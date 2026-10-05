import React, { useState, useRef, useEffect } from "react";
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import EditModal from "../components/EditModal";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";
import supabase from "../../../SupabaseClient";
import { Edit, Trash, CheckCircle } from "lucide-react";

// Point pdf.js at the correct worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function SECLFormat2Page() {
  const fileInputRef = useRef(null);
  
  const [docs, setDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const fetchFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('secl_intimation_format_2').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      console.log("Fetched data from secl_intimation_format_2:", data);
      
      const grouped = {};
      data.forEach(row => {
        const key = row.file_name || 'Manual Entry';
        if (!grouped[key]) {
          grouped[key] = {
            id: row.id,
            fileName: row.file_name,
            pdfUrl: row.pdf_url,
            company: row.company_name,
            contact: row.contact_person,
            period: row.auction_period,
            rows: []
          };
        }
        grouped[key].rows.push({
          status: row.status || 'pending',
          dbId: row.id,
          seller: row.seller,
          bidId: row.bid_id,
          source: row.source,
          mode: row.mode,
          grade: row.grade,
          size: row.size,
          offerQty: row.offer_qty,
          qtyAllotted: row.qty_allotted,
          bidPrice: row.bid_price,
          notifiedPrice: row.notified_price,
          premium: row.premium,
          balanceQty: row.balance_qty
        });
      });
      const docsArray = Object.values(grouped);
      setDocs(docsArray);
      if (docsArray.length > 0) {
        setView("results");
      }
    } catch (err) {
      console.error("Error fetching from Supabase:", err);
    }
  };

  useEffect(() => {
    fetchFromSupabase();
  }, []);
  
  const [view, setView] = useState(docs.length > 0 ? "results" : "drop");
  const [loading, setLoading] = useState(false);
  const [loadingName, setLoadingName] = useState("");
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRowInfo, setEditRowInfo] = useState(null);
  const [editData, setEditData] = useState(null);

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

  const handleModalSave = async (formData) => {
    if (editRowInfo) {
      if (editRowInfo.dbId) {
        const updateData = {
          company_name: formData.company,
          contact_person: formData.contact,
          auction_period: formData.period,
          seller: formData.seller,
          bid_id: formData.bidId,
          source: formData.source,
          mode: formData.mode,
          grade: formData.grade,
          size: formData.size,
          offer_qty: formData.offerQty ? parseFloat(String(formData.offerQty).replace(/,/g, '')) : null,
          qty_allotted: formData.qtyAllotted ? parseFloat(String(formData.qtyAllotted).replace(/,/g, '')) : null,
          bid_price: formData.bidPrice ? parseFloat(String(formData.bidPrice).replace(/,/g, '')) : null,
          notified_price: formData.notifiedPrice ? parseFloat(String(formData.notifiedPrice).replace(/,/g, '')) : null,
          premium: formData.premium,
          balance_qty: formData.balanceQty ? parseFloat(String(formData.balanceQty).replace(/,/g, '')) : null,
        };
        const { error: updateError } = await supabase.from('secl_intimation_format_2').update(updateData).eq('id', editRowInfo.dbId);
        if (updateError) {
          console.error(updateError);
          showToast("Error updating database.");
          return;
        }
      }
      setDocs(prev => {
        const newDocs = [...prev];
        const doc = newDocs[editRowInfo.dIdx];
        doc.company = formData.company;
        doc.contact = formData.contact;
        doc.period = formData.period;
        doc.rows[editRowInfo.rIdx] = {
           ...doc.rows[editRowInfo.rIdx],
           ...formData
        };
        return newDocs;
      });
      showToast("Row updated successfully!");
      setIsModalOpen(false);
      setEditRowInfo(null);
      setEditData(null);
    } else {
      handleManualAdd(formData);
    }
  };

  
  const handleMarkDone = async (dIdx, rIdx, dbId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    if (dbId) {
      try {
        const { error } = await supabase.from('secl_intimation_format_2').update({ status: newStatus }).eq('id', dbId);
        if (error) throw error;
      } catch (err) {
        console.error(err);
        showToast("Error updating status.");
        return;
      }
    }
    setDocs(prev => {
      const newDocs = [...prev];
      newDocs[dIdx].rows[rIdx].status = newStatus;
      return newDocs;
    });
    showToast(newStatus === 'done' ? 'Marked as Done!' : 'Moved to Pending');
  };

  const handleDeleteRow = async (dIdx, rIdx, dbId) => {
    if (!window.confirm("Are you sure you want to delete this row?")) return;
    if (dbId) {
      try {
        const { error } = await supabase.from('secl_intimation_format_2').delete().eq('id', dbId);
        if (error) throw error;
        showToast("Row deleted from database.");
      } catch (err) {
        console.error(err);
        showToast("Error deleting from database.");
        return;
      }
    }
    setDocs(prev => {
      const newDocs = [...prev];
      newDocs[dIdx].rows.splice(rIdx, 1);
      if (newDocs[dIdx].rows.length === 0) {
        newDocs.splice(dIdx, 1);
      }
      return newDocs;
    });
  };

  const openEditModal = (r) => {
    setEditRowInfo({ dIdx: r._dIdx, rIdx: r._rIdx, dbId: r.dbId });
    setEditData({
      company: r._doc.company,
      contact: r._doc.contact,
      period: r._doc.period,
      seller: r.seller,
      bidId: r.bidId,
      source: r.source,
      mode: r.mode,
      grade: r.grade,
      size: r.size,
      offerQty: r.offerQty,
      qtyAllotted: r.qtyAllotted,
      bidPrice: r.bidPrice,
      notifiedPrice: r.notifiedPrice,
      premium: r.premium,
      balanceQty: r.balanceQty
    });
    setIsModalOpen(true);
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
      auctionNo: grab(/Auction\s*(?:Number|ID|No\.?)\s*:?\s*([A-Za-z0-9_/.-]+)/i, text),
      period: grab(/(?:Period of Auction|Auction\s*Date)\s*:?\s*([-0-9:\s/A-Za-z.]+?)(?=\s*We are pleased|\s*Bidder Details|\s*Dear|\s*Allocated Information|$)/i, text)
    };
  }

  function parseRows(text) {
    const rows = [];
    const re = /SECL\s+(\S+)\s+((?:[A-Za-z]+\s?){1,2})\s+(Road|Rail)\s+(\w+)\s+(\w+)\s+(Sized\s*Rom\s*\(-?\)?\s*100\s*mm\)|Sized\s*Rom\s*\(-100mm\))\s+([\d.,]+)\s+([\d.,]+|-)\s*(?:MT)?\s+([\d.,]+|-)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const row = {
        seller: "SECL", bidId: m[1] === "-" ? "—" : m[1], source: m[2].trim(), mode: m[3], grade: m[4], size: m[6].trim(),
        offerQty: m[7], qtyAllotted: m[8] === "-" ? "—" : m[8], bidPrice: m[9] === "-" ? "—" : m[9],
        notifiedPrice: m[10], premium: m[12] + "%", balanceQty: m[13]
      };
      if (!rows.some(r => JSON.stringify(r) === JSON.stringify(row))) {
        rows.push(row);
      }
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
      if (docs.some(d => d.fileName === file.name)) continue;
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
  const exportCols = [
    { key: "company", label: "Company Name" },
    { key: "seller", label: "Seller" },
    { key: "contact", label: "Contact Person" },
    { key: "period", label: "Auction Period" },
    { key: "bidId", label: "Bid ID" },
    { key: "source", label: "Source" },
    { key: "mode", label: "Mode" },
    { key: "grade", label: "Grade" },
    { key: "size", label: "Size" },
    { key: "offerQty", label: "Offer Qty" },
    { key: "qtyAllotted", label: "Allotted (MT)" },
    { key: "bidPrice", label: "Bid ₹/MT" },
    { key: "notifiedPrice", label: "Notified ₹/MT" },
    { key: "premium", label: "Premium" },
    { key: "balanceQty", label: "Balance Qty" }
  ];

  const getExportData = () => {
    return docs.flatMap(d => {
      return (d.rows || []).map(r => ({
        company: d.company || "",
        seller: r.seller || "",
        contact: d.contact || "",
        period: d.period || "",
        bidId: r.bidId || "",
        source: r.source || "",
        mode: r.mode || "",
        grade: r.grade || "",
        size: r.size || "",
        offerQty: r.offerQty || "",
        qtyAllotted: r.qtyAllotted || "",
        bidPrice: r.bidPrice || "",
        notifiedPrice: r.notifiedPrice || "",
        premium: r.premium || "",
        balanceQty: r.balanceQty || ""
      }));
    });
  };

  const handleExportExcel = () => {
    exportToExcel(getExportData(), exportCols, "MSTC_Extracted_Data");
  };

  const handleExportPdf = () => {
    exportToPDF(getExportData(), exportCols, "MSTC_Extracted_Data", "MSTC Summary Table");
  };

  const handleSave = async () => {
    if (docs.length === 0) return;
    
    showToast("Saving PDFs to cloud...");
    setLoading(true);
    let updatedDocs = [...docs];
    try {
      for (let i = 0; i < updatedDocs.length; i++) {
        const d = updatedDocs[i];
        let pdf_url = d.pdfUrl || null;
        if (pdf_url && pdf_url.startsWith("blob:")) {
          try {
            const response = await fetch(pdf_url);
            const blob = await response.blob();
            const fileName = d.fileName || `mstc_${Date.now()}.pdf`;
            const filePath = `pdfs/${Date.now()}_${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from("secl-pdfs")
              .upload(filePath, blob, { contentType: "application/pdf", upsert: true });

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from("secl-pdfs")
                .getPublicUrl(filePath);
              pdf_url = publicUrlData?.publicUrl || null;
            } else {
              console.warn("PDF upload failed:", uploadError);
            }
          } catch (e) {
            console.error("Error fetching blob", e);
          }
        }
        updatedDocs[i].pdfUrl = pdf_url;
        
        // Save to Supabase
        const dbRows = d.rows.filter(r => !r.dbId).map(r => ({
          company_name: d.company,
          contact_person: d.contact,
          auction_period: d.period,
          seller: r.seller,
          bid_id: r.bidId,
          source: r.source,
          mode: r.mode,
          grade: r.grade,
          size: r.size,
          offer_qty: r.offerQty === "—" || r.offerQty === "-" ? null : parseFloat(String(r.offerQty).replace(/,/g, '')),
          qty_allotted: r.qtyAllotted === "—" || r.qtyAllotted === "-" ? null : parseFloat(String(r.qtyAllotted).replace(/,/g, '')),
          bid_price: r.bidPrice === "—" || r.bidPrice === "-" ? null : parseFloat(String(r.bidPrice).replace(/,/g, '')),
          notified_price: r.notifiedPrice === "—" || r.notifiedPrice === "-" ? null : parseFloat(String(r.notifiedPrice).replace(/,/g, '')),
          premium: r.premium,
          balance_qty: r.balanceQty === "—" || r.balanceQty === "-" ? null : parseFloat(String(r.balanceQty).replace(/,/g, '')),
          pdf_url: pdf_url,
          file_name: d.fileName
        }));
        
        if (dbRows.length > 0) {
          const { error: dbError } = await supabase.from('secl_intimation_format_2').insert(dbRows);
          if (dbError) console.error("Database insert error:", dbError);
        }
      }
      
      // Refresh state from DB to get dbIds
      await fetchFromSupabase();
      showToast("Data and PDFs saved to Supabase successfully!");
    } catch(err) {
      console.error(err);
      showToast("Error saving PDFs");
    } finally {
      setLoading(false);
    }
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
          <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "24px" }}>
            <div style={{ display: "flex", marginBottom: "-17px" }}>
              <button 
                onClick={() => setActiveTab("pending")}
                style={{
                  background: "none", border: "none", padding: "10px 20px", fontSize: "14px", fontWeight: "600",
                  color: activeTab === "pending" ? "var(--primary, #dc2626)" : "var(--muted)",
                  borderBottom: activeTab === "pending" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                Pending
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                style={{
                  background: "none", border: "none", padding: "10px 20px", fontSize: "14px", fontWeight: "600",
                  color: activeTab === "history" ? "var(--primary, #dc2626)" : "var(--muted)",
                  borderBottom: activeTab === "history" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                History
              </button>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {/* SEARCH BAR */}
              <div style={{ position: "relative" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: "6px 12px 6px 30px", border: "1px solid var(--line)", borderRadius: "6px", fontSize: "13px", width: "220px", outline: "none", color: "var(--text)", background: "var(--surface)" }}
                />
              </div>
            </div>
            <div className="results-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="btn ghost" onClick={handleExportExcel} style={{ borderColor: "#107c41", color: "#107c41", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 124, 65, 0.04)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="8" y1="13" x2="16" y2="13"></line>
                  <line x1="8" y1="17" x2="16" y2="17"></line>
                </svg>
                EXCEL
              </button>
              <button className="btn ghost" onClick={handleExportPdf} style={{ borderColor: "#d6251b", color: "#d6251b", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(214, 37, 27, 0.04)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M9 15h1a2 2 0 0 0 0-4H9v4Z"></path>
                </svg>
                PDF
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
              <button className="btn outline" onClick={() => {
                setEditRowInfo(null);
                setEditData(null);
                setIsModalOpen(true);
              }}>
                + Add Form
              </button>
              <button className="btn outline" onClick={() => fileInputRef.current?.click()}>
                Add More Files
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '32px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>Total Allotted (MT)</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                {(() => {
                  const allRows = docs.flatMap((d, dIdx) => (d.rows || []).map((r, rIdx) => ({ ...r, _doc: d, _dIdx: dIdx, _rIdx: rIdx })));
                  const filteredRows = allRows.filter(r => {
                    const statusMatch = activeTab === "pending" ? r.status !== 'done' : r.status === 'done';
                    if (!statusMatch) return false;
                    if (!searchTerm) return true;
                    const lower = searchTerm.toLowerCase();
                    const values = [...Object.values(r), r._doc.company, r._doc.period, r._doc.contact];
                    return values.some(v => String(v || "").toLowerCase().includes(lower));
                  });
                  return filteredRows.reduce((sum, r) => sum + (Number(String(r.qtyAllotted).replace(/,/g, '')) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
                })()}
              </div>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>Total Balance Qty</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ember)' }}>
                {(() => {
                  const allRows = docs.flatMap((d, dIdx) => (d.rows || []).map((r, rIdx) => ({ ...r, _doc: d, _dIdx: dIdx, _rIdx: rIdx })));
                  const filteredRows = allRows.filter(r => {
                    const statusMatch = activeTab === "pending" ? r.status !== 'done' : r.status === 'done';
                    if (!statusMatch) return false;
                    if (!searchTerm) return true;
                    const lower = searchTerm.toLowerCase();
                    const values = [...Object.values(r), r._doc.company, r._doc.period, r._doc.contact];
                    return values.some(v => String(v || "").toLowerCase().includes(lower));
                  });
                  return filteredRows.reduce((sum, r) => sum + (Number(String(r.balanceQty).replace(/,/g, '')) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
                })()}
              </div>
            </div>
          </div>

          <div className="results-content" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16, color: "var(--text)" }}>Extracted Items</h3>
            <div style={{ padding: 24, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <div className="summary-table-wrap" style={{ border: "1px solid #e5e7eb" }}>
                <table className="stable">
                  <thead style={{ background: "#f9fafb" }}>
                    <tr>
                      <th>#</th><th>Seller</th><th>Contact Person</th><th>Auction Period</th><th>Bid ID</th><th>Source</th><th>Mode</th><th>Grade</th><th>Size</th>
                      <th>Offer Qty</th><th>Allotted</th><th>Bid ₹/MT</th><th>Notified ₹/MT</th><th>Premium</th><th>Balance Qty</th><th>Status</th><th>Preview</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allRows = docs.flatMap((d, dIdx) => (d.rows || []).map((r, rIdx) => ({ ...r, _doc: d, _dIdx: dIdx, _rIdx: rIdx })));
                      const filteredRows = allRows.filter(r => {
                        const statusMatch = activeTab === "pending" ? r.status !== 'done' : r.status === 'done';
                        if (!statusMatch) return false;
                        if (!searchTerm) return true;
                        const lower = searchTerm.toLowerCase();
                        const values = [...Object.values(r), r._doc.company, r._doc.period, r._doc.contact];
                        return values.some(v => String(v || "").toLowerCase().includes(lower));
                      });

                      if (filteredRows.length === 0) {
                        return <tr><td colSpan="16" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No matching records found.</td></tr>;
                      }

                      return filteredRows.map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{r.seller}</td>
                          <td>{r._doc.contact}</td>
                          <td>{r._doc.period}</td>
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
                            <span style={{ 
                              padding: "4px 12px", 
                              borderRadius: "16px", 
                              fontSize: "12px", 
                              fontWeight: "600", 
                              display: "inline-block",
                              backgroundColor: r.status === "done" ? "#d1fae5" : "#fef3c7",
                              color: r.status === "done" ? "#065f46" : "#92400e"
                            }}>
                              {r.status === "done" ? "Done" : "Pending"}
                            </span>
                          </td>
                          <td>
                            {r._doc.pdfUrl ? (
                              <a href={r._doc.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                                View PDF
                              </a>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>-</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => handleMarkDone(r._dIdx, r._rIdx, r.dbId, r.status)} 
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid #86efac', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                              >
                                <CheckCircle size={14} /> {r.status === 'done' ? 'Undo' : 'Done'}
                              </button>
                              <button 
                                onClick={() => openEditModal(r)} 
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid #93c5fd', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                              >
                                <Edit size={14} /> Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteRow(r._dIdx, r._rIdx, r.dbId)} 
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                              >
                                <Trash size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        title={editRowInfo ? "Edit Row" : "Add Manual Entry"}
        initialData={editData || {}}
        columns={[
          { key: "company", label: "Company Name", type: "text" },
          { key: "seller", label: "Seller", type: "text" },
          { key: "contact", label: "Contact Person", type: "text" },
          { key: "period", label: "Auction Period", type: "text" },
          { key: "bidId", label: "Bid ID", type: "text" },
          { key: "source", label: "Source", type: "text" },
          { key: "mode", label: "Mode", type: "text" },
          { key: "grade", label: "Grade", type: "text" },
          { key: "size", label: "Size", type: "text" },
          { key: "offerQty", label: "Offer Qty", type: "text" },
          { key: "qtyAllotted", label: "Allotted (MT)", type: "text" },
          { key: "bidPrice", label: "Bid ₹/MT", type: "text" },
          { key: "notifiedPrice", label: "Notified ₹/MT", type: "text" },
          { key: "premium", label: "Premium", type: "text" },
          { key: "balanceQty", label: "Balance Qty", type: "text" }
        ]}
      />
    </div>
  );
}
