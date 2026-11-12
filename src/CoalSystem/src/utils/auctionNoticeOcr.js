// AI reader for SECL / CIL e-auction notice PDFs (scanned or digital). AuctionPage uses it to pre-fill its form.
//
//   PDF -> every page rendered to an image -> OpenAI vision model returns the notice + cluster tables as JSON
//   (strict schema) -> values are cleaned in code and the figures are cross-checked (cluster totals, grand total,
//   lots). If the figures do not add up, a second pass re-reads the pages with those mismatches as hints.
//
// The key/model come from the same env vars the other CoalSystem OCR helper (openaiOcr.js) uses.

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_PAGES = 8;
const MAX_SIDE = 2600; // longest side in px of a rendered page: sharp enough for small table digits
const TIMEOUT_MS = 4 * 60 * 1000;

const envValue = (read) => {
  try { return String(read() || '').trim(); } catch { return ''; }
};
const defaultApiKey = () => envValue(() => import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY);
const defaultModel = () => envValue(() => import.meta.env.VITE_OCR_MODEL || import.meta.env.OCR_MODEL) || 'gpt-5.6-sol';
const defaultVerifyModel = () => envValue(() => import.meta.env.VITE_OCR_VERIFY_MODEL || import.meta.env.OCR_VERIFY_MODEL) || defaultModel();

/* ───────────── PDF -> page images (browser only) ───────────── */

export async function renderPdfPages(file, { maxPages = MAX_PAGES } = {}) {
  const pdfjsLib = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const count = Math.min(doc.numPages, maxPages);
  const images = [];
  for (let n = 1; n <= count; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, MAX_SIDE / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.92));
  }
  return { images, truncated: doc.numPages > maxPages, totalPages: doc.numPages };
}

/* ───────────── schema + prompts ───────────── */

const str = { type: 'string' };
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const arr = (items) => ({ type: 'array', items });

const NOTICE_KEYS = [
  'notice_ref_no', 'notification_date', 'coal_company', 'department', 'registered_office', 'scheme_name', 'coal_type',
  'total_offered_tonnes', 'auction_month_year', 'bid_date', 'service_provider', 'service_provider_hindi', 'remarks_annexure',
  'rail_deposit_clause', 'road_deposit_clause', 'payment_timeline_clause',
];

const SCHEMA = obj({
  notice: obj(Object.fromEntries(NOTICE_KEYS.map((k) => [k, str]))),
  clusters: arr(obj({
    cluster_name: str, total_offer: str, representative_grade: str, representative_size: str, modulated_price: str, floor_price: str,
    lines: arr(obj({
      source: str, mode: str,
      feeding_collieries: arr(obj({ name: str, grade: str, modulated_price: str, supply_pattern: str })),
      grade: str, size: str, quantity: str, modulated_price: str, modulated_price_rep_grade: str, supply_pattern: str, no_of_lots: str,
    })),
  })),
  total_lots: str,
  total_offered_qty: str,
  uncertain_fields: arr(str),
});

const VERIFY_SCHEMA = obj({
  data: SCHEMA,
  corrections: arr(obj({ field: str, from: str, to: str, reason: str })),
});

const SYSTEM = `You read scanned SECL / Coal India e-auction notice PDFs (Hindi + English, often skewed, faint or photocopied) and return their data as JSON.
Rules:
- Copy values exactly as printed. Never calculate, estimate or "fix" numbers. Copy names letter by letter and keep the original spelling.
- If a cell is blank, illegible or you are not sure, return "" for it. Do not guess digits.
- Numeric cells contain ONLY digits and one optional decimal point: remove commas (also Indian grouping such as 11,22,000), units and currency symbols. Percentage / range cells (supply pattern, e.g. "0%-20%") are copied as printed.
- Dates are copied as printed (e.g. 22/06/26). Clauses are copied as the full English sentence, exactly as printed.
- Keep the original row order of every table. One printed row is one entry: never merge or split rows.`;

const GUIDE = `The pages are a notice letter (page with "सूचना/NOTICE"), an annexure with "<Name> Cluster Offer" tables, and a page of notes; they may come in any order.

"notice" (from the letter and the notes page):
- notice_ref_no: the reference number after "सन्दर्भ क्र", written in English letters (transliterate एसईसीएल/बीएसपी as SECL/BSP), e.g. SECL/BSP/H-360. The last number can be handwritten: list it in uncertain_fields if it is not perfectly clear.
- notification_date: the date at the top right of the letter ("दिनांक").
- coal_company: the issuing company's short name as used in the English paragraph (e.g. SECL).
- department: the department line under the company name (e.g. Marketing & Sales Department).
- registered_office: the registered office address line in English.
- scheme_name: the e-auction scheme / policy name in the English paragraph (e.g. CIL E-Auction Scheme 2022 under Single Window Mode agnostic E auction Policy).
- coal_type: the type of coal being sold (e.g. Non Coking coal).
- total_offered_tonnes: the total quantity offered in the first paragraph (digits only, in tonnes).
- auction_month_year: the month and year of the sale (e.g. June 2026).
- bid_date: the e-Auction date in the "Date | Service Provider | Remarks" table.
- service_provider: the English service provider name in that table; service_provider_hindi: the Hindi name in the same cell.
- remarks_annexure: the English remark in that table's Remarks column.
- rail_deposit_clause: the full English sentence about rail mode customers depositing coal value for rake booking.
- road_deposit_clause: the full English sentence about road mode customers depositing coal value through the bank interface (letter page).
- payment_timeline_clause: the full text of Note 1 on the notes page (road mode customers, payment timeline, clause 5.3).

"clusters": every "<Name> Cluster Offer" block of the annexure is one cluster.
- cluster_name, total_offer, representative_grade, representative_size, modulated_price (cluster level "Modulated price") and floor_price come from the first (summary) table of the block.
- lines = the rows of that block's second table ("Cluster Description" / "Offer Description"):
  source = "Source" or "Loading Points" cell; mode = Road or Rail; grade; size; quantity = "Qty" / "Evacuation capacity under offer" / "Evacuation Quantity (Tonnes)"; modulated_price = the line's own "Modulated price"; modulated_price_rep_grade = "Modulated Price of Representative Grade" (only when that column exists); supply_pattern; no_of_lots.
  feeding_collieries = the names under "Feeding Collieries" for that line. When one source cell spans several sub-rows (e.g. a siding fed by several collieries), it is ONE line and each sub-row is one feeding_collieries entry with its own grade, modulated price and supply pattern; leave the line's own modulated_price / supply_pattern "" when they are only printed per sub-row.
- total_lots = the number next to "Total Lots"; total_offered_qty = the number next to "Total Offered Qty".
- uncertain_fields: names of fields (e.g. "notice.notice_ref_no", "clusters[2].lines[0].quantity") that you read from handwriting, a stamp, or a hard-to-read spot.`;

/* ───────────── OpenAI call ───────────── */

async function callModel({ apiKey, model, schemaName, schema, system, text, images }) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not defined in the .env file. Please check the .env configuration.');
  const content = [{ type: 'text', text }];
  images.forEach((url, i) => {
    content.push({ type: 'text', text: `Page ${i + 1}:` });
    content.push({ type: 'image_url', image_url: { url, detail: 'high' } });
  });
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
      response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI API failed with status ${res.status}`);
  const msg = json.choices?.[0]?.message;
  if (msg?.refusal) throw new Error(`The AI refused to read this document: ${msg.refusal}`);
  return JSON.parse(msg?.content || '{}');
}

/* ───────────── cleaning ───────────── */

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const toNumber = (v) => {
  const m = String(v ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? m[0] : '';
};
const numOf = (v) => {
  const n = parseFloat(toNumber(v));
  return Number.isFinite(n) ? n : null;
};

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
const fullYear = (y) => (String(y).length === 2 ? `20${y}` : String(y));

// -> YYYY-MM-DD for <input type="date">, or "" when the value is not a date
export function toIsoDate(v) {
  const s = clean(v);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/(\d{1,2})(?:st|nd|rd|th)?[.\-/ ]+([A-Za-z]{3,9})[.\-/ ,]+(\d{2,4})/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return `${fullYear(m[3])}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(m[1])}`;
  m = s.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
  if (m) return `${fullYear(m[3])}-${pad(m[2])}-${pad(m[1])}`;
  return '';
}

const toMode = (v) => (/rail/i.test(String(v)) ? 'Rail' : 'Road');

const formatFeeding = (list) =>
  (list || [])
    .filter((f) => clean(f.name))
    .map((f) => {
      const details = [clean(f.grade), toNumber(f.modulated_price), clean(f.supply_pattern)].filter(Boolean);
      return details.length ? `${clean(f.name)} (${details.join(', ')})` : clean(f.name);
    })
    .join('; ');

// Same keys as AuctionPage's defaultNewItem() (minus id): one printed table-2 row = one item, cluster header repeated
function toItems(raw) {
  const items = [];
  (raw.clusters || []).forEach((c) => {
    (c.lines || []).forEach((l) => {
      const source = clean(l.source);
      const floor = toNumber(c.floor_price);
      items.push({
        cluster_name: clean(c.cluster_name),
        total_offer: toNumber(c.total_offer),
        representative_grade: clean(c.representative_grade),
        representative_size: clean(c.representative_size),
        cluster_modulated_price: toNumber(c.modulated_price),
        floor_price: floor,
        source,
        loading_point: source,
        mode: toMode(l.mode),
        feeding_collieries: formatFeeding(l.feeding_collieries),
        mine: source,
        coal_grade: clean(l.grade),
        size: clean(l.size),
        quantity_offered: toNumber(l.quantity),
        base_price: floor,
        modulated_price: toNumber(l.modulated_price),
        modulated_price_rep_grade: toNumber(l.modulated_price_rep_grade),
        supply_pattern: clean(l.supply_pattern),
        no_of_lots: toNumber(l.no_of_lots),
      });
    });
  });
  return items;
}

function toForm(notice = {}) {
  const form = {};
  NOTICE_KEYS.forEach((k) => { form[k] = clean(notice[k]); });
  form.notification_date = toIsoDate(notice.notification_date);
  form.bid_date = toIsoDate(notice.bid_date);
  form.total_offered_tonnes = toNumber(notice.total_offered_tonnes);
  return form;
}

/* ───────────── arithmetic checks (done in code, not by the model) ───────────── */

const sameNumber = (a, b) => Math.abs(a - b) < 0.5;

// Figures that must add up on a correct read. A hit means "look at this", never "wrong".
export function crossChecks(raw) {
  const warnings = [];
  const clusters = raw.clusters || [];
  if (clusters.length === 0) return ['No cluster offer tables were found in the PDF.'];

  let grandQty = 0;
  let grandLots = 0;
  let anyLots = false;
  clusters.forEach((c, ci) => {
    const name = clean(c.cluster_name) || `Cluster ${ci + 1}`;
    const lines = c.lines || [];
    if (lines.length === 0) warnings.push(`${name}: no description lines were read.`);
    const qty = lines.reduce((t, l) => t + (numOf(l.quantity) || 0), 0);
    grandQty += qty;
    const total = numOf(c.total_offer);
    if (total !== null && lines.length && !sameNumber(qty, total)) {
      warnings.push(`${name}: line quantities add up to ${qty.toLocaleString('en-IN')} but Total Offer is ${total.toLocaleString('en-IN')}.`);
    }
    lines.forEach((l, li) => {
      if (!clean(l.source)) warnings.push(`${name}: line ${li + 1} has no source / loading point.`);
      if (numOf(l.quantity) === null) warnings.push(`${name}: line ${li + 1} has no quantity.`);
      const lots = numOf(l.no_of_lots);
      if (lots !== null) { grandLots += lots; anyLots = true; }
    });
  });

  const printedQty = numOf(raw.total_offered_qty);
  if (printedQty !== null && !sameNumber(grandQty, printedQty)) {
    warnings.push(`All lines add up to ${grandQty.toLocaleString('en-IN')} but "Total Offered Qty" is ${printedQty.toLocaleString('en-IN')}.`);
  }
  const letterQty = numOf(raw.notice?.total_offered_tonnes);
  if (letterQty !== null && printedQty !== null && !sameNumber(letterQty, printedQty)) {
    warnings.push(`The letter says ${letterQty.toLocaleString('en-IN')} tonnes but the annexure total is ${printedQty.toLocaleString('en-IN')}.`);
  }
  const printedLots = numOf(raw.total_lots);
  if (printedLots !== null && anyLots && !sameNumber(grandLots, printedLots)) {
    warnings.push(`Lines add up to ${grandLots} lots but "Total Lots" is ${printedLots}.`);
  }
  return warnings;
}

/* ───────────── main entry points ───────────── */

/**
 * @param {string[]} images  data:image/... URLs, one per page
 * @returns {Promise<{ form: object, items: object[], warnings: string[], corrections: object[] }>}
 */
export async function extractAuctionNotice(images, { onStage = () => {}, apiKey = defaultApiKey(), model = defaultModel(), verifyModel = defaultVerifyModel(), truncatedPages = 0 } = {}) {
  onStage('Reading the notice with AI… this can take up to a minute');
  let raw = await callModel({
    apiKey, model, schemaName: 'auction_notice', schema: SCHEMA, system: SYSTEM,
    text: `Read this auction notice (${images.length} page${images.length === 1 ? '' : 's'}) into the JSON shape.\n\n${GUIDE}`,
    images,
  });

  let checks = crossChecks(raw);
  let corrections = [];
  if (checks.length) {
    // The figures do not add up: a second pass re-reads those spots, and is only kept if it improves the result
    onStage('Some figures do not add up, checking them again…');
    try {
      const second = await callModel({
        apiKey, model: verifyModel, schemaName: 'auction_notice_verify', schema: VERIFY_SCHEMA,
        system: `${SYSTEM}\nYou are now a careful checker: compare every value of the extracted data with the pages, digit by digit. Change a value ONLY when you are certain the page shows something different (wrong digit, wrong column, missed or extra row). Return the full data in "data" and one "corrections" entry per value you changed.`,
        text: `${GUIDE}\n\nExtracted data to check:\n${JSON.stringify(raw)}\n\nThese figures did not add up, look at them first:\n- ${checks.join('\n- ')}`,
        images,
      });
      const secondChecks = crossChecks(second.data);
      if (secondChecks.length < checks.length) {
        raw = second.data;
        checks = secondChecks;
        corrections = second.corrections || [];
      }
    } catch (e) {
      console.warn('Auction notice second pass failed:', e);
    }
  }

  const warnings = [...checks];
  const uncertain = (raw.uncertain_fields || []).map(clean).filter(Boolean);
  if (uncertain.length) warnings.push(`Please verify (hard to read or handwritten): ${uncertain.join(', ')}.`);
  if (truncatedPages > 0) warnings.push(`Only the first ${MAX_PAGES} pages were read; ${truncatedPages} more page(s) were skipped.`);

  return { form: toForm(raw.notice), items: toItems(raw), warnings, corrections };
}

export async function extractAuctionNoticeFromPdf(file, onStage = () => {}) {
  onStage('Preparing the PDF pages…');
  const { images, truncated, totalPages } = await renderPdfPages(file);
  return extractAuctionNotice(images, { onStage, truncatedPages: truncated ? totalPages - images.length : 0 });
}

export async function extractAuctionNoticeFromImage(file, onStage = () => {}) {
  onStage('Reading image file…');
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return extractAuctionNotice([base64], { onStage, truncatedPages: 0 });
}
