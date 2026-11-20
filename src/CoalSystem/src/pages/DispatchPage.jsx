import React, { useState, useEffect, useRef, useMemo } from "react";
import EditModal from "../components/EditModal";
import { downloadBlob } from "../utils/pdfParser";
import { supabase } from "../utils/supabase";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";
import HighlightText from "../components/HighlightText";
import TruckDispatchTab from "./TruckDispatchTab";

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
  const [activeTab, setActiveTab] = useState("truck-dispatch");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedReceiver, setSelectedReceiver] = useState("ALL");
  const [selectedMines, setSelectedMines] = useState("ALL");

  // Column visibility state
  const allTableColumns = useMemo(() => [
    { key: "row_num", label: "#" },
    ...INITIAL_COLS.map(c => ({ key: c.key, label: c.label.replace(" *", "") })),
    { key: "status", label: "Status" },
    { key: "pdf", label: "Preview" },
    { key: "action", label: "Action" }
  ], []);

  const [visibleCols, setVisibleCols] = useState(
    allTableColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const toggleColumn = (key) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllColumns = (val) => {
    setVisibleCols(allTableColumns.reduce((acc, col) => ({ ...acc, [col.key]: val }), {}));
  };

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

      if (formData.pdfFile) {
        const fileExt = formData.pdfFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
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
        const recordId = data[editingIndex].id;
        const { error } = await supabase
          .from("dispatch_records")
          .update(payload)
          .eq("id", recordId);
        
        if (error) throw error;
      } else {
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

  // Dropdown filter unique options
  const receiverPartyOptions = useMemo(() => {
    const list = data.map(d => d.receiverParty).filter(Boolean);
    return ["ALL", ...Array.from(new Set(list))];
  }, [data]);

  const minesOptions = useMemo(() => {
    const list = data.map(d => d.minesName).filter(Boolean);
    return ["ALL", ...Array.from(new Set(list))];
  }, [data]);

  // Filtered dataset
  const displayData = useMemo(() => {
    return data.filter(r => {
      if (activeTab === "history" && r.status !== "done") return false;
      if (activeTab === "pending" && (r.status || "pending") !== "pending") return false;
      
      if (selectedReceiver !== "ALL" && r.receiverParty !== selectedReceiver) {
        return false;
      }

      if (selectedMines !== "ALL" && r.minesName !== selectedMines) {
        return false;
      }

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
  }, [data, activeTab, selectedReceiver, selectedMines, selectedDate, searchTerm]);

  // Aggregated KPI Stats based on displayData
  const stats = useMemo(() => {
    let dispatchSum = 0;
    let balanceSum = 0;
    let freightSum = 0;
    const trucksSet = new Set();
    const doNumbers = new Set();

    displayData.forEach(item => {
      const dQty = Number(item.dispatchQty) || 0;
      const bQty = Number(item.balanceQty) || 0;
      const fAmt = Number(item.freight) || 0;

      dispatchSum += dQty;
      balanceSum += bQty;
      freightSum += fAmt;

      if (item.truckNumber && String(item.truckNumber).trim()) {
        trucksSet.add(String(item.truckNumber).trim().toUpperCase());
      }
      if (item.doNo && String(item.doNo).trim()) {
        doNumbers.add(String(item.doNo).trim().toUpperCase());
      }
    });

    return {
      count: displayData.length,
      dispatchQty: dispatchSum.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      balanceQty: balanceSum.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      totalFreight: freightSum.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      uniqueTrucks: trucksSet.size,
      uniqueDOs: doNumbers.size
    };
  }, [displayData]);

  const handleExportExcel = () => {
    exportToExcel(displayData, INITIAL_COLS.map(c => ({ key: c.key, label: c.label.replace(" *", "") })), `dispatch_${activeTab}`);
  };

  const handleExportPdf = () => {
    exportToPDF(displayData, INITIAL_COLS.map(c => ({ key: c.key, label: c.label.replace(" *", "") })), `dispatch_${activeTab}`, `Dispatch Tracking - ${activeTab.toUpperCase()}`);
  };

  return (
    <div className="dispatch-page-container" style={{ padding: "16px 20px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      {/* ── TOP HEADER ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid var(--line, #e2e8f0)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 4px 10px rgba(2, 132, 199, 0.25)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text, #0f172a)", letterSpacing: "-0.02em" }}>
                Dispatch Tracking
              </h2>
              <span style={{
                background: "#f0fdf4",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
                fontSize: "10.5px",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "999px",
                letterSpacing: "0.5px"
              }}>
                MONITORING
              </span>
            </div>
            <div style={{ color: "var(--muted, #64748b)", fontSize: "12.5px", marginTop: "2px", fontWeight: "500" }}>
              Live Coal Delivery, Vehicle Loads & Balance Stock Tracking
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#475569",
            fontSize: "12px",
            fontWeight: "600",
            padding: "6px 14px",
            borderRadius: "8px",
            letterSpacing: "0.4px"
          }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#0284c7" }}></span>
            DISPATCH ACTIVE
          </span>
        </div>
      </div>

      {/* ── 4 KPI SUMMARY CARDS (SHOW ONLY FOR PENDING / HISTORY TABS) ── */}
      {activeTab !== "truck-dispatch" && (
        <div className="dispatch-cards-grid">
          {/* Card 1: Total Dispatch Qty */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px", whiteSpace: "nowrap" }}>
                Total Dispatch Qty
              </div>
              <div style={{ color: "#0f172a", fontSize: "20px", fontWeight: "900", lineHeight: "1.1", letterSpacing: "-0.02em", fontFamily: "var(--font-mono, monospace)", whiteSpace: "nowrap" }}>
                {stats.dispatchQty} <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>MT</span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px", fontWeight: "500", whiteSpace: "nowrap" }}>
                {stats.count} Record{stats.count !== 1 ? 's' : ''} in view
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(2, 132, 199, 0.04) 100%)",
              border: "1px solid rgba(2, 132, 199, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0284c7",
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 9l7 7 7-7"></path>
                <path d="M12 3v13"></path>
                <path d="M3 21h18"></path>
              </svg>
            </div>
          </div>

          {/* Card 2: Total Balance Qty */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px", whiteSpace: "nowrap" }}>
                Total Balance Qty
              </div>
              <div style={{ color: "#0f172a", fontSize: "20px", fontWeight: "900", lineHeight: "1.1", letterSpacing: "-0.02em", fontFamily: "var(--font-mono, monospace)", whiteSpace: "nowrap" }}>
                {stats.balanceQty} <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>MT</span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px", fontWeight: "500", whiteSpace: "nowrap" }}>
                Pending Deliveries
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(234, 88, 12, 0.12) 0%, rgba(234, 88, 12, 0.04) 100%)",
              border: "1px solid rgba(234, 88, 12, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ea580c",
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
          </div>

          {/* Card 3: Active Trucks / Loads */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px", whiteSpace: "nowrap" }}>
                Active Vehicles
              </div>
              <div style={{ color: "#0f172a", fontSize: "20px", fontWeight: "900", lineHeight: "1.1", letterSpacing: "-0.02em", fontFamily: "var(--font-mono, monospace)", whiteSpace: "nowrap" }}>
                {stats.uniqueTrucks} <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>Trucks</span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px", fontWeight: "500", whiteSpace: "nowrap" }}>
                Across {stats.uniqueDOs} Delivery Orders
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(124, 58, 237, 0.04) 100%)",
              border: "1px solid rgba(124, 58, 237, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7c3aed",
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
          </div>

          {/* Card 4: Freight Recorded */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px", whiteSpace: "nowrap" }}>
                Total Freight
              </div>
              <div style={{ color: "#0f172a", fontSize: "20px", fontWeight: "900", lineHeight: "1.1", letterSpacing: "-0.02em", fontFamily: "var(--font-mono, monospace)", whiteSpace: "nowrap" }}>
                ₹{stats.totalFreight}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px", fontWeight: "500", whiteSpace: "nowrap" }}>
                Transportation Cost
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(22, 163, 74, 0.12) 0%, rgba(22, 163, 74, 0.04) 100%)",
              border: "1px solid rgba(22, 163, 74, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTION / TOOLBAR WRAPPER ── */}
      <div style={{ padding: "0", borderBottom: "1px solid var(--line, #e2e8f0)", marginBottom: activeTab === "truck-dispatch" ? "12px" : "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", paddingBottom: "16px" }}>
          
          {/* TABS & QUICK EXPORTS */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <button
                onClick={() => setActiveTab("truck-dispatch")}
                style={{
                  background: activeTab === "truck-dispatch" ? "#ffffff" : "transparent",
                  border: "none",
                  padding: "6px 16px",
                  fontSize: "13px",
                  fontWeight: activeTab === "truck-dispatch" ? "700" : "500",
                  color: activeTab === "truck-dispatch" ? "#0284c7" : "#64748b",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: activeTab === "truck-dispatch" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>Truck Dispatch</span>
                <span style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  background: activeTab === "truck-dispatch" ? "#e0f2fe" : "#e2e8f0",
                  color: activeTab === "truck-dispatch" ? "#0369a1" : "#475569",
                  fontWeight: "800"
                }}>
                  Excel
                </span>
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                style={{
                  background: activeTab === "pending" ? "#ffffff" : "transparent",
                  border: "none",
                  padding: "6px 16px",
                  fontSize: "13px",
                  fontWeight: activeTab === "pending" ? "700" : "500",
                  color: activeTab === "pending" ? "#dc2626" : "#64748b",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: activeTab === "pending" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                Pending Records
              </button>
              <button
                onClick={() => setActiveTab("history")}
                style={{
                  background: activeTab === "history" ? "#ffffff" : "transparent",
                  border: "none",
                  padding: "6px 16px",
                  fontSize: "13px",
                  fontWeight: activeTab === "history" ? "700" : "500",
                  color: activeTab === "history" ? "#16a34a" : "#64748b",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: activeTab === "history" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                History Records
              </button>
            </div>

            {activeTab !== "truck-dispatch" && (
              <>
                <button 
                  className="btn ghost" 
                  onClick={handleExportExcel} 
                  style={{ 
                    borderColor: "#107c41", 
                    color: "#107c41", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "6px",
                    background: "rgba(16, 124, 65, 0.04)",
                    padding: "6px 12px",
                    fontSize: "13px"
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
                    background: "rgba(214, 37, 27, 0.04)",
                    padding: "6px 12px",
                    fontSize: "13px"
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15h1a2 2 0 0 0 0-4H9v4Z"></path>
                  </svg>
                  PDF
                </button>
              </>
            )}
          </div>

          {/* FILTERS & SEARCH */}
          {activeTab !== "truck-dispatch" && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            
            {/* RECEIVER PARTY DROPDOWN FILTER */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                value={selectedReceiver}
                onChange={(e) => setSelectedReceiver(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontSize: "13px",
                  color: "#334155",
                  background: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "160px"
                }}
              >
                <option value="ALL">All Receiver Parties</option>
                {receiverPartyOptions.filter(p => p !== "ALL").map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* MINES FILTER */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                value={selectedMines}
                onChange={(e) => setSelectedMines(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontSize: "13px",
                  color: "#334155",
                  background: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "140px"
                }}
              >
                <option value="ALL">All Mines</option>
                {minesOptions.filter(m => m !== "ALL").map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* SEARCH BAR */}
            <div style={{ position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Search dispatch..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: "6px 12px 6px 30px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", width: "190px", outline: "none", color: "var(--text)", background: "#ffffff" }}
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
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 12px", color: "#0f172a", fontSize: "13px", fontWeight: "600", minWidth: "115px", justifyContent: "center", whiteSpace: "nowrap" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {selectedDate ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "All Data"}
              </div>
            </div>

            {/* COLUMNS TOGGLE DROPDOWN */}
            <div style={{ position: "relative" }} ref={columnDropdownRef}>
              <button 
                className="btn ghost" 
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "all 0.15s ease", border: "1px solid var(--line)", background: "#ffffff" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                Columns
              </button>
              {showColumnDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "220px", background: "#ffffff", border: "1px solid var(--line)", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", zIndex: 100, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", fontWeight: "600", color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Toggle Columns</span>
                  </div>
                  <div style={{ padding: "8px 14px", display: "flex", gap: "12px", borderBottom: "1px solid #f1f5f9", fontSize: "12px", background: "#f8fafc" }}>
                    <button onClick={() => setAllColumns(true)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}>Select All</button>
                    <button onClick={() => setAllColumns(false)} style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "500" }}>Deselect All</button>
                  </div>
                  <div style={{ maxHeight: "240px", overflowY: "auto", padding: "6px 0" }}>
                    {allTableColumns.map(col => (
                      <label key={col.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 14px", cursor: "pointer", fontSize: "12.5px", color: "#334155" }}>
                        <input 
                          type="checkbox" 
                          checked={visibleCols[col.key]} 
                          onChange={() => toggleColumn(col.key)} 
                          style={{ accentColor: "#dc2626", cursor: "pointer" }}
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="btn" onClick={() => { setEditingIndex(null); setIsModalOpen(true); }} style={{ padding: "7px 16px", fontSize: "13px", fontWeight: "600" }}>
              + Add Form
            </button>
          </div>
          )}
        </div>
      </div>

      {/* ── CONDITIONAL RENDERING: TRUCK DISPATCH TAB VS EXTRACTED DISPATCH ── */}
      {activeTab === "truck-dispatch" ? (
        <TruckDispatchTab />
      ) : (
      <>
      {/* ── TABLE CONTENT ── */}
      <div className="summary-section" style={{ marginTop: 0 }}>
        <div className="summary-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div className="summary-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Extracted Dispatch Records</span>
            <span style={{ fontSize: "12px", fontWeight: "700", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "10px" }}>
              {displayData.length} Records
            </span>
          </div>
        </div>
        <div className="summary-table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflowX: "auto", overflowY: "visible", width: "100%", maxWidth: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <table className="stable" style={{ width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0, whiteSpace: "nowrap" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {visibleCols.row_num && <th style={{ textAlign: "center", width: "45px", color: "#64748b", fontWeight: 700, padding: "12px 8px" }}>#</th>}
                {INITIAL_COLS.map(c => {
                  const key = c.key;
                  if (!visibleCols[key]) return null;
                  const isRight = key === "orderQty" || key === "orderRate" || key === "dispatchQty" || key === "balanceQty" || key === "freight" || key === "truckQty";
                  return (
                    <th 
                      key={key}
                      style={{ 
                        color: "#475569", 
                        fontWeight: 700, 
                        fontSize: "12px", 
                        letterSpacing: "0.5px", 
                        padding: "12px 14px",
                        textAlign: isRight ? "right" : "left"
                      }}
                    >
                      {c.label.replace(" *", "")}
                    </th>
                  );
                })}
                {visibleCols.status && <th style={{ color: "#475569", fontWeight: 700, fontSize: "12px", textAlign: "center", width: "95px", padding: "12px 10px" }}>Status</th>}
                {visibleCols.pdf && <th style={{ color: "#475569", fontWeight: 700, fontSize: "12px", textAlign: "center", width: "60px", padding: "12px 8px" }}>Preview</th>}
                {visibleCols.action && <th style={{ color: "#475569", fontWeight: 700, fontSize: "12px", textAlign: "center", width: "160px", padding: "12px 10px" }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan={allTableColumns.length} style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>No {activeTab} dispatch records found</div>
                    <div style={{ fontSize: "13px" }}>Try adjusting the search or filters</div>
                  </td>
                </tr>
              ) : (
                displayData.map((row, i) => {
                  const isEven = i % 2 === 0;
                  return (
                    <tr 
                      key={row.id || i}
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
                      {INITIAL_COLS.map(c => {
                        if (!visibleCols[c.key]) return null;
                        const val = row[c.key] !== null && row[c.key] !== undefined ? String(row[c.key]) : "—";

                        if (c.key === "doNo") {
                          return (
                            <td key={c.key} style={{ fontWeight: 700, color: "#0f172a", fontFamily: "monospace", padding: "10px 14px" }}>
                              <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                <HighlightText text={val} highlight={searchTerm} />
                              </span>
                            </td>
                          );
                        }
                        if (c.key === "truckNumber") {
                          return (
                            <td key={c.key} style={{ fontWeight: 700, color: "#1e293b", fontFamily: "monospace", padding: "10px 14px" }}>
                              <span style={{ background: "#f8fafc", padding: "2px 7px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                                <HighlightText text={val} highlight={searchTerm} />
                              </span>
                            </td>
                          );
                        }
                        if (c.key === "dispatchQty") {
                          return (
                            <td key={c.key} style={{ textAlign: "right", fontWeight: 800, color: "#0284c7", fontFamily: "monospace", padding: "10px 14px" }}>
                              <HighlightText text={val} highlight={searchTerm} />
                            </td>
                          );
                        }
                        if (c.key === "balanceQty") {
                          return (
                            <td key={c.key} style={{ textAlign: "right", fontWeight: 800, color: "#ea580c", fontFamily: "monospace", padding: "10px 14px" }}>
                              <HighlightText text={val} highlight={searchTerm} />
                            </td>
                          );
                        }
                        if (c.key === "freight") {
                          return (
                            <td key={c.key} style={{ textAlign: "right", fontWeight: 800, color: "#16a34a", fontFamily: "monospace", padding: "10px 14px" }}>
                              {val !== "—" && !val.startsWith("₹") ? `₹${val}` : <HighlightText text={val} highlight={searchTerm} />}
                            </td>
                          );
                        }
                        if (c.key === "orderQty" || c.key === "orderRate" || c.key === "truckQty") {
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
                      
                      {visibleCols.status && (
                        <td data-label="Status" style={{ textAlign: "center", padding: "10px 8px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            textTransform: "capitalize",
                            background: row.status === "done" ? "#dcfce7" : "#fef3c7",
                            color: row.status === "done" ? "#15803d" : "#b45309",
                            border: row.status === "done" ? "1px solid #bbf7d0" : "1px solid #fde68a"
                          }}>
                            {row.status === "done" ? "Done" : "Pending"}
                          </span>
                        </td>
                      )}

                      {visibleCols.pdf && (
                        <td data-label="Preview" style={{ textAlign: "center", padding: "10px 8px" }}>
                          {row.pdfUrl ? (
                            (() => {
                              const isImg = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(row.pdfName || row.pdfUrl);
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
                            {activeTab === "pending" && (
                              <button 
                                onClick={() => handleMarkDone(row.id)} 
                                style={{ 
                                  display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 9px", 
                                  fontSize: "11px", fontWeight: "600", color: "#16a34a", background: "#f0fdf4", 
                                  border: "1px solid #bbf7d0", borderRadius: "6px", cursor: "pointer",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)", transition: "all 0.15s ease"
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = "#dcfce7"; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
                                title="Mark as Done"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Done
                              </button>
                            )}
                            <button 
                              onClick={() => handleEditClick(data.findIndex(d => d.id === row.id))} 
                              style={{ 
                                display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 9px", 
                                fontSize: "11px", fontWeight: "600", color: "#1d4ed8", background: "#eff6ff", 
                                border: "1px solid #bfdbfe", borderRadius: "6px", cursor: "pointer",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.03)", transition: "all 0.15s ease"
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = "#dbeafe"; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
                              title="Edit"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(data.findIndex(d => d.id === row.id))} 
                              style={{ 
                                display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 9px", 
                                fontSize: "11px", fontWeight: "600", color: "#dc2626", background: "#fef2f2", 
                                border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.03)", transition: "all 0.15s ease"
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                              title="Delete"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
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
      </>
      )}
    </div>
  );
}
