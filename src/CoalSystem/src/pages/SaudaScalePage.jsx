import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import { showToast } from "../utils/toast";
import EditModal from "../components/EditModal";
import { Trash2, Edit, Search, Filter, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SaudaScalePage() {
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sauda_scale_2")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setData(data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("Error fetching data from database");
    } finally {
      setIsLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterSeller, setFilterSeller] = useState("");

  const handleSave = async (formData) => {
    const parseNum = (val) => {
      if (!val) return 0;
      const parsed = parseFloat(val.toString().replace(/,/g, ""));
      return isNaN(parsed) ? 0 : parsed;
    };

    const parseDate = (val) => {
      if (!val || val === "-") return null;
      const d = new Date(val);
      if (isNaN(d)) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const buy_order_qty = parseNum(formData.buy_order_qty);
    const sell_order_qty = parseNum(formData.sell_order_qty);
    const balance_qty = buy_order_qty - sell_order_qty;

    const payload = {
      from_party: formData.from_party || null,
      order_date: parseDate(formData.order_date),
      grade_mines: formData.grade_mines || null,
      buyer_name: formData.buyer_name || null,
      buy_order_qty: buy_order_qty,
      buy_basic_rate: parseNum(formData.buy_basic_rate),
      seller_name: formData.seller_name || null,
      sell_order_qty: sell_order_qty,
      sell_basic_rate: parseNum(formData.sell_basic_rate),
      balance_qty: balance_qty,
      lifter_transport: formData.lifter_transport || null,
      freight: parseNum(formData.freight),
      freight_rate: parseNum(formData.freight_rate),
      remark: formData.remark || null,
      do_no: formData.do_no || null,
      due_date: parseDate(formData.due_date),
    };

    try {
      if (editingItem) {
        const { error } = await supabase.from("sauda_scale_2").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        showToast("Entry updated successfully!");
      } else {
        const { error } = await supabase.from("sauda_scale_2").insert([payload]);
        if (error) throw error;
        showToast("Entry saved successfully!");
      }
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving data:", error);
      showToast("Error saving data");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const { error } = await supabase.from("sauda_scale_2").delete().eq("id", id);
      if (error) throw error;
      showToast("Deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      showToast("Error deleting data");
    }
  };

  const columns = [
    { key: "from_party", label: "FROM", type: "text" },
    { key: "order_date", label: "ORDER DT.", type: "date" },
    { key: "grade_mines", label: "GRADE/MINES", type: "text" },
    { key: "buyer_name", label: "BUYER NAME", type: "text" },
    { key: "buy_order_qty", label: "BUY ORDER QTY.", type: "number" },
    { key: "buy_basic_rate", label: "BUY BASIC RATE", type: "number" },
    { key: "seller_name", label: "SELLER NAME", type: "text" },
    { key: "sell_order_qty", label: "SELL ORDER QTY.", type: "number" },
    { key: "sell_basic_rate", label: "SELL BASIC RATE", type: "number" },
    { key: "lifter_transport", label: "LIFTER/TRANSPORT", type: "text" },
    { key: "freight", label: "FREIGHT", type: "number" },
    { key: "freight_rate", label: "FREIGHT RATE", type: "number" },
    { key: "do_no", label: "D.O.NO.", type: "text" },
    { key: "due_date", label: "DUE DATE", type: "date" },
    { key: "remark", label: "REMARK", type: "text" },
  ];

  const uniqueGrades = [...new Set(data.map(d => d.grade_mines).filter(Boolean))];
  const uniqueBuyers = [...new Set(data.map(d => d.buyer_name).filter(Boolean))];
  const uniqueSellers = [...new Set(data.map(d => d.seller_name).filter(Boolean))];

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef(null);

  const displayColumns = [
    { key: "from_party", label: "FROM" },
    { key: "order_date", label: "ORDER DT." },
    { key: "grade_mines", label: "GRADE/MINES" },
    { key: "buyer_name", label: "BUYER NAME" },
    { key: "buy_order_qty", label: "BUY ORDER QTY." },
    { key: "buy_basic_rate", label: "BUY BASIC RATE" },
    { key: "seller_name", label: "SELLER NAME" },
    { key: "sell_order_qty", label: "SELL ORDER QTY." },
    { key: "sell_basic_rate", label: "SELL BASIC RATE" },
    { key: "balance_qty", label: "BALANCE QTY." },
    { key: "lifter_transport", label: "LIFTER/TRANSPORT" },
    { key: "freight", label: "FREIGHT" },
    { key: "freight_rate", label: "FREIGHT RATE" },
    { key: "do_no", label: "D.O.NO." },
    { key: "due_date", label: "DUE DATE" },
    { key: "remark", label: "REMARK" },
  ];

  const [visibleCols, setVisibleCols] = useState(
    displayColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const toggleColumn = (key) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllColumns = (val) => {
    setVisibleCols(displayColumns.reduce((acc, col) => ({ ...acc, [col.key]: val }), {}));
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredData = data.filter(row => {
    let matchesSearch = true;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      matchesSearch = 
        (row.from_party || "").toLowerCase().includes(lowerTerm) ||
        (row.grade_mines || "").toLowerCase().includes(lowerTerm) ||
        (row.do_no || "").toLowerCase().includes(lowerTerm);
    }

    let matchesGrade = true;
    if (filterGrade) {
      matchesGrade = row.grade_mines === filterGrade;
    }

    let matchesBuyer = true;
    if (filterBuyer) {
      matchesBuyer = row.buyer_name === filterBuyer;
    }

    let matchesSeller = true;
    if (filterSeller) {
      matchesSeller = row.seller_name === filterSeller;
    }

    return matchesSearch && matchesGrade && matchesBuyer && matchesSeller;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Sauda Scale Report", 14, 15);
    
    const tableColumn = [
      "S.NO.", "FROM", "ORDER DT.", "GRADE/MINES", "BUYER", 
      "BUY QTY", "BUY RATE", "SELLER", "SELL QTY", "SELL RATE", 
      "BALANCE", "LIFTER", "FREIGHT", "F. RATE", "D.O.NO.", "DUE DATE", "REMARK"
    ];
    
    const tableRows = [];
    
    filteredData.forEach((row, index) => {
      const rowData = [
        String(index + 1).padStart(2, '0'),
        row.from_party || "-",
        row.order_date || "-",
        row.grade_mines || "-",
        row.buyer_name || "-",
        row.buy_order_qty || "-",
        row.buy_basic_rate || "-",
        row.seller_name || "-",
        row.sell_order_qty || "-",
        row.sell_basic_rate || "-",
        row.balance_qty || "-",
        row.lifter_transport || "-",
        row.freight || "-",
        row.freight_rate || "-",
        row.do_no || "-",
        row.due_date || "-",
        row.remark || "-"
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [220, 38, 38] }
    });
    
    doc.save("Sauda_Scale.pdf");
  };

  const exportToExcel = () => {
    const excelData = filteredData.map((row, index) => ({
      "S.NO.": index + 1,
      "FROM": row.from_party || "-",
      "ORDER DT.": row.order_date || "-",
      "GRADE/MINES": row.grade_mines || "-",
      "BUYER": row.buyer_name || "-",
      "BUY QTY": row.buy_order_qty || "-",
      "BUY RATE": row.buy_basic_rate || "-",
      "SELLER": row.seller_name || "-",
      "SELL QTY": row.sell_order_qty || "-",
      "SELL RATE": row.sell_basic_rate || "-",
      "BALANCE": row.balance_qty || "-",
      "LIFTER/TRANSPORT": row.lifter_transport || "-",
      "FREIGHT": row.freight || "-",
      "FREIGHT RATE": row.freight_rate || "-",
      "D.O.NO.": row.do_no || "-",
      "DUE DATE": row.due_date || "-",
      "REMARK": row.remark || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sauda Scale");
    XLSX.writeFile(workbook, "Sauda_Scale.xlsx");
  };

  const totalBuyQty = filteredData.reduce((sum, row) => sum + (row.buy_order_qty || 0), 0);
  const totalSellQty = filteredData.reduce((sum, row) => sum + (row.sell_order_qty || 0), 0);
  const totalBalanceQty = filteredData.reduce((sum, row) => sum + (row.balance_qty || 0), 0);

  const buyColSpan = (visibleCols.buy_order_qty ? 1 : 0) + (visibleCols.buy_basic_rate ? 1 : 0);
  const sellColSpan = (visibleCols.sell_order_qty ? 1 : 0) + (visibleCols.sell_basic_rate ? 1 : 0) + (visibleCols.balance_qty ? 1 : 0);
  const totalCols = 2 + (visibleCols.from_party ? 1 : 0) + (visibleCols.order_date ? 1 : 0) + (visibleCols.grade_mines ? 1 : 0) + (visibleCols.buyer_name ? 1 : 0) + buyColSpan + (visibleCols.seller_name ? 1 : 0) + sellColSpan + (visibleCols.lifter_transport ? 1 : 0) + (visibleCols.freight ? 1 : 0) + (visibleCols.freight_rate ? 1 : 0) + (visibleCols.do_no ? 1 : 0) + (visibleCols.due_date ? 1 : 0) + (visibleCols.remark ? 1 : 0);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px", position: "relative", zIndex: 50 }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--ember)", fontFamily: "var(--font-display)", fontSize: "28px" }}>Sauda Scale</h2>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "14px" }}>Manage and track your Sauda records efficiently.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", zIndex: 999 }} ref={columnDropdownRef}>
            <button 
              className="btn ghost" 
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer", fontWeight: "500", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
              <span>Columns</span>
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
                  {displayColumns.map(col => (
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
          <button
            onClick={exportToPDF}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer", fontWeight: "500", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
          >
            <FileText size={16} color="#ef4444" />
            <span>PDF</span>
          </button>
          <button
            onClick={exportToExcel}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", cursor: "pointer", fontWeight: "500", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
          >
            <FileSpreadsheet size={16} color="#10b981" />
            <span>Excel</span>
          </button>
          <button
            className="btn"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontWeight: "600", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(220, 38, 38, 0.2)" }}
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          >
            <span>+ Add Sauda</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ padding: "20px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)", textTransform: "uppercase" }}>Total Buy Order Qty.</span>
          <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--text)", fontFamily: "var(--font-mono)" }}>{totalBuyQty.toLocaleString()}</span>
        </div>
        <div style={{ padding: "20px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)", textTransform: "uppercase" }}>Total Sell Order Qty.</span>
          <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--text)", fontFamily: "var(--font-mono)" }}>{totalSellQty.toLocaleString()}</span>
        </div>
        <div style={{ padding: "20px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)", textTransform: "uppercase" }}>Total Balance Qty.</span>
          <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--ember-bright)", fontFamily: "var(--font-mono)" }}>{totalBalanceQty.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ 
        background: "var(--panel)", 
        padding: "16px 20px", 
        borderRadius: "12px", 
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        border: "1px solid var(--line)",
        display: "flex", 
        gap: "16px", 
        marginBottom: "24px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--line)", padding: "0 12px", flex: "1 1 300px" }}>
          <Search size={18} color="var(--muted)" />
          <input
            type="text"
            placeholder="Search by FROM, GRADE or D.O.NO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "10px", border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: "var(--text)" }}
          />
        </div>
        
        <div style={{ display: "flex", flex: "1 1 auto", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={16} color="var(--muted)" />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted)", textTransform: "uppercase" }}>Filters:</span>
          </div>

          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            style={{ flex: "1 1 120px", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--bg)", outline: "none", fontSize: "14px", minWidth: "120px", color: "var(--text)", cursor: "pointer" }}
          >
            <option value="">All GRADE/MINES</option>
            {uniqueGrades.map((g, i) => <option key={i} value={g}>{g}</option>)}
          </select>

          <select
            value={filterBuyer}
            onChange={(e) => setFilterBuyer(e.target.value)}
            style={{ flex: "1 1 120px", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--bg)", outline: "none", fontSize: "14px", minWidth: "120px", color: "var(--text)", cursor: "pointer" }}
          >
            <option value="">All BUYERS</option>
            {uniqueBuyers.map((b, i) => <option key={i} value={b}>{b}</option>)}
          </select>

          <select
            value={filterSeller}
            onChange={(e) => setFilterSeller(e.target.value)}
            style={{ flex: "1 1 120px", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--bg)", outline: "none", fontSize: "14px", minWidth: "120px", color: "var(--text)", cursor: "pointer" }}
          >
            <option value="">All SELLERS</option>
            {uniqueSellers.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="stable">
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>S.NO.</th>
                {visibleCols.from_party && <th>FROM</th>}
                {visibleCols.order_date && <th>ORDER DT.</th>}
                {visibleCols.grade_mines && <th>GRADE/MINES</th>}
                {visibleCols.buyer_name && <th>BUYER NAME</th>}
                {buyColSpan > 0 && <th colSpan={buyColSpan} style={{ textAlign: "center", background: "rgba(37, 99, 235, 0.05)" }}>BUY</th>}
                {visibleCols.seller_name && <th>SELLER NAME</th>}
                {sellColSpan > 0 && <th colSpan={sellColSpan} style={{ textAlign: "center", background: "rgba(220, 38, 38, 0.05)" }}>SELL</th>}
                {visibleCols.lifter_transport && <th>LIFTER/TRANSPORT</th>}
                {visibleCols.freight && <th>FREIGHT</th>}
                {visibleCols.freight_rate && <th>FREIGHT RATE</th>}
                {visibleCols.do_no && <th>D.O.NO.</th>}
                {visibleCols.due_date && <th>DUE DATE</th>}
                {visibleCols.remark && <th>REMARK</th>}
                <th style={{ width: "80px", textAlign: "center" }}>ACTIONS</th>
              </tr>
              <tr>
                <th></th>
                {visibleCols.from_party && <th></th>}
                {visibleCols.order_date && <th></th>}
                {visibleCols.grade_mines && <th></th>}
                {visibleCols.buyer_name && <th></th>}
                {visibleCols.buy_order_qty && <th style={{ background: "rgba(37, 99, 235, 0.05)" }}>ORDER QTY.</th>}
                {visibleCols.buy_basic_rate && <th style={{ background: "rgba(37, 99, 235, 0.05)" }}>BASIC RATE</th>}
                {visibleCols.seller_name && <th></th>}
                {visibleCols.sell_order_qty && <th style={{ background: "rgba(220, 38, 38, 0.05)" }}>ORDER QTY.</th>}
                {visibleCols.sell_basic_rate && <th style={{ background: "rgba(220, 38, 38, 0.05)" }}>BASIC RATE</th>}
                {visibleCols.balance_qty && <th style={{ background: "rgba(220, 38, 38, 0.05)" }}>BALANCE QTY.</th>}
                {visibleCols.lifter_transport && <th></th>}
                {visibleCols.freight && <th></th>}
                {visibleCols.freight_rate && <th></th>}
                {visibleCols.do_no && <th></th>}
                {visibleCols.due_date && <th></th>}
                {visibleCols.remark && <th></th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>No records found.</td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr key={row.id}>
                    <td data-label="S.NO." style={{ textAlign: "center", fontWeight: "bold", color: "var(--muted)" }}>
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    {visibleCols.from_party && <td data-label="FROM">{row.from_party || "-"}</td>}
                    {visibleCols.order_date && <td data-label="ORDER DT.">{row.order_date || "-"}</td>}
                    {visibleCols.grade_mines && <td data-label="GRADE/MINES">{row.grade_mines || "-"}</td>}
                    {visibleCols.buyer_name && <td data-label="BUYER NAME">{row.buyer_name || "-"}</td>}
                    {visibleCols.buy_order_qty && <td data-label="BUY ORDER QTY." style={{ background: "rgba(37, 99, 235, 0.02)" }}>{row.buy_order_qty || "-"}</td>}
                    {visibleCols.buy_basic_rate && <td data-label="BUY BASIC RATE" style={{ background: "rgba(37, 99, 235, 0.02)" }}>{row.buy_basic_rate || "-"}</td>}
                    {visibleCols.seller_name && <td data-label="SELLER NAME">{row.seller_name || "-"}</td>}
                    {visibleCols.sell_order_qty && <td data-label="SELL ORDER QTY." style={{ background: "rgba(220, 38, 38, 0.02)" }}>{row.sell_order_qty || "-"}</td>}
                    {visibleCols.sell_basic_rate && <td data-label="SELL BASIC RATE" style={{ background: "rgba(220, 38, 38, 0.02)" }}>{row.sell_basic_rate || "-"}</td>}
                    {visibleCols.balance_qty && <td data-label="BALANCE QTY." style={{ background: "rgba(220, 38, 38, 0.02)", fontWeight: "bold" }}>{row.balance_qty || "-"}</td>}
                    {visibleCols.lifter_transport && <td data-label="LIFTER/TRANSPORT">{row.lifter_transport || "-"}</td>}
                    {visibleCols.freight && <td data-label="FREIGHT">{row.freight || "-"}</td>}
                    {visibleCols.freight_rate && <td data-label="FREIGHT RATE">{row.freight_rate || "-"}</td>}
                    {visibleCols.do_no && <td data-label="D.O.NO.">{row.do_no || "-"}</td>}
                    {visibleCols.due_date && <td data-label="DUE DATE">{row.due_date || "-"}</td>}
                    {visibleCols.remark && <td data-label="REMARK">{row.remark || "-"}</td>}
                    <td data-label="ACTIONS">
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          onClick={() => {
                            setEditingItem(row);
                            setIsModalOpen(true);
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        title={editingItem ? "Edit Sauda Scale" : "Add Sauda Scale"}
        initialData={editingItem || {}}
        columns={columns}
        tableName="sauda_scale_2"
        showPdfUpload={false}
      />
    </div>
  );
}
