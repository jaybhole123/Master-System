import React, { useState, useRef, useEffect } from "react";
import { COLS } from "../utils/seclParser";
import HighlightText from "./HighlightText";
import { InfoCard } from "./Cards";
import EditModal from "./EditModal";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";

export default function SECLIntimationResults({ data, fileName, onReset, onAddFiles, onExportJson, onExportCsv, onSave, onDeleteRow, onUpdateRow, onAddManual, currentPage = 1, totalCount = 0, pageSize = 10, isFetching = false, onPageChange }) {
  const dataArray = Array.isArray(data) ? data : [data];
  const allItems = dataArray.flatMap(d => 
    (d.items || []).map(item => ({ ...item, _meta: d.meta, pdfUrl: d.pdfUrl, pdfName: d.pdfName }))
  );
  const [activeTab, setActiveTab] = useState("table");
  const [editingIndex, setEditingIndex] = useState(null);
  const fileInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  // --- COLUMN TOGGLE LOGIC ---
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef(null);

  const allTableColumns = [
    { key: "srNo", label: "S.No." },
    { key: "bidderName", label: "Name of Bidder" },
    { key: "submittedDate", label: "Submitted Date" },
    { key: "auctionDate", label: "Date of Auction" },
    { key: "sellerName", label: "Seller Name" },
    { key: "sourceName", label: "Source Name" },
    { key: "gradeSize", label: "Grade / Size" },
    { key: "qtyAllotted", label: "Quantity Allotted" },
    { key: "bidPrice", label: "Winning Bid Price Rs/MT" },
    { key: "preview", label: "Preview" },
    { key: "action", label: "Action" }
  ];

  const [visibleCols, setVisibleCols] = useState(
    allTableColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const toggleColumn = (key) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllColumns = (val) => {
    setVisibleCols(allTableColumns.reduce((acc, col) => ({ ...acc, [col.key]: val }), {}));
  };

  const filteredItems = React.useMemo(() => {
    let result = allItems;
    if (selectedDate) {
      result = result.filter(item => {
        const itemDateStr = item._meta?.["Submitted Date"];
        if (!itemDateStr) return false;
        const d = new Date(itemDateStr);
        if (isNaN(d)) return false;
        return d.getDate() === selectedDate.getDate() &&
               d.getMonth() === selectedDate.getMonth() &&
               d.getFullYear() === selectedDate.getFullYear();
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => {
        const metaValues = item._meta ? Object.values(item._meta) : [];
        const directValues = Object.values(item);
        return [...metaValues, ...directValues].some(val => 
          val && String(val).toLowerCase().includes(lower)
        );
      });
    }
    return result;
  }, [allItems, searchTerm, selectedDate]);

  const totals = React.useMemo(() => {
    let totalQty = 0;
    let totalBidPrice = 0;
    filteredItems.forEach(row => {
      // Remove any commas and parse as float
      const qtyStr = String(row["Quantity Allotted"] || "").replace(/,/g, '');
      const bidStr = String(row["Winning Bid Price (Rs/MT)"] || "").replace(/,/g, '');
      
      const qty = parseFloat(qtyStr);
      const bid = parseFloat(bidStr);
      
      if (!isNaN(qty)) totalQty += qty;
      if (!isNaN(bid)) totalBidPrice += bid;
    });
    return { totalQty, totalBidPrice };
  }, [filteredItems]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEditClick = (index) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (updatedData) => {
    const newRow = { ...updatedData };
    // Map flattened edited properties back to _meta
    if (newRow["Name of Bidder"] !== undefined || newRow["Date of Auction"] !== undefined || newRow["Submitted Date"] !== undefined) {
      newRow._meta = { ...newRow._meta };
      if (newRow["Name of Bidder"] !== undefined) newRow._meta["Name of Bidder"] = newRow["Name of Bidder"];
      if (newRow["Submitted Date"] !== undefined) newRow._meta["Submitted Date"] = newRow["Submitted Date"];
      if (newRow["Date of Auction"] !== undefined) newRow._meta["Date of Auction"] = newRow["Date of Auction"];
    }
    
    onUpdateRow && onUpdateRow(editingIndex, newRow);
    setEditingIndex(null);
  };

  const editModalCols = [
    { key: "Name of Bidder", label: "Name of Bidder" },
    { key: "Submitted Date", label: "Submitted Date" },
    { key: "Date of Auction", label: "Date of Auction" },
    { key: "Seller Name", label: "Seller Name" },
    { key: "Source Name", label: "Source Name" },
    { key: "Grade / Size", label: "Grade / Size" },
    { key: "Quantity Allotted", label: "Quantity Allotted" },
    { key: "Winning Bid Price (Rs/MT)", label: "Winning Bid Price (RS/MT)" }
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length > 0 && onAddFiles) onAddFiles(files);
    e.target.value = "";
  };

  const columnsForExport = [
    { key: "bidderName", label: "Name of Bidder" },
    { key: "submittedDate", label: "Submitted Date" },
    { key: "auctionDate", label: "Date of Auction" },
    { key: "sellerName", label: "Seller Name" },
    { key: "sourceName", label: "Source Name" },
    { key: "gradeSize", label: "Grade / Size" },
    { key: "qtyAllotted", label: "Quantity Allotted" },
    { key: "bidPrice", label: "Winning Bid Price Rs/MT" }
  ];

  const handleExportExcel = () => {
    const formatted = allItems.map(row => ({
      bidderName: row._meta?.['Name of Bidder'] || "",
      submittedDate: row._meta?.['Submitted Date'] || "",
      auctionDate: row._meta?.['Date of Auction'] || "",
      sellerName: row["Seller Name"] || "",
      sourceName: row["Source Name"] || "",
      gradeSize: row["Grade / Size"] || "",
      qtyAllotted: row["Quantity Allotted"] || "",
      bidPrice: row["Winning Bid Price (Rs/MT)"] || ""
    }));
    exportToExcel(formatted, columnsForExport, fileName || "secl_intimation");
  };

  const handleExportPdf = () => {
    const formatted = allItems.map(row => ({
      bidderName: row._meta?.['Name of Bidder'] || "",
      submittedDate: row._meta?.['Submitted Date'] || "",
      auctionDate: row._meta?.['Date of Auction'] || "",
      sellerName: row["Seller Name"] || "",
      sourceName: row["Source Name"] || "",
      gradeSize: row["Grade / Size"] || "",
      qtyAllotted: row["Quantity Allotted"] || "",
      bidPrice: row["Winning Bid Price (Rs/MT)"] || ""
    }));
    exportToPDF(formatted, columnsForExport, fileName || "secl_intimation", "SECL Intimation Summary");
  };

  return (
    <section id="results">
      {/* TOTALS CARDS */}
      {filteredItems && filteredItems.length > 0 && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "20px", flex: 1, minWidth: "240px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Quantity Allotted</div>
            <div style={{ color: "var(--text)", fontSize: "32px", fontWeight: "800", display: "flex", alignItems: "baseline", gap: "8px" }}>
              {totals.totalQty.toLocaleString('en-IN')}
              <span style={{ fontSize: "16px", color: "var(--muted)", fontWeight: "600" }}>MT</span>
            </div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "20px", flex: 1, minWidth: "240px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Winning Bid Price (Rs/MT)</div>
            <div style={{ color: "#16a34a", fontSize: "32px", fontWeight: "800", display: "flex", alignItems: "baseline" }}>
              ₹{totals.totalBidPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="results-bar">
        <div>
          <div className="results-file" id="resFileName">{fileName}</div>
          <div className="results-hint">SECL Intimation Extracted</div>
        </div>
        <div className="results-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>

          <button 
            className="btn ghost" 
            onClick={handleExportExcel} 
            style={{ 
              borderColor: "#107c41", 
              color: "#107c41", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px",
              background: "rgba(16, 124, 65, 0.04)"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="8" y1="13" x2="16" y2="13"></line>
              <line x1="8" y1="17" x2="16" y2="17"></line>
            </svg>
            EXCEL
          </button>
          <button 
            className="btn ghost" 
            onClick={handleExportPdf}
            style={{ 
              borderColor: "#d6251b", 
              color: "#d6251b", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px",
              background: "rgba(214, 37, 27, 0.04)"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M9 15h1a2 2 0 0 0 0-4H9v4Z"></path>
            </svg>
            PDF
          </button>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept=".pdf" />
          <button className="btn outline" onClick={onAddManual}>
            + ADD FORM
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            ADD PDF
          </button>
        </div>
      </div>

      <div className="results-content">

        <div className="summary-section" style={{ marginTop: 0 }}>
          <div className="summary-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div className="summary-title">Extracted Items</div>
          
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
                style={{ padding: "6px 12px 6px 30px", border: "1px solid var(--line)", borderRadius: "6px", fontSize: "13px", width: "220px", outline: "none", color: "var(--text)", background: "transparent" }}
              />
            </div>
            
            {/* DATE NAVIGATOR */}
            <div style={{ display: "flex", alignItems: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "4px" }}>
                <button 
                  onClick={() => setSelectedDate(prev => prev ? (function(){ const d = new Date(prev); d.setDate(d.getDate() - 1); return d; })() : new Date())}
                  style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: "pointer", color: "#64748b" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                
                <button 
                  onClick={() => setSelectedDate(new Date())}
                  style={{ margin: "0 2px", padding: "0 10px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: selectedDate ? "#fef2f2" : "transparent", color: selectedDate ? "#dc2626" : "#64748b", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                >
                  Today
                </button>

                <button 
                  onClick={() => setSelectedDate(null)}
                  style={{ margin: "0 2px", padding: "0 10px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: !selectedDate ? "#fef2f2" : "transparent", color: !selectedDate ? "#dc2626" : "#64748b", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                >
                  All
                </button>
                
                <button 
                  onClick={() => setSelectedDate(prev => prev ? (function(){ const d = new Date(prev); d.setDate(d.getDate() + 1); return d; })() : new Date())}
                  style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: "pointer", color: "#64748b" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
              
              <div style={{ width: "1px", height: "20px", background: "#e2e8f0", margin: "0 4px" }}></div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 14px", color: "#0f172a", fontSize: "14px", fontWeight: "600", minWidth: "130px", justifyContent: "center", whiteSpace: "nowrap" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {selectedDate ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "All Dates"}
              </div>
            </div>

            {/* COLUMNS TOGGLE DROPDOWN */}
            <div style={{ position: "relative" }} ref={columnDropdownRef}>
              <button 
                className="btn ghost" 
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "6px", padding: "6px 12px", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "all 0.15s ease" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                Columns
              </button>
              {showColumnDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "220px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", zIndex: 100, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", fontSize: "13px", fontWeight: "600", color: "var(--text)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Toggle Columns</span>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", gap: "12px", borderBottom: "1px solid var(--line)", fontSize: "12px", background: "rgba(0,0,0,0.02)" }}>
                    <button onClick={() => setAllColumns(true)} style={{ color: "var(--primary, #dc2626)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}>Select All</button>
                    <button onClick={() => setAllColumns(false)} style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "500" }}>Deselect All</button>
                  </div>
                  <div style={{ maxHeight: "220px", overflowY: "auto", padding: "8px 0" }}>
                    {allTableColumns.map(col => (
                      <label key={col.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", cursor: "pointer", transition: "background 0.15s ease", color: "var(--text)" }} onMouseOver={e => e.currentTarget.style.background="rgba(0,0,0,0.04)"} onMouseOut={e => e.currentTarget.style.background="transparent"}>
                        <input 
                          type="checkbox" 
                          checked={visibleCols[col.key] || false}
                          onChange={(e) => setVisibleCols(prev => ({ ...prev, [col.key]: e.target.checked }))}
                          style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary, #dc2626)" }}
                        />
                        <span style={{ fontSize: "13px", userSelect: "none" }}>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
          <div className="summary-table-wrap">
            {filteredItems && filteredItems.length > 0 ? (
              <table className="stable">
                <thead>
                  <tr>
                    {visibleCols.srNo && <th style={{ width: "50px", textAlign: "center" }}>S.No.</th>}
                    {visibleCols.bidderName && <th>Name of Bidder</th>}
                    {visibleCols.submittedDate && <th>Submitted Date</th>}
                    {visibleCols.auctionDate && <th>Date of Auction</th>}
                    {visibleCols.sellerName && <th>Seller Name</th>}
                    {visibleCols.sourceName && <th>Source Name</th>}
                    {visibleCols.gradeSize && <th>Grade / Size</th>}
                    {visibleCols.qtyAllotted && <th>Quantity Allotted</th>}
                    {visibleCols.bidPrice && <th>Winning Bid Price Rs/MT</th>}
                    {visibleCols.preview && <th>Preview</th>}
                    {visibleCols.action && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((row, i) => {
                    return (
                      <tr key={i}>
                        {visibleCols.srNo && <td data-label="S.No." style={{ textAlign: "center", fontWeight: "600", color: "var(--muted)", fontSize: "13px", fontFamily: "var(--font-mono, monospace)" }}>{String((currentPage - 1) * pageSize + i + 1).padStart(2, "0")}</td>}
                        {visibleCols.bidderName && <td data-label="Name of Bidder" style={{ fontWeight: "600", color: "var(--text)" }}><HighlightText text={row._meta?.['Name of Bidder'] || "—"} highlight={searchTerm} /></td>}
                        {visibleCols.submittedDate && <td data-label="Submitted Date"><HighlightText text={row._meta?.['Submitted Date'] || "—"} highlight={searchTerm} /></td>}
                        {visibleCols.auctionDate && <td data-label="Date of Auction"><HighlightText text={row._meta?.['Date of Auction'] || "—"} highlight={searchTerm} /></td>}
                        {visibleCols.sellerName && <td data-label="Seller Name"><HighlightText text={row["Seller Name"] || "—"} highlight={searchTerm} /></td>}
                        {visibleCols.sourceName && <td data-label="Source Name"><HighlightText text={row["Source Name"] || "—"} highlight={searchTerm} /></td>}
                        {visibleCols.gradeSize && <td data-label="Grade / Size"><HighlightText text={row["Grade / Size"] || "—"} highlight={searchTerm} /></td>}
                        {visibleCols.qtyAllotted && <td data-label="Quantity Allotted"><HighlightText text={row["Quantity Allotted"] != null && row["Quantity Allotted"] !== "" ? String(row["Quantity Allotted"]) : "—"} highlight={searchTerm} /></td>}
                        {visibleCols.bidPrice && <td data-label="Winning Bid Price Rs/MT"><HighlightText text={row["Winning Bid Price (Rs/MT)"] != null && row["Winning Bid Price (Rs/MT)"] !== "" ? String(row["Winning Bid Price (Rs/MT)"]) : "—"} highlight={searchTerm} /></td>}
                        {visibleCols.preview && <td data-label="Preview">
                          {row.pdfUrl ? (
                            <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                              View PDF
                            </a>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>-</span>
                          )}
                        </td>}
                        {visibleCols.action && (
                          <td data-label="Action">
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                              <button
                                style={{
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                                  padding: "4px 8px", fontSize: "11px", fontWeight: "500", borderRadius: "4px",
                                  border: "1px solid rgba(37, 99, 235, 0.3)", background: "transparent",
                                  color: "var(--primary, #dc2626)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(37, 99, 235, 0.1)"; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                                onClick={() => handleEditClick(i)}
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit
                              </button>
                              <button
                                style={{
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                                  padding: "4px 8px", fontSize: "11px", fontWeight: "500", borderRadius: "4px",
                                  border: "1px solid rgba(220, 38, 38, 0.3)", background: "transparent", color: "#dc2626",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.15s ease",
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)"; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                                onClick={() => { if(window.confirm("Are you sure you want to delete this row?")) { onDeleteRow && onDeleteRow(i); } }}
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
                No items found in the PDF.
              </div>
            )}
          </div>

          {/* PAGINATION CONTROLS */}
          {onPageChange && totalCount > pageSize && (() => {
            const totalPages = Math.ceil(totalCount / pageSize);
            const pages = [];
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);
            for (let p = startPage; p <= endPage; p++) pages.push(p);

            return (
              <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                  {isFetching ? "Loading..." : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} records`}
                </div>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isFetching}
                    style={{ padding: "5px 10px", borderRadius: "5px", border: "1px solid var(--line)", background: currentPage <= 1 ? "#f3f4f6" : "white", cursor: currentPage <= 1 ? "not-allowed" : "pointer", color: currentPage <= 1 ? "#9ca3af" : "var(--text)", fontSize: "13px", fontWeight: "500" }}
                  >← Prev</button>
                  {startPage > 1 && <span style={{ padding: "0 4px", color: "var(--muted)" }}>...</span>}
                  {pages.map(p => (
                    <button
                      key={p}
                      onClick={() => onPageChange(p)}
                      disabled={isFetching}
                      style={{ padding: "5px 10px", borderRadius: "5px", border: `1px solid ${p === currentPage ? "var(--primary)" : "var(--line)"}`, background: p === currentPage ? "var(--primary)" : "white", color: p === currentPage ? "white" : "var(--text)", fontWeight: p === currentPage ? "700" : "400", cursor: "pointer", fontSize: "13px", minWidth: "34px" }}
                    >{p}</button>
                  ))}
                  {endPage < totalPages && <span style={{ padding: "0 4px", color: "var(--muted)" }}>...</span>}
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isFetching}
                    style={{ padding: "5px 10px", borderRadius: "5px", border: "1px solid var(--line)", background: currentPage >= totalPages ? "#f3f4f6" : "white", cursor: currentPage >= totalPages ? "not-allowed" : "pointer", color: currentPage >= totalPages ? "#9ca3af" : "var(--text)", fontSize: "13px", fontWeight: "500" }}
                  >Next →</button>
                </div>
              </div>
            );
          })()}

          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", background: "var(--panel)", borderBottomLeftRadius: "var(--radius)", borderBottomRightRadius: "var(--radius)" }}>
            <button className="btn" onClick={onSave} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--ember-bright)", color: "white", padding: "8px 24px", fontSize: "14px", fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              SAVE DATA
            </button>
          </div>
        </div>
      </div>
      
      <EditModal
        isOpen={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        onSave={handleSaveEdit}
        title="Edit SECL Intimation"
        initialData={editingIndex !== null ? {
          ...allItems[editingIndex],
          "Name of Bidder": allItems[editingIndex]._meta?.["Name of Bidder"] || "",
          "Submitted Date": allItems[editingIndex]._meta?.["Submitted Date"] || "",
          "Date of Auction": allItems[editingIndex]._meta?.["Date of Auction"] || "",
        } : null}
        columns={editModalCols}
      />
    </section>
  );
}
