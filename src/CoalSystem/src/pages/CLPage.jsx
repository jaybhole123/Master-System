import React, { useState, useRef, useEffect } from 'react';
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import EditModal from "../components/EditModal";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

// Point pdf.js at the correct worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function CLPage() {
  const fileInputRef = useRef(null);
  
  const [docs, setDocs] = useState([]);
  const [view, setView] = useState("drop");
  const [loading, setLoading] = useState(false);
  const [loadingName, setLoadingName] = useState("");
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tesseractLoaded, setTesseractLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    // Load Tesseract script if not present
    const loadScript = (id, src) => {
      return new Promise((resolve) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    const initScripts = async () => {
      await loadScript('tesseract-js-script', 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js');
      setTesseractLoaded(true);
    };

    initScripts();
  }, []);

  const NUM = s => { if (s === null || s === undefined) return null; const n = parseFloat(String(s).replace(/,/g, '')); return isNaN(n) ? null : n; };
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const parseDMY = s => { const m = String(s || '').match(/(\d{1,2})-(\w{3})-(\d{4})/); return m && MON[m[2].toLowerCase()] !== undefined ? new Date(+m[3], MON[m[2].toLowerCase()], +m[1]) : null; };

  function parseLetter(txt) {
    const R = { info: {}, rows: [], notes: [], terms: [], warns: [] };
    const first = (re, i = 1) => { const m = txt.match(re); return m ? m[i].trim() : ''; };
    const I = R.info;
    I['Auction ID'] = first(/Auction ID\s+([A-Z0-9_]{6,})/);
    I['Source Name'] = first(/Source Name\s+(.+?)\s+in the/i);
    I['Auction Ref No'] = first(/^Auction Ref\.?\s*No\.?\s+(.+)$/im);
    const pm = txt.match(/(\d{1,2}-\w{3}-\d{4}\s+\d{1,2}:\d{2}\s*[AP]M)\s*::\s*(\d{1,2}-\w{3}-\d{4}\s+\d{1,2}:\d{2})(?:\s*(?:Date\s+)?([AP]M))?/i);
    if (pm) { I['Auction Start'] = pm[1].replace(/\s+/g, ' '); I['Auction End'] = (pm[2] + ' ' + (pm[3] || '')).replace(/\s+/g, ' ').trim(); }
    I['Letter Date'] = first(/Date:\s*(\d{1,2}-\w{3}-\d{4})/);
    I['Mail Date'] = first(/((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \w{3} \d{1,2}, \d{4} at [\d:]+\s*[AP]M?)/);
    I["Buyer Ref No"] = first(/Buyer\s*Ref[.,]?\s*No[.,]?\s*(\S+)/i);
    const cl = txt.split('\n').find(l => /Buyer\s*Ref/i.test(l)) || '';
    I['Company'] = cl.replace(/^.*Buyer\s*Ref[.,]?\s*No[.,]?\s*\S+\s*/i, '').replace(/^\S*ompany(\s+Name)?\s*/i, '').trim();
    if (!I['Company']) I['Company'] = first(/^Company(?:\s*Name)?\s+(.+)$/im);
    I['Contact Person'] = first(/^Contact Person\s+(.+)$/im);
    I['UBID No'] = first(/UBID\s*No[.,]?\s*([A-Z0-9]+)/i);
    I['City'] = first(/^City\s+(\S+)/im);
    I['District'] = first(/^(?:.*\s)?District\s+(\S+)/im);
    I['State'] = first(/^State\s+([A-Za-z ]+)$/im);
    I['Pin Code'] = first(/Pin\s*Code\s+(\d{6})/i);
    I['Country'] = first(/^Country\s+(\S+)/im);

    const end = txt.search(/^\s*\W?\s*Note\s*:/im);
    const ids = [...txt.matchAll(/\b(\d{10,})\b/g)].filter(m => end < 0 || m.index < end);
    ids.forEach((m, k) => {
      const stop = k + 1 < ids.length ? ids[k + 1].index : (end > 0 ? end : txt.length);
      const seg = txt.slice(m.index + m[1].length, stop);
      const pre = txt.slice(Math.max(0, m.index - 60), m.index);
      const ctx = txt.slice(Math.max(0, m.index - 300), stop);
      const row = { bidId: m[1] };
      const sm = pre.match(/\b(SECL|NCL|MCL|WCL|CCL|BCCL|ECL|NEC)\b/); row.subsidiary = sm ? sm[1] : '';
      const mo = seg.match(/\b(Road cum Rail|Road|Rail|RCR)\b/i); row.mode = mo ? mo[1] : '';
      const gm = seg.match(/G-?\s?\d+/); row.repGrade = gm ? gm[0].replace(/\s/g, '') : '';
      const pr = seg.match(/(\d[\d,]*\.\d{2})\s*\|?\s*(\d[\d,]*\.\d{2})/);
      if (!pr) { R.warns.push(`Bid ID ${m[1]} ki row poori samajh nahi aayi (offer qty / price nahi mile).`); R.rows.push(row); return; }
      row.offerQty = NUM(pr[1]); row.repNotifiedPrice = NUM(pr[2]);
      const rest = seg.slice(seg.indexOf(pr[0]) + pr[0].length);
      const cm2 = rest.match(/^\s*\|?\s*(.+?)\s*\|?\s*(G-?\s?\d+)/);
      row.colliery = cm2 ? cm2[1].replace(/[|]/g, '').trim() : ''; row.collieryGrade = cm2 ? cm2[2].replace(/\s/g, '') : '';
      const tm = rest.match(/(\d[\d,]*\.\d{2})\s+(\d+(?:\.\d+)?)\s+(\d[\d,]*\.\d{2})\s*\|?\s*(\d+(?:\.\d+)?)\s+(?:(\S{1,8})\s+)?(\d+\.\d{1,2})\s+(\d+)\s+(Yes|No)\b/i);
      if (tm) {
        row.allocatedQty = NUM(tm[1]); row.bidPrice = NUM(tm[2]); row.collieryNotified = NUM(tm[3]); row.finalBid = NUM(tm[4]);
        row.supplyRange = tm[5] || '-'; row.premium = NUM(tm[6]); row.seniority = tm[7]; row.thirdParty = tm[8];
      } else R.warns.push(`Bid ID ${m[1]}: allocated qty / bid price wali row ka format samajh nahi aaya. Raw text dekh kar check karein.`);
      const mm = seg.match(/(\d{2,3})\s*MM\b/i) || seg.match(/\(-\)\s*(\d+)/);
      row.size = (/SIZED/i.test(ctx) ? 'Sized ROM ' : '') + (mm ? `(-) ${mm[1]} mm` : '');
      row.source = (I['Source Name'] || '').replace(/\s*\(.*\)\s*$/, '');
      if (row.bidPrice && row.repNotifiedPrice && row.premium !== null && row.premium !== undefined) {
        const p = (row.bidPrice - row.repNotifiedPrice) / row.repNotifiedPrice * 100;
        if (Math.abs(p - row.premium) > 0.05) R.warns.push(`Bid ID ${m[1]}: premium ${row.premium}% likha hai, par (Bid − Notified)/Notified = ${p.toFixed(2)}% aata hai. Koi number galat padha gaya ho sakta hai.`);
      }
      R.rows.push(row);
    });

    const ni = txt.search(/^\s*\W?\s*Note\s*:/im);
    const tail = ni >= 0 ? txt.slice(ni) : '';
    tail.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => R.terms.push(l));
    return R;
  }

  function addWorkingDays(d, n) {
    const x = new Date(d.getTime());
    while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) n--; }
    return x;
  }
  
  const dmy = d => String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();

  function derive(d) {
    d.rows.forEach(r => { r.value = (r.allocatedQty || 0) * (r.bidPrice || 0); });
    d.totals = { qty: d.rows.reduce((t, r) => t + (r.allocatedQty || 0), 0), value: d.rows.reduce((t, r) => t + r.value, 0) };
    d.totals.avg = d.totals.qty ? d.totals.value / d.totals.qty : 0;
    const ed = parseDMY(d.info['Auction End'] || d.info['Letter Date']);
    d.payBy = ed ? dmy(addWorkingDays(ed, 10)) : '';
  }

  function itemsToText(items) {
    const s = items.filter(i => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x), lines = [];
    s.forEach(it => { const L = lines.find(l => Math.abs(l.y - it.y) <= 2.5); if (L) L.items.push(it); else lines.push({ y: it.y, items: [it] }); });
    return lines.map(l => l.items.sort((a, b) => a.x - b.x).map(i => i.str.trim()).join(' ')).join('\n');
  }

  async function llmTranscribe(dataUrl) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: dataUrl.split(',')[1] } },
          { type: 'text', text: 'Transcribe the text of this document page exactly as plain text, in reading order. Skip the Gmail header/footer lines. Keep every table row on ONE single line with cells separated by single spaces, and keep all numbers exactly. Key-value blocks: one "Label value" pair per line. Output only the text, nothing else.' }
        ] }]
      })
    });
    const d = await r.json();
    if (!d.content) throw new Error((d.error && d.error.message) || 'API response nahi mila');
    return d.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
  }

  const handleFiles = async (files) => {
    if (files.length === 0) {
      setError("Please upload only PDF files.");
      return;
    }

    if (!tesseractLoaded) {
      setError("Please wait for scripts to load.");
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingName(files.length > 1 ? `${files.length} files` : files[0].name);
    setStatusMsg("");

    const newDocs = [];
    for (const file of files) {
      try {
        setStatusMsg(`PDF khol rahe hain... (${file.name})`);
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const texts = [], imgs = [], canv = [];
        let needOcr = false;
        
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const tc = await page.getTextContent();
          const t = itemsToText(tc.items.map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5] })));
          
          const vp = page.getViewport({ scale: 3 });
          const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          
          imgs.push(c.toDataURL('image/jpeg', 0.6)); canv.push(c);
          texts.push(t); 
          if (t.replace(/\s/g, '').length < 80) needOcr = true;
        }

        if (needOcr && window.Tesseract) {
          let cur = 1;
          try {
            setStatusMsg(`OCR engine load ho raha hai (pehli baar thoda time lagta hai)...`);
            const worker = await window.Tesseract.createWorker('eng', 1, { 
              logger: m => { 
                if (m.status === 'recognizing text') {
                  setStatusMsg(`OCR chal raha hai... ${Math.round(m.progress * 100)}% (page ${cur})`); 
                }
              } 
            });
            await worker.setParameters({ tessedit_pageseg_mode: '4' });
            for (let i = 0; i < canv.length; i++) { 
              cur = i + 1; 
              texts[i] = (await worker.recognize(canv[i])).data.text; 
            }
            await worker.terminate();
          } catch (e1) {
            try {
              for (let i = 0; i < imgs.length; i++) { 
                setStatusMsg(`Claude se page ${i + 1} padhwa rahe hain...`); 
                texts[i] = await llmTranscribe(imgs[i]); 
              }
            } catch (e2) {
              throw new Error('OCR nahi chal saka (' + e1.message + '). Is PDF file ko Chrome me kholein, ya Chrome ke "Save as PDF" se banayi hui text-wali PDF use karein.');
            }
          }
        }

        const RAW = texts.join('\n\n--- page ---\n\n');
        const d = parseLetter(RAW);
        
        if (!d.rows.length) { 
          setError(`Allocation table nahi mili (${file.name}).`);
          continue;
        }
        
        derive(d);
        newDocs.push({
          id: Math.random().toString(36).substring(7),
          fileName: file.name,
          pdfUrl: URL.createObjectURL(file),
          data: d,
          raw: RAW,
          imgs: imgs
        });
      } catch (err) {
        console.error(err);
        setError(`Error: ${err.message}`);
      }
    }
    
    if (newDocs.length > 0) {
      setDocs((prev) => [...prev, ...newDocs]);
      setView("results");
    }
    setLoading(false);
    setStatusMsg("");
  };

  const handleReset = () => {
    setDocs([]);
    setView("drop");
    setLoading(false);
    setLoadingName("");
    setError(null);
  };

  const handleSave = () => {
    showToast("Feature coming soon!");
  };

  const handleManualAdd = (formData) => {
    showToast("Manual entry for CL coming soon!");
    setIsModalOpen(false);
  };

  const saveFile = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; 
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const handleCsvExport = (exportDocs) => {
    exportDocs.forEach(doc => {
      const DATA = doc.data;
      const q = v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
      const L = [['Field', 'Value']]; 
      Object.entries(DATA.info).forEach(kv => L.push(kv));
      L.push([], ['Subsidiary', 'Source', 'Bid ID', 'Mode', 'Rep Grade', 'Size', 'Offer Qty', 'Rep Notified Price', 'Colliery', 'Grade', 'Allocated MT', 'Bid Price', 'Colliery Notified', 'Final Bid Price', 'Supply Range', 'Premium %', 'Seniority', 'Third Party', 'Value Rs']);
      DATA.rows.forEach(r => L.push([r.subsidiary, r.source, r.bidId, r.mode, r.repGrade, r.size, r.offerQty, r.repNotifiedPrice, r.colliery, r.collieryGrade, r.allocatedQty, r.bidPrice, r.collieryNotified, r.finalBid, r.supplyRange, r.premium, r.seniority, r.thirdParty, r.value]));
      
      const csvContent = '\ufeff' + L.map(r => r.map(q).join(',')).join('\n');
      const baseName = 'final_allocation_' + String((DATA.info['Buyer Ref No'] || 'letter')).replace(/[^\w.-]+/g, '_');
      saveFile(baseName + '.csv', csvContent, 'text/csv');
    });
  };

  const handleJsonExport = (exportDocs) => {
    exportDocs.forEach(doc => {
      const baseName = 'final_allocation_' + String((doc.data.info['Buyer Ref No'] || 'letter')).replace(/[^\w.-]+/g, '_');
      saveFile(baseName + '.json', JSON.stringify(doc.data, null, 2), 'application/json');
    });
  };

  const inr = (n, d = 2) => n === null || n === undefined ? '-' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div>
      {view === "drop" && (
        <>
          <Dropzone
            onFiles={handleFiles}
            loading={loading}
            loadingName={loadingName || statusMsg}
            error={error}
            title="Upload CL Final Allocation Letter PDF"
            icon="📄"
          />
          {statusMsg && (
            <div style={{ textAlign: 'center', color: 'var(--primary)', marginTop: 10, fontSize: 13 }}>
              {statusMsg}
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ color: "var(--muted)", marginRight: 15, fontSize: "14px" }}>Or enter data manually</span>
            <button className="btn outline" onClick={() => setIsModalOpen(true)}>+ Add Form</button>
          </div>
          <div className="summary-section" style={{ marginTop: 40, opacity: 0.6, pointerEvents: "none" }}>
            <div className="summary-header">
              <div className="summary-title">Data Preview (Upload PDF to populate)</div>
            </div>
            <div className="summary-table-wrap">
              <table className="stable">
                <thead>
                  <tr>
                    <th>Buyer Ref No</th>
                    <th>Total Allocated (MT)</th>
                    <th>Bid Price (Rs/MT)</th>
                    <th>Premium (%)</th>
                    <th>Coal Value (Rs)</th>
                    <th>Payment Last Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                      Upload a PDF to view extracted data
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === "results" && docs.length > 0 && (
        <div className="results-container slide-up">
          <div className="results-header">
            <div className="results-title">
              <div style={{ fontSize: 24, marginRight: 12 }}>📋</div>
              <div>
                <h3>CL Extracted Data</h3>
                <p>{docs.length} file(s) loaded</p>
              </div>
            </div>
            <div className="results-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>

              <button 
                className="btn ghost" 
                onClick={handleSave} 
                style={{ 
                  borderColor: "var(--primary)", 
                  color: "var(--primary)", 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "6px",
                  background: "rgba(0, 0, 0, 0.04)"
                }}
              >
                💾 SAVE
              </button>
              
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                accept=".pdf" 
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files.length) handleFiles(Array.from(e.target.files));
                }} 
              />
              <button className="btn outline" onClick={() => setIsModalOpen(true)}>
                + Add Form
              </button>
              <button className="btn outline" onClick={() => fileInputRef.current?.click()}>
                Add More Files
              </button>
            </div>
          </div>

          <div className="summary-section" style={{ marginTop: 0 }}>
            <div className="summary-header">
              <div className="summary-title">Key Performance Indicators (KPIs)</div>
            </div>
            <div className="summary-table-wrap">
              <table className="stable">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Buyer Ref No</th>
                    <th>Total Allocated (MT)</th>
                    <th>Bid Price (Rs/MT)</th>
                    <th>Premium (%)</th>
                    <th>Coal Value (Rs)</th>
                    <th>Payment Last Date</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 600 }}>{doc.fileName}</td>
                      <td>{doc.data.info['Buyer Ref No'] || '-'}</td>
                      <td style={{ color: "var(--ember)", fontWeight: 600 }}>{inr(doc.data.totals?.qty)}</td>
                      <td>{inr(doc.data.rows[0]?.bidPrice)}</td>
                      <td>{inr(doc.data.rows[0]?.premium)}</td>
                      <td style={{ color: "var(--ember)", fontWeight: 600 }}>{inr(doc.data.totals?.value)}</td>
                      <td>{doc.data.payBy || '-'}</td>
                      <td>
                        {doc.pdfUrl ? (
                          <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                            View PDF
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="results-content" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16, color: "var(--text)" }}>Document Detail</h3>
            {docs.map((doc) => (
              <div key={doc.id} style={{ marginBottom: 32, padding: 24, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 20, margin: "0 0 4px 0", color: "var(--text)" }}>{doc.data.info['Company'] || 'Allocation Letter'}</h3>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{doc.fileName}</div>
                  </div>
                  {doc.data.info['Mail Date'] && (
                    <span style={{ fontSize: 12, padding: "4px 10px", background: "#f3f4f6", borderRadius: 16, fontWeight: 500 }}>
                      Mail Date: {doc.data.info['Mail Date']}
                    </span>
                  )}
                </div>

                <div style={{ background: "#fff4e5", border: "1px solid #ffcc80", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "#e65100" }}>
                  <div>⚠ Ye data OCR/PDF se padha gaya hai. Paise aur quantity wale numbers ek baar original PDF se zaroor mila lein.</div>
                  {doc.data.warns && doc.data.warns.length > 0 && doc.data.warns.map((w, i) => <div key={i}>⚠ {w}</div>)}
                </div>

                <h4 style={{ fontSize: 15, marginBottom: 12 }}>Auction &amp; Bidder Details</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                  {Object.entries(doc.data.info).map(([k, v], idx) => (
                    v ? (
                      <div key={idx}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>{k}</div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                      </div>
                    ) : null
                  ))}
                </div>

                <h4 style={{ fontSize: 15, marginBottom: 12 }}>Quantity Allotted</h4>
                <div className="summary-table-wrap" style={{ marginBottom: 24, border: "1px solid #e5e7eb" }}>
                  <table className="stable">
                    <thead style={{ background: "#f9fafb" }}>
                      <tr>
                        <th>#</th><th>Subsidiary</th><th>Source</th><th>Bid ID</th><th>Mode</th><th>Rep. Grade</th><th>Size</th>
                        <th>Offer Qty</th><th>Rep. Notified</th><th>Colliery</th><th>Grade</th><th>Allocated</th>
                        <th>Bid ₹/MT</th><th>Coll. Notified</th><th>Final Bid</th><th>Supply Range</th><th>Premium %</th>
                        <th>Seniority</th><th>Third Party</th><th>Value ₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.data.rows.map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{r.subsidiary}</td>
                          <td>{r.source}</td>
                          <td>{r.bidId}</td>
                          <td>{r.mode}</td>
                          <td>{r.repGrade}</td>
                          <td>{r.size}</td>
                          <td>{inr(r.offerQty)}</td>
                          <td>{inr(r.repNotifiedPrice)}</td>
                          <td>{r.colliery}</td>
                          <td>{r.collieryGrade}</td>
                          <td style={{ color: "var(--ember)", fontWeight: 500 }}>{inr(r.allocatedQty)}</td>
                          <td style={{ color: "var(--ember)", fontWeight: 500 }}>{inr(r.bidPrice, 0)}</td>
                          <td>{inr(r.collieryNotified)}</td>
                          <td>{inr(r.finalBid, 0)}</td>
                          <td>{r.supplyRange || '-'}</td>
                          <td>{inr(r.premium)}</td>
                          <td>{r.seniority}</td>
                          <td>{r.thirdParty}</td>
                          <td>{inr(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: "bold", background: "#f7f8fa" }}>
                        <td colSpan="11" style={{ textAlign: "right" }}>Total</td>
                        <td>{inr(doc.data.totals?.qty)}</td>
                        <td colSpan="7"></td>
                        <td>{inr(doc.data.totals?.value)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div style={{ marginTop: 24 }}>
                  <details style={{ marginBottom: 12 }}>
                    <summary style={{ cursor: "pointer", color: "var(--primary)", fontWeight: 500, fontSize: 14 }}>
                      Verify karne ke liye PDF ke pages dekhein
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                      {doc.imgs && doc.imgs.map((src, i) => (
                        <img key={i} src={src} alt={`Page ${i+1}`} style={{ maxWidth: "100%", border: "1px solid #e5e7eb", borderRadius: 4 }} />
                      ))}
                    </div>
                  </details>
                  <details>
                    <summary style={{ cursor: "pointer", color: "var(--primary)", fontWeight: 500, fontSize: 14 }}>
                      Padha hua raw text dekhein (OCR / PDF)
                    </summary>
                    <pre style={{ marginTop: 12, padding: 16, background: "#1f2937", color: "#e5e7eb", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto", borderRadius: 6 }}>
                      {doc.raw}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleManualAdd}
        title="Add Manual Entry"
        initialData={{}}
        columns={[
          { key: "buyerRef", label: "Buyer Ref No" },
          { key: "allocatedQty", label: "Total Allocated (MT)" },
          { key: "bidPrice", label: "Bid Price (Rs/MT)" }
        ]}
      />
    </div>
  );
}
