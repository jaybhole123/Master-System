import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import EditModal from "../components/EditModal";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";

export default function RefundLapsePage() {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("refundLapse");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef(null);
  const itemsPerPage = 50;

  const columns = [
    { key: "sno", label: "S.No." },
    { key: "party_name", label: "PARTY NAME" },
    { key: "mines_name", label: "Mines Name" },
    { key: "do_no", label: "Do No" },
    { key: "do_issue_date", label: "Do Issude Date" },
    { key: "do_last_date", label: "Do Last Date" },
    { key: "do_qty", label: "Do Qty" },
    { key: "lifted_qty", label: "Lifted Qty" },
    { key: "lapsed_qty", label: "Lapsed Qty" },
    { key: "qty_deduct", label: "Qty deduct" },
    { key: "rate_pmt", label: "Rate PMT" },
    { key: "coal_value", label: "COAL VALUE" },
    { key: "less_emd", label: "LESS EMD" },
    { key: "refund_amt_of_coal", label: "REFUND AMT OF COAL" },
    { key: "royalty_pmt", label: "Royalty PMT" },
    { key: "royalty_amount", label: "ROYALTY AMOUNT" },
    { key: "nemt_amount", label: "NEMT" },
    { key: "dmf_amount", label: "DMF" },
    { key: "preview", label: "Preview" }
  ];

  const summaryColumns = [
    { key: "sno", label: "S.No." },
    { key: "party_name", label: "PARTY NAME" },
    { key: "royalty_pmt", label: "Royalty PMT" },
    { key: "nemt", label: "NEMT" },
    { key: "dmf", label: "DMF" },
    { key: "tcs", label: "TCS" },
    { key: "so_value_rate", label: "SO Value Rate" },
    { key: "less_emd_rate", label: "EMD" }
  ];

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef(null);

  const [visibleCols, setVisibleCols] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const toggleColumn = (key) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllColumns = (val) => {
    setVisibleCols(columns.reduce((acc, col) => ({ ...acc, [col.key]: val }), {}));
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleSaveEdit = async (updatedData) => {
    const item = data[editingIndex];
    if (item && item.id) {
      try {
        const lapsedForDb = updatedData.lapsed_qty ? parseFloat(updatedData.lapsed_qty) : null;
        const doQtyForDb = parseFloat(item.do_qty) || 0;
        const liftedForDb = item.do_qty && item.do_qty !== "-" ? doQtyForDb - (lapsedForDb || 0) : (updatedData.lifted_qty ? parseFloat(updatedData.lifted_qty) : null);

        const updatePayload = {
          lapsed_qty: lapsedForDb,
          lifted_qty: liftedForDb
        };
        const { error: dbError } = await supabase.from('sales_orders').update(updatePayload).eq('id', item.id);
        if (dbError) throw dbError;
        
        // Calculate updated royalty amount for local state
        const lapsed = parseFloat(updatedData.lapsed_qty) || 0;
        const doQty = parseFloat(item.do_qty) || 0;
        const computedLiftedQty = item.do_qty && item.do_qty !== "-" ? (doQty - lapsed) : (updatedData.lifted_qty || "-");

        const royalty = parseFloat(item.royalty_pmt) || parseFloat(updatedData.royalty_pmt) || 0;
        const nemtVal = parseFloat(updatedData.nemt) || parseFloat(item.nemt) || 2;
        const dmfVal = parseFloat(updatedData.dmf) || parseFloat(item.dmf) || 30;
        const calculatedRoyaltyAmt = lapsed > 0 ? (royalty * lapsed).toFixed(2) : "-";
        const calculatedNemtAmt = lapsed > 0 ? ((royalty * lapsed) * (nemtVal / 100)).toFixed(2) : "-";
        const calculatedDmfAmt = lapsed > 0 ? ((royalty * lapsed) * (dmfVal / 100)).toFixed(2) : "-";

        const soValueRate = parseFloat(item.so_value_rate) || parseFloat(updatedData.so_value_rate) || 0;
        const tcsRate = parseFloat(item.tcs) || parseFloat(updatedData.tcs) || 0;
        const calculatedCoalValue = lapsed > 0 ? ((soValueRate - tcsRate) * lapsed).toFixed(2) : (item.coal_value || item.amount || "-");

        const emdRate = parseFloat(item.less_emd_rate) || parseFloat(item.less_emd) || 0;
        const calculatedLessEmd = lapsed > 0 ? (lapsed * emdRate).toFixed(2) : (item.less_emd || "-");

        let calculatedRefund = "-";
        if (calculatedCoalValue !== "-" && calculatedLessEmd !== "-") {
          calculatedRefund = (parseFloat(calculatedCoalValue) - parseFloat(calculatedLessEmd)).toFixed(2);
        }

        // Update local state
        const newData = [...data];
        newData[editingIndex] = { 
          ...item, 
          ...updatedData, 
          lapsed_qty: updatedData.lapsed_qty || "-", 
          lifted_qty: computedLiftedQty,
          royalty_amount: calculatedRoyaltyAmt,
          nemt_amount: calculatedNemtAmt,
          dmf_amount: calculatedDmfAmt,
          coal_value: calculatedCoalValue,
          less_emd: calculatedLessEmd,
          refund_amt_of_coal: calculatedRefund
        };
        setData(newData);
        setToastMessage("Data successfully updated!");
        setTimeout(() => setToastMessage(""), 3000);
      } catch (err) {
        console.error("Error updating record:", err);
        alert("Error updating record: " + err.message);
      }
    } else {
        const newData = [...data];
        newData[editingIndex] = { ...item, ...updatedData };
        setData(newData);
    }
    setEditingIndex(null);
  };

  const handleDelete = async (row) => {
    if (window.confirm("Are you sure you want to delete this row?")) {
      try {
        const { error } = await supabase.from('sales_orders').delete().eq('id', row.id);
        if (error) throw error;
        
        setData(prevData => prevData.filter(item => item.id !== row.id));
        
        setToastMessage("Data successfully deleted!");
        setTimeout(() => setToastMessage(""), 3000);
      } catch (err) {
        console.error("Error deleting record:", err);
        alert("Error deleting record: " + err.message);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        let { data: dbData, error, count } = await supabase
          .from('sales_orders')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: true })
          .range(from, to);

        if (error) {
          if (error.code === 'PGRST103' || error.message?.includes('416')) {
            dbData = [];
          } else {
            throw error;
          }
        }

        setTotalCount(count || 0);

        if (dbData && dbData.length > 0) {
          const mappedData = dbData.map((row, index) => {
            const lapsed = parseFloat(row.lapsed_qty) || 0;
            const royalty = parseFloat(row.royalty_pmt) || 0;
            const royaltyAmt = lapsed > 0 ? (royalty * lapsed).toFixed(2) : "-";
            
            // Fetch percentages for Tax Summary
            const storedNemt = parseFloat(row.nemt) || 2;
            const storedDmf = parseFloat(row.dmf) || 30;
            
            // Calculate NEMT and DMF amounts for Refund & Lapse table
            const nemtAmount = lapsed > 0 ? ((royalty * lapsed) * (storedNemt / 100)).toFixed(2) : "-";
            const dmfAmount = lapsed > 0 ? ((royalty * lapsed) * (storedDmf / 100)).toFixed(2) : "-";
            
            const soValueRate = parseFloat(row.so_value_rate) || 0;
            const tcsRate = parseFloat(row.tcs) || 0;
            const calculatedCoalValue = lapsed > 0 ? ((soValueRate - tcsRate) * lapsed).toFixed(2) : (row.amount || "-");

            const doQty = parseFloat(row.quantity) || 0;
            const computedLiftedQty = row.quantity ? (doQty - lapsed) : (row.lifted_qty || "-");

            const emdRate = parseFloat(row.less_emd) || 0;
            const calculatedLessEmd = lapsed > 0 ? (lapsed * emdRate).toFixed(2) : (row.less_emd || "-");

            let calculatedRefund = "-";
            if (calculatedCoalValue !== "-" && calculatedLessEmd !== "-") {
              calculatedRefund = (parseFloat(calculatedCoalValue) - parseFloat(calculatedLessEmd)).toFixed(2);
            }

            const nemtDisplay = storedNemt;
            const dmfDisplay = storedDmf;

            return {
              id: row.id,
              sno: String(index + 1).padStart(2, "0"),
              party_name: row.name || "-",
              nemt: nemtDisplay,
              dmf: dmfDisplay,
              nemt_amount: nemtAmount,
              dmf_amount: dmfAmount,
              mines_name: row.mine || "-",
              do_no: row.sales_order_number || "-",
              do_issue_date: row.sales_order_valid_from || "-",
              do_last_date: row.sales_order_valid_to || "-",
              do_qty: row.quantity || "-",
              lifted_qty: computedLiftedQty,
              lapsed_qty: row.lapsed_qty || "-",
              qty_deduct: "-",
              rate_pmt: row.rate_per_te || "-",
              coal_value: calculatedCoalValue,
              less_emd: calculatedLessEmd,
              less_emd_rate: row.less_emd != null ? row.less_emd : "-",
              refund_amt_of_coal: calculatedRefund,
              royalty_pmt: row.royalty_pmt != null ? row.royalty_pmt : "-",
              royalty_amount: royaltyAmt,
              tcs: row.tcs || "-",
              so_value_rate: row.so_value_rate || "-",
              pdf_url: row.pdf_url || null
            };
          });
          
          setData(prev => {
            const newData = currentPage === 1 ? mappedData : [...prev, ...mappedData];
            return Array.from(new Map(newData.map(item => [item.id, item])).values());
          });
        }
      } catch (err) {
        console.error("Error fetching sales orders for Refund/Lapse page:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && data.length < totalCount) {
          setCurrentPage(p => p + 1);
        }
      },
      { threshold: 1.0 }
    );
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, [isLoading, data.length, totalCount]);

  const filteredData = data.filter(row => 
    Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedData = filteredData;

  const handleExportExcel = () => {
    if (activeTab === "refundLapse") {
      exportToExcel(paginatedData, columns.filter(c => c.key !== "preview"), "Refund_Lapse_Data");
    } else {
      exportToExcel(paginatedData, summaryColumns, "Tax_Summary_Data");
    }
  };

  const handleExportPdf = () => {
    if (activeTab === "refundLapse") {
      exportToPDF(paginatedData, columns.filter(c => c.key !== "preview"), "Refund_Lapse_Data", "Refund & Lapse Data");
    } else {
      exportToPDF(paginatedData, summaryColumns, "Tax_Summary_Data", "Tax Summary Data");
    }
  };

  return (
    <div className="page-content">
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          background: "#16a34a",
          color: "white",
          padding: "12px 24px",
          borderRadius: "6px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          zIndex: 9999,
          fontWeight: 500,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          {toastMessage}
        </div>
      )}

      <div className="topbar" style={{ padding: "0 0 20px 0", borderBottom: "none", display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: "relative", zIndex: 50 }}>
        <h2>Refund / Lapse</h2>
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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

          <button 
            className="btn ghost" 
            onClick={handleExportExcel} 
            style={{ borderColor: "#107c41", color: "#107c41", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 124, 65, 0.04)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", fontWeight: "600", cursor: "pointer", border: "1px solid" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
            EXCEL
          </button>
          
          <button 
            className="btn ghost" 
            onClick={handleExportPdf}
            style={{ borderColor: "#d6251b", color: "#d6251b", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(214, 37, 27, 0.04)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", fontWeight: "600", cursor: "pointer", border: "1px solid" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15h1a2 2 0 0 0 0-4H9v4Z"></path></svg>
            PDF
          </button>

          <div style={{ position: "relative", zIndex: 999 }} ref={columnDropdownRef}>
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
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "240px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 9999, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", fontSize: "13px", fontWeight: "600", color: "var(--text)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Toggle Columns</span>
                </div>
                <div style={{ padding: "10px 14px", display: "flex", gap: "12px", borderBottom: "1px solid var(--line)", fontSize: "12px", background: "var(--bg)" }}>
                  <button onClick={() => setAllColumns(true)} style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}>Select All</button>
                  <button onClick={() => setAllColumns(false)} style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "500" }}>Deselect All</button>
                </div>
                <div style={{ maxHeight: "220px", overflowY: "auto", padding: "8px 0" }}>
                  {columns.map(col => (
                    <label key={col.key} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", color: "var(--text)", transition: "background 0.15s", userSelect: "none" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                      <input 
                        type="checkbox" 
                        checked={visibleCols[col.key]} 
                        onChange={() => toggleColumn(col.key)} 
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#dc2626", margin: 0 }}
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
      
      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: "20px" }}>
        <button 
          onClick={() => setActiveTab("refundLapse")}
          style={{
            background: "none",
            border: "none",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            color: activeTab === "refundLapse" ? "var(--primary, #dc2626)" : "var(--muted)",
            borderBottom: activeTab === "refundLapse" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Refund & Lapse Data
        </button>
        <button 
          onClick={() => setActiveTab("taxSummary")}
          style={{
            background: "none",
            border: "none",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            color: activeTab === "taxSummary" ? "var(--primary, #dc2626)" : "var(--muted)",
            borderBottom: activeTab === "taxSummary" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Tax Summary Data
        </button>
      </div>

      {activeTab === "refundLapse" && (
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Refund & Lapse Data</div>
        </div>
        {!isMobile ? (
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table className="stable" style={{ minWidth: "1800px" }}>
            <thead>
              <tr>
                {columns.map(col => (
                  visibleCols[col.key] && <th key={col.key}>{col.label}</th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    Loading data...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, i) => (
                  <tr key={i}>
                    {columns.map(col => (
                      visibleCols[col.key] && <td key={col.key}>
                        {col.key === "preview" ? (
                          row.pdf_url ? (
                            <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                              View PDF
                            </a>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>-</span>
                          )
                        ) : ["nemt", "dmf", "tcs", "so_value_rate"].includes(col.key) ? (
                          "-"
                        ) : col.key === "party_name" ? (
                          <span style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text)" }}>{row[col.key]}</span>
                        ) : (
                          row[col.key]
                        )}
                      </td>
                    ))}
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                        <button
                          style={{
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                            padding: "4px 8px", fontSize: "11px", fontWeight: "500", borderRadius: "4px",
                            border: "1px solid rgba(22, 163, 74, 0.3)", background: "transparent",
                            color: "#16a34a", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            transition: "all 0.15s ease",
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "rgba(22, 163, 74, 0.1)"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                          onClick={() => setEditingIndex(i)}
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
                          onClick={() => handleDelete(row)}
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="mobile-card-container" style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>Loading data...</div>
            ) : paginatedData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No data available</div>
            ) : (
              paginatedData.map((row, i) => (
                <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <span style={{ fontWeight: "bold", fontSize: "16px", color: "var(--primary, #dc2626)" }}>{row.party_name}</span>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>#{row.do_no}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", marginBottom: "12px" }}>
                    {columns.filter(col => !["party_name", "do_no", "preview"].includes(col.key) && visibleCols[col.key]).map(col => (
                      <div key={col.key} style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>{col.label}</span>
                        <span style={{ color: "var(--text)", fontWeight: "500" }}>
                          {["nemt", "dmf", "tcs", "so_value_rate"].includes(col.key) ? "-" : row[col.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                  {visibleCols["preview"] && row.pdf_url && (
                    <div style={{ marginBottom: "12px" }}>
                      <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "13px" }}>
                        View PDF
                      </a>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--line)", paddingTop: "12px", justifyContent: "flex-end" }}>
                    <button
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "12px", fontWeight: "500", borderRadius: "4px", border: "1px solid rgba(22, 163, 74, 0.3)", background: "transparent", color: "#16a34a" }}
                      onClick={() => setEditingIndex(i)}
                    >
                      Edit
                    </button>
                    <button
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "12px", fontWeight: "500", borderRadius: "4px", border: "1px solid rgba(220, 38, 38, 0.3)", background: "transparent", color: "#dc2626" }}
                      onClick={() => handleDelete(row)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      )}

      {/* ── Summary Table ── */}
      {activeTab === "taxSummary" && (
      <div className="table-card" style={{ marginTop: 0 }}>
        <div className="table-header">
          <div className="table-title">Tax Summary Data</div>
        </div>
        {!isMobile ? (
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table className="stable">
            <thead>
              <tr>
                {summaryColumns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={summaryColumns.length} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    Loading data...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={summaryColumns.length} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, i) => (
                  <tr key={i}>
                    {summaryColumns.map(col => (
                      <td key={col.key}>
                        {col.key === "party_name" ? (
                          <span style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text)" }}>{row[col.key]}</span>
                        ) : (
                          row[col.key]
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="mobile-card-container" style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>Loading data...</div>
            ) : paginatedData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No data available</div>
            ) : (
              paginatedData.map((row, i) => (
                <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <span style={{ fontWeight: "bold", fontSize: "16px", color: "var(--primary, #dc2626)" }}>{row.party_name}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                    {summaryColumns.filter(col => col.key !== "party_name").map(col => (
                      <div key={col.key} style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>{col.label}</span>
                        <span style={{ color: "var(--text)", fontWeight: "500" }}>{row[col.key]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      )}

      {/* INFINITE SCROLL OBSERVER - SHARED FOR BOTH TABS */}
      {totalCount > data.length && (
        <div ref={observerRef} style={{ padding: "16px 20px", display: "flex", justifyContent: "center", alignItems: "center", borderTop: "1px solid var(--line)", background: "var(--panel)", flexDirection: "column", gap: "8px", marginTop: "16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
          <div style={{ fontSize: "13px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px" }}>
            {isLoading ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Loading more data...
              </>
            ) : `Scroll to load more (Showing ${data.length} of ${totalCount} records)`}
          </div>
        </div>
      )}

      <EditModal
        isOpen={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        onSave={handleSaveEdit}
        title="Edit Refund / Lapse Entry"
        showPdfUpload={false}
        initialData={editingIndex !== null ? {
          ...data[editingIndex],
          lapsed_qty: data[editingIndex].lapsed_qty === "-" ? "" : data[editingIndex].lapsed_qty
        } : null}
        columns={[
          { key: "lapsed_qty", label: "Lapsed Qty", type: "number" }
        ]}
      />

    </div>
  );
}
