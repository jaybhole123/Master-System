import React, { useState, useRef, useEffect } from 'react';
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import EditModal from "../components/EditModal";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

// Point pdf.js at the correct worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function MSTCPage() {
  const fileInputRef = useRef(null);
  
  const [docs, setDocs] = useState([]);
  const [view, setView] = useState("drop");
  const [loading, setLoading] = useState(false);
  const [loadingName, setLoadingName] = useState("");
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const NUM = s => { const n = parseFloat(String(s).replace(/,/g, '')); return isNaN(n) ? null : n; };
  const COLS = [45, 60, 80, 111, 126, 142, 179, 203, 225, 255, 272, 293, 330, 361, 383, 414, 430, 445, 466, 485, 523, 546];

  function groupLines(items, tol = 2.5) {
    const s = items.filter(i => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    s.forEach(it => {
      const L = lines.find(l => Math.abs(l.y - it.y) <= tol);
      if (L) L.items.push(it); else lines.push({ y: it.y, items: [it] });
    });
    lines.forEach(l => l.items.sort((a, b) => a.x - b.x));
    return lines;
  }
  
  function joinItems(arr) {
    let out = '', prev = null;
    arr.forEach(it => {
      if (prev) out += (it.x - (prev.x + prev.w) < 1.2) ? '' : ' ';
      out += it.str.trim(); prev = it;
    });
    return out.trim();
  }

  function parsePages(pages) {
    const res = { info: {}, sources: [], terms: [], notes: [], warns: [], subject: '', mailDate: '' };
    let tablePage = -1;
    pages.forEach((p, pi) => { if (p.items.some(i => i.str.trim() === 'Seller') && p.items.some(i => /Colliery/i.test(i.str))) tablePage = tablePage < 0 ? pi : tablePage; });
    if (tablePage < 0) return res;

    const P = pages[tablePage];
    const clean = P.items.filter(i => i.y > 8 && i.y < 775);
    groupLines(clean).forEach(l => {
      const txt = joinItems(l.items);
      if (/^Final Allocation Letter/i.test(txt)) res.subject = txt;
      const d = txt.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \w{3} \d{1,2}, \d{4} at [\d:]+ [AP]M/); if (d && !res.mailDate) res.mailDate = d[0];
      const ci = l.items.findIndex(i => i.str.trim() === ':');
      if (ci > 0 && ci < l.items.length - 1) res.info[joinItems(l.items.slice(0, ci)).replace(/\s*:$/, '')] = joinItems(l.items.slice(ci + 1));
      else if (/:$/.test(txt) && l.items.length === 1) {  }
      if (l.items.length === 1 && /^Buyer's Ref No\s*:$/i.test(txt)) {  }
    });
    groupLines(clean).forEach(l => {
      const its = l.items;
      if (its.length >= 3 && /:$/.test(its[0].str.trim()) && its[1].str.trim() === ':') {
        const k = its[0].str.trim().replace(/\s*:$/, ''); res.info[k] = joinItems(its.slice(2)); delete res.info[k + ' :'];
      }
    });
    Object.keys(res.info).forEach(k => { if (/:$/.test(k)) delete res.info[k]; });

    const sellerHdr = clean.find(i => i.str.trim() === 'Seller');
    const shift = sellerHdr.x - COLS[0];
    const col = x => { let c = 0; COLS.forEach((s, i) => { if (x + 3 >= s + shift) c = i; }); return c; };
    const foot = clean.find(i => /^\*Final Bid price/i.test(i.str));
    const topY = sellerHdr.y - 30, botY = foot ? foot.y : 0;
    const body = clean.filter(i => i.y < topY && i.y > botY && i.str.trim()).map(i => ({ ...i, c: col(i.x) }));
    const cell = (cols, y, tol = 9) => body.filter(i => cols.includes(i.c) && Math.abs(i.y - y) <= tol).sort((a, b) => b.y - a.y || a.x - b.x).map(i => i.str.trim()).join(' ').replace(/\s+/g, ' ').trim();

    const mains = body.filter(i => i.c === 0).map(a => {
      const y = a.y, g = c => cell([c], y);
      const aq = g(8), m = aq.match(/^([\d.,]+)\s*MT/i);
      return {
        y, seller: g(0), bidId: g(1), source: g(2), mode: g(3), grade: g(4), repGrade: g(5), size: g(6),
        offerQty: NUM(g(7)), allottedQty: m ? NUM(m[1]) : null, bidPrice: NUM(g(9)), notifiedPrice: NUM(g(10)),
        modulatedPrice: NUM(g(11)), premium: NUM(cell([12], y, 3)), balanceQty: NUM(cell([13], y, 3)), seniority: g(21),
        feeders: []
      };
    });
    mains.forEach(m => { m.allotted = m.allottedQty !== null && /\d/.test(m.bidId); });

    body.filter(i => i.c === 17).forEach(a => {
      const y = a.y, g = c => cell([c], y, 8);
      let name = g(14), grade = g(15);
      const mm = name.match(/^(.*\S)\s+(G\d+)$/); if (mm && !grade) { name = mm[1]; grade = mm[2]; }
      const f = { colliery: name, grade, size: g(16).replace(/\s+/g, ' '), notified: NUM(g(17)), finalBid: NUM(g(18)), finalBidRep: NUM(g(19)), supplyRange: g(20), y };
      let owner = mains.find(m => m.allotted && Math.abs(m.y - y) <= 3);
      if (!owner) {
        const cand = mains.filter(m => !m.allotted).length ? mains.filter(m => !m.allotted) : mains;
        owner = cand.slice().sort((p, q) => Math.abs(p.y - y) - Math.abs(q.y - y))[0];
      }
      if (owner) owner.feeders.push(f);
    });
    mains.forEach(m => m.feeders.sort((a, b) => b.y - a.y));
    res.sources = mains;

    mains.filter(m => m.allotted).forEach(m => {
      if (m.bidPrice && m.notifiedPrice) {
        const p = (m.bidPrice - m.notifiedPrice) / m.notifiedPrice * 100;
        if (m.premium !== null && Math.abs(p - m.premium) > 0.01) res.warns.push(`${m.source}: premium Excel/PDF me ${m.premium}% hai, par (Bid − Notified)/Notified se ${p.toFixed(4)}% aata hai.`);
      }
    });

    groupLines(clean.filter(i => foot && i.y <= foot.y + 2 && i.y > 30)).forEach(l => res.notes.push(joinItems(l.items)));
    groupLines(clean.filter(i => foot && i.y < 45)).forEach(l => { const t = joinItems(l.items); if (!res.notes.includes(t)) res.notes.push(t); });
    pages.forEach((p, pi) => {
      if (pi === tablePage) return;
      groupLines(p.items.filter(i => i.y > 12 && i.y < 775)).forEach(l => res.terms.push(joinItems(l.items).replace(/\uFFFD/g, '1')));
    });
    return res;
  }

  function addWorkingDays(d, n) {
    const x = new Date(d.getTime());
    while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) n--; }
    return x;
  }
  
  const dmy = d => String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();

  function derive(d) {
    const al = d.sources.filter(s => s.allotted);
    al.forEach(s => { s.value = (s.allottedQty || 0) * (s.bidPrice || 0); });
    d.totals = { qty: al.reduce((t, s) => t + (s.allottedQty || 0), 0), value: al.reduce((t, s) => t + s.value, 0) };
    d.totals.avg = d.totals.qty ? d.totals.value / d.totals.qty : 0;
    const per = d.info['Period of Auction'] || '';
    const m = per.match(/::\s*(\d{2})-(\d{2})-(\d{4})/);
    d.payBy = m ? dmy(addWorkingDays(new Date(+m[3], +m[2] - 1, +m[1]), 10)) : '';
  }

  const handleFiles = async (files) => {
    if (files.length === 0) {
      setError("Please upload only PDF files.");
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingName(files.length > 1 ? `${files.length} files` : files[0].name);

    const newDocs = [];
    for (const file of files) {
      try {
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const pages = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const tc = await (await doc.getPage(p)).getTextContent();
          pages.push({ items: tc.items.map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })) });
        }
        const d = parsePages(pages);
        if (!d.sources.length) { 
          setError(`Is PDF me expected allocation table nahi mili (${file.name}).`);
          continue;
        }
        derive(d);
        newDocs.push({
          id: Math.random().toString(36).substring(7),
          fileName: file.name,
          pdfUrl: URL.createObjectURL(file),
          data: d
        });
      } catch (err) {
        console.error(err);
        setError(`Failed to read ${file.name}. (${err.message})`);
      }
    }
    
    if (newDocs.length > 0) {
      setDocs((prev) => [...prev, ...newDocs]);
      setView("results");
    }
    setLoading(false);
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
    showToast("Manual entry for MSTC coming soon!");
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
      L.push([], ['Seller', 'Bid Id', 'Source', 'Mode', 'Grade', 'Rep Grade', 'Size', 'Offer Qty', 'Allotted MT', 'Bid Price', 'Notified Price', 'Premium %', 'Balance Qty', 'Seniority', 'Allotted?', 'Value Rs']);
      DATA.sources.forEach(s => L.push([s.seller, s.bidId, s.source, s.mode, s.grade, s.repGrade, s.size, s.offerQty, s.allottedQty, s.bidPrice, s.notifiedPrice, s.premium, s.balanceQty, s.seniority, s.allotted ? 'Yes' : 'No', s.value || '']));
      L.push([], ['Source', 'Colliery', 'Grade', 'Size', 'Notified Price', 'Final Bid Price', 'Final Bid (Rep Grade)', 'Supply Range']);
      DATA.sources.forEach(s => s.feeders.forEach(f => L.push([s.source, f.colliery, f.grade, f.size, f.notified, f.finalBid, f.finalBidRep, f.supplyRange])));
      
      const csvContent = '\ufeff' + L.map(r => r.map(q).join(',')).join('\n');
      const baseName = 'allocation_' + String(DATA.info["Buyer's Ref No"] || 'letter').replace(/[^\w.-]+/g, '_');
      saveFile(baseName + '.csv', csvContent, 'text/csv');
    });
  };

  const handleJsonExport = (exportDocs) => {
    exportDocs.forEach(doc => {
      const baseName = 'allocation_' + String(doc.data.info["Buyer's Ref No"] || 'letter').replace(/[^\w.-]+/g, '_');
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
            loadingName={loadingName}
            error={error}
            title="Upload MSTC Allocation Letter PDF"
            icon="📄"
          />
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
                    <th>Total Allotted (MT)</th>
                    <th>Weighted Avg Price</th>
                    <th>Coal Value (Rs)</th>
                    <th>Payment Last Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
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
            <div className="results-title" style={{ display: 'none' }}>
              <div style={{ fontSize: 24, marginRight: 12 }}>📋</div>
              <div>
                <h3>MSTC Extracted Data</h3>
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
                    <th>Total Allotted (MT)</th>
                    <th>Weighted Avg Price</th>
                    <th>Coal Value (Rs)</th>
                    <th>Payment Last Date</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 600 }}>{doc.fileName}</td>
                      <td>{doc.data.info["Buyer's Ref No"] || '-'}</td>
                      <td style={{ color: "var(--ember)", fontWeight: 600 }}>{inr(doc.data.totals?.qty)}</td>
                      <td>{inr(doc.data.totals?.avg)}</td>
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
                    <h3 style={{ fontSize: 20, margin: "0 0 4px 0", color: "var(--text)" }}>{doc.data.subject || 'Allocation Letter'}</h3>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{doc.fileName}</div>
                  </div>
                  {doc.data.mailDate && (
                    <span style={{ fontSize: 12, padding: "4px 10px", background: "#f3f4f6", borderRadius: 16, fontWeight: 500 }}>
                      Mail Date: {doc.data.mailDate}
                    </span>
                  )}
                </div>

                {doc.data.warns && doc.data.warns.length > 0 && (
                  <div style={{ background: "#fff4e5", border: "1px solid #ffcc80", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "#e65100" }}>
                    {doc.data.warns.map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </div>
                )}

                <h4 style={{ fontSize: 15, marginBottom: 12 }}>Auction &amp; Buyer Details</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                  {Object.entries(doc.data.info).map(([k, v], idx) => (
                    <div key={idx}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <h4 style={{ fontSize: 15, marginBottom: 12 }}>Allotted Coal</h4>
                <div className="summary-table-wrap" style={{ marginBottom: 24, border: "1px solid #e5e7eb" }}>
                  <table className="stable">
                    <thead style={{ background: "#f9fafb" }}>
                      <tr>
                        <th>Seller</th><th>Bid ID</th><th>Source</th><th>Mode</th><th>Grade</th><th>Rep. Grade</th><th>Size</th>
                        <th>Offer Qty</th><th>Allotted</th><th>Bid ₹/MT</th><th>Notified ₹/MT</th><th>Premium %</th><th>Value ₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.data.sources.filter(s => s.allotted).map((r, i) => (
                        <tr key={i}>
                          <td>{r.seller}</td>
                          <td>{r.bidId}</td>
                          <td>{r.source}</td>
                          <td>{r.mode}</td>
                          <td>{r.grade}</td>
                          <td>{r.repGrade}</td>
                          <td>{r.size}</td>
                          <td>{inr(r.offerQty, 1)}</td>
                          <td style={{ color: "var(--ember)", fontWeight: 500 }}>{inr(r.allottedQty)}</td>
                          <td style={{ color: "var(--ember)", fontWeight: 500 }}>{inr(r.bidPrice)}</td>
                          <td>{inr(r.notifiedPrice, 0)}</td>
                          <td>{inr(r.premium, 4)}</td>
                          <td>{inr(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: "bold", background: "#f7f8fa" }}>
                        <td colSpan="8" style={{ textAlign: "right" }}>Total</td>
                        <td>{inr(doc.data.totals?.qty)}</td>
                        <td colSpan="3"></td>
                        <td>{inr(doc.data.totals?.value)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <h4 style={{ fontSize: 15, marginBottom: 12 }}>Feeding Colliery Details</h4>
                <div className="summary-table-wrap" style={{ marginBottom: 16, border: "1px solid #e5e7eb" }}>
                  <table className="stable">
                    <thead style={{ background: "#f9fafb" }}>
                      <tr>
                        <th>Source</th><th>Status</th><th>Colliery</th><th>Grade</th><th>Size</th>
                        <th>Notified Price</th><th>Final Bid Price</th><th>Final Bid (Rep. Grade)</th><th>Supply Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.data.sources.flatMap(s => 
                        s.feeders.map((f, i) => (
                          <tr key={`${s.source}-${i}`}>
                            <td>{i === 0 ? `${s.source} (${s.mode})` : ''}</td>
                            <td>{i === 0 ? (s.allotted ? 'Allotted' : 'Not Allotted') : ''}</td>
                            <td>{f.colliery || '-'}</td>
                            <td>{f.grade}</td>
                            <td>{f.size}</td>
                            <td>{inr(f.notified, 1)}</td>
                            <td>{f.finalBid === null ? '-' : inr(f.finalBid)}</td>
                            <td>{f.finalBidRep === null ? '-' : inr(f.finalBidRep, 1)}</td>
                            <td>{f.supplyRange || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
          { key: "allottedQty", label: "Total Allotted (MT)" },
          { key: "avgPrice", label: "Weighted Avg Price" }
        ]}
      />
    </div>
  );
}
