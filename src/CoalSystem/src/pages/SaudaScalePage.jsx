import { useState, useEffect } from "react";
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

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterSeller, setFilterSeller] = useState("");

  const handleSave = (formData) => {
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
      id: editingItem ? editingItem.id : Date.now().toString(),
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
      do_no: formData.do_no || null,
      due_date: parseDate(formData.due_date),
    };

    if (editingItem) {
      setData((prev) => prev.map((item) => (item.id === payload.id ? payload : item)));
      showToast("Entry updated successfully (Local)!");
    } else {
      setData((prev) => [payload, ...prev]);
      showToast("Entry saved successfully (Local)!");
    }

    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    setData((prev) => prev.filter((item) => item.id !== id));
    showToast("Deleted successfully (Local)");
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
    { key: "do_no", label: "D.O.NO.", type: "text" },
    { key: "due_date", label: "DUE DATE", type: "date" },
  ];

  const uniqueGrades = [...new Set(data.map(d => d.grade_mines).filter(Boolean))];
  const uniqueBuyers = [...new Set(data.map(d => d.buyer_name).filter(Boolean))];
  const uniqueSellers = [...new Set(data.map(d => d.seller_name).filter(Boolean))];

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
      "BALANCE", "D.O.NO.", "DUE DATE"
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
        row.do_no || "-",
        row.due_date || "-"
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
      "D.O.NO.": row.do_no || "-",
      "DUE DATE": row.due_date || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sauda Scale");
    XLSX.writeFile(workbook, "Sauda_Scale.xlsx");
  };

  const totalBuyQty = filteredData.reduce((sum, row) => sum + (row.buy_order_qty || 0), 0);
  const totalSellQty = filteredData.reduce((sum, row) => sum + (row.sell_order_qty || 0), 0);
  const totalBalanceQty = filteredData.reduce((sum, row) => sum + (row.balance_qty || 0), 0);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--ember)", fontFamily: "var(--font-display)", fontSize: "28px" }}>Sauda Scale</h2>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "14px" }}>Manage and track your Sauda records efficiently.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
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
                <th>FROM</th>
                <th>ORDER DT.</th>
                <th>GRADE/MINES</th>
                <th>BUYER NAME</th>
                <th colSpan="2" style={{ textAlign: "center", background: "rgba(37, 99, 235, 0.05)" }}>BUY</th>
                <th>SELLER NAME</th>
                <th colSpan="3" style={{ textAlign: "center", background: "rgba(220, 38, 38, 0.05)" }}>SELL</th>
                <th>D.O.NO.</th>
                <th>DUE DATE</th>
                <th style={{ width: "80px", textAlign: "center" }}>ACTIONS</th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th style={{ background: "rgba(37, 99, 235, 0.05)" }}>ORDER QTY.</th>
                <th style={{ background: "rgba(37, 99, 235, 0.05)" }}>BASIC RATE</th>
                <th></th>
                <th style={{ background: "rgba(220, 38, 38, 0.05)" }}>ORDER QTY.</th>
                <th style={{ background: "rgba(220, 38, 38, 0.05)" }}>BASIC RATE</th>
                <th style={{ background: "rgba(220, 38, 38, 0.05)" }}>BALANCE QTY.</th>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>No records found.</td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr key={row.id}>
                    <td data-label="S.NO." style={{ textAlign: "center", fontWeight: "bold", color: "var(--muted)" }}>
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td data-label="FROM">{row.from_party || "-"}</td>
                    <td data-label="ORDER DT.">{row.order_date || "-"}</td>
                    <td data-label="GRADE/MINES">{row.grade_mines || "-"}</td>
                    <td data-label="BUYER NAME">{row.buyer_name || "-"}</td>
                    <td data-label="BUY ORDER QTY." style={{ background: "rgba(37, 99, 235, 0.02)" }}>{row.buy_order_qty || "-"}</td>
                    <td data-label="BUY BASIC RATE" style={{ background: "rgba(37, 99, 235, 0.02)" }}>{row.buy_basic_rate || "-"}</td>
                    <td data-label="SELLER NAME">{row.seller_name || "-"}</td>
                    <td data-label="SELL ORDER QTY." style={{ background: "rgba(220, 38, 38, 0.02)" }}>{row.sell_order_qty || "-"}</td>
                    <td data-label="SELL BASIC RATE" style={{ background: "rgba(220, 38, 38, 0.02)" }}>{row.sell_basic_rate || "-"}</td>
                    <td data-label="BALANCE QTY." style={{ background: "rgba(220, 38, 38, 0.02)", fontWeight: "bold" }}>{row.balance_qty || "-"}</td>
                    <td data-label="D.O.NO.">{row.do_no || "-"}</td>
                    <td data-label="DUE DATE">{row.due_date || "-"}</td>
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
        tableName="sauda_scale"
        showPdfUpload={false}
      />
    </div>
  );
}
