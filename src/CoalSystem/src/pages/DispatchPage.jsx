import React, { useState, useEffect, useRef } from "react";
import EditModal from "../components/EditModal";
import { downloadBlob } from "../utils/pdfParser";
import { supabase } from "../utils/supabase";

const INITIAL_COLS = [
  { key: "doNo", label: "DO No *" },
  { key: "orderNo", label: "Order No", type: "text" },
  { key: "orderQty", label: "Order Qty", type: "number" },
  { key: "orderRate", label: "Order Rate", type: "number" },
  { key: "truckNumber", label: "Truck No *", type: "text" },
  { key: "truckQty", label: "Truck No Qty *", type: "text" },
  { key: "dispatchQty", label: "Dispatch Qty", type: "number" },
  { key: "balanceQty", label: "Balance Qty", type: "number" },
  { key: "freight", label: "Freight *", type: "text" },
  { key: "receiverParty", label: "Receiver Party *", type: "text" },
  { key: "plantName", label: "Plant Name *", type: "text" },
  { key: "minesName", label: "Mines Name *", type: "text" }
];

export default function DispatchPage() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState(INITIAL_COLS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target)) {
        setShowColumnDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setAllColumns = (show) => {
    // Column toggle logic if needed later
  };

  useEffect(() => {
    async function fetchDoNumbers() {
      try {
        const { data: soData, error } = await supabase
          .from("sales_orders")
          .select("sales_order_number");
        
        if (!error && soData) {
          const uniqueOptions = [...new Set(soData.map(s => s.sales_order_number).filter(Boolean))];
          setColumns(prev => prev.map(c => 
            c.key === "doNo" ? { ...c, options: uniqueOptions } : c
          ));
        }
      } catch (err) {
        console.error("Error fetching SO numbers:", err);
      }
    }
    fetchDoNumbers();
  }, []);

  const fetchDispatchData = async () => {
    try {
      const { data: records, error } = await supabase
        .from("dispatch_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (records) {
        const mappedData = records.map(r => ({
          id: r.id,
          doNo: r.do_no,
          orderNo: r.order_no,
          orderQty: r.order_qty,
          orderRate: r.order_rate,
          truckNumber: r.truck_no,
          truckQty: r.truck_qty,
          dispatchQty: r.dispatch_qty,
          balanceQty: r.balance_qty,
          freight: r.freight,
          receiverParty: r.receiver_party,
          plantName: r.plant_name,
          minesName: r.mines_name,
          pdfUrl: r.pdf_url,
          pdfName: r.pdf_name,
          status: r.status || "pending",
          createdAt: r.created_at
        }));
        setData(mappedData);
      }
    } catch (err) {
      console.error("Error fetching dispatch records:", err);
    }
  };

  useEffect(() => {
    fetchDispatchData();
  }, []);

  const handleManualAdd = async (formData) => {
    try {
      let pdfUrl = formData.pdfUrl || null;
      let pdfName = formData.pdfName || null;

      // Basic PDF Upload logic if provided
      if (formData.pdfFile) {
        const fileExt = formData.pdfFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Ensure bucket exists in your Supabase setup, e.g. "documents"
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(`dispatch/${fileName}`, formData.pdfFile);
        
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(`dispatch/${fileName}`);
          pdfUrl = publicUrlData.publicUrl;
          pdfName = formData.pdfFile.name;
        } else {
          console.error("PDF upload failed:", uploadError);
        }
      }

      const payload = {
        do_no: formData.doNo || null,
        order_no: formData.orderNo || null,
        order_qty: formData.orderQty ? parseFloat(formData.orderQty) : null,
        order_rate: formData.orderRate ? parseFloat(formData.orderRate) : null,
        truck_no: formData.truckNumber || null,
        truck_qty: formData.truckQty ? parseFloat(formData.truckQty) : null,
        dispatch_qty: formData.dispatchQty ? parseFloat(formData.dispatchQty) : null,
        balance_qty: formData.balanceQty ? parseFloat(formData.balanceQty) : null,
        freight: formData.freight ? parseFloat(formData.freight) : null,
        receiver_party: formData.receiverParty || null,
        plant_name: formData.plantName || null,
        mines_name: formData.minesName || null,
        pdf_url: pdfUrl,
        pdf_name: pdfName,
        status: formData.status || "pending"
      };

      if (editingIndex !== null && data[editingIndex]?.id) {
        // Update existing record
        const recordId = data[editingIndex].id;
        const { error } = await supabase
          .from("dispatch_records")
          .update(payload)
          .eq("id", recordId);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("dispatch_records")
          .insert([payload]);
          
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingIndex(null);
      fetchDispatchData();
    } catch (err) {
      console.error("Error saving dispatch record:", err);
      alert("Failed to save record.");
    }
  };

  const handleEditClick = (index) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleDelete = async (index) => {
    if (window.confirm("Are you sure you want to delete this row?")) {
      try {
        const recordId = data[index].id;
        if (!recordId) {
          const newData = [...data];
          newData.splice(index, 1);
          setData(newData);
          return;
        }

        const { error } = await supabase
          .from("dispatch_records")
          .delete()
          .eq("id", recordId);
          
        if (error) throw error;
        
        fetchDispatchData();
      } catch (err) {
        console.error("Error deleting record:", err);
        alert("Failed to delete record.");
      }
    }
  };

  const handleMarkDone = async (id) => {
    try {
      const { error } = await supabase
        .from("dispatch_records")
        .update({ status: "done" })
        .eq("id", id);
      if (error) throw error;
      fetchDispatchData();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status");
    }
  };

  const handleExportCsv = () => {
    if (data.length === 0) return;
    const header = columns.map(c => c.label).join(",") + "\n";
    const rows = data.map(row => 
      columns.map(col => `"${(row[col.key] || "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    downloadBlob(header + rows, "dispatch_data.csv", "text/csv");
  };

  const handleExportJson = () => {
    if (data.length === 0) return;
    downloadBlob(JSON.stringify(data, null, 2), "dispatch_data.json", "application/json");
  };

  const displayData = data.filter(r => {
    if (activeTab === "history" && r.status !== "done") return false;
    if (activeTab === "pending" && (r.status || "pending") !== "pending") return false;
    
    if (selectedDate && r.createdAt) {
      const d1 = new Date(r.createdAt);
      const d2 = new Date(selectedDate);
      if (d1.getFullYear() !== d2.getFullYear() || d1.getMonth() !== d2.getMonth() || d1.getDate() !== d2.getDate()) {
        return false;
      }
    }
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const match = Object.values(r).some(v => v && String(v).toLowerCase().includes(lowerSearch));
      if (!match) return false;
    }
    
    return true;
  });

  const totalDispatchQty = displayData.reduce((sum, item) => sum + (Number(item.dispatchQty) || 0), 0);
  const totalBalanceQty = displayData.reduce((sum, item) => sum + (Number(item.balanceQty) || 0), 0);

  return (
    <div className="page-content">
      <h2 style={{ margin: "0 0 20px 0", fontFamily: "var(--font-display)", fontSize: 24 }}>Dispatch Tracking</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9l7 7 7-7"></path><path d="M12 3v13"></path><path d="M3 21h18"></path></svg>
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Total Dispatch Qty</h3>
            <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#111827', fontWeight: '600' }}>{totalDispatchQty.toFixed(2)}</h2>
          </div>
        </div>
        
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Total Balance Qty</h3>
            <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#111827', fontWeight: '600' }}>{totalBalanceQty.toFixed(2)}</h2>
          </div>
        </div>
      </div>

      <div style={{ padding: "0", borderBottom: "1px solid var(--line)", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          
          {/* ── TABS ── */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "-1px" }}>
            <button
              onClick={() => setActiveTab("pending")}
              style={{
                background: "none", border: "none", padding: "12px 16px", fontSize: "15px",
                fontWeight: activeTab === "pending" ? "700" : "500",
                color: activeTab === "pending" ? "var(--primary, #dc2626)" : "var(--muted)",
                borderBottom: activeTab === "pending" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              Pending Records
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                background: "none", border: "none", padding: "12px 16px", fontSize: "15px",
                fontWeight: activeTab === "history" ? "700" : "500",
                color: activeTab === "history" ? "var(--primary, #dc2626)" : "var(--muted)",
                borderBottom: activeTab === "history" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              History Records
            </button>
          </div>

          <div className="toolbar-wrapper" style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", paddingBottom: "12px" }}>
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
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "6px", padding: "6px 12px", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "all 0.15s ease", border: "1px solid var(--line)" }}
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
                </div>
              )}
            </div>


            <button className="btn" onClick={() => { setEditingIndex(null); setIsModalOpen(true); }}>
              + Add Form
            </button>
          </div>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-table-wrap">
          <table className="stable" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>#</th>
                {columns.map(c => <th key={c.key}>{c.label.replace(" *", "")}</th>)}
                <th>Status</th>
                <th>PDF</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 4} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No {activeTab} dispatch records found.
                  </td>
                </tr>
              ) : (
                displayData.map((row, i) => (
                  <tr key={i}>
                    <td className="row-num" data-label="#">{i + 1}</td>
                    {columns.map(c => (
                      <td key={c.key} data-label={c.label.replace(" *", "")}>{row[c.key] || "-"}</td>
                    ))}
                    <td data-label="Status">
                      <span style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: "600",
                        textTransform: "capitalize",
                        background: row.status === "done" ? "#dcfce7" : "#fef3c7",
                        color: row.status === "done" ? "#15803d" : "#b45309",
                        border: row.status === "done" ? "1px solid #bbf7d0" : "1px solid #fde68a"
                      }}>
                        {row.status === "done" ? "Done" : "Pending"}
                      </span>
                    </td>
                    <td data-label="PDF">
                      {row.pdfUrl ? (
                        <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                          View PDF
                        </a>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>-</span>
                      )}
                    </td>
                    <td data-label="Action">
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        {activeTab === "pending" && (
                          <button onClick={() => handleMarkDone(row.id)} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "12px", fontWeight: "500", color: "#3b82f6", background: "#fff", border: "1px solid #bfdbfe", borderRadius: "4px", cursor: "pointer", outline: "none" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Done
                          </button>
                        )}
                        <button onClick={() => handleEditClick(data.findIndex(d => d.id === row.id))} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "12px", fontWeight: "500", color: "#10b981", background: "#fff", border: "1px solid #a7f3d0", borderRadius: "4px", cursor: "pointer", outline: "none" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(data.findIndex(d => d.id === row.id))} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "12px", fontWeight: "500", color: "#ef4444", background: "#fff", border: "1px solid #fecaca", borderRadius: "4px", cursor: "pointer", outline: "none" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
      </div>

      <EditModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingIndex(null); }}
        onSave={handleManualAdd}
        title={editingIndex !== null ? "Edit Dispatch Record" : "Add Dispatch Record"}
        initialData={editingIndex !== null ? data[editingIndex] : {}}
        columns={columns}
      />
    </div>
  );
}
