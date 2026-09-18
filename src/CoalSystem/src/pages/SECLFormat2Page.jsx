import React, { useState, useRef, useEffect } from "react";
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import EditModal from "../components/EditModal";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

// Point pdf.js at the correct worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function SECLFormat2Page() {
  const fileInputRef = useRef(null);
  
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("secl_format2_data");
      if (saved) {
        let parsed = JSON.parse(saved);
        const cleanBlobs = (obj) => {
          if (Array.isArray(obj)) return obj.map(cleanBlobs);
          if (obj !== null && typeof obj === 'object') {
            const newObj = {};
            for (let k in obj) {
              if (k === 'pdfUrl' && typeof obj[k] === 'string' && obj[k].startsWith('blob:')) {
                newObj[k] = null;
              } else {
                newObj[k] = cleanBlobs(obj[k]);
              }
            }
            return newObj;
          }
          return obj;
        };
        setDocs(cleanBlobs(parsed));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);
  
  const [view, setView] = useState(docs.length > 0 ? "results" : "drop");
  const [loading, setLoading] = useState(false);
  const [loadingName, setLoadingName] = useState("");
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleManualAdd = (formData) => {
    const newDoc = {
      id: Math.random().toString(36).substring(7),
      fileName: formData.pdfFile ? formData.pdfFile.name : "Manual Entry",
      pdfUrl: formData.pdfFile ? URL.createObjectURL(formData.pdfFile) : null,
      docType: "Allocation Letter",
      buyerRef: "—",
      company: formData.company || "—",
      contact: formData.contact || "—",
      pan: "—",
      auctionNo: "—",
      period: formData.period || "—",
      rows: [{
        seller: formData.seller || "—",
        bidId: "—",
        source: formData.source || "—",
        mode: "—",
        grade: formData.grade || "—",
        size: "—",
        offerQty: "—",
        qtyAllotted: formData.qtyAllotted || "—",
        bidPrice: formData.bidPrice || "—",
        notifiedPrice: "—",
        premium: "—",
        balanceQty: "—"
      }],
      raw: "Manual entry data.",
      showRaw: false
    };
    setDocs((prev) => [...prev, newDoc]);
    setView("results");
    setIsModalOpen(false);
  };

  async function extractTextFromPdf(file) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let full = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      full += content.items.map((i) => i.str).join(" ") + "\n";
    }
    return full.replace(/\s+/g, ' ').trim();
  }

  function grab(re, text, fallback) {
    const m = text.match(re);
    return m ? m[1].trim() : (fallback || "—");
  }

  function parseGenericFields(text) {
    return {
      buyerRef: grab(/Buyer(?:'s)?s?\.?\s*Ref\.?\s*No\.?\s*:?\s*([A-Za-z0-9_]+)/i, text),
      company: grab(/Company\s*Name\s*:?\s*([A-Za-z0-9 .&()'-]+?)(?=\s*Contact Person|\s*Street|\s*UBID)/i, text),
      contact: grab(/Contact\s*Person\s*:?\s*([A-Za-z .]+?)(?=\s*Street|\s*UBID|\s*City)/i, text),
      pan: grab(/PAN\s*NO\.?\s*:?\s*([A-Z0-9]{8,12})/i, text),
      auctionNo: grab(/Auction\s*(?:Number|ID|No\.?)\s*:?\s*([A-Za-z0-9_\/.\-]+)/i, text),
      period: grab(/(?:Period of Auction|Auction\s*Date)\s*:?\s*([0-9:\s\-\/A-Za-z:.:]+?)(?=\s*We are pleased|\s*Bidder Details|\s*Dear|\s*Allocated Information|$)/i, text)
    };
  }

  function parseRows(text) {
    const rows = [];
    const re = /SECL\s+(\S+)\s+((?:[A-Za-z]+\s?){1,2})\s+(Road|Rail)\s+(\w+)\s+(\w+)\s+(Sized\s*Rom\s*\(-?\)?\s*100\s*mm\)|Sized\s*Rom\s*\(-100mm\))\s+([\d.,]+)\s+([\d.,]+|-)\s*(?:MT)?\s+([\d.,]+|-)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      rows.push({
        seller: "SECL", bidId: m[1] === "-" ? "—" : m[1], source: m[2].trim(), mode: m[3], grade: m[4], size: m[6].trim(),
        offerQty: m[7], qtyAllotted: m[8] === "-" ? "—" : m[8], bidPrice: m[9] === "-" ? "—" : m[9],
        notifiedPrice: m[10], premium: m[12] + "%", balanceQty: m[13]
      });
    }
    // ECA-style allocated info row
    const ecaRe = /Road\s+([A-Za-z0-9 &]+?)\s+([\d.]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d+)\b/;
    const ecaM = text.match(ecaRe);
    if (ecaM && rows.length === 0) {
      rows.push({
        seller: "SECL", bidId: "—", source: ecaM[1].trim(), mode: "Road", grade: "—", size: "—",
        offerQty: ecaM[3], qtyAllotted: ecaM[4], bidPrice: ecaM[6], notifiedPrice: ecaM[2], premium: "—", balanceQty: "—"
      });
    }
    return rows;
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
        const text = await extractTextFromPdf(file);
        const fields = parseGenericFields(text);
        let rows = parseRows(text);
        if (rows.length === 0) {
          rows = [{ seller: "—", bidId: "—", source: "—", mode: "—", grade: "—", size: "—", offerQty: "—", qtyAllotted: "—", bidPrice: "—", notifiedPrice: "—", premium: "—", balanceQty: "—" }];
        }
        newDocs.push({
          id: Math.random().toString(36).substring(7),
          fileName: file.name,
          pdfUrl: URL.createObjectURL(file),
          docType: text.includes("Sale Intimation") ? "Sale Intimation Letter" : "Allocation Letter",
          buyerRef: fields.buyerRef,
          company: fields.company,
          contact: fields.contact,
          pan: fields.pan,
          auctionNo: fields.auctionNo,
          period: fields.period,
          rows: rows,
          raw: text.slice(0, 1800) + (text.length > 1800 ? " …" : ""),
          showRaw: false
        });
      } catch (err) {
        console.error(err);
        setError(`Failed to read ${file.name}. (${err.message})`);
      }
    }
    
    setDocs((prev) => [...prev, ...newDocs]);
    setLoading(false);
    setView("results");
  };

  const handleReset = () => {
    setDocs([]);
    setView("drop");
    setLoading(false);
    setLoadingName("");
    setError(null);
  };

  const toggleRaw = (id) => {
    setDocs((prev) => prev.map(d => d.id === id ? { ...d, showRaw: !d.showRaw } : d));
  };

  const handleSave = () => {
    if (docs.length === 0) return;
    localStorage.setItem("secl_format2_data", JSON.stringify(docs));
    showToast("Data saved to LocalStorage successfully!");
  };

  return (
    <div>
      {view === "drop" && (
        <>
          <Dropzone
            onFiles={handleFiles}
            loading={loading}
            loadingName={loadingName}
            error={error}
            title="Upload SECL Format 2 PDF"
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
                    <th>Buyer</th>
                    <th>Buyer Ref</th>
                    <th>Source / Colliery</th>
                    <th>Mode</th>
                    <th>Grade</th>
                    <th>Qty Allotted</th>
                    <th>Bid Price ₹/MT</th>
                    <th>Notified Price ₹/MT</th>
                    <th>Premium %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
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
                <h3>SECL Format 2 Extracted Data</h3>
                <p>{docs.length} file(s) loaded</p>
              </div>
            </div>
            <div className="results-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="btn outline" onClick={handleReset}>
                Start Over
              </button>
              
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
              <div className="summary-title">All allocations, side by side</div>
            </div>
            <div className="summary-table-wrap">
              <table className="stable">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Period of Auction</th>
                    <th>Seller</th>
                    <th>Source Name</th>
                    <th>Grade</th>
                    <th>Representative</th>
                    <th>Quantity Allotted (MT)</th>
                    <th>Bid Price (Rs/MT)</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    d.rows.map((r, idx) => (
                      <tr key={`${d.id}-${idx}`}>
                        <td style={{ fontWeight: 600 }}>{d.company}</td>
                        <td>{d.period}</td>
                        <td>{r.seller}</td>
                        <td>{r.source}</td>
                        <td>{r.grade}</td>
                        <td>{d.contact}</td>
                        <td style={{ color: "var(--ember)", fontWeight: 600 }}>{r.qtyAllotted}</td>
                        <td style={{ color: "var(--ember)", fontWeight: 600 }}>{r.bidPrice}</td>
                        <td>
                          {d.pdfUrl ? (
                            <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                              View PDF
                            </a>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="results-content" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16, color: "var(--text)" }}>Document Detail</h3>
            {docs.map((d) => (
              <div key={d.id} style={{ marginBottom: 32, padding: 24, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 20, margin: "0 0 4px 0", color: "var(--text)" }}>{d.company}</h3>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{d.docType} ({d.fileName})</div>
                  </div>
                  <span style={{ fontSize: 12, padding: "4px 10px", background: "#f3f4f6", borderRadius: 16, fontWeight: 500 }}>
                    Ref: {d.buyerRef}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Contact Person</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{d.contact}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>PAN</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{d.pan}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Auction No / ID</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{d.auctionNo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Auction Period</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{d.period}</div>
                  </div>
                </div>

                <div className="summary-table-wrap" style={{ marginBottom: 16, border: "1px solid #e5e7eb" }}>
                  <table className="stable">
                    <thead style={{ background: "#f9fafb" }}>
                      <tr>
                        <th>Seller</th><th>Bid ID</th><th>Source</th><th>Mode</th><th>Grade</th><th>Size</th>
                        <th>Offer Qty</th><th>Allotted</th><th>Bid ₹/MT</th><th>Notified ₹/MT</th><th>Premium</th><th>Balance Qty</th><th>Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.rows.map((r, i) => (
                        <tr key={i}>
                          <td>{r.seller}</td>
                          <td>{r.bidId}</td>
                          <td>{r.source}</td>
                          <td>{r.mode}</td>
                          <td>{r.grade}</td>
                          <td>{r.size}</td>
                          <td style={{ color: "var(--ember)", fontWeight: 500 }}>{r.offerQty}</td>
                          <td style={{ color: "var(--ember)", fontWeight: 500 }}>{r.qtyAllotted}</td>
                          <td style={{ color: "var(--ember)", fontWeight: 500 }}>{r.bidPrice}</td>
                          <td>{r.notifiedPrice}</td>
                          <td>{r.premium}</td>
                          <td>{r.balanceQty}</td>
                          <td>
                            {d.pdfUrl && (
                              <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                                View PDF
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button 
                    onClick={() => toggleRaw(d.id)}
                    style={{ background: "none", border: "none", color: "var(--primary)", textDecoration: "underline", cursor: "pointer", fontSize: 13, padding: 0 }}
                  >
                    {d.showRaw ? "Hide extracted text" : "Show extracted text ↴"}
                  </button>
                  {d.showRaw && (
                    <div style={{ marginTop: 12, padding: 16, background: "#1f2937", color: "#e5e7eb", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto", borderRadius: 6 }}>
                      {d.raw}
                    </div>
                  )}
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
          { key: "company", label: "Company Name" },
          { key: "period", label: "Period of Auction" },
          { key: "seller", label: "Seller" },
          { key: "source", label: "Source Name" },
          { key: "grade", label: "Grade" },
          { key: "contact", label: "Representative" },
          { key: "qtyAllotted", label: "Quantity Allotted (MT)" },
          { key: "bidPrice", label: "Bid Price (Rs/MT)" }
        ]}
      />
    </div>
  );
}
