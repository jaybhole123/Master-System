import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import { showToast } from "../utils/toast";
import EditModal from "../components/EditModal";
import { Trash2, Edit, Search, Filter, FileText, FileSpreadsheet, Plus } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SaudaScalePage() {
  const [activeTab, setActiveTab] = useState("BUY"); // "BUY" or "SELL"
  const [buyData, setBuyData] = useState([]);
  const [sellData, setSellData] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterSeller, setFilterSeller] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [buyRes, sellRes] = await Promise.all([
        supabase.from("buy_sauda").select("*").order("created_at", { ascending: false }),
        supabase.from("sell_sauda").select("*, buy_sauda(*)").order("created_at", { ascending: false })
      ]);
      
      if (buyRes.error) throw buyRes.error;
      if (sellRes.error) throw sellRes.error;

      setBuyData(buyRes.data || []);
      setSellData(sellRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      // It might error if tables don't exist yet, we will suppress it silently for UX
    } finally {
      setIsLoading(false);
    }
  };

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
      return d.toISOString().split("T")[0];
    };

    try {
      if (activeTab === "BUY") {
        const payload = {
          from_party: formData.from_party || null,
          order_date: parseDate(formData.order_date),
          grade_mines: formData.grade_mines || null,
          buyer_name: formData.buyer_name || null,
          buy_order_qty: parseNum(formData.buy_order_qty),
          buy_basic_rate: parseNum(formData.buy_basic_rate),
          remark: formData.remark || null,
        };

        if (editingItem) {
          const { error } = await supabase.from("buy_sauda").update(payload).eq("id", editingItem.id);
          if (error) throw error;
          showToast("Buy entry updated successfully!");
        } else {
          const { error } = await supabase.from("buy_sauda").insert([payload]);
          if (error) throw error;
          showToast("Buy entry saved successfully!");
        }
      } else {
        // SELL TAB
        const sellQty = parseNum(formData.sell_order_qty);
        
        // Validation for remaining qty
        if (formData.buy_id) {
           const relatedBuy = buyData.find(b => b.id === formData.buy_id);
           if (relatedBuy) {
              const totalSold = sellData
                .filter(s => s.buy_id === formData.buy_id && (!editingItem || s.id !== editingItem.id))
                .reduce((sum, s) => sum + Number(s.sell_order_qty || 0), 0);
              const remainingQty = Number(relatedBuy.buy_order_qty || 0) - totalSold;
              
              if (sellQty > remainingQty) {
                 showToast(`Validation Error: Sell Qty (${sellQty}) cannot exceed Balance Qty (${remainingQty})`);
                 return;
              }
           }
        }

        const payload = {
          buy_id: formData.buy_id || null,
          seller_name: formData.seller_name || null,
          sell_order_qty: sellQty,
          sell_basic_rate: parseNum(formData.sell_basic_rate),
          lifter_transport: formData.lifter_transport || null,
          freight: formData.freight || null,
          freight_rate: parseNum(formData.freight_rate),
          do_no: formData.do_no || null,
          due_date: parseDate(formData.due_date),
          remark: formData.remark || null,
        };

        if (editingItem) {
          const { error } = await supabase.from("sell_sauda").update(payload).eq("id", editingItem.id);
          if (error) throw error;
          showToast("Sell entry updated successfully!");
        } else {
          const { error } = await supabase.from("sell_sauda").insert([payload]);
          if (error) throw error;
          showToast("Sell entry saved successfully!");
        }
      }
      
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving data:", error);
      showToast("Error saving data");
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type} entry?`)) return;
    try {
      const table = type === "BUY" ? "buy_sauda" : "sell_sauda";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      showToast("Deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      showToast("Error deleting data");
    }
  };

  // Prepare UI Data
  const buyDataWithBalance = buyData.map(buy => {
    const soldQty = sellData
      .filter(sell => sell.buy_id === buy.id)
      .reduce((sum, sell) => sum + Number(sell.sell_order_qty || 0), 0);
    return {
      ...buy,
      balance_qty: Number(buy.buy_order_qty || 0) - soldQty
    };
  });

  // Filter Data
  const filteredBuyData = buyDataWithBalance.filter(row => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || 
      (row.from_party || "").toLowerCase().includes(term) ||
      (row.grade_mines || "").toLowerCase().includes(term) ||
      (row.buyer_name || "").toLowerCase().includes(term);
    const matchesGrade = !filterGrade || row.grade_mines === filterGrade;
    const matchesBuyer = !filterBuyer || row.buyer_name === filterBuyer;
    return matchesSearch && matchesGrade && matchesBuyer;
  });

  const filteredSellData = sellData.filter(row => {
    const term = searchTerm.toLowerCase();
    const buyRef = row.buy_sauda || {};
    const matchesSearch = !term || 
      (row.do_no || "").toLowerCase().includes(term) ||
      (row.seller_name || "").toLowerCase().includes(term) ||
      (buyRef.buyer_name || "").toLowerCase().includes(term);
    const matchesSeller = !filterSeller || row.seller_name === filterSeller;
    const matchesBuyer = !filterBuyer || buyRef.buyer_name === filterBuyer;
    const matchesGrade = !filterGrade || buyRef.grade_mines === filterGrade;
    return matchesSearch && matchesSeller && matchesBuyer && matchesGrade;
  });

  // Columns for Modals
  const buyOptions = buyDataWithBalance.map(b => ({
    value: b.id,
    label: `${b.buyer_name || 'Unknown'} - ${b.grade_mines || 'No Grade'} (${b.balance_qty} MT Left)`
  }));

  const buyModalColumns = [
    { key: "from_party", label: "FROM", type: "text" },
    { key: "order_date", label: "ORDER DT.", type: "date" },
    { key: "grade_mines", label: "GRADE/MINES", type: "text" },
    { key: "buyer_name", label: "BUYER NAME", type: "text" },
    { key: "buy_order_qty", label: "BUY ORDER QTY.", type: "number" },
    { key: "buy_basic_rate", label: "BUY BASIC RATE", type: "number" },
    { key: "remark", label: "REMARK", type: "text" },
  ];

  const sellModalColumns = [
    { key: "buy_id", label: "LINK TO BUY SAUDA", type: "dropdown", options: buyOptions },
    { key: "seller_name", label: "SELLER NAME", type: "text" },
    { key: "sell_order_qty", label: "SELL ORDER QTY.", type: "number" },
    { key: "sell_basic_rate", label: "SELL BASIC RATE", type: "number" },
    { key: "lifter_transport", label: "LIFTER/TRANSPORT", type: "text" },
    { key: "freight", label: "FREIGHT", type: "text" },
    { key: "freight_rate", label: "FREIGHT RATE", type: "number" },
    { key: "do_no", label: "D.O.NO.", type: "text" },
    { key: "due_date", label: "DUE DATE", type: "date" },
    { key: "remark", label: "REMARK", type: "text" },
  ];

  const uniqueGrades = [...new Set(buyData.map(d => d.grade_mines).filter(Boolean))];
  const uniqueBuyers = [...new Set(buyData.map(d => d.buyer_name).filter(Boolean))];
  const uniqueSellers = [...new Set(sellData.map(d => d.seller_name).filter(Boolean))];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 10px" }}>
      {/* Header and Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--ember)", fontFamily: "var(--font-display)", fontSize: "28px" }}>SAUDA SALE</h2>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "14px" }}>Manage Buy and Sell Sauda separately.</p>
        </div>
        
        <div style={{ display: "flex", gap: "12px", background: "var(--panel)", padding: "4px", borderRadius: "10px", border: "1px solid var(--line)" }}>
          <button
            onClick={() => setActiveTab("BUY")}
            style={{
              padding: "8px 24px",
              borderRadius: "6px",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
              background: activeTab === "BUY" ? "var(--ember)" : "transparent",
              color: activeTab === "BUY" ? "white" : "var(--muted)",
              transition: "all 0.2s"
            }}
          >
            Buy Sauda
          </button>
          <button
            onClick={() => setActiveTab("SELL")}
            style={{
              padding: "8px 24px",
              borderRadius: "6px",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
              background: activeTab === "SELL" ? "var(--ember)" : "transparent",
              color: activeTab === "SELL" ? "white" : "var(--muted)",
              transition: "all 0.2s"
            }}
          >
            Sell Sauda
          </button>
        </div>

        <div>
          <button
            className="btn"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontWeight: "600", borderRadius: "8px", background: "var(--ember)" }}
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Add {activeTab === "BUY" ? "Buy" : "Sell"}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ padding: "20px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)", textTransform: "uppercase" }}>Total Buy Qty</span>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text)" }}>
            {filteredBuyData.reduce((sum, r) => sum + (r.buy_order_qty || 0), 0).toLocaleString()} MT
          </div>
        </div>
        <div style={{ padding: "20px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)", textTransform: "uppercase" }}>Total Sell Qty</span>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text)" }}>
             {filteredSellData.reduce((sum, r) => sum + (r.sell_order_qty || 0), 0).toLocaleString()} MT
          </div>
        </div>
        <div style={{ padding: "20px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)", textTransform: "uppercase" }}>Total Balance</span>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--ember-bright)" }}>
            {filteredBuyData.reduce((sum, r) => sum + (r.balance_qty || 0), 0).toLocaleString()} MT
          </div>
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
            placeholder="Search..."
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

      {/* Table Section */}
      <div className="table-card">
        <div className="table-scroll">
          {activeTab === "BUY" ? (
            <table className="stable">
              <thead>
                <tr>
                  <th>S.NO.</th>
                  <th>FROM</th>
                  <th>ORDER DT.</th>
                  <th>GRADE/MINES</th>
                  <th>BUYER NAME</th>
                  <th>ORDER QTY.</th>
                  <th>BASIC RATE</th>
                  <th>BALANCE QTY.</th>
                  <th>REMARK</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuyData.length === 0 ? (
                  <tr><td colSpan={10} style={{textAlign: "center"}}>No records found.</td></tr>
                ) : (
                  filteredBuyData.map((row, i) => (
                    <tr key={row.id}>
                      <td data-label="S.NO.">{i + 1}</td>
                      <td data-label="FROM">{row.from_party || "-"}</td>
                      <td data-label="ORDER DT.">{row.order_date || "-"}</td>
                      <td data-label="GRADE/MINES">{row.grade_mines || "-"}</td>
                      <td data-label="BUYER NAME" style={{fontWeight:"bold"}}>{row.buyer_name || "-"}</td>
                      <td data-label="ORDER QTY.">{row.buy_order_qty || "-"}</td>
                      <td data-label="BASIC RATE">{row.buy_basic_rate || "-"}</td>
                      <td data-label="BALANCE QTY." style={{fontWeight:"bold", color: row.balance_qty > 0 ? "#10b981" : "var(--muted)"}}>{row.balance_qty}</td>
                      <td data-label="REMARK">{row.remark || "-"}</td>
                      <td data-label="ACTIONS">
                        <div style={{display:"flex", gap:"8px", justifyContent:"center"}}>
                          <button onClick={() => { setEditingItem(row); setIsModalOpen(true); }} className="btn ghost" style={{padding:"4px", color:"var(--primary)"}}><Edit size={16}/></button>
                          <button onClick={() => handleDelete(row.id, "BUY")} className="btn ghost" style={{padding:"4px", color:"var(--danger)"}}><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="stable">
              <thead>
                <tr>
                  <th>S.NO.</th>
                  <th>BUYER (LINKED)</th>
                  <th>SELLER NAME</th>
                  <th>SELL QTY.</th>
                  <th>BASIC RATE</th>
                  <th>LIFTER/TRANS.</th>
                  <th>FREIGHT</th>
                  <th>F. RATE</th>
                  <th>D.O.NO.</th>
                  <th>DUE DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellData.length === 0 ? (
                  <tr><td colSpan={11} style={{textAlign: "center"}}>No records found.</td></tr>
                ) : (
                  filteredSellData.map((row, i) => (
                    <tr key={row.id}>
                      <td data-label="S.NO.">{i + 1}</td>
                      <td data-label="BUYER" style={{fontSize:"12px", color:"var(--muted)", fontWeight: "500"}}>
                        {row.buy_sauda ? `${row.buy_sauda.buyer_name} (${row.buy_sauda.grade_mines})` : "-"}
                      </td>
                      <td data-label="SELLER NAME" style={{fontWeight:"bold", color:"var(--ember)"}}>{row.seller_name || "-"}</td>
                      <td data-label="SELL QTY.">{row.sell_order_qty || "-"}</td>
                      <td data-label="BASIC RATE">{row.sell_basic_rate || "-"}</td>
                      <td data-label="LIFTER">{row.lifter_transport || "-"}</td>
                      <td data-label="FREIGHT">{row.freight || "-"}</td>
                      <td data-label="F. RATE">{row.freight_rate || "-"}</td>
                      <td data-label="D.O.NO.">{row.do_no || "-"}</td>
                      <td data-label="DUE DATE">{row.due_date || "-"}</td>
                      <td data-label="ACTIONS">
                        <div style={{display:"flex", gap:"8px", justifyContent:"center"}}>
                          <button onClick={() => { setEditingItem(row); setIsModalOpen(true); }} className="btn ghost" style={{padding:"4px", color:"var(--primary)"}}><Edit size={16}/></button>
                          <button onClick={() => handleDelete(row.id, "SELL")} className="btn ghost" style={{padding:"4px", color:"var(--danger)"}}><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <EditModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSave={handleSave}
        title={editingItem ? `Edit ${activeTab} Sauda` : `Add ${activeTab} Sauda`}
        initialData={editingItem}
        columns={activeTab === "BUY" ? buyModalColumns : sellModalColumns}
        tableName={activeTab === "BUY" ? "buy_sauda" : "sell_sauda"}
        showPdfUpload={false}
      />
    </div>
  );
}
