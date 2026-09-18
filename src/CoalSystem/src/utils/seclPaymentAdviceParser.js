// src/utils/seclPaymentAdviceParser.js

import { extractRows } from "./pdfParser";

/* ─── Date Normalizer ──────────────────── */
export function normalizeDate(raw) {
  if (!raw || raw === 'Not Found') return raw || 'Not Found';
  let s = raw.trim();
  s = s.replace(/(\d)(st|nd|rd|th)\b/gi, '$1');
  s = s.replace(/\s+/g, ' ').trim();
  const months = { jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec' };
  
  function fixYear(y) {
    y = String(y);
    if (y.length === 2) return (parseInt(y, 10) < 70 ? '20' : '19') + y;
    return y;
  }
  
  let mIso = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (mIso) {
    let monIso = new Date(+mIso[1], +mIso[2] - 1, +mIso[3]).toLocaleString('en-US', { month: 'short' });
    return mIso[3].padStart(2, '0') + '-' + monIso + '-' + mIso[1];
  }
  
  let m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    let y1 = fixYear(m[3]);
    let mon = new Date(+y1, +m[2] - 1, +m[1]).toLocaleString('en-US', { month: 'short' });
    return m[1].padStart(2, '0') + '-' + mon + '-' + y1;
  }
  
  let m2 = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
  if (m2) {
    let mk = m2[2].toLowerCase().slice(0, 3);
    let mon2 = months[mk] || m2[2].slice(0, 3);
    let y2 = fixYear(m2[3]);
    return m2[1].padStart(2, '0') + '-' + mon2 + '-' + y2;
  }
  
  let m3 = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (m3) {
    let mk2 = m3[1].toLowerCase().slice(0, 3);
    let mon3 = months[mk2] || m3[1].slice(0, 3);
    let y3 = fixYear(m3[3]);
    return m3[2].padStart(2, '0') + '-' + mon3 + '-' + y3;
  }
  
  let m4 = s.match(/^(\d{1,2})[.\-\/]([A-Za-z]{3,})[.\-\/](\d{2,4})$/);
  if (m4) {
    let mk4 = m4[2].toLowerCase().slice(0, 3);
    let mon4 = months[mk4] || (m4[2].charAt(0).toUpperCase() + m4[2].slice(1, 3).toLowerCase());
    let y4 = fixYear(m4[3]);
    return m4[1].padStart(2, '0') + '-' + mon4 + '-' + y4;
  }
  
  let nd = new Date(s);
  if (!isNaN(nd.getTime()) && /\d{4}/.test(s)) {
    let dd = String(nd.getDate()).padStart(2, '0');
    let monN = nd.toLocaleString('en-US', { month: 'short' });
    return dd + '-' + monN + '-' + nd.getFullYear();
  }
  return s;
}

/* ─── Customer Name Normalizer ─────────── */
const ASAK_CANONICAL = 'ASAK COAL PRIVATE LIMITED';
const ASAK_VARIANTS = /^ASAK(\s*COAL)?(\s*MINE[S]?)?(\s*PRIVATE\s*LIMITED)?$/i;

export function normalizeCustomer(raw) {
  if (!raw) return raw;
  let s = raw.trim().toUpperCase().replace(/\s+/g, ' ');
  if (ASAK_VARIANTS.test(s)) return ASAK_CANONICAL;
  return s;
}

/* ─── TCS Calculation ──────────────────── */
export function calcTCS(rec) {
  let pdfTcs = (rec.pdfTcsTotal !== null && rec.pdfTcsTotal !== undefined && !isNaN(rec.pdfTcsTotal)) ? rec.pdfTcsTotal : 0;
  let isASAK = (rec.customerName === ASAK_CANONICAL);
  let tcsAmt = pdfTcs > 0 ? (isASAK ? Math.round(pdfTcs / 2 * 100) / 100 : Math.round(pdfTcs * 100) / 100) : 0;
  let amtAfterTcs = rec.requisitePayment !== null ? Math.round((rec.requisitePayment - tcsAmt) * 100) / 100 : null;
  return { tcsAmount: tcsAmt, amountAfterTcs: amtAfterTcs };
}

export function ensureTCS(rec) {
  if (rec.pdfTcsTotal === undefined) rec.pdfTcsTotal = 0;
  if (rec.tcsAmount === undefined || rec.tcsAmount === null) {
    if (rec.customerName === ASAK_CANONICAL && rec.requisitePayment && !rec.pdfTcsTotal) {
      rec.pdfTcsTotal = Math.round(rec.requisitePayment * 0.02 * 100) / 100;
    }
    let t = calcTCS(rec);
    rec.tcsAmount = t.tcsAmount;
    rec.amountAfterTcs = t.amountAfterTcs;
  }
  if (rec.inclTotal === undefined) {
    rec.inclTotal = (rec.incl50 !== null && rec.incl50 !== undefined && rec.quantity !== null && rec.quantity !== undefined) ? rec.incl50 * rec.quantity : null;
  }
  return rec;
}

/* ─── Main Extraction ──────────────────── */
export async function parseSECLPaymentAdvice(file) {
  // Leverage existing extractRows logic
  const allLines = await extractRows(file);
  
  function pn(s) {
    if (!s) return null;
    let v = parseFloat(s.replace(/,/g, '').trim());
    return isNaN(v) ? null : v;
  }
  
  function idx(pattern) {
    for (let i = 0; i < allLines.length; i++) {
      let m = (pattern instanceof RegExp) ? pattern.test(allLines[i]) : allLines[i].indexOf(pattern) >= 0;
      if (m) return i;
    }
    return -1;
  }
  
  function nthNum(si, filter, n, win) {
    n = n || 1;
    win = win || 30;
    let c = 0;
    for (let i = si + 1; i < Math.min(si + win, allLines.length); i++) {
      let v = pn(allLines[i]);
      if (v !== null && filter(v)) {
        c++;
        if (c === n) return v;
      }
    }
    return null;
  }

  let minesName = 'Not Found';
  const colLabels = [/Colliery\s*:/, /Name of Colliery\s*:/i, /Mine\s*Name\s*:/i, /Name of Mine\s*:/i, /Loading Point\s*:/i, /Area\/Mine\s*:/i, /Mine\/Area\s*:/i, /Source Mine\s*:/i];
  for (let cli = 0; cli < colLabels.length && minesName === 'Not Found'; cli++) {
    let ci = idx(colLabels[cli]);
    if (ci >= 0) {
      let cl = allLines[ci];
      let labelSrc = colLabels[cli].source.replace(/\\s\*/g, '\\s*');
      let cm = cl.match(new RegExp(labelSrc + '\\s*([A-Z0-9][A-Z0-9 &\\-().]+?)(?:\\s{3,}|\\s*$)', 'i'));
      if (cm && cm[1].trim()) minesName = cm[1].trim();
      else {
        let cm2 = cl.match(new RegExp(labelSrc + '\\s*(\\S.*)$', 'i'));
        if (cm2 && cm2[1].trim()) minesName = cm2[1].trim();
      }
    }
  }

  let customerName = 'Not Found';
  let cnIdx = idx(/Customer Name\s*:/i);
  if (cnIdx >= 0) {
    let cnl = allLines[cnIdx];
    let cnm = cnl.match(/Customer Name\s*:\s*([A-Z][A-Z0-9 &.,\-()/]+?)(?:\s{2,}|Customer Name|GSTIN|$)/i);
    if (cnm && cnm[1].trim()) customerName = cnm[1].trim();
  }

  let quantity = null;
  let matIdx = idx('NON-COKING COAL');
  if (matIdx >= 0) {
    let im = allLines[matIdx].match(/NON-COKING COAL\s+([\d,]+)/);
    if (im) {
      let v = pn(im[1]);
      if (v && v > 100) quantity = v;
    }
    if (!quantity) {
      for (let i = matIdx + 1; i < Math.min(matIdx + 8, allLines.length); i++) {
        if (allLines[i].indexOf('27011200') >= 0) break;
        let v = pn(allLines[i]);
        if (v !== null && v > 100) {
          quantity = v;
          break;
        }
      }
    }
  }

  let dueDate = 'Not Found';
  let ddIdx = idx(/Payment due Date/i);
  if (ddIdx >= 0) {
    let ddl = allLines[ddIdx];
    let ddm = ddl.match(/Payment due Date[:\s]+([A-Za-z]{3}[a-z]*\s+\d{1,2},?\s+\d{4}|\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/i);
    if (ddm) dueDate = ddm[1].trim();
    else {
      let ddf = ddl.match(/Payment due Date[:\s]+(\S[^G][^\s]{3,})/i);
      if (ddf) dueDate = ddf[1].trim();
    }
  }

  let bidPrice = null;
  let bpIdx = idx('Basic Price');
  if (bpIdx >= 0) {
    let ib = allLines[bpIdx].match(/Basic Price\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/);
    if (ib) {
      let v = pn(ib[1]);
      if (v && v < 100000) bidPrice = v;
    }
    if (bidPrice === null) bidPrice = nthNum(bpIdx, function(v) { return v >= 500 && v <= 9999; }, 1, 20);
  }

  let cgstTotal = null;
  let cgstIdx = idx(/CGST\(\s*9%\s*\)/i);
  if (cgstIdx >= 0) {
    let ic = allLines[cgstIdx].match(/CGST\([^)]+\)\s+([\d,.]+)\s+([\d,.]+)/i);
    if (ic) cgstTotal = pn(ic[2]);
    else cgstTotal = nthNum(cgstIdx, function(v) { return v > 1000000; }, 1, 30);
  }

  let sgstTotal = null;
  let sgstIdx = idx(/SGST\(\s*9%\s*\)/i);
  if (sgstIdx >= 0) {
    let is2 = allLines[sgstIdx].match(/SGST\([^)]+\)\s+([\d,.]+)\s+([\d,.]+)/i);
    if (is2) sgstTotal = pn(is2[2]);
    else sgstTotal = nthNum(sgstIdx, function(v) { return v > 1000000; }, 1, 30);
  }

  let igstTotal = 0;
  let igstIdx = idx(/IGST\s*\(/i);
  if (igstIdx >= 0) {
    let ii = allLines[igstIdx].match(/IGST\([^)]+\)\s+([\d,.]+)\s+([\d,.]+)/i);
    if (ii) igstTotal = pn(ii[2]) || 0;
    else igstTotal = nthNum(igstIdx, function(v) { return v > 0; }, 1, 10) || 0;
  }

  let grandTotal = null;
  let gtIdx = idx(/Grand Total including EMD/i);
  if (gtIdx >= 0) {
    let ig = allLines[gtIdx].match(/Grand Total including EMD\s+([\d,.]+)\s+([\d,.]+)/i);
    if (ig) grandTotal = pn(ig[2]);
    else grandTotal = nthNum(gtIdx, function(v) { return v > 1000000; }, 1, 8);
  }

  let requisitePayment = null;
  let rpIdx = idx(/Requisite Payment/i);
  if (rpIdx >= 0) {
    let ir = allLines[rpIdx].match(/Requisite Payment\s+([\d,.]+)\s+([\d,.]+)/i);
    if (ir) requisitePayment = pn(ir[2]);
    else {
      let bn = [];
      for (let i = rpIdx + 1; i < Math.min(rpIdx + 12, allLines.length); i++) {
        let v = pn(allLines[i]);
        if (v !== null && v > 1000000) bn.push(v);
      }
      if (bn.length >= 2) requisitePayment = Math.max.apply(null, bn);
      else if (bn.length === 1) requisitePayment = bn[0];
    }
  }

  /* ── Auction Date extraction ────────── */
  let auctionDate = 'Not Found';
  for (let i = 0; i < allLines.length; i++) {
    let al = allLines[i];
    if (/Auction\s*Date/i.test(al)) {
      let adm = al.match(/Auction\s*Date[^:]*:\s*([0-9]{1,2}[.\-\/]?[A-Za-z]{3}[.\-\/]?[0-9]{4})/i);
      if (adm) {
        auctionDate = adm[1].toUpperCase().replace(/[.\-\/]/g, '.').replace(/(\d{1,2})\.([A-Z]{3})\.(\d{4})/, function(_, d, m, y) { return d.padStart(2, '0') + '.' + m + '.' + y; });
        break;
      }
      let adm2 = al.match(/Auction\s*Date[^:]*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);
      if (adm2) {
        auctionDate = adm2[1];
        break;
      }
      if (i + 1 < allLines.length) {
        let nl = allLines[i + 1];
        let adm3 = nl.match(/^([0-9]{1,2}[.\-\/]?[A-Za-z]{3}[.\-\/]?[0-9]{4})$/i);
        if (adm3) {
          auctionDate = adm3[1].toUpperCase().replace(/[.\-\/]/g, '.').replace(/(\d{1,2})\.([A-Z]{3})\.(\d{4})/, function(_, d, m, y) { return d.padStart(2, '0') + '.' + m + '.' + y; });
          break;
        }
      }
      break;
    }
  }

  /* ── TCS extraction ── */
  let pdfTcsTotal = 0;
  for (let i = 0; i < allLines.length; i++) {
    if (/TCS\s*\(/i.test(allLines[i])) {
      let tl = allLines[i];
      let tm = tl.match(/TCS[^)]*\)\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
      if (tm) {
        let v1 = pn(tm[1]), v2 = pn(tm[2]);
        pdfTcsTotal = (v2 !== null && v2 > v1) ? v2 : (v1 || 0);
        break;
      }
      let found = false;
      for (let j = i; j <= Math.min(i + 4, allLines.length - 1); j++) {
        let am = allLines[j].match(/Amount\s*[:\-]\s*([\d,]+\.?\d*)/i);
        if (am) {
          pdfTcsTotal = pn(am[1]) || 0;
          found = true;
          break;
        }
      }
      if (found) break;
      let best = 0;
      for (let j = i; j <= Math.min(i + 5, allLines.length - 1); j++) {
        let nums = allLines[j].match(/([\d,]+\.\d{2})/g);
        if (nums) {
          nums.forEach(function(ns) {
            let nv = pn(ns);
            if (nv && nv > best && nv < 10000000) best = nv;
          });
        }
      }
      if (best > 0) { pdfTcsTotal = best; }
      break;
    }
  }

  let qty = quantity || 1;
  let grandPMT = grandTotal !== null ? grandTotal / qty : null;
  let cgstPMT = cgstTotal !== null ? cgstTotal / qty : null;
  let sgstPMT = sgstTotal !== null ? sgstTotal / qty : null;
  let igstPMT = igstTotal / qty;
  let incl50 = null;
  if (grandPMT !== null) incl50 = grandPMT - ((cgstPMT || 0) + (sgstPMT || 0) + igstPMT) + 50;
  let inclTotal = (incl50 !== null && quantity !== null && quantity !== undefined) ? incl50 * quantity : null;

  customerName = normalizeCustomer(customerName);
  auctionDate = normalizeDate(auctionDate);
  dueDate = normalizeDate(dueDate);
  
  let rec = {
    isManual: false,
    minesName, customerName, quantity, requisitePayment, grandTotal,
    auctionDate, dueDate, bidPrice, pdfTcsTotal, cgstTotal, sgstTotal, igstTotal,
    grandPMT, cgstPMT, sgstPMT, igstPMT, incl50, inclTotal
  };
  
  return ensureTCS(rec);
}
