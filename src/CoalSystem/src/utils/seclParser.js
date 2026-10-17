
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
 
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
 
// Coal India subsidiaries that can appear as "Seller Name" in these letters.
// FIX: original code only matched "SECL" — NCL (and any other subsidiary)
// rows were silently dropped, so an NCL intimation letter returned zero rows.
const SUBSIDIARY_CODES = ['SECL', 'NCL', 'CIL', 'ECL', 'WCL', 'BCCL', 'CCL', 'MCL', 'NEC', 'SER'];
function isSubsidiaryCode(str) {
  const s = str.trim().toUpperCase();
  return SUBSIDIARY_CODES.some(code => s.startsWith(code));
}
 
// ---------------------------------------------------------------------------
// FORMAT A: "Winners Intimation Letter for <SUBSIDIARY> Single Window Mode
// Agnostic e-Auction" (MSTC portal export). Columns confirmed against real
// PDF coordinates.
// ---------------------------------------------------------------------------
export const COLS = [
  {x: 32,  label: 'Seller Name'},
  {x: 61,  label: 'Auction Id'},
  {x: 90,  label: 'Source Name'},
  {x: 119, label: 'Grade / Size'},
  {x: 163, label: 'Remark'},
  {x: 195, label: 'Offer Qty'},
  {x: 224, label: 'Unbooked Qty'},
  {x: 263, label: 'Mode'},
  {x: 292, label: 'Floor Price'},
  {x: 321, label: 'Quantity Allotted'},
  {x: 358, label: 'Winning Bid Price (Rs/MT)'},
  {x: 409, label: 'Unique Bid Id'},
  {x: 445, label: 'Premium % Over Notified Price'},
  {x: 480, label: 'Bid Rank'},
  {x: 509, label: 'Feeding Colliery Details' }
];
 
// ---------------------------------------------------------------------------
// FORMAT B: "Sale Intimation letter" — the Gmail/MSTC-Admin email export
// (e.g. "Final Allocation Letter SECL_CLUSTER EA-...", printed from Gmail).
// This is a genuinely different template: different meta labels, and a
// 22-column ruled table (14 main columns + 7 "Feeding Colliery Details"
// sub-columns + Bid Seniority). Column boundaries below were measured from
// the PDF's own grid lines (not guessed), so they line up with the ruled
// cells regardless of how text runs happen to be merged inside a cell.
// ---------------------------------------------------------------------------
const GMAIL_COL_EDGES = [
  44.3, 60.2, 78.0, 98.0, 118.5, 132.9, 171.4, 195.6, 221.75, 253.5,
  271.15, 292.3, 331.2, 360.1, 382.9, 403.65, 420.35, 444.4, 465.45,
  485.9, 524.55, 543.6, 567.4
];
const GMAIL_COLS_LABELS = [
  'Seller', 'Unique Bid Id', 'Source Name', 'Mode', 'Grade', 'Representative Grade',
  'Size', 'Offer Quantity (MT)', 'Quantity Allotted (MT)', 'Bid Price (Rs/MT)',
  'Notified Price of Source (Rs/MT)', 'Notified/Modulated Price of Representative Grade (Rs/t)',
  'Premium (%)', 'Balance Quantity (MT)', 'Colliery Name', 'Colliery Grade', 'Colliery Size',
  'Colliery Notified Price', 'Final Bid Price (Rs/MT)', 'Final Bid Price of Representative Grade (Rs/MT)',
  'Supply Range', 'Bid Seniority'
];
export const GMAIL_COLS = GMAIL_COLS_LABELS.map((label, i) => ({ label, x: (GMAIL_COL_EDGES[i] + GMAIL_COL_EDGES[i+1]) / 2 }));
 
function nearestCol(x, cols){
  let best = cols[0], bestDist = Math.abs(cols[0].x - x);
  for(const c of cols){
    const d = Math.abs(c.x - x);
    if(d < bestDist){ best = c; bestDist = d; }
  }
  return best.label;
}
 
// Column index for a raw x using explicit boundary edges (used for the
// Gmail format, where columns are narrow enough that a single text "item"
// can straddle more than one column when the source PDF has no space
// between adjacent cell values).
function colIndexForX(x, edges){
  for (let i = 0; i < edges.length - 1; i++) {
    if (x >= edges[i] && x < edges[i+1]) return i;
  }
  if (x < edges[0]) return 0;
  return edges.length - 2;
}
 
// Known transport mode values — these should never be split across columns.
const KNOWN_MODES = ['Road', 'Rail', 'ROAD', 'RAIL', 'road', 'rail'];

// Splits one text item across column boundaries by estimating each
// character's on-page x position from the item's total width. Needed
// because the Gmail-exported table sometimes has zero space between two
// adjacent cells' text (e.g. "SECL95452MG..." is actually "SECL" | "95452M"
// | "G..." spread across 3 columns), so a single nearest-x lookup on the
// item's start position alone would misfile the whole run into column 1.
function splitItemAcrossColumns(item, edges){
  const len = item.str.length;
  if (len === 0) return [];
  const trimmed = item.str.trim();

  // If the entire text is a known mode keyword, assign it whole to its
  // starting column — never split it character-by-character.
  if (KNOWN_MODES.includes(trimmed)) {
    const col = colIndexForX(item.x + (item.width || trimmed.length * 5) / 2, edges);
    return [{ col, text: trimmed }];
  }

  const width = item.width || (len * 5); // fallback estimate if width missing
  const charW = width / len;
  const segments = [];
  let curCol = null, curText = '';
  for (let i = 0; i < len; i++) {
    const charCenterX = item.x + charW * (i + 0.5);
    const col = colIndexForX(charCenterX, edges);
    if (col !== curCol) {
      if (curText) segments.push({ col: curCol, text: curText });
      curCol = col;
      curText = item.str[i];
    } else {
      curText += item.str[i];
    }
  }
  if (curText) segments.push({ col: curCol, text: curText });
  return segments;
}
 
function grab(re, text){
  const m = text.match(re);
  return m ? m[1].trim() : '';
}
 
// Finds the y-position (in the given item flow) of the first item matching
// a predicate, to use as an upper clip boundary. Used to stop a table row
// from swallowing footer/disclaimer text that appears below it with no
// further row to bound it.
function findBoundaryY(allItems, predicate){
  const hit = allItems
    .filter(predicate)
    .sort((a,b) => a.page - b.page || a.y - b.y)[0];
  return hit ? hit.y : Infinity;
}
 
export function detectDocType(fullText){
  const upper = fullText.toUpperCase();
  if (upper.includes('BIDDER REGISTRATION NUMBER')) return 'winners';
  if (upper.includes("BUYER'S REF NO") || upper.includes('BUYER S REF NO') || upper.includes('SALE INTIMATION LETTER')) return 'gmail';
  return 'unknown';
}
 
export function parseMetaWinners(text){
  return {
    'Bidder Registration Number': grab(/Bidder Registration Number:\s*(\d+)/, text),
    'Name of Bidder': grab(/Name of the Bidder:\s*(.*?)Contact Person:/, text),
    'Contact Person': grab(/Contact Person:\s*(.*?)Address:/, text),
    'Address': grab(/Address:\s*(.*?)(PAN:)/, text),
    'PAN': grab(/PAN:\s*([A-Z0-9]+?)\s*GST:/, text) || grab(/PAN:\s*([A-Z0-9]+)/, text),
    // FIX: source PDFs say "GST:" not "CGST:" — the old regex never matched.
    'GST': grab(/\bGST:\s*([A-Z0-9]+)/, text),
    'Auction Number': grab(/Auction Number:\s*(\d+)/, text),
    'Date of Auction': grab(/(?:Date\s+of\s+Auction|Period\s+of\s+Auction|Auction\s*Period|Auction\s*Date):\s*([0-9A-Za-z, :-]+?)(?=\s*(?:Third\s+Party\s+Sampling|We\s+are\s+pleased|$))/i, text),
    'Third Party Sampling': grab(/Third Party Sampling:\s*(YES|NO)/, text)
  };
} 
 
export function parseMetaGmail(text){
  // Fields are rendered as "Label : : value" (two colon glyphs from the
  // original two-column form layout), so we allow one or two colons.
  const field = (label, nextLabel) => {
    const re = new RegExp(label + "\\s*:\\s*:?\\s*(.+?)\\s*" + nextLabel, 'i');
    return grab(re, text);
  };
  return {
    "Buyer's Ref No": field("Buyer's Ref No", "Company Name"),
    'Company Name': field("Company Name", "Contact Person"),
    'Contact Person': field("Contact Person", "Street"),
    'Street': field("Street", "City"),
    'City': field("City", "Country"),
    'Country': field("Country", "Pin"),
    'Pin': field("Pin", "PAN NO"),
    'PAN': grab(/PAN NO\s*:\s*:?\s*([A-Z0-9]+)/i, text),
    'Auction Period': grab(/(?:Period\s+of\s+Auction|Auction\s*Period|Auction\s*Date|Date\s+of\s+Auction)\s*:?\s*:?\s*([0-9]{2}[-/][0-9]{2}[-/][0-9]{4}(?:\s+[0-9:]+(?:::| to | - )[0-9]{2}[-/][0-9]{2}[-/][0-9]{4}\s+[0-9:]+)?|[-0-9:\s/A-Za-z.]+?)(?=\s*(?:We\s+are\s+pleased|Bidder\s+Details|Dear|Allocated\s+Information|$))/i, text)
  };
}
 
// Columns whose value can legitimately wrap to a second line within one
// row (long names, grade/size descriptions, colliery detail text). Every
// other column is a short numeric/code value that never wraps — if a
// second line of the SAME row leaves a stray token near that column's x
// position, it almost always belongs to a neighbouring wrapped column
// (e.g. "Feeding Colliery Details" bleeding into "Unique Bid Id"'s x-range
// on the row's continuation line), so we only take those columns from the
// row's first line.
const WRAPPABLE_WINNERS_COLS = new Set(['Source Name', 'Grade / Size', 'Remark', 'Feeding Colliery Details']);
 
export function parseTableWinners(allItems){
  const rowStarts = allItems
    .filter(it => isSubsidiaryCode(it.str) && it.x < 60)
    .sort((a,b) => a.page - b.page || a.y - b.y);
 
  if(rowStarts.length === 0) return [];
 
  // FIX: without this, the last row (which has no following row to bound
  // it) swallows the "(*) Exclusive of statutory charges..." footer text
  // below the table and corrupts its Seller Name / other columns.
  const footerY = findBoundaryY(allItems, it => /^\(\*\)$/.test(it.str.trim()));
 
  const rows = [];
  for(let i=0; i<rowStarts.length; i++){
    const start = rowStarts[i];
    const next = rowStarts[i+1];
 
    const rowItems = allItems.filter(it => {
      if(it.page !== start.page) return false;
      if(it.y < start.y - 0.5) return false;
      if(next && it.page === next.page && it.y >= next.y - 0.5) return false;
      if(!next && it.page === start.page && it.y >= footerY - 0.5) return false;
      return true;
    });
 
    const buckets = {};
    COLS.forEach(c => buckets[c.label] = []);
    rowItems
      .sort((a,b) => a.y - b.y || a.x - b.x)
      .forEach(it => {
        const col = nearestCol(it.x, COLS);
        // FIX: skip continuation-line stragglers for non-wrappable columns
        // (see WRAPPABLE_WINNERS_COLS note above).
        if (!WRAPPABLE_WINNERS_COLS.has(col) && it.y > start.y + 4) return;
        buckets[col].push(it.str);
      });
 
    const rowObj = {};
    COLS.forEach(c => {
      let val = buckets[c.label].join(' ').replace(/\s+/g,' ').trim();
      if (c.label === 'Seller Name' && isSubsidiaryCode(val)) {
        val = val.trim().split(/\s+/)[0];
      }
      rowObj[c.label] = val;
    });
    rows.push(rowObj);
  }
  return rows;
}
 
export function parseTableGmail(allItems){
  // Row starts: a "Seller" cell (column 1, x within its boundary range)
  // whose text begins with a known subsidiary code, appearing below the
  // table header block.
  const [col1Start, col1End] = [GMAIL_COL_EDGES[0], GMAIL_COL_EDGES[1]];
  const rowStarts = allItems
    .filter(it => it.x >= col1Start - 2 && it.x < col1End + 2 && isSubsidiaryCode(it.str))
    .sort((a,b) => a.page - b.page || a.y - b.y);
 
  if(rowStarts.length === 0) return [];
 
  // Stop each row (and the whole table) before footer disclaimer text or Gmail quote
  const endY = findBoundaryY(allItems, it => 
    it.str.includes('[Quoted') || 
    it.str.includes('*Final Bid') || 
    it.str.includes('Final Bid price is Exclusive') ||
    it.str.includes('Determination of coal') ||
    it.str.includes('PAYMENT TERMS')
  );
 
  const rows = [];
  for(let i=0; i<rowStarts.length; i++){
    const start = rowStarts[i];
    const next = rowStarts[i+1];
    const rowEndY = next ? next.y - 0.5 : endY - 0.5;
 
    const rowItems = allItems.filter(it =>
      it.page === start.page && it.y >= start.y - 0.5 && it.y < rowEndY
    );
 
    const buckets = new Array(GMAIL_COLS_LABELS.length).fill('').map(() => []);
    rowItems
      .sort((a,b) => a.y - b.y || a.x - b.x)
      .forEach(it => {
        splitItemAcrossColumns(it, GMAIL_COL_EDGES).forEach(seg => {
          if (seg.col != null) buckets[seg.col].push(seg.text);
        });
      });
 
    const rowObj = {};
    GMAIL_COLS_LABELS.forEach((label, idx) => {
      let val = buckets[idx].join('').replace(/\s+/g, ' ').trim();
      if (label === 'Seller' && isSubsidiaryCode(val)) val = val.trim().split(/\s+/)[0] || val;
      rowObj[label] = val;
    });

    // --- Post-processing: fix Mode / Grade / Size misalignment ---
    // Sometimes "Road" or "Rail" (or part of it) ends up in the Grade or Size
    // column instead of Mode, because the PDF text run straddled the column
    // boundary. Detect and relocate.
    const modeVal = (rowObj['Mode'] || '').trim();
    const gradeVal = (rowObj['Grade'] || '').trim();
    const sizeVal = (rowObj['Size'] || '').trim();

    // If Mode is empty but Grade starts with a mode keyword, split it out
    const modeRegex = /^(Road|Rail)\s*/i;
    if (!modeVal || modeVal === '—') {
      const gradeMatch = gradeVal.match(modeRegex);
      if (gradeMatch) {
        rowObj['Mode'] = gradeMatch[1];
        rowObj['Grade'] = gradeVal.slice(gradeMatch[0].length).trim() || '—';
      } else {
        // Check if mode keyword ended up in Size column
        const sizeMatch = sizeVal.match(modeRegex);
        if (sizeMatch) {
          rowObj['Mode'] = sizeMatch[1];
          rowObj['Size'] = sizeVal.slice(sizeMatch[0].length).trim() || '—';
        }
      }
    }

    // If Mode has extra text that belongs to Grade (e.g. "RoadG14")
    const modeClean = (rowObj['Mode'] || '').trim();
    const modeExtract = modeClean.match(/^(Road|Rail)(.+)$/i);
    if (modeExtract && modeExtract[2]) {
      rowObj['Mode'] = modeExtract[1];
      // Prepend overflow to Grade
      rowObj['Grade'] = (modeExtract[2] + ' ' + (rowObj['Grade'] || '')).trim();
    }

    // If Grade has text that belongs to Size (e.g. "G14Sized Rom")
    // Grade values are typically short codes like G1-G17, so if Grade
    // contains "Sized" or "ROM" or "mm", that part belongs to Size.
    const gradeFixed = (rowObj['Grade'] || '').trim();
    const sizeInGrade = gradeFixed.match(/^([A-Za-z0-9]+?)\s*(Sized.*|ROM.*|\(-?\d+.*mm.*)/i);
    if (sizeInGrade) {
      rowObj['Grade'] = sizeInGrade[1];
      rowObj['Size'] = ((sizeInGrade[2] || '') + ' ' + (rowObj['Size'] || '')).trim();
    }

    // Clean up Size: if it starts with "ad" or "oad" or "ail" (remnant of Road/Rail split)
    const sizeFixed = (rowObj['Size'] || '').trim();
    const remnantMatch = sizeFixed.match(/^(oad|ail|ad|il|d|l)\s+(.*)/i);
    if (remnantMatch) {
      rowObj['Size'] = remnantMatch[2].trim() || '—';
      // Try to reconstruct the mode if it was partially captured
      const partialMode = (rowObj['Mode'] || '').trim();
      if (partialMode && !partialMode.match(/^(Road|Rail)$/i)) {
        // Try combining
        const combined = partialMode + remnantMatch[1];
        if (combined.match(/^(Road|Rail)$/i)) {
          rowObj['Mode'] = combined;
        }
      }
    }

    // --- Post-processing: fix Bid ID & Source Name mixing ---
    // A Bid ID is strictly numeric or numeric followed by a letter (e.g. "99063M", "98408M").
    // If the Bid ID cell contains extra trailing letters (like "98408M K", "99063M A", "98409M P"),
    // that trailing letter actually belongs to the start of Source Name (e.g., "K" + "hairahBurhar" -> "KhairahBurhar").
    let bidIdVal = (rowObj['Unique Bid Id'] || '').trim();
    let sourceVal = (rowObj['Source Name'] || '').trim();

    const bidIdOverflow = bidIdVal.match(/^(\d+[A-Za-z]?)\s+([A-Za-z]+)$/);
    if (bidIdOverflow) {
      rowObj['Unique Bid Id'] = bidIdOverflow[1];
      const overflowLetter = bidIdOverflow[2];
      // Attach overflow letter to source if not already present
      if (!sourceVal.startsWith(overflowLetter)) {
        // If sourceVal starts with lowercase or continuation, attach directly or with space
        if (sourceVal && /^[a-z]/.test(sourceVal)) {
          rowObj['Source Name'] = overflowLetter + sourceVal;
        } else {
          rowObj['Source Name'] = (overflowLetter + ' ' + sourceVal).trim();
        }
      }
    } else {
      // If Bid ID ends with uppercase letters beyond normal pattern, e.g. "99063MAmera"
      const bidIdDirectJoin = bidIdVal.match(/^(\d{4,8}[A-Za-z])([A-Za-z].*)$/);
      if (bidIdDirectJoin) {
        rowObj['Unique Bid Id'] = bidIdDirectJoin[1];
        const overflowText = bidIdDirectJoin[2];
        if (!sourceVal.startsWith(overflowText)) {
          rowObj['Source Name'] = (overflowText + ' ' + sourceVal).trim();
        }
      }
    }

    rows.push(rowObj);
  }

  // Filter out any rows that don't look like actual table data rows
  return rows.filter(r => {
    const seller = (r['Seller'] || '').trim();
    if (!seller || !isSubsidiaryCode(seller)) return false;
    // Must have at least a mode or grade or bidPrice or source or offerQty
    const hasData = r['Source Name'] || r['Mode'] || r['Grade'] || r['Offer Quantity (MT)'] || r['Quantity Allotted (MT)'] || r['Bid Price (Rs/MT)'];
    // Filter out rows that captured footer formula text
    const textAll = Object.values(r).join(' ');
    if (textAll.includes('Final Bid price') || textAll.includes('Exclusive of') || textAll.includes('clause 5.2') || textAll.includes('Clause 5.2') || textAll.includes('PAYMENT TERMS')) {
      return false;
    }
    return Boolean(hasData);
  });
}
 
export async function extractSECLData(file) {
  const buf = await file.arrayBuffer();
  let pdf;
  try{
    pdf = await pdfjsLib.getDocument({data: buf}).promise;
  }catch(workerErr){
    console.warn('Worker load failed, retrying without worker:', workerErr);
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    pdf = await pdfjsLib.getDocument({data: buf, disableWorker: true}).promise;
  }
 
  let fullText = '';
  let allItems = [];
 
  for(let p=1; p<=pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({scale:1, rotation: page.rotate});
    // disableCombineTextItems keeps text runs closer to their original
    // per-cell granularity instead of pdf.js merging adjacent runs, which
    // matters for tightly-kerned table exports (e.g. the Gmail format).
    const content = await page.getTextContent({ disableCombineTextItems: true });
    content.items.forEach(it => {
      if(!it.str || !it.str.trim()) return;
      const [vx, vy] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
      allItems.push({
        str: it.str,
        x: vx,
        y: vy,
        width: it.width || 0,
        page: p
      });
    });
    fullText += content.items.map(it => it.str).join(' ') + '\n';
  }
 
  fullText = fullText.replace(/\s+/g,' ').trim();
 
  if (!fullText.toUpperCase().includes("INTIMATION") && !fullText.toUpperCase().includes("SOUTH EASTERN COALFIELDS")) {
    throw new Error("Invalid Format: Uploaded file is not a SECL Intimation PDF.");
  }
 
  const docType = detectDocType(fullText);
  let meta, items;
  if (docType === 'winners') {
    meta = parseMetaWinners(fullText);
    items = parseTableWinners(allItems);
  } else if (docType === 'gmail') {
    meta = parseMetaGmail(fullText);
    items = parseTableGmail(allItems);
  } else {
    throw new Error("Invalid Format: Uploaded file is not a recognized SECL/NCL Intimation PDF layout.");
  }
 
  if (items.length === 0) {
    throw new Error("Invalid Format: Uploaded file is not a valid SECL Intimation PDF (No table data found).");
  }
 
  return { meta, items, docType, columns: docType === 'winners' ? COLS : GMAIL_COLS, rawText: fullText };
}
 
export function toSECLCSV(cols, items) {
  const labels = cols.map(c => c.label);
  let csv = labels.map(c => `"${c}"`).join(',') + '\n';
  items.forEach(r => {
    csv += labels.map(c => `"${String(r[c] ?? '').replace(/"/g,'""')}"`).join(',') + '\n';
  });
  return csv;
}