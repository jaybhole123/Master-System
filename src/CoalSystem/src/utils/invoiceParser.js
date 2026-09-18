function grab(text, regex) {
  const m = text.match(regex);
  return m ? m[1].trim() : "";
}

export function parseInvoiceText(rows) {
  const rawText = rows.join('\n');
  const lines = rows.map(l => l.trim()).filter(Boolean);
  const t = rawText.replace(/\s+/g,' ');

  if (!t.toUpperCase().includes("INVOICE") && !t.toUpperCase().includes("TAX INVOICE")) {
    throw new Error("Invalid Format: Uploaded file is not an Invoice PDF.");
  }

  // Log extracted text for debugging
  console.log('--- Invoice Extracted Text ---');
  console.log(rawText);
  console.log('--- End Invoice Text ---');

  const data = {};

  // ── INVOICE NO ──
  data.invoiceNo = grab(t, /Invoice\s*No\.?\s*:?\s*([A-Za-z0-9\/\-]+)/i);

  // ── INVOICE DATE ──
  data.invoiceDate = grab(t, /(?<!e-Way Bill\s)Date\s*:?\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4})/i)
    || grab(t, /Invoice\s*Date\s*:?\s*([0-9]{1,2}[\-\/\.][A-Za-z0-9]{2,3}[\-\/\.][0-9]{2,4})/i);

  // ── IRN (30-80 hex chars) ──
  data.irn = grab(t, /IRN\s*:?\s*([a-f0-9]{30,80})/i)
    || grab(t, /\b([a-f0-9]{64})\b/i);

  // ── ACK NO / DATE ──
  data.ackNo   = grab(t, /Ack\s*No\.?\s*:?\s*([0-9]+)/i);
  data.ackDate = grab(t, /Ack\s*Date\s*:?\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4})/i);

  // ── E-WAY BILL NO ──
  data.ewayBillNo = grab(t, /E[\s-]*Way\s*Bill\s*No\.?\s*:?\s*([0-9]{10,15})/i)
    || grab(t, /e[\s-]*Way\s*Bill\s*:?\s*([0-9]{10,15})/i)
    || grab(t, /EWB\s*No\.?\s*:?\s*([0-9]{10,15})/i);

  // ── VEHICLE NO (Indian format: XX00XX0000 or XX00X0000) ──
  data.vehicleNo = grab(t, /Vehicle\s*(?:No\.?)?\s*:?\s*([A-Z]{2}\s*[0-9]{2}\s*[A-Z]{1,3}\s*[0-9]{3,4})/i)
    || grab(t, /Veh\.?\s*No\.?\s*:?\s*([A-Z]{2}\s*[0-9]{2}\s*[A-Z]{1,3}\s*[0-9]{3,4})/i)
    || grab(t, /\b([A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{3,4})\b/);

  // ── TRANSPORT ──
  data.transport = grab(t, /Transport\s*:?\s*(By\s*Road|By\s*Rail|By\s*Air|By\s*Ship)/i);
  data.placeOfSupply = grab(t, /Place\s*of\s*Supply\s*[:\-]?\s*([A-Za-z\.\&]+(?:\s+[A-Za-z\.\&]+){0,3}(?:\s*\(\s*[0-9]+\s*\))?)/i)
    || grab(t, /Place\s*of\s*Supply\s*[:\-]?\s*([A-Za-z\s]+?)(?=\s*(?:State|Code|Reverse|Vehicle|E-way|Billed|To|Consignee|$))/i);

  // ── SUPPLIER ──
  data.supplierName = grab(t, /(JAI\s*BHOLE\s*ENTERPRISES)/i)
    || grab(t, /Supplier\s*(?:Name)?\s*:?\s*(.+?)(?:\s*GSTIN|\s*Address|\s*Mo\.|$)/i);
  data.supplierGSTIN = grab(t, /GSTIN\s*No\.?\s*[\-:]?\s*([0-9A-Z]{15})/i);
  data.supplierAddress = grab(t, /JAI BHOLE ENTERPRISES\s*(.*?)\s*Mo\.?:/i);
  data.supplierContact = grab(t, /Mo\.?:\s*([0-9]{10})/i);

  // ── BUYER NAME (multiple formats) ──
  data.buyerName = grab(t, /Billed\s*to\)?\s*:?\s*M\/s\.?\s*(.+?)(?:\s*,\s*|\s*Address|\s*GSTIN|\s*State|\s*PAN)/i)
    || grab(t, /Bill\s*To\s*:?\s*M\/s\.?\s*(.+?)(?:\s*,|\s*Address|\s*GSTIN)/i)
    || grab(t, /Billed\s*to\)?\s*:?\s*(.+?)(?:\s*,|\s*Address|\s*GSTIN|\s*State)/i)
    || grab(t, /Bill\s*To\s*:?\s*(.+?)(?:\s*,|\s*Address|\s*GSTIN)/i)
    || grab(t, /Buyer\s*(?:Name)?\s*:?\s*(.+?)(?:\s*,|\s*Address|\s*GSTIN|\s*State)/i)
    || grab(t, /Consignee\s*:?\s*M\/s\.?\s*(.+?)(?:\s*,|\s*Address|\s*GSTIN)/i);

  // Clean up buyer name - remove "M/s" prefix if still present
  if (data.buyerName) {
    data.buyerName = data.buyerName.replace(/^M\/s\.?\s*/i, '').trim();
  }

  data.buyerAddress = grab(t, /Billed\s*to\)?\s*.*?(?:Ltd\.|Limited|LLP|Pvt)\.?\s*(.*?)\s*GSTIN/i);
  const buyerGstins = [...t.matchAll(/GSTIN\s*No\.?\s*:?\s*([0-9A-Z]{15})/gi)].map(m=>m[1]);
  data.buyerGSTIN = buyerGstins.find(g => g !== data.supplierGSTIN) || '';
  data.buyerPAN = grab(t, /Pan\s*No\.?\s*:?\s*([A-Z]{5}[0-9]{4}[A-Z])/i);

  // ── BANK DETAILS ──
  data.bankName = grab(t, /Bank\s*Name\s*:?\s*([A-Za-z\s]+?)(?:\s*A\/c|\s*Account|\s*Branch)/i);
  data.bankAccount = grab(t, /A\/c\s*No\.?\s*:?\s*([0-9]+)/i);
  data.ifsc = grab(t, /IFS\s*Code\s*:?\s*.*?([A-Z]{4}0[0-9A-Z]{6})/i) || grab(t, /([A-Z]{4}0[0-9A-Z]{6})/);

  // ── TOTAL AMOUNT (Invoice Grand Total) ──
  data.totalAmount = grab(t, /Total\s+[\d.,]+\s*(?:MT|TE|TN|KG|PCS|NOS|GRS)\s*[^0-9\n]*?([0-9,]+\.[0-9]{2})/i)
    || grab(t, /Total\s*(?:Invoice\s*)?(?:Amount|Amt|Value)\s*[^0-9\n]*?([0-9,]+\.[0-9]{2})/i)
    || grab(t, /Grand\s*Total\s*[^0-9\n]*?([0-9,]+\.[0-9]{2})/i)
    || grab(t, /Total\s*Inv\s*Amt\s*[^0-9\n]*?([0-9,]+\.[0-9]{2})/i)
    || grab(t, /Net\s*Amount\s*[^0-9\n]*?([0-9,]+\.[0-9]{2})/i)
    || grab(t, /Total\s*[^0-9\n]*?([0-9,]+\.[0-9]{2})(?=\s*(?:E\.?\s*&\s*O\.?\s*E\.?|Amount Chargeable|Rupees|Indian))/i)
    || grab(t, /TOTAL\s*[:\s]*([0-9,]+\.[0-9]{2})/);

  data.amountInWords = grab(t, /Amount Chargeable.*?in words\)\s*(Indian Rupees[^E]*?)(?:E\.\s*&\s*O\.E|$)/i)
    || grab(t, /(?:Amount|Total)\s*(?:in\s*)?Words\s*:?\s*(.*?)(?:E\.\s*&|Subject|$)/i);

  // ── TAX DETAILS ──
  data.cgst = grab(t, /CGST\s*Amt\.?\s*:?\s*([0-9,]+\.[0-9]{2})/i) || grab(t, /Central Goods and Service Tax\s*([0-9,]+\.[0-9]{2})/i);
  data.sgst = grab(t, /SGST\s*Amt\.?\s*:?\s*([0-9,]+\.[0-9]{2})/i) || grab(t, /State Goods and Service Tax\s*([0-9,]+\.[0-9]{2})/i);
  data.igst = grab(t, /IGST\s*Amt\.?\s*:?\s*([0-9,]+\.[0-9]{2})/i) || grab(t, /Integrated Goods and Service Tax\s*([0-9,]+\.[0-9]{2})/i);
  data.taxableAmt = grab(t, /Tot\.?\s*Taxable\s*Amt\s*:?\s*([0-9,]+\.[0-9]{2})/i);
  data.roundOff = grab(t, /Round\s*Off\s*(\(?-?\)?\s*[0-9]+\.[0-9]{2})/i);
  data.totalQuantity = grab(t, /Total\s+([0-9.,]+\s*MT)/i)
    || grab(t, /Quantity\s*:?\s*([0-9.,]+\s*MT)/i);

  // ── GOODS LINE ITEMS ──
  data.goods = [];
  const rowPattern = /^\s*\d+\s+(.+?)\s+(\d{4,8})\s+(\d{1,2}\s*%)\s+([\d.,]+\s*[A-Za-z]+)\s+([\d,]+\.\d{2})\s*[A-Za-z]*\s+([\d,]+\.\d{2})\s*$/;
  lines.forEach(line => {
    const m = line.match(rowPattern);
    if (m){
      data.goods.push({
        description: m[1].trim(),
        hsn: m[2],
        gstRate: m[3].replace(/\s+/g,''),
        quantity: m[4],
        rate: m[5],
        amount: m[6]
      });
    }
  });

  // Fallback: single-line-item invoices
  if (data.goods.length === 0){
    const goodsMatch = t.match(/([A-Za-z][A-Za-z\s]*Hsn\s*[0-9]+)\s*([0-9]{6,8})\s*([0-9]+\s*%)\s*([0-9.,]+\s*MT)\s*([0-9,]+\.[0-9]{2})\s*MT\s*([0-9,]+\.[0-9]{2})/i);
    if (goodsMatch){
      data.goods.push({
        description: goodsMatch[1].trim(),
        hsn: goodsMatch[2],
        gstRate: goodsMatch[3],
        quantity: goodsMatch[4],
        rate: goodsMatch[5],
        amount: goodsMatch[6]
      });
    }
  }

  // ── FALLBACK: Total Amount from goods if still empty ──
  if (!data.totalAmount && data.goods.length > 0) {
    // Sum all goods amounts as total
    const total = data.goods.reduce((sum, g) => sum + parseFloat((g.amount || '0').replace(/,/g, '')), 0);
    if (total > 0) data.totalAmount = total.toFixed(2);
  }

  // ── RATE ──
  if (data.goods.length > 0 && !data.rate) {
    data.rate = data.goods[0].rate;
  }

  if (data.goods.length === 0 && !data.invoiceNo) {
    throw new Error("Invalid Format: Uploaded file is not a valid Invoice PDF (No invoice items found).");
  }

  return data;
}

export const INVOICE_COLS = [
  { key: "invoiceNo", label: "INVOICE NO" },
  { key: "invoiceDate", label: "INVOICE DATE" },
  { key: "irn", label: "IRN" },
  { key: "buyerGSTIN", label: "BUYER GSTIN" },
  { key: "supplierName", label: "SUPPLIER NAME" },
  { key: "ewayBillNo", label: "E-WAY BILL NO" },
  { key: "vehicleNo", label: "VEHICLE NO" },
  { key: "placeOfSupply", label: "PLACE OF SUPPLY" },
  { key: "totalQuantity", label: "QUANTITY" },
  { key: "rate", label: "RATE" },
  { key: "totalAmount", label: "TOTAL AMOUNT" },
];

export function toInvoiceCSV(data) {
  const dataArray = Array.isArray(data) ? data : [data];
  
  const headers = ["PDF Index", ...INVOICE_COLS.map(c => c.label)];
  const rows = [headers];

  dataArray.forEach((d, index) => {
    const row = [index + 1];
    INVOICE_COLS.forEach(c => {
      row.push(d[c.key] || "");
    });
    rows.push(row);
  });

  return rows.map(r => r.map(c => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
}
