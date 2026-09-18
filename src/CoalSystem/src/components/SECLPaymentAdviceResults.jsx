import React, { useRef, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import EditModal from "./EditModal";
import { exportToPDF } from "../utils/exportHelpers";
import HighlightText from "./HighlightText";

export default function SECLPaymentAdviceResults({ data, fileName, onReset, onAddFiles, onSave, onDeleteRow, onUpdateRow, onAddManual, onPageChange, totalCount, isFetching }) {
  const fileInputRef = useRef(null);
  const observerRef = useRef(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleEditClick = (index) => setEditingIndex(index);
  const handleSaveEdit = (updatedData) => {
    onUpdateRow && onUpdateRow(editingIndex, updatedData);
    setEditingIndex(null);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length > 0 && onAddFiles) onAddFiles(files);
    e.target.value = "";
  };

  const getDaysLeft = (validToDateStr) => {
    if (!validToDateStr || validToDateStr === "-" || validToDateStr === "Not Found") return "-";
    const validTo = new Date(validToDateStr);
    if (isNaN(validTo)) return "-";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validTo.setHours(0, 0, 0, 0);
    
    const diffTime = validTo - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Expired";
    return `${diffDays} days left`;
  };

  const getExpiredDays = (validToDateStr) => {
    if (!validToDateStr || validToDateStr === "-" || validToDateStr === "Not Found") return null;
    const validTo = new Date(validToDateStr);
    if (isNaN(validTo)) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validTo.setHours(0, 0, 0, 0);

    const diffTime = today - validTo;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : null;
  };

  // Ensure data is array
  const allItems = Array.isArray(data) ? data : [data];

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && onPageChange && !isFetching && allItems.length < totalCount) {
          onPageChange();
        }
      },
      { threshold: 1.0 }
    );
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, [onPageChange, isFetching, allItems.length, totalCount]);


  const filteredItems = useMemo(() => {
    let result = allItems;

    if (selectedDate) {
      result = result.filter(item => {
        // Always show newly uploaded (unsaved) records that don't have a createdAt date yet
        if (!item.createdAt) return true;
        
        const itemDate = new Date(item.createdAt);
        if (isNaN(itemDate)) return false;
        
        return itemDate.getDate() === selectedDate.getDate() &&
               itemDate.getMonth() === selectedDate.getMonth() &&
               itemDate.getFullYear() === selectedDate.getFullYear();
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

  const statusCounts = useMemo(() => {
    let expired = 0;
    let valid = 0;
    filteredItems.forEach(d => {
      const daysLeft = getDaysLeft(d.dueDate);
      if (daysLeft === "Expired") {
        expired++;
      } else {
        valid++;
      }
    });
    return { expired, valid };
  }, [filteredItems]);

  // Grouping logic (matching HTML exactly)
  const { groups, order, tQty, tAmt, tGrand, tTcs, tInclTotal } = useMemo(() => {
    const groups = {};
    const order = [];
    let tQty = 0, tAmt = 0, tGrand = 0, tTcs = 0, tInclTotal = 0;

    filteredItems.forEach((rec, index) => {
      // Add a stable index property for Edit/Delete ops if not already present
      const r = { ...rec, _originalIndex: index };
      
      const cn = r.customerName || "Unknown";
      if (!groups[cn]) {
        groups[cn] = { name: cn, rows: [], qty: 0, req: 0, grand: 0, invoices: 0, tcs: 0, inclTotal: 0 };
        order.push(cn);
      }
      const g = groups[cn];
      g.rows.push(r);
      g.invoices++;
      
      if (r.quantity) { g.qty += r.quantity; tQty += r.quantity; }
      if (r.requisitePayment) { g.req += r.requisitePayment; tAmt += r.requisitePayment; }
      if (r.grandTotal) { g.grand += r.grandTotal; tGrand += r.grandTotal; }
      if (r.tcsAmount) { g.tcs += r.tcsAmount; tTcs += r.tcsAmount; }
      if (r.inclTotal !== null && r.inclTotal !== undefined) { 
        g.inclTotal += r.inclTotal; 
        tInclTotal += r.inclTotal; 
      }
    });
    
    return { groups, order, tQty, tAmt, tGrand, tTcs, tInclTotal };
  }, [filteredItems]);

  // Excel Export matching the HTML logic
  const handleExportExcel = () => {
    if (!allItems.length) {
      alert("No data to export.");
      return;
    }
    const headers = ['S.No', 'Mines Name', 'Customer Name', 'Quantity (MT)', 'Requisite Payment (INR)', 'Grand Total incl. EMD', 'Auction Date', 'Due Date', 'Bid Price PMT', 'Including 50 PMT', 'Including 50 Total', 'TCS'];
    const exportData = [];
    let exSno = 0;

    order.forEach(cn => {
      const g = groups[cn];
      g.rows.forEach(r => {
        exSno++;
        const safeNum = (v) => (v === null || v === undefined || isNaN(v)) ? 'Not Found' : Number(Number(v).toFixed(2));
        const inclTotalEx = (r.inclTotal !== null && r.inclTotal !== undefined) ? r.inclTotal : null;
        
        exportData.push([
          exSno,
          r.minesName,
          r.customerName,
          r.quantity !== null ? r.quantity : 'Not Found',
          r.requisitePayment !== null ? r.requisitePayment : 'Not Found',
          r.grandTotal !== null ? r.grandTotal : 'Not Found',
          r.auctionDate || 'Not Found',
          r.dueDate,
          r.bidPrice !== null ? r.bidPrice : 'Not Found',
          safeNum(r.incl50),
          inclTotalEx !== null ? Number(inclTotalEx.toFixed(2)) : 'Not Found',
          r.tcsAmount || 0
        ]);
      });
      // Party subtotal row
      exportData.push([
        '',
        '↳ ' + g.name + ' (' + g.invoices + ' invoices)',
        '',
        g.qty,
        '₹' + g.req.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        '₹' + g.grand.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        '', '', '', '',
        '₹' + g.inclTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        g.tcs ? '₹' + g.tcs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
    ws['!cols'] = [6, 22, 28, 14, 26, 20, 14, 18, 14, 18, 18, 16].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Advice');
    
    const cleanName = (fileName || "secl_payment_advice").replace(/\.[^/.]+$/, "");
    XLSX.writeFile(wb, `${cleanName}.xlsx`);
  };

  const handleExportPdf = () => {
    exportToPDF(allItems, EDIT_COLS, fileName || "secl_payment_advice", "SECL Payment Advice Summary");
  };

  const rd2 = (v) => (v === null || v === undefined || isNaN(v)) ? null : Math.round(v * 100) / 100;
  const formatN = (v) => (v === null || v === undefined || isNaN(v)) ? "Not Found" : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatINR = (v) => (v === null || v === undefined || isNaN(v)) ? "Not Found" : `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const EDIT_COLS = [
    { key: "minesName", dbKey: "mines_name", label: "Mines Name" },
    { key: "customerName", dbKey: "customer_name", label: "Customer Name" },
    { key: "quantity", dbKey: "quantity", label: "Quantity (MT)" },
    { key: "requisitePayment", dbKey: "requisite_payment", label: "Requisite Payment" },
    { key: "grandTotal", dbKey: "grand_total", label: "Grand Total" },
    { key: "auctionDate", label: "Auction Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "bidPrice", dbKey: "bid_price", label: "Bid Price" },
    { key: "incl50", dbKey: "incl_50", label: "Including 50 PMT" },
    { key: "inclTotal", dbKey: "incl_total", label: "Including 50 Total" },
    { key: "tcsAmount", dbKey: "tcs_amount", label: "TCS Amount" }
  ];

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef(null);

  const allTableColumns = [
    { key: "sno", label: "S.No" },
    { key: "minesName", label: "Mines Name" },
    { key: "customerName", label: "Customer Name" },
    { key: "quantity", label: "Quantity (MT)" },
    { key: "amount", label: "Amount" },
    { key: "grandTotal", label: "Grand Total" },
    { key: "auctionDate", label: "Auction Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "bidPrice", label: "Bid Price" },
    { key: "incl50", label: "Including 50" },
    { key: "createdAt", label: "Submitted Date" },
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

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <section id="results">
      {/* ACTION BAR */}
      <div className="results-bar">
        <div>
          <div className="results-file" id="resFileName">{fileName}</div>
          <div className="results-hint">SECL Payment Advice Analyzer</div>
        </div>
        <div className="results-actions" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>

          <button className="btn ghost" onClick={handleExportExcel} style={{ borderColor: "#107c41", color: "#107c41", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 124, 65, 0.04)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
            EXCEL
          </button>
          <button className="btn ghost" onClick={handleExportPdf} style={{ borderColor: "#d6251b", color: "#d6251b", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(214, 37, 27, 0.04)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15h1a2 2 0 0 0 0-4H9v4Z"></path></svg>
            PDF
          </button>
          
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept=".pdf" />
          <button className="btn outline" onClick={onAddManual}>+ MANUAL ENTRY</button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>ADD PDF</button>
        </div>
      </div>

      <div className="results-content">
        {/* TOTALS CARDS */}
        {allItems && allItems.length > 0 && (
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "20px", flex: 1, minWidth: "240px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Valid</div>
              <div className="blink-text" style={{ color: "#16a34a", fontSize: "32px", fontWeight: "800", display: "flex", alignItems: "baseline", gap: "8px" }}>
                {statusCounts.valid}
              </div>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "20px", flex: 1, minWidth: "240px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Expired</div>
              <div className="blink-text" style={{ color: "#dc2626", fontSize: "32px", fontWeight: "800", display: "flex", alignItems: "baseline" }}>
                {statusCounts.expired}
              </div>
            </div>
          </div>
        )}

        {/* PARTY CARDS */}
        {order.length > 0 && (
          <div className="party-cards show" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
            {order.map(cn => {
              const g = groups[cn];
              return (
                <div key={cn} className="party-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "16px 20px", minWidth: "240px", flex: 1 }}>
                  <div className="pc-name" style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "10px", letterSpacing: "0.3px" }}>{g.name}</div>
                  <div className="pc-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", marginBottom: "5px", fontWeight: 600 }}>
                    <span className="pc-label" style={{ color: "var(--muted)" }}>Invoices</span>
                    <span className="pc-val green" style={{ color: "#3fb950" }}>{g.invoices}</span>
                  </div>
                  <div className="pc-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", marginBottom: "5px", fontWeight: 600 }}>
                    <span className="pc-label" style={{ color: "var(--muted)" }}>Total Qty (MT)</span>
                    <span className="pc-val gold" style={{ color: "#e3b341" }}>{g.qty.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pc-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", marginBottom: "5px", fontWeight: 600 }}>
                    <span className="pc-label" style={{ color: "var(--muted)" }}>Requisite Payment</span>
                    <span className="pc-val gold" style={{ color: "#e3b341" }}>₹{g.req.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: "20px" }}>
        <button 
          onClick={() => setActiveTab("summary")}
          style={{
            background: "none",
            border: "none",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            color: activeTab === "summary" ? "var(--primary, #dc2626)" : "var(--muted)",
            borderBottom: activeTab === "summary" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Extracted Payment Records
        </button>
        <button 
          onClick={() => setActiveTab("leftDays")}
          style={{
            background: "none",
            border: "none",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            color: activeTab === "leftDays" ? "var(--primary, #dc2626)" : "var(--muted)",
            borderBottom: activeTab === "leftDays" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Left Days Summary
        </button>
      </div>

      {/* ── Shared Toolbar ── */}
      <div className="toolbar-wrapper">
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
            {selectedDate ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "All Data"}
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
                      onChange={() => toggleColumn(col.key)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary, #dc2626)", margin: 0 }}
                    />
                    <span style={{ fontSize: "13px", userSelect: "none" }}>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* LEFT DAYS SUMMARY TABLE */}
        {activeTab === "leftDays" && filteredItems.length > 0 && (
          <div className="table-card" style={{ marginTop: 24, marginBottom: 24 }}>
            <div className="table-header">
              <div className="table-title">Left Days Summary</div>
            </div>
            <div className="table-scroll" style={{ overflowX: "auto" }}>
              <table className="stable">
                <thead>
                  <tr>
                    <th className="r">S.No</th>
                    <th>Mines Name</th>
                    <th>Customer Name</th>
                    <th>Left Days</th>
                    <th>Days Since Expired</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((d, index) => {
                    const daysLeft = getDaysLeft(d.dueDate);
                    const isExpired = daysLeft === "Expired";
                    const expiredDays = getExpiredDays(d.dueDate);
                    return (
                      <tr key={`left-days-${index}`}>
                        <td data-label="S.No" className="sno" style={{ textAlign: "center" }}>{String(index + 1).padStart(2, '0')}</td>
                        <td data-label="Mines Name" style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text)" }}>{d.minesName || "-"}</td>
                        <td data-label="Customer Name">{d.customerName || "-"}</td>
                        <td data-label="Left Days" className="blink-text" style={{ color: isExpired ? "#dc2626" : "inherit", fontWeight: isExpired ? "500" : "normal" }}>
                          {daysLeft}
                        </td>
                        <td data-label="Days Since Expired">
                          {expiredDays === null ? (
                            <span className="blink-text" style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              background: "rgba(34, 197, 94, 0.1)",
                              color: "#16a34a",
                              fontWeight: "600",
                              fontSize: "12px",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              border: "1px solid rgba(34, 197, 94, 0.2)"
                            }}>
                              Valid
                            </span>
                          ) : (
                            <span className="blink-text" style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              background: "rgba(220, 38, 38, 0.08)",
                              color: "#b91c1c",
                              fontWeight: "600",
                              fontSize: "12px",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              border: "1px solid rgba(220, 38, 38, 0.2)"
                            }}>
                              ⏱ {expiredDays} {expiredDays === 1 ? "day" : "days"} ago
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABLE */}
        {activeTab === "summary" && (
        <div className="summary-section" style={{ marginTop: 0 }}>
          <div className="summary-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div className="summary-title">Extracted Payment Records</div>
          </div>
          <div className="summary-table-wrap">
            {allItems.length > 0 ? (
              <table className="stable secl-table">
                <thead>
                  <tr>
                    {visibleCols.sno && <th className="r">S.No</th>}
                    {visibleCols.minesName && <th>Mines Name</th>}
                    {visibleCols.customerName && <th>Customer Name</th>}
                    {visibleCols.quantity && <th className="r">Quantity (MT)</th>}
                    {visibleCols.amount && <th className="r">Amount<br /><small style={{ fontWeight: 400, textTransform: "none" }}>(Requisite Payment)</small></th>}
                    {visibleCols.grandTotal && <th className="r">Grand Total<br /><small style={{ fontWeight: 400, textTransform: "none" }}>PMT (÷Qty)</small></th>}
                    {visibleCols.auctionDate && <th>Auction Date</th>}
                    {visibleCols.dueDate && <th>Due Date</th>}
                    {visibleCols.bidPrice && <th className="r">Bid Price<br /><small style={{ fontWeight: 400, textTransform: "none" }}>PMT (Basic)</small></th>}
                    {visibleCols.incl50 && <th className="r">Including 50<br /><small style={{ fontWeight: 400, textTransform: "none" }}>PMT Rate</small></th>}
                    {visibleCols.createdAt && <th>Submitted Date</th>}
                    {visibleCols.preview && <th>Preview</th>}
                    {visibleCols.action && <th style={{ width: "60px", textAlign: "center" }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let displaySno = 0;
                    const rows = [];
                    order.forEach(cn => {
                      const g = groups[cn];
                      g.rows.forEach(r => {
                        displaySno++;
                        rows.push(
                          <tr key={`row-${r._originalIndex}`}>
                            {visibleCols.sno && <td className="sno" data-label="S.No">{String(displaySno).padStart(2, '0')}</td>}
                            {visibleCols.minesName && <td className="mines" data-label="Mines Name" style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text)" }}>
                              <HighlightText text={r.minesName} highlight={searchTerm} />
                              {r.isManual && <span className="manual-badge" style={{ display: "inline-block", padding: "1px 5px", background: "rgba(31,111,235,0.15)", color: "var(--primary)", borderRadius: "3px", fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 600, verticalAlign: "middle", marginLeft: "4px" }}>MANUAL</span>}
                            </td>}
                            {visibleCols.customerName && <td className="mines" style={{ fontWeight: 400 }} data-label="Customer Name"><HighlightText text={r.customerName} highlight={searchTerm} /></td>}
                            {visibleCols.quantity && <td className="r" data-label="Quantity">{r.quantity !== null ? <HighlightText text={r.quantity.toLocaleString('en-IN')} highlight={searchTerm} /> : <span className="val-nf" style={{ color: "var(--danger)" }}>Not Found</span>}</td>}
                            {visibleCols.amount && <td className="r" data-label="Requisite Payment">
                              <span style={{ color: "#e3b341", fontWeight: 600 }}><HighlightText text={formatINR(r.requisitePayment)} highlight={searchTerm} /></span>
                            </td>}
                            {visibleCols.grandTotal && <td className="r" data-label="Grand Total PMT">
                              <span style={{ color: "var(--primary)" }}><HighlightText text={formatN(rd2(r.grandPMT))} highlight={searchTerm} /></span>
                            </td>}
                            {visibleCols.auctionDate && <td className="date" data-label="Auction Date"><HighlightText text={r.auctionDate || "—"} highlight={searchTerm} /></td>}
                            {visibleCols.dueDate && <td className="date" data-label="Due Date"><HighlightText text={r.dueDate} highlight={searchTerm} /></td>}
                            {visibleCols.bidPrice && <td className="r" data-label="Bid Price PMT"><HighlightText text={formatN(r.bidPrice !== null ? rd2(r.bidPrice) : null)} highlight={searchTerm} /></td>}
                            {visibleCols.incl50 && <td className="r" data-label="Incl 50 PMT">
                              <span style={{ color: "#3fb950", fontWeight: 600 }}><HighlightText text={formatN(rd2(r.incl50))} highlight={searchTerm} /></span>
                            </td>}
                            {visibleCols.createdAt && <td className="date" data-label="Submitted Date">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span style={{ color: "var(--muted)" }}>-</span>}
                            </td>}
                            {visibleCols.preview && <td data-label="Preview">
                              {r.pdfUrl ? (
                                <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                                  View PDF
                                </a>
                              ) : (
                                <span style={{ color: "var(--muted)" }}>-</span>
                              )}
                            </td>}
                            {visibleCols.action && <td data-label="Action">
                              <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                                  <button
                                    style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "4px 8px", fontSize: "11px", fontWeight: "500", borderRadius: "4px", border: "1px solid rgba(22, 163, 74, 0.3)", background: "transparent", color: "#16a34a", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.15s ease" }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = "rgba(22, 163, 74, 0.1)"; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                                    onClick={() => handleEditClick(r._originalIndex)}
                                    title="Edit"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    Edit
                                  </button>
                                  <button
                                    style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "4px 8px", fontSize: "11px", fontWeight: "500", borderRadius: "4px", border: "1px solid rgba(220, 38, 38, 0.3)", background: "transparent", color: "#dc2626", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.15s ease" }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)"; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                                    onClick={() => { if(window.confirm("Are you sure you want to delete this row?")) { onDeleteRow && onDeleteRow(r._originalIndex); } }}
                                    title="Delete"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>Delete
                                  </button>
                              </div>
                            </td>}
                          </tr>
                        );
                      });

                      // Party subtotal row
                      const colSpanBeforeQty = (visibleCols.sno ? 1 : 0) + (visibleCols.minesName ? 1 : 0) + (visibleCols.customerName ? 1 : 0);
                      rows.push(
                        <tr key={`sub-${cn}`} className="party-sub-row" style={{ background: "rgba(88,166,255,0.06)", borderTop: "1px solid rgba(88,166,255,0.2)", borderBottom: "2px solid rgba(88,166,255,0.25)" }}>
                          {colSpanBeforeQty > 0 && (
                            <td colSpan={colSpanBeforeQty} style={{ color: "var(--primary)", fontFamily: "var(--font-mono)", fontSize: "12px", padding: "10px 14px" }}>
                              <span style={{ color: "var(--primary)", marginRight: "4px" }}>↳</span>
                              {g.name} — {g.invoices} invoice{g.invoices > 1 ? 's' : ''}
                            </td>
                          )}
                          {visibleCols.quantity && <td className="r" data-label="Total Qty" style={{ color: "var(--primary)", fontFamily: "var(--font-mono)", fontSize: "12px", padding: "10px 14px", fontWeight: 600 }}>{g.qty.toLocaleString('en-IN')}</td>}
                          {visibleCols.amount && <td className="r" data-label="Total Payment" style={{ color: "#e3b341", fontFamily: "var(--font-mono)", fontSize: "12px", padding: "10px 14px", fontWeight: 600 }}>₹{g.req.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                          {visibleCols.grandTotal && <td></td>}
                          {visibleCols.auctionDate && <td></td>}
                          {visibleCols.dueDate && <td></td>}
                          {visibleCols.bidPrice && <td></td>}
                          {visibleCols.incl50 && <td></td>}
                          {visibleCols.createdAt && <td></td>}
                          {visibleCols.preview && <td></td>}
                          {visibleCols.action && <td></td>}
                        </tr>
                      );
                    });
                    
                    // Grand Total Row
                    const colSpanBeforeQtyTotal = (visibleCols.sno ? 1 : 0) + (visibleCols.minesName ? 1 : 0) + (visibleCols.customerName ? 1 : 0);
                    rows.push(
                      <tr key="totals" className="totals-row" style={{ background: "var(--panel)", borderTop: "2px solid var(--border)" }}>
                        {colSpanBeforeQtyTotal > 0 && (
                          <td colSpan={colSpanBeforeQtyTotal} style={{ padding: "12px 14px", fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                            TOTAL &nbsp;·&nbsp; {filteredItems.length} record{filteredItems.length !== 1 ? 's' : ''}
                          </td>
                        )}
                        {visibleCols.quantity && <td className="r" data-label="Total Qty" style={{ color: "#3fb950", fontFamily: "var(--font-mono)", fontWeight: 600, padding: "12px 14px" }}>{tQty.toLocaleString('en-IN')}</td>}
                        {visibleCols.amount && <td className="r" data-label="Total Payment" style={{ color: "#e3b341", fontFamily: "var(--font-mono)", fontWeight: 600, padding: "12px 14px" }}>₹{tAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                        {visibleCols.grandTotal && <td></td>}
                        {visibleCols.auctionDate && <td></td>}
                        {visibleCols.dueDate && <td></td>}
                        {visibleCols.bidPrice && <td></td>}
                        {visibleCols.incl50 && <td></td>}
                        {visibleCols.createdAt && <td></td>}
                        {visibleCols.preview && <td></td>}
                        {visibleCols.action && <td></td>}
                      </tr>
                    );
                    
                    return rows;
                  })()}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
                No records found.
              </div>
            )}
          </div>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", background: "var(--panel)", borderBottomLeftRadius: "var(--radius)", borderBottomRightRadius: "var(--radius)" }}>
            <button className="btn" onClick={onSave} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--ember-bright)", color: "white", padding: "8px 24px", fontSize: "14px", fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              SAVE DATA
            </button>
          </div>
        </div>
        )}

        {/* INFINITE SCROLL OBSERVER - SHARED FOR BOTH TABS */}
        {onPageChange && totalCount > allItems.length && (
          <div ref={observerRef} style={{ padding: "16px 20px", display: "flex", justifyContent: "center", alignItems: "center", borderTop: "1px solid var(--line)", background: "var(--panel)", flexDirection: "column", gap: "8px", marginTop: "16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <div style={{ fontSize: "13px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px" }}>
              {isFetching ? (
                <>
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  Loading more data...
                </>
              ) : `Scroll to load more (Showing ${allItems.length} of ${totalCount} records)`}
            </div>
          </div>
        )}
      </div>
      
      <EditModal
        isOpen={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        onSave={handleSaveEdit}
        title="Edit Record"
        initialData={editingIndex !== null ? allItems[editingIndex] : null}
        tableName="secl_payment_advices"
        columns={EDIT_COLS}
      />
    </section>
  );
}
