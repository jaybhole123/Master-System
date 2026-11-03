import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Helper to render first page of PDF to image canvas dataURL
export async function convertPdfPageToImage(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for sharp text readability

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return canvas.toDataURL("image/jpeg", 0.95);
}

// Client side helper for Coal System Sales Order AI OCR
// Uses OpenAI Vision API configured with OPENAI_API_KEY and models gpt-5.6-sol / gpt-5.6-terra

const API_URL = 'https://api.openai.com/v1/chat/completions';

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function normalizeDate(rawStr) {
  if (!rawStr) return '';
  const s = String(rawStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Match formats like "Aug 1, 2026", "Aug 01, 2026", "Sep 14, 2026", "Jul 29, 2026"
  const m1 = s.match(/([a-zA-Z]{3,9})[\s,]+(\d{1,2})(?:st|nd|rd|th)?,?[\s,]+(\d{4})/i);
  if (m1) {
    const month = MONTH_MAP[m1[1].slice(0, 3).toLowerCase()];
    if (month) {
      return `${m1[3]}-${month}-${String(m1[2]).padStart(2, '0')}`;
    }
  }

  // Match formats like "1 Aug 2026", "14 Sep 2026", "14-Sep-2026", "01.08.2026"
  const m2 = s.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\-/.]([a-zA-Z]{3,9})[\s\-/,]+(\d{4})/i);
  if (m2) {
    const month = MONTH_MAP[m2[2].slice(0, 3).toLowerCase()];
    if (month) {
      return `${m2[3]}-${month}-${String(m2[1]).padStart(2, '0')}`;
    }
  }

  // Standard numeric dates YYYY-MM-DD or DD/MM/YYYY
  const m3 = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (m3) {
    return `${m3[1]}-${String(m3[2]).padStart(2, '0')}-${String(m3[3]).padStart(2, '0')}`;
  }

  const m4 = s.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (m4) {
    return `${m4[3]}-${String(m4[2]).padStart(2, '0')}-${String(m4[1]).padStart(2, '0')}`;
  }

  return s;
}

export async function extractSalesOrderFromImage(fileOrDataUrl, onProgress) {
  if (onProgress) onProgress(15);

  const apiKey = (import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || '').trim();
  const model = (import.meta.env.VITE_OCR_MODEL || import.meta.env.OCR_MODEL || 'gpt-5.6-sol').trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not defined in .env file. Please check .env configuration.");
  }

  // Get base64 representation
  let base64Image;
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image/')) {
    base64Image = fileOrDataUrl;
  } else if (fileOrDataUrl instanceof File && (fileOrDataUrl.type === 'application/pdf' || fileOrDataUrl.name.toLowerCase().endsWith('.pdf'))) {
    base64Image = await convertPdfPageToImage(fileOrDataUrl);
  } else {
    base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrDataUrl);
    });
  }

  if (onProgress) onProgress(40);

  const prompt = `You are an OCR reader for Indian Coal Mining (SECL) Sales Order documents.

READ ONLY WHAT IS ACTUALLY PRINTED IN THE IMAGE.
- Absolute Zero-Tolerance for dummy, fake, guessed, or default data.
- If a field is not printed, blurry, or missing, leave it as an empty string "".
- Do not invent numbers, names, or dates under any circumstances.

Extract these exact printed fields into valid JSON:
{
  "name": "",
  "sales_order_number": "",
  "sales_order_valid_from": "",
  "sales_order_valid_to": "",
  "office_area": "",
  "mine": "",
  "quantity": "",
  "rate_per_te": "",
  "amount": "",
  "so_value_rate": ""
}

Exact Locations in Image:
- "name": Text printed in 'Sold to Party' or 'Receiver (Billed To)' under Name.
- "sales_order_number": Digits printed after 'Sales Order Number :'.
- "sales_order_valid_from": Text printed after 'Sales Order Valid From :'.
- "sales_order_valid_to": Text printed after 'Sales Order Valid To :'.
- "office_area": Text printed next to 'Office Area :' (or 'Area :').
- "mine": Value printed in the Line Item table under column 'Mine'.
- "quantity": Number printed in the Line Item table under column 'Quantity'.
- "rate_per_te": Rate printed in the PARTICULARS table for 'Requisite Payment'.
- "amount": Amount printed in the PARTICULARS table for 'Requisite Payment'.
- "so_value_rate": Leave "" if not explicitly printed.

Return ONLY the raw JSON object.`;

  let jsonResponse;
  let rawContent;
  let parsedData = {};

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                  detail: "high"
                }
              }
            ]
          }
        ]
      })
    });

    if (onProgress) onProgress(80);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `OpenAI API failed with status ${response.status}`);
    }

    jsonResponse = await response.json();
    rawContent = jsonResponse.choices?.[0]?.message?.content || "{}";
    parsedData = JSON.parse(rawContent);
  } catch (error) {
    console.error("OpenAI OCR direct call failed, error:", error);
    throw error;
  }

  console.log("Extracted Sales Order data from image:", parsedData);

  if (onProgress) onProgress(100);

  const validFrom = normalizeDate(parsedData.sales_order_valid_from);
  const validTo = normalizeDate(parsedData.sales_order_valid_to);

  // Map into standard Sales Order structure for SalesOrderResults table
  return {
    sold_to_party: { name: parsedData.name || "" },
    receiver: { name: parsedData.name || "" },
    order_info: {
      sales_order_number: parsedData.sales_order_number || "",
      sales_order_valid_from: validFrom,
      sales_order_valid_to: validTo
    },
    company: {
      office_area: parsedData.office_area || ""
    },
    mine_info: {
      area: parsedData.office_area || "",
      mine: parsedData.mine || "",
      quantity_words: parsedData.quantity ? String(parsedData.quantity) : ""
    },
    line_items: [
      {
        mine: parsedData.mine || "",
        quantity: parsedData.quantity ? String(parsedData.quantity) : ""
      }
    ],
    pricing: [
      {
        description: "Requisite Payment",
        rate_per_te: parsedData.rate_per_te ? String(parsedData.rate_per_te) : "",
        amount: parsedData.amount ? String(parsedData.amount) : ""
      }
    ],
    totals: {
      requisite_payment: parsedData.amount ? String(parsedData.amount) : ""
    },
    so_value_rate: parsedData.so_value_rate || parsedData.rate_per_te || ""
  };
}

