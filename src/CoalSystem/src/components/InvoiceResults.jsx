import { useRef, useState, useEffect, useMemo } from "react";
import { INVOICE_COLS } from "../utils/invoiceParser";
import EditModal from "./EditModal";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";
import HighlightText from "./HighlightText";

export default function InvoiceResults({ data, fileName, onReset, onAddFiles, onExportJson, onExportCsv, onSave, onDeleteRow, onUpdateRow, onAddManual }) {
  const dataArray = Array.isArray(data) ? data : [data];
  const allItems = dataArray;
  const fileInputRef = useRef(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  // --- COLUMN TOGGLE LOGIC ---
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef(null);

  const allTableColumns = [
    { key: "row_num", label: "#" },
    ...INVOICE_COLS,
    { key: "submittedDate", label: "Submitted Date" },
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

  const filteredItems = useMemo(() => {
    let result = allItems;

    if (selectedDate) {
      result = result.filter(item => {
        if (!item.submittedDate && !item.createdAt) return true;
        const itemDate = new Date(item.submittedDate || item.createdAt);
        if (isNaN(itemDate)) return false;
        
        return itemDate.getDate() === selectedDate.getDate() &&
               itemDate.getMonth() === selectedDate.getMonth() &&
               itemDate.getFullYear() === selectedDate.getFullYear();
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(val => 
          val && String(val).toLowerCase().includes(lower)
        )
      );
    }
    return result;
  }, [allItems, searchTerm, selectedDate]);

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
    onUpdateRow && onUpdateRow(editingIndex, updatedData);
    setEditingIndex(null);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length > 0 && onAddFiles) onAddFiles(files);
    e.target.value = "";
  };

  // ── KPI Summary Statistics ──
  const stats = useMemo(() => {
    const list = filteredItems || [];
    let totalQty = 0;
    let totalAmt = 0;
    const suppliers = new Set();
    const buyers = new Set();

    list.forEach(item => {
      // Quantity parsing
      if (item.totalQuantity) {
        const qMatch = String(item.totalQuantity).match(/([0-9.,]+)/);
        if (qMatch) {
          const num = parseFloat(qMatch[1].replace(/,/g, ''));
          if (!isNaN(num)) totalQty += num;
        }
      }

      // Amount parsing
      if (item.totalAmount) {
        const aNum = typeof item.totalAmount === 'number' 
          ? item.totalAmount 
          : parseFloat(String(item.totalAmount).replace(/,/g, ''));
        if (!isNaN(aNum)) totalAmt += aNum;
      }

      if (item.supplierName && String(item.supplierName).trim()) {
        suppliers.add(String(item.supplierName).trim().toUpperCase());
      }
      if (item.buyerName && String(item.buyerName).trim()) {
        buyers.add(String(item.buyerName).trim().toUpperCase());
      }
    });

    return {
      count: list.length,
      totalQty: totalQty.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      totalAmt: totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      suppliersCount: suppliers.size,
      buyersCount: buyers.size
    };
  }, [filteredItems]);

  const handleExportExcel = () => {
    exportToExcel(allItems, INVOICE_COLS, fileName || "invoices");
  };

  const handleExportPdf = () => {
    exportToPDF(allItems, INVOICE_COLS, fileName || "invoices", "Invoices Summary");
  };

  return (
    <section id="results" style={{ marginTop: "8px" }}>
      {/* ── Modern KPI Summary Cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {/* Card 1: Total Invoices */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
              Total Invoices
            </div>
            <div style={{ color: "#0f172a", fontSize: "28px", fontWeight: "900", lineHeight: "1.1", letterSpacing: "-0.02em", fontFamily: "var(--font-mono, monospace)" }}>
              {stats.count}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "6px", fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb", display: "inline-block" }}></span>
              {selectedDate ? "Filtered Date" : "All Processed"}
            </div>
          </div>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#eff6ff",
            border: "1px solid #dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2563eb",
            boxShadow: "0 1px 2px rgba(37, 99, 235, 0.08)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
        </div>

        {/* Card 2: Total Quantity */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
              Total Quantity
            </div>
            <div style={{ color: "#0f172a", fontSize: "28px", fontWeight: "900", lineHeight: "1.1", letterSpacing: "-0.02em", fontFamily: "var(--font-mono, monospace)" }}>
              {stats.totalQty} <span style={{ fontSize: "14px", fontWeight: "800", color: "#64748b" }}>MT</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "6px", fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7c3aed", display: "inline-block" }}></span>
              Dispatched Weight
            </div>
          </div>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#f5f3ff",
            border: "1px solid #ede9fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#7c3aed",
            boxShadow: "0 1px 2px rgba(124, 58, 237, 0.08)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
        </div>

        {/* Card 3: Total Amount */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
              Total Amount
            </div>
            <div style={{ color: "#0f172a", fontSize: "28px", fontWeight: "900", lineHeight: "1.1", letterSpacing: "-0.02em", fontFamily: "var(--font-mono, monospace)" }}>
              ₹{stats.totalAmt}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "6px", fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }}></span>
              Gross Invoice Value
            </div>
          </div>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#f0fdf4",
            border: "1px solid #dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#16a34a",
            boxShadow: "0 1px 2px rgba(22, 163, 74, 0.08)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>

        {/* Card 4: Parties / Network */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
              Parties / Network
            </div>
            <div style={{ color: "#0f172a", fontSize: "28px", fontWeight: "900", lineHeight: "1.1", letterSpacing: "-0.02em", fontFamily: "var(--font-mono, monospace)" }}>
              {stats.buyersCount} <span style={{ fontSize: "14px", fontWeight: "800", color: "#64748b" }}>Buyers</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "6px", fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ea580c", display: "inline-block" }}></span>
              {stats.suppliersCount} Supplier{stats.suppliersCount !== 1 ? 's' : ''} Active
            </div>
          </div>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#fff7ed",
            border: "1px solid #ffedd5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ea580c",
            boxShadow: "0 1px 2px rgba(234, 88, 12, 0.08)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="results-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--line)", marginBottom: "16px" }}>
        <div style={{ display: "none" }}>
          <div className="results-file" id="resFileName">{fileName}</div>
          <div className="results-hint">Invoice Extracted</div>
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
            UPLOAD PDF
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
                style={{ padding: "6px 12px 6px 30px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", width: "220px", outline: "none", color: "var(--text)" }}
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
                  style={{ margin: "0 2px", padding: "0 10px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: selectedDate && selectedDate.toDateString() === new Date().toDateString() ? "#fef2f2" : "transparent", color: selectedDate && selectedDate.toDateString() === new Date().toDateString() ? "#dc2626" : "#64748b", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
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
                {selectedDate ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "All Data"}
              </div>
            </div>

            {/* COLUMNS TOGGLE DROPDOWN */}
            <div style={{ position: "relative" }} ref={columnDropdownRef}>
              <button 
                className="btn ghost" 
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid var(--line)", borderRadius: "6px", padding: "6px 12px", background: "var(--panel)", color: "var(--text)", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "all 0.15s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "var(--panel)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                Columns
              </button>
              {showColumnDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "220px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", zIndex: 100, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", fontSize: "13px", fontWeight: "600", color: "var(--text)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Toggle Columns</span>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", gap: "12px", borderBottom: "1px solid var(--line)", fontSize: "12px", background: "var(--bg)" }}>
                    <button onClick={() => setAllColumns(true)} style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}>Select All</button>
                    <button onClick={() => setAllColumns(false)} style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "500" }}>Deselect All</button>
                  </div>
                  <div style={{ maxHeight: "220px", overflowY: "auto", padding: "8px 0" }}>
                    {allTableColumns.map(col => (
                      <label key={col.key} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", color: "var(--text)", transition: "background 0.15s", userSelect: "none" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                        <input 
                          type="checkbox" 
                          checked={visibleCols[col.key]} 
                          onChange={() => toggleColumn(col.key)} 
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb", margin: 0 }}
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
      </div>

      <div className="results-content">
        <div className="summary-section" style={{ marginTop: 0 }}>
          <div className="summary-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div className="summary-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Extracted Invoice Items</span>
              <span style={{ fontSize: "12px", fontWeight: "700", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "10px" }}>
                {filteredItems.length} Records
              </span>
            </div>
          </div>
          <div className="summary-table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflowX: "auto", overflowY: "visible", width: "100%", maxWidth: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            {filteredItems && filteredItems.length > 0 ? (
              <table className="stable" style={{ width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    {visibleCols.row_num && <th style={{ textAlign: "center", width: "45px", color: "#64748b", fontWeight: 700, padding: "12px 8px" }}>#</th>}
                    {INVOICE_COLS.map((c) => (
                      visibleCols[c.key] && (
                        <th 
                          key={c.key} 
                          style={{ 
                            color: "#475569", 
                            fontWeight: 700, 
                            fontSize: "12px", 
                            letterSpacing: "0.5px", 
                            padding: "12px 14px",
                            textAlign: (c.key === "totalQuantity" || c.key === "rate" || c.key === "totalAmount") ? "right" : "left",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {c.label}
                        </th>
                      )
                    ))}
                    {visibleCols.submittedDate && <th style={{ color: "#475569", fontWeight: 700, fontSize: "12px", padding: "12px 14px", whiteSpace: "nowrap" }}>Submitted Date</th>}
                    {visibleCols.preview && <th style={{ color: "#475569", fontWeight: 700, fontSize: "12px", textAlign: "center", width: "60px", padding: "12px 8px" }}>Preview</th>}
                    {visibleCols.action && <th style={{ color: "#475569", fontWeight: 700, fontSize: "12px", textAlign: "center", width: "110px", padding: "12px 10px" }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((row, i) => {
                    const isEven = i % 2 === 0;
                    return (
                      <tr 
                        key={i} 
                        style={{ 
                          backgroundColor: isEven ? "#ffffff" : "#fcfcfd",
                          transition: "background-color 0.15s ease",
                          borderBottom: "1px solid #f1f5f9"
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isEven ? "#ffffff" : "#fcfcfd"; }}
                      >
                        {visibleCols.row_num && (
                          <td style={{ textAlign: "center", fontWeight: "700", color: "#94a3b8", fontSize: "12px", fontFamily: "monospace", padding: "10px 8px" }}>
                            {String(i + 1).padStart(2, '0')}
                          </td>
                        )}
                        {INVOICE_COLS.map((c) => {
                          if (!visibleCols[c.key]) return null;
                          const val = row[c.key] || "—";
                          
                          // Style specific columns for high readability
                          if (c.key === "invoiceNo") {
                            return (
                              <td key={c.key} style={{ fontWeight: 700, color: "#0f172a", fontFamily: "monospace", padding: "10px 14px", whiteSpace: "nowrap" }}>
                                <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                  <HighlightText text={val} highlight={searchTerm} />
                                </span>
                              </td>
                            );
                          }
                          if (c.key === "invoiceDate") {
                            return (
                              <td key={c.key} style={{ fontWeight: 600, color: "#334155", padding: "10px 14px", whiteSpace: "nowrap" }}>
                                <HighlightText text={val} highlight={searchTerm} />
                              </td>
                            );
                          }
                          if (c.key === "irn") {
                            return (
                              <td key={c.key} style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "10px 14px" }} title={val}>
                                <HighlightText text={val} highlight={searchTerm} />
                              </td>
                            );
                          }
                          if (c.key === "buyerGSTIN") {
                            return (
                              <td key={c.key} style={{ fontFamily: "monospace", fontWeight: 600, color: "#475569", padding: "10px 14px", whiteSpace: "nowrap" }}>
                                <HighlightText text={val} highlight={searchTerm} />
                              </td>
                            );
                          }
                          if (c.key === "supplierName") {
                            return (
                              <td key={c.key} style={{ fontWeight: 700, color: "#1e293b", padding: "10px 14px" }}>
                                <HighlightText text={val} highlight={searchTerm} />
                              </td>
                            );
                          }
                          if (c.key === "totalQuantity") {
                            return (
                              <td key={c.key} style={{ textAlign: "right", fontWeight: 700, color: "#0f172a", fontFamily: "monospace", padding: "10px 14px" }}>
                                <HighlightText text={val} highlight={searchTerm} />
                              </td>
                            );
                          }
                          if (c.key === "totalAmount") {
                            return (
                              <td key={c.key} style={{ textAlign: "right", fontWeight: 800, color: "#15803d", fontFamily: "monospace", padding: "10px 14px", whiteSpace: "nowrap" }}>
                                {val !== "—" && !String(val).startsWith("₹") ? `₹${val}` : <HighlightText text={val} highlight={searchTerm} />}
                              </td>
                            );
                          }
                          if (c.key === "rate") {
                            return (
                              <td key={c.key} style={{ textAlign: "right", fontWeight: 600, color: "#334155", fontFamily: "monospace", padding: "10px 14px" }}>
                                <HighlightText text={val} highlight={searchTerm} />
                              </td>
                            );
                          }

                          return (
                            <td key={c.key} style={{ padding: "10px 14px", color: "#334155" }}>
                              <HighlightText text={val} highlight={searchTerm} />
                            </td>
                          );
                        })}
                        {visibleCols.submittedDate && (
                          <td data-label="Submitted Date" style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>
                            {row.submittedDate ? new Date(row.submittedDate).toLocaleDateString('en-GB') : "—"}
                          </td>
                        )}
                        {visibleCols.preview && (
                          <td data-label="Preview" style={{ textAlign: "center", padding: "10px 8px" }}>
                            {row.pdfUrl ? (
                              (() => {
                                const isImg = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(row.fileName || row.pdfUrl);
                                const bg = isImg ? "#f5f3ff" : "#fff1f1";
                                const border = isImg ? "#ddd6fe" : "#fed7d7";
                                const accent = isImg ? "#7c3aed" : "#dc2626";

                                return (
                                  <a
                                    href={row.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={isImg ? "View Image" : "View PDF"}
                                    style={{
                                      display: "inline-flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "3px 6px",
                                      borderRadius: "6px",
                                      background: bg,
                                      border: `1px solid ${border}`,
                                      textDecoration: "none",
                                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                      transition: "all 0.15s ease",
                                      cursor: "pointer"
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                      <polyline points="14 2 14 8 20 8"></polyline>
                                      <line x1="9" y1="13" x2="15" y2="13"></line>
                                      <line x1="9" y1="17" x2="15" y2="17"></line>
                                    </svg>
                                    <span style={{
                                      fontSize: "7.5px",
                                      fontWeight: "800",
                                      color: accent,
                                      letterSpacing: "0.3px",
                                      lineHeight: 1,
                                      marginTop: "1.5px"
                                    }}>
                                      {isImg ? "IMG" : "PDF"}
                                    </span>
                                  </a>
                                );
                              })()
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                        )}
                        {visibleCols.action && (
                          <td data-label="Action" style={{ textAlign: "center", padding: "10px 8px" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                              <button
                                style={{
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                                  padding: "5px 9px", fontSize: "11px", fontWeight: "600", borderRadius: "6px",
                                  border: "1px solid #bfdbfe", background: "#eff6ff",
                                  color: "#1d4ed8", boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = "#dbeafe"; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
                                onClick={() => handleEditClick(i)}
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit
                              </button>
                              <button
                                style={{
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                                  padding: "5px 9px", fontSize: "11px", fontWeight: "600", borderRadius: "6px",
                                  border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)", transition: "all 0.15s ease",
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                                onClick={() => { if(window.confirm("Are you sure you want to delete this row?")) { onDeleteRow && onDeleteRow(i); } }}
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Delete
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
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                No items found in the PDF.
              </div>
            )}
          </div>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", background: "var(--panel)", borderBottomLeftRadius: "var(--radius)", borderBottomRightRadius: "var(--radius)" }}>
            <button className="btn" onClick={onSave} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--primary, #dc2626)", color: "white", padding: "9px 24px", fontSize: "14px", fontWeight: "700", border: "none", borderRadius: "8px", cursor: "pointer", boxShadow: "0 2px 5px rgba(220, 38, 38, 0.25)" }}>
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
        title="Edit Invoice"
        initialData={editingIndex !== null ? allItems[editingIndex] : null}
        columns={INVOICE_COLS}
      />
    </section>
  );
}
