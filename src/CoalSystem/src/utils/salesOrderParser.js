import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Extracts raw text from PDF using POSITION-AWARE sorting.
 * 
 * pdf.js returns text items in the PDF's internal stream order, which for
 * multi-column layouts (like SECL Sales Orders) is often column-by-column
 * instead of row-by-row. This causes regex parsing to fail because labels
 * and values from different columns get interleaved.
 *
 * Fix: sort all text items by their Y coordinate (top→bottom), then X
 * coordinate (left→right), and group items on the same Y line together.
 * This produces proper visual reading order.
 */
export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Collect items with their position (x, y from the transform matrix)
    const items = content.items
      .filter(item => item.str && item.str.trim() !== '')
      .map(item => ({
        str: item.str,
        x: item.transform[4],   // horizontal position
        y: item.transform[5],   // vertical position (PDF: 0 = bottom)
      }));

    // Sort: Y descending (top of page first), then X ascending (left to right)
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 3) return yDiff > 0 ? 1 : -1;
      return a.x - b.x;
    });

    // Group items into visual lines (items within 3 units of Y = same line)
    const lines = [];
    let currentLine = [];
    let lastY = null;

    for (const item of items) {
      if (lastY !== null && Math.abs(item.y - lastY) > 3) {
        if (currentLine.length > 0) {
          lines.push(currentLine.map(t => t.str).join(' '));
        }
        currentLine = [];
      }
      currentLine.push(item);
      lastY = item.y;
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.map(t => t.str).join(' '));
    }

    fullText += lines.join('\n') + '\n';
  }

  // Log for debugging (can be removed later)
  console.log('--- Extracted PDF Text ---');
  console.log(fullText);
  console.log('--- End PDF Text ---');

  return fullText;
}

function matchOne(text, regex) {
  const m = text.match(regex);
  return m ? m[1].trim() : '';
}

/**
 * Parses raw text from a SECL Sales Order PDF into structured JSON.
 *
 * Based on the actual PDF layout:
 *   - Header: "SALES ORDER" + company info + Office Area
 *   - 3-column party table: Sold To Party | Receiver (Billed To) | Consignee (Shipped To)
 *   - 3-column order details: Sales Order info | Scheme info | Mine info
 *   - Line Item table
 *   - PARTICULARS pricing table
 *   - Bank Details table
 *
 * After position-aware extraction, each visual row becomes one line,
 * so "Sales Order Number : 3330084775 Scheme Name : ... Area : SOHAGPUR"
 * is a single line. The regexes below are tuned for this format.
 */
export function parseSalesOrder(text) {
  const clean = text.replace(/\s+/g, ' ').trim();

  const upperClean = clean.toUpperCase();
  const isValidFormat = upperClean.includes("SALES ORDER") || 
                        upperClean.includes("DELIVERY ORDER") ||
                        upperClean.includes("SOUTH EASTERN COALFIELDS") ||
                        upperClean.includes("DO NO") ||
                        upperClean.includes("D.O.") ||
                        upperClean.includes("DELIVERY");

  if (!isValidFormat) {
    console.warn("Format warning: Did not find standard Sales Order keywords. Attempting to parse anyway.");
  }
  
  console.log("=== PDF TEXT START ===\n" + clean + "\n=== PDF TEXT END ===");

  // ──────────────────────────────────────────────
  // COMPANY / HEADER
  // ──────────────────────────────────────────────
  const company = {
    name: matchOne(clean, /(^[A-Z][A-Za-z ]+ Limited)\b/i) || "South Eastern Coalfields Limited",
    address: matchOne(clean, /SECL HQ,?\s*(.+?)\s*(?:Telephone|IN\b|Office Area)/i) || "Seepat Road, Bilaspur Chhattisgarh 495006",
    gst: matchOne(clean, /GST\s*:\s*([0-9A-Z,]+)/i),
    office_area: matchOne(clean, /Office Area\s*[:]?\s*(.+?)(?=\s+SECL\s*HQ)/i) || matchOne(clean, /Office Area\s*:\s*([A-Za-z ]+)\b/i)
  };

  // ──────────────────────────────────────────────
  // SOLD TO PARTY / RECEIVER NAME
  // The Name field can contain parentheses like "(Formerly PHIL ISPAT PVT LTD)"
  // ──────────────────────────────────────────────
  // Try multiple patterns for the party name
  let partyName = '';

  const partyMatch = clean.match(/(?:Name|Nane)\s*:\s*([A-Za-z0-9 .&\-\/\(\)]+?)(?=\s+(?:Address|Addre8s|Addres0|Name|Nane)\s*:)/gi);
  if (partyMatch && partyMatch.length > 0) {
    // If there are multiple matches, take the first one which is usually the cleanest
    let bestMatch = partyMatch[0].replace(/(?:Name|Nane)\s*:\s*/i, '').trim();
    // Sometimes OCR adds extra 'Name:' inside, clean it up
    bestMatch = bestMatch.split(/(?:Name|Nane)\s*:/i)[0].trim();
    partyName = bestMatch;
  }

  // Pattern 1: "Sold to Party:XXXXXXX Name : SOME NAME ... Address"
  if (!partyName) {
    partyName = matchOne(clean, /Sold to Party\s*:\s*\d+\s*Name\s*:\s*([A-Za-z0-9 .&\-\/\(\)]+?)(?=\s+Address\s*:)/i);
  }

  // Pattern 2: "Name : SOME NAME Name :" (repeated in 3-column layout)
  if (!partyName) {
    partyName = matchOne(clean, /\bName\s*:\s*([A-Za-z0-9 .&\-\/\(\)]+?)(?=\s+Name\s*:)/i);
  }

  // Pattern 3: "Name : SOME NAME Address :"
  if (!partyName) {
    partyName = matchOne(clean, /\bName\s*:\s*([A-Za-z0-9 .&\-\/\(\)]+?)(?=\s+Address\s*:)/i);
  }

  // Pattern 4: "Name : SOME NAME (Formerly XYZ)" — greedy until Address/District
  if (!partyName) {
    partyName = matchOne(clean, /\bName\s*:\s*(.+?)(?=\s+(?:Address|District|State|GSTIN)\s*:)/i);
  }

  // ──────────────────────────────────────────────
  // ORDER INFO
  // ──────────────────────────────────────────────
  const order_info = {
    sales_order_number: matchOne(clean, /(?:Sales|Salee)\s+Order\s+(?:Number|Nu ber)\s*:\s*(\w+[\/\-]?\w*)/i),
    sales_order_date: matchOne(clean, /(?:Sales|Sles)\s+Order\s+Date\s*:\s*([a-zA-Z]{3} \d{1,2}, \d{4})/i),
    contract_number: matchOne(clean, /Contract Number\s*:\s*(\d+)/i) || matchOne(clean, /FSA No\.?\s*:\s*([A-Za-z0-9]+)/i),
    sales_order_valid_from: matchOne(clean, /(?:Sales|sles)\s+Order\s+(?:Valid\s+From|Velld\s+ro)\s*:\s*([a-zA-Z]{3} \d{1,2}, \d{4})/i),
    sales_order_valid_to: matchOne(clean, /(?:Sales|Sles)\s+Order\s+(?:Valid\s+To|Velld\s+To)\s*:\s*([a-zA-Z]{3} \d{1,2}, \d{4})/i),
    month: matchOne(clean, /\bMonth\s*:\s*(\d+)/i),
    legacy_fsa_no: matchOne(clean, /Legacy FSA No\s*:\s*(\d+)/i),
    scheme_name: matchOne(clean, /Scheme Name\s*:\s*(.+?)(?=\s+(?:Auction Date|Area\s*:|Contract Signing))/i),
    auction_date: matchOne(clean, /Auction Date\s*:\s*([\d\.]+ [a-zA-Z]{3} \d{4}|[a-zA-Z]{3} \d{1,2}, \d{4})/i),
    contract_signing_date: matchOne(clean, /Contract Signing Date\s*:\s*([\d\.]+ [a-zA-Z]{3} \d{4}|[a-zA-Z]{3} \d{1,2}, \d{4})/i),
    contract_expiry_date: matchOne(clean, /Contract Expiry Date\s*:\s*([\d\.]+ [a-zA-Z]{3} \d{4}|[a-zA-Z]{3} \d{1,2}, \d{4})/i),
    mode_of_transport: matchOne(clean, /Mode of Transport\s*:\s*([A-Za-z]+)/i),
    type_of_consumer: matchOne(clean, /Type of Consumer\s*:\s*([A-Za-z ]+?)(?=\s+(?:PCB|STC|Factory|Name of|Quantity))/i),
    destination: matchOne(clean, /\bDestination\s*:\s*([A-Za-z ]*?)(?=\s+(?:Line Item|$))/i),
    tranche: matchOne(clean, /Tranche\s*:\s*([A-Za-z0-9 ]+?)(?=\s+Destination)/i),
  };

  // ──────────────────────────────────────────────
  // MINE INFO (right column of the 3-column order details section)
  // ──────────────────────────────────────────────
  const mine_info = {
    area: matchOne(clean, /\bArea\s*:\s*([A-Z]+)/),
    mine: matchOne(clean, /\bMine\s*:\s*(\d+)/),
    grade_desc: matchOne(clean, /Grade Desc\s*:\s*([A-Z0-9]+)/i),
    size: matchOne(clean, /\bSize\s*:\s*([\-0-9]+ ?MM)/i),
    commodity: matchOne(clean, /Name of Commodity\s*:\s*([A-Za-z\- ]+?)(?=\s+(?:STC|ZTCS|Quantity|$))/i),
    stc_distance: matchOne(clean, /STC Distance\s*:\s*([0-9.]+)/i),
    ztcs_applicable: matchOne(clean, /ZTCS Applicable\s*:\s*([A-Za-z]+)/i),
    quantity_words: matchOne(clean, /Quantity\s*:\s*([A-Z0-9., ]+?)(?=\s+(?:Unit|Tranche|Line Item|$))/i).replace(/\s+/g, ' ')
  };

  // ──────────────────────────────────────────────
  // LINE ITEMS TABLE
  // ──────────────────────────────────────────────
  const line_items = [];

  // The line item row follows the header:
  //   "Line Item Mine Material Material Description HSN Code Unit of Measure Quantity"
  //   "10 KHAIRAHA UG 4100000000 NON-COKING COAL 27011200 TE 496"
  const liMatch = clean.match(
    /(?:Line Item\s+Mine\s+Material\s+Material Description\s+HSN Code\s+Unit of Measure\s+Quantity\s*)(\d+)\s+([A-Z][A-Z ]+?)\s+(\d{6,})\s+([A-Z\-]+(?:\s+[A-Z\-]+)*?\s*COAL)\s+(\d{5,})\s+(TE)\s+([\d,]+)/i
  );
  if (liMatch) {
    line_items.push({
      line_item: liMatch[1],
      mine: liMatch[2].trim(),
      material: liMatch[3],
      material_description: liMatch[4].trim(),
      hsn_code: liMatch[5],
      unit: liMatch[6],
      quantity: liMatch[7].replace(/,/g, '')
    });
  }

  // Fallback: try without the header
  if (line_items.length === 0) {
    const liFallback = clean.match(
      /(\d{1,3})\s+([A-Z][A-Z ]{2,}?(?:OC|UG|MINE|OCM|OCP))\s+(\d{6,})\s+([A-Z\-]+(?:\s+[A-Z\-]+)*\s*COAL)\s+(\d{5,})\s+(TE)\s+([\d,]+)/i
    );
    if (liFallback) {
      line_items.push({
        line_item: liFallback[1],
        mine: liFallback[2].trim(),
        material: liFallback[3],
        material_description: liFallback[4].trim(),
        hsn_code: liFallback[5],
        unit: liFallback[6],
        quantity: liFallback[7].replace(/,/g, '')
      });
    }
  }

  // ──────────────────────────────────────────────
  // PRICING / PARTICULARS TABLE
  // ──────────────────────────────────────────────
  const pricing = [];
  const particularsMatch = clean.match(/PARTICULARS\s*(.+?)Private Washery Name/i);
  if (particularsMatch) {
    let block = particularsMatch[1];
    // Strip header row
    block = block.replace(/^\d+\s*Pricing Description\s*Rate Per TE\(INR\)\s*Amount\(INR\)\s*/i, '');
    block = block.replace(/^Pricing Description\s*Rate Per TE\(INR\)\s*Amount\(INR\)\s*/i, '');

    // Each pricing row: "Label text 1234.56 5678.90"
    const rowRe = /([A-Za-z][A-Za-z .\-]*?(?:\([^)]*\))?[A-Za-z%.\-\) ]*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
    let m;
    while ((m = rowRe.exec(block)) !== null) {
      const label = m[1].trim().replace(/\s+/g, ' ');
      if (!label || /^[\d.]+$/.test(label)) continue;
      pricing.push({
        description: label,
        rate_per_te: m[2].replace(/,/g, ''),
        amount: m[3].replace(/,/g, '')
      });
    }
  }

  // ──────────────────────────────────────────────
  // BANK DETAILS TABLE
  // ──────────────────────────────────────────────
  const bank_details = [];
  // EMD row
  const emdMatch = clean.match(/\bEMD\s+([A-Za-z]+ \d{1,2},\s*\d{4})\s+([\d.]+)/i);
  if (emdMatch) {
    bank_details.push({ type: 'EMD', utr: '', date_of_payment: emdMatch[1], document_no: '', bank_name: '', amount: emdMatch[2] });
  }
  // FT rows
  const ftRe = /\bFT\s+(\S+)\s+([A-Za-z]+ \d{1,2},\s*\d{4})\s+(\d+)\s+([A-Za-z ]+?)\s+([\d.]+)/gi;
  let ftM;
  while ((ftM = ftRe.exec(clean)) !== null) {
    bank_details.push({
      type: 'FT',
      utr: ftM[1],
      date_of_payment: ftM[2],
      document_no: ftM[3],
      bank_name: ftM[4].trim(),
      amount: ftM[5]
    });
  }

  // ──────────────────────────────────────────────
  // TOTALS
  // ──────────────────────────────────────────────
  const totals = {
    requisite_payment_rate: '',
    requisite_payment_amount: '',
    total_amount: matchOne(clean, /\bTOTAL\s*:\s*([\d.,]+)/i),
    total_in_words: matchOne(clean, /Total Sale Order Value In words\s*:\s*(.+?)(?=\s*(?:GST collected|This is digitally|The Document))/i),
    gst_to_deposit: matchOne(clean, /GST collected to be deposited.*?RS\s*:?\s*([\d.,]+)/i)
  };

  // Extract Requisite Payment from pricing table
  const reqPay = pricing.find(p => p.description?.toLowerCase().includes("requisite payment"));
  if (reqPay) {
    totals.requisite_payment_rate = reqPay.rate_per_te;
    totals.requisite_payment_amount = reqPay.amount;
  }

  // ──────────────────────────────────────────────
  // VALIDATE
  // ──────────────────────────────────────────────
  // Relaxed validation: We already check for "SALES ORDER" at the top.
  // If line_items are missing due to formatting, we can still show the rest of the data.
  // if (line_items.length === 0) {
  //   console.warn("No line items found, but continuing with other extracted data.");
  // }

  // ──────────────────────────────────────────────
  // ASSEMBLE RESULT
  // ──────────────────────────────────────────────
  return {
    document_type: matchOne(clean, /(SALES ORDER)/i),
    company,
    sold_to_party: {
      code: matchOne(clean, /Sold to Party\s*:\s*(\d+)/i),
      name: partyName,
    },
    receiver: {
      customer_code: matchOne(clean, /Customer Code\s*:\s*(\d+)/i),
      name: partyName,
      district: matchOne(clean, /District\s*:\s*([A-Za-z]+)/i),
      state: matchOne(clean, /State\s*:\s*([A-Za-z]+)/i),
      gstin: matchOne(clean, /GSTIN\s*:\s*([0-9A-Z]{15})/i)
    },
    order_info,
    mine_info,
    line_items,
    pricing,
    bank_details,
    totals
  };
}

/**
 * Convert parsed JSON structure into flat CSV
 */
export function toCSVSalesOrder(data) {
  const dataArray = Array.isArray(data) ? data : [data];
  const rows = [['PDF Index', 'Field', 'Value']];

  function flatten(idx, obj, prefix = '') {
    Object.entries(obj).forEach(([k, v]) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        flatten(idx, v, prefix + k + '.');
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === 'object') {
            Object.entries(item).forEach(([kk, vv]) => {
              rows.push([idx + 1, `${prefix}${k}[${i}].${kk}`, vv]);
            });
          } else {
            rows.push([idx + 1, `${prefix}${k}[${i}]`, item]);
          }
        });
      } else {
        rows.push([idx + 1, prefix + k, v]);
      }
    });
  }

  dataArray.forEach((d, i) => flatten(i, d));
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

/**
 * Downloads a Blob to the user's device
 */
export function downloadBlob(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
