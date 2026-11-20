import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../utils/supabase";
import HighlightText from "../components/HighlightText";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";

// Local storage key for persistent local cache
const LOCAL_STORAGE_KEY = "coal_truck_dispatch_records_v1";

export default function TruckDispatchTab() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("ALL");
  const [selectedParty, setSelectedParty] = useState("ALL");
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibleCount, setVisibleCount] = useState(50); // Initial 50 records, then infinite load in chunks of 50

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // null => Add mode, object => Edit mode
  const [formData, setFormData] = useState({
    date: "",
    truckNo: "",
    qty: "",
    partyName: "",
    remark: ""
  });

  // Custom dropdown & search states for Add/Edit Modal
  const [truckDropdownOpen, setTruckDropdownOpen] = useState(false);
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const truckRef = useRef(null);
  const partyRef = useRef(null);

  // Close custom dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (truckRef.current && !truckRef.current.contains(e.target)) {
        setTruckDropdownOpen(false);
      }
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setPartyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Excel upload & preview state
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [previewData, setPreviewData] = useState([]); // Excel records pending user confirmation
  const [previewPage, setPreviewPage] = useState(1);
  const previewRowsPerPage = 50; // Paginate preview table in chunks of 50
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSavingPreview, setIsSavingPreview] = useState(false);

  // Remove stale localStorage cache once connected to DB
  useEffect(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: dbRecords, error } = await supabase
        .from("coal_truck_dispatches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase query error:", error);
      } else {
        // Source of truth is 100% Supabase DB!
        // If DB has 0 rows (user deleted all data), it stays empty.
        const mapped = (dbRecords || []).map((r, idx) => ({
          id: r.id,
          sNo: r.s_no ? Number(r.s_no) : idx + 1,
          date: r.date || "",
          truckNo: (r.truck_no || "").toUpperCase().trim(),
          qty: parseFloat(r.qty) || 0,
          partyName: (r.party_name || "").trim(),
          remark: r.remark || ""
        }));
        setData(mapped);
        return;
      }
    } catch (e) {
      console.warn("Supabase load error:", e);
    }
  };

  const saveData = async (newData) => {
    setData(newData);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
  };

  // Unique parties for filter
  const uniqueParties = useMemo(() => {
    const set = new Set();
    data.forEach(d => {
      if (d.partyName) set.add(d.partyName);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [data]);

  // Unique trucks for filter
  const uniqueTrucksList = useMemo(() => {
    const set = new Set();
    data.forEach(d => {
      if (d.truckNo) set.add(d.truckNo);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [data]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Truck filter
      if (selectedTruck !== "ALL" && item.truckNo !== selectedTruck) {
        return false;
      }

      // Party filter
      if (selectedParty !== "ALL" && item.partyName !== selectedParty) {
        return false;
      }

      // Qty filter (min / max)
      const numQty = parseFloat(item.qty);
      if (minQty && !isNaN(parseFloat(minQty))) {
        if (isNaN(numQty) || numQty < parseFloat(minQty)) return false;
      }
      if (maxQty && !isNaN(parseFloat(maxQty))) {
        if (isNaN(numQty) || numQty > parseFloat(maxQty)) return false;
      }

      // Search filter (Truck No, Party Name, Remark)
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const tNo = (item.truckNo || "").toLowerCase();
        const pName = (item.partyName || "").toLowerCase();
        const dt = (item.date || "").toLowerCase();
        if (!tNo.includes(q) && !pName.includes(q) && !dt.includes(q)) {
          return false;
        }
      }

      // Date Range Filter
      if (startDate || endDate) {
        if (!item.date) return false;
        let itemDateStr = "";
        const parts = item.date.split(" ")[0].split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            itemDateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else {
            const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            const mo = parts[1].padStart(2, '0');
            const da = parts[0].padStart(2, '0');
            itemDateStr = `${yr}-${mo}-${da}`;
          }
        }
        if (startDate && itemDateStr && itemDateStr < startDate) return false;
        if (endDate && itemDateStr && itemDateStr > endDate) return false;
      }

      return true;
    });
  }, [data, selectedTruck, selectedParty, minQty, maxQty, searchTerm, startDate, endDate]);

  // Reset visibleCount whenever filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [searchTerm, selectedTruck, selectedParty, minQty, maxQty, startDate, endDate]);

  // Paginated/Visible slice of data (infinite scroll / load chunks of 50)
  const paginatedData = useMemo(() => {
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  // Statistics
  const stats = useMemo(() => {
    let totalQty = 0;
    const trucksSet = new Set();
    const partiesSet = new Set();
    filteredData.forEach(d => {
      totalQty += Number(d.qty) || 0;
      if (d.truckNo) trucksSet.add(d.truckNo);
      if (d.partyName) partiesSet.add(d.partyName);
    });
    return {
      totalRecords: filteredData.length,
      totalQty: totalQty.toFixed(2),
      uniqueTrucks: trucksSet.size,
      uniqueParties: partiesSet.size
    };
  }, [filteredData]);

  // Excel / CSV File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Reading file...");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!jsonData || jsonData.length === 0) {
          alert("Selected file is empty.");
          setIsUploading(false);
          return;
        }

        // Find header row containing S.NO or TRUCK NO or PARTY NAME
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(10, jsonData.length); r++) {
          const rowText = jsonData[r].map(c => String(c || "").toUpperCase().trim()).join(" ");
          if (rowText.includes("TRUCK") || rowText.includes("PARTY") || rowText.includes("QTY")) {
            headerRowIdx = r;
            break;
          }
        }

        if (headerRowIdx === -1) {
          headerRowIdx = 0;
        }

        const headers = jsonData[headerRowIdx].map(h => String(h || "").toUpperCase().trim());
        const sNoIdx = headers.findIndex(h => h.includes("S.NO") || h.includes("SL") || h.includes("SR"));
        const dateIdx = headers.findIndex(h => h.includes("DATE"));
        const truckIdx = headers.findIndex(h => h.includes("TRUCK"));
        const qtyIdx = headers.findIndex(h => h.includes("QTY"));
        const partyIdx = headers.findIndex(h => h.includes("PARTY"));

        const newRecords = [];
        let runningId = Date.now();

        for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
          const row = jsonData[r];
          if (!row || row.length === 0) continue;

          // Check if this is a "Total" row or empty
          const firstVal = String(row[sNoIdx >= 0 ? sNoIdx : 0] || "").trim().toLowerCase();
          if (firstVal === "total" || firstVal === "sum") continue;

          const truckVal = String(row[truckIdx >= 0 ? truckIdx : 2] || "").trim().toUpperCase();
          const qtyVal = parseFloat(row[qtyIdx >= 0 ? qtyIdx : 3]);
          const partyVal = String(row[partyIdx >= 0 ? partyIdx : 4] || "").trim();

          // If no truck and no party and no qty, skip
          if (!truckVal && !partyVal && isNaN(qtyVal)) continue;

          let dateVal = row[dateIdx >= 0 ? dateIdx : 1];
          let formattedDate = "";
          if (dateVal instanceof Date) {
            formattedDate = dateVal.toLocaleDateString("en-GB") + " " + dateVal.toLocaleTimeString("en-GB");
          } else if (dateVal !== null && dateVal !== undefined) {
            formattedDate = String(dateVal).trim();
          }

          newRecords.push({
            id: `rec_${runningId++}_${r}`,
            sNo: newRecords.length + 1,
            date: formattedDate,
            truckNo: truckVal,
            qty: !isNaN(qtyVal) ? qtyVal : 0,
            partyName: partyVal,
            remark: ""
          });
        }

        if (newRecords.length === 0) {
          alert("No valid truck dispatch rows found in this file.");
        } else {
          // Open Preview Modal instead of immediately saving
          setPreviewData(newRecords);
          setPreviewPage(1);
          setIsPreviewOpen(true);
        }
      } catch (err) {
        console.error("Error parsing Excel:", err);
        alert("Failed to parse file: " + err.message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm and Save Excel Preview Data to DB
  const handleConfirmSaveExcel = async () => {
    if (!previewData || previewData.length === 0) return;
    setIsSavingPreview(true);

    try {
      // 1. Insert into Supabase in safe chunks of 100
      for (let i = 0; i < previewData.length; i += 100) {
        const batch = previewData.slice(i, i + 100).map((nr, bIdx) => ({
          s_no: i + bIdx + 1,
          date: nr.date,
          truck_no: nr.truckNo,
          qty: nr.qty,
          party_name: nr.partyName,
          remark: nr.remark || ""
        }));
        await supabase.from("coal_truck_dispatches").insert(batch);
      }

      // 2. Reload fresh data directly from Supabase DB
      await loadData();

      setUploadStatus(`Successfully saved ${previewData.length} records to Database!`);
      setTimeout(() => setUploadStatus(""), 4000);
      setIsPreviewOpen(false);
      setPreviewData([]);
    } catch (err) {
      console.error("Error saving to DB:", err);
      alert("Failed to save to database: " + err.message);
    } finally {
      setIsSavingPreview(false);
    }
  };

  // Helper to format date into YYYY-MM-DD for date input
  const toDateInputVal = (dStr) => {
    if (!dStr) return "";
    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
      return dStr.substring(0, 10);
    }
    // If DD/MM/YYYY or DD/MM/YY
    const parts = dStr.split(" ")[0].split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        const mo = parts[1].padStart(2, '0');
        const da = parts[0].padStart(2, '0');
        return `${yr}-${mo}-${da}`;
      }
    }
    return "";
  };

  // Helper to format YYYY-MM-DD to DD/MM/YYYY
  const fromDateInputVal = (dStr) => {
    if (!dStr) return "";
    const [y, m, d] = dStr.split("-");
    if (y && m && d) {
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    return dStr;
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setFormData({
      date: `${dd}/${mm}/${yyyy}`,
      truckNo: "",
      qty: "",
      partyName: "",
      remark: ""
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      date: item.date || "",
      truckNo: item.truckNo || "",
      qty: item.qty || "",
      partyName: item.partyName || "",
      remark: item.remark || ""
    });
    setIsModalOpen(true);
  };

  // Delete Record
  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete Truck No: ${item.truckNo} (${item.partyName})?`)) {
      return;
    }
    const updated = data.filter(d => d.id !== item.id);
    updated.forEach((d, idx) => { d.sNo = idx + 1; });
    await saveData(updated);

    // Remove from DB if exists
    try {
      if (item.id && !String(item.id).startsWith("rec_")) {
        await supabase.from("coal_truck_dispatches").delete().eq("id", item.id);
      }
    } catch (e) {
      console.warn("DB delete error:", e);
    }
  };

  // Save Modal (Create or Update)
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.truckNo.trim()) {
      alert("Please enter Truck Number");
      return;
    }
    if (!formData.qty || isNaN(parseFloat(formData.qty))) {
      alert("Please enter a valid Quantity");
      return;
    }

    if (editingItem) {
      // Update
      const updated = data.map(d => {
        if (d.id === editingItem.id) {
          return {
            ...d,
            date: formData.date.trim(),
            truckNo: formData.truckNo.trim().toUpperCase(),
            qty: parseFloat(formData.qty),
            partyName: formData.partyName.trim(),
            remark: formData.remark.trim()
          };
        }
        return d;
      });
      await saveData(updated);

      try {
        if (editingItem.id && !String(editingItem.id).startsWith("rec_")) {
          await supabase.from("coal_truck_dispatches").update({
            date: formData.date.trim(),
            truck_no: formData.truckNo.trim().toUpperCase(),
            qty: parseFloat(formData.qty),
            party_name: formData.partyName.trim()
          }).eq("id", editingItem.id);
        }
      } catch (err) {
        console.warn("DB update error:", err);
      }
    } else {
      // Add
      try {
        const { data: inserted, error } = await supabase.from("coal_truck_dispatches").insert([{
          s_no: data.length + 1,
          date: formData.date.trim() || new Date().toLocaleDateString("en-GB"),
          truck_no: formData.truckNo.trim().toUpperCase(),
          qty: parseFloat(formData.qty),
          party_name: formData.partyName.trim(),
          remark: formData.remark.trim()
        }]).select();

        const newItem = {
          id: (inserted && inserted[0]?.id) || `rec_${Date.now()}`,
          sNo: data.length + 1,
          date: formData.date.trim() || new Date().toLocaleDateString("en-GB"),
          truckNo: formData.truckNo.trim().toUpperCase(),
          qty: parseFloat(formData.qty),
          partyName: formData.partyName.trim(),
          remark: formData.remark.trim()
        };
        const updated = [newItem, ...data];
        updated.forEach((d, idx) => { d.sNo = idx + 1; });
        await saveData(updated);
      } catch (err) {
        console.warn("DB insert error:", err);
        const newItem = {
          id: `rec_${Date.now()}`,
          sNo: data.length + 1,
          date: formData.date.trim() || new Date().toLocaleDateString("en-GB"),
          truckNo: formData.truckNo.trim().toUpperCase(),
          qty: parseFloat(formData.qty),
          partyName: formData.partyName.trim(),
          remark: formData.remark.trim()
        };
        const updated = [newItem, ...data];
        updated.forEach((d, idx) => { d.sNo = idx + 1; });
        await saveData(updated);
      }
    }

    setIsModalOpen(false);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportColumns = [
      { key: "sNo", label: "S.NO." },
      { key: "date", label: "DATE" },
      { key: "truckNo", label: "TRUCK NO." },
      { key: "qty", label: "QTY." },
      { key: "partyName", label: "PARTY NAME" },
      { key: "remark", label: "REMARK" }
    ];
    exportToExcel(filteredData, exportColumns, "Truck_Dispatch_Records");
  };

  // Export to PDF
  const handleExportPDF = () => {
    const exportColumns = [
      { key: "sNo", label: "S.NO." },
      { key: "date", label: "DATE" },
      { key: "truckNo", label: "TRUCK NO." },
      { key: "qty", label: "QTY." },
      { key: "partyName", label: "PARTY NAME" }
    ];
    exportToPDF(filteredData, exportColumns, "Truck_Dispatch_Report", "Truck Dispatch Delivery Records");
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const sampleRows = [
      { "S.NO.": 1, "DATE": "05/10/2026 07:06:31", "TRUCK NO.": "CG15EC8810", "QTY.": 39.84, "PARTY NAME": "RUDRAA ENTEPRISES" },
      { "S.NO.": 2, "DATE": "05/10/2026 07:24:25", "TRUCK NO.": "CG15ED3613", "QTY.": 38.99, "PARTY NAME": "RUDRAA ENTEPRISES" },
      { "S.NO.": 3, "DATE": "05/10/2026 18:47:25", "TRUCK NO.": "CG15ED2488", "QTY.": 37.85, "PARTY NAME": "ANANTA ALLOYS PRIVATE LIMITED" }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "Truck_Dispatch_Sample_Template.xlsx");
  };

  return (
    <div style={{ padding: "0", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      {/* ── 4 COMPACT KPI STAT CARDS (2x2 on Mobile, 4x1 on Desktop) ── */}
      <div className="dispatch-cards-grid">
        {/* Card 1: Total Records */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
        }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px" }}>
              Total Dispatches
            </div>
            <div style={{ color: "#0f172a", fontSize: "20px", fontWeight: "900", fontFamily: "var(--font-mono, monospace)" }}>
              {stats.totalRecords} <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Entries</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px", fontWeight: "500" }}>
              In current view
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
            color: "#0284c7"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
        </div>

        {/* Card 2: Total Qty */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
        }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px" }}>
              Total Weight (Qty)
            </div>
            <div style={{ color: "#16a34a", fontSize: "20px", fontWeight: "900", fontFamily: "var(--font-mono, monospace)" }}>
              {Number(stats.totalQty).toLocaleString()} <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>MT</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px", fontWeight: "500" }}>
              Delivered Tonnage
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
            color: "#16a34a"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
        </div>

        {/* Card 3: Unique Trucks */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
        }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px" }}>
              Unique Vehicles
            </div>
            <div style={{ color: "#7c3aed", fontSize: "20px", fontWeight: "900", fontFamily: "var(--font-mono, monospace)" }}>
              {stats.uniqueTrucks} <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Trucks</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px", fontWeight: "500" }}>
              Active in log
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
            color: "#7c3aed"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
        </div>

        {/* Card 4: Receiving Parties */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
        }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px" }}>
              Consignee Parties
            </div>
            <div style={{ color: "#ea580c", fontSize: "20px", fontWeight: "900", fontFamily: "var(--font-mono, monospace)" }}>
              {stats.uniqueParties} <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Parties</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px", fontWeight: "500" }}>
              Receiving plants
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
            color: "#ea580c"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: EXPORT, EXCEL UPLOAD, SEARCH & FILTERS ── */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "12px 16px",
        marginBottom: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          
          {/* Action Buttons: Excel Upload, Add Entry, Sample */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              style={{ display: "none" }}
            />

            {/* Upload Excel Button */}
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={isUploading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "7px 14px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: isUploading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)"
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {isUploading ? "Uploading..." : "Upload Excel Sheet"}
            </button>

            {/* Manual Add Button */}
            <button
              onClick={handleOpenAdd}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "7px 14px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(220, 38, 38, 0.25)"
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Manual Entry
            </button>

            {/* Sample Template Button */}
            <button
              onClick={handleDownloadSample}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#f8fafc",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
              title="Download sample formatted Excel template"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Sample Excel
            </button>

            {/* Quick Export Buttons */}
            <button
              onClick={handleExportExcel}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#f0fdf4",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Export Excel
            </button>

            <button
              onClick={handleExportPDF}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Export PDF
            </button>
          </div>

          {/* Upload Status / Total Count Indicator */}
          {uploadStatus ? (
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a", background: "#f0fdf4", padding: "4px 10px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
              {uploadStatus}
            </span>
          ) : (
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
              Showing {filteredData.length} records
            </span>
          )}
        </div>

        {/* Filters Row: Single Line Professional Alignment */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #f1f5f9", overflowX: "auto", whiteSpace: "nowrap" }}>
          
          {/* 1. SEARCH INPUT */}
          <div style={{ position: "relative", width: "180px", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search truck, party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 28px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "12px",
                outline: "none",
                background: "#ffffff"
              }}
            />
          </div>

          {/* 2. TRUCK NO. FILTER */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b" }}>Truck:</span>
            <select
              value={selectedTruck}
              onChange={(e) => setSelectedTruck(e.target.value)}
              style={{
                padding: "5px 8px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "12px",
                color: "#1e293b",
                background: "#ffffff",
                outline: "none",
                cursor: "pointer",
                maxWidth: "150px",
                fontWeight: "600",
                fontFamily: "var(--font-mono, monospace)"
              }}
            >
              <option value="ALL">All Trucks ({uniqueTrucksList.length - 1})</option>
              {uniqueTrucksList.filter(t => t !== "ALL").map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 3. PARTY NAME FILTER */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b" }}>Party:</span>
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              style={{
                padding: "5px 8px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "12px",
                color: "#1e293b",
                background: "#ffffff",
                outline: "none",
                cursor: "pointer",
                maxWidth: "180px",
                fontWeight: "600"
              }}
            >
              {uniqueParties.map(p => (
                <option key={p} value={p}>{p === "ALL" ? `All Parties (${uniqueParties.length - 1})` : p}</option>
              ))}
            </select>
          </div>

          {/* 4. DATE RANGE FILTER */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f8fafc", padding: "3px 6px", borderRadius: "8px", border: "1px solid #e2e8f0", flexShrink: 0 }}>
            <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b" }}>Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "2px 5px", fontSize: "11.5px", outline: "none", background: "#ffffff", cursor: "pointer" }}
              title="Start Date"
            />
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "2px 5px", fontSize: "11.5px", outline: "none", background: "#ffffff", cursor: "pointer" }}
              title="End Date"
            />
          </div>

          {/* RESET ALL FILTERS */}
          {(searchTerm || selectedTruck !== "ALL" || selectedParty !== "ALL" || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedTruck("ALL");
                setSelectedParty("ALL");
                setStartDate("");
                setEndDate("");
              }}
              style={{
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "4px 10px",
                fontSize: "11.5px",
                fontWeight: "700",
                cursor: "pointer",
                flexShrink: 0
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── DESKTOP TABLE VIEW ── */}
      <div className="truck-desktop-table-view" style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        marginBottom: 0
      }}>
        <div 
          style={{ overflowX: "auto", maxHeight: "calc(100vh - 355px)" }}
          onScroll={(e) => {
            const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
            if (scrollHeight - scrollTop <= clientHeight + 80) {
              if (visibleCount < filteredData.length) {
                setVisibleCount(prev => Math.min(prev + 50, filteredData.length));
              }
            }
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
            <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #e2e8f0" }}>
              <tr>
                <th style={{ padding: "10px 14px", fontSize: "11.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center", width: "55px" }}>
                  S.NO.
                </th>
                <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center", width: "65px" }}>
                  VIEW
                </th>
                <th style={{ padding: "10px 14px", fontSize: "11.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  DATE
                </th>
                <th style={{ padding: "10px 14px", fontSize: "11.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  TRUCK NO.
                </th>
                <th style={{ padding: "10px 14px", fontSize: "11.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>
                  QTY. (MT)
                </th>
                <th style={{ padding: "10px 14px", fontSize: "11.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  PARTY NAME
                </th>
                <th style={{ padding: "10px 14px", fontSize: "11.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center", width: "120px" }}>
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "12.5px", color: "#1e293b" }}>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s ease",
                      background: idx % 2 === 0 ? "#ffffff" : "#fafafa"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#fafafa"; }}
                  >
                    {/* S.No */}
                    <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: "700", color: "#64748b", fontFamily: "var(--font-mono, monospace)" }}>
                      {idx + 1}
                    </td>

                    {/* View Eye Button */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button
                        onClick={() => { setViewingItem(row); setIsViewModalOpen(true); }}
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#0284c7",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#e0f2fe"; e.currentTarget.style.borderColor = "#7dd3fc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                        title="View Details"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                    </td>

                    {/* Date */}
                    <td style={{ padding: "10px 14px", fontWeight: "600", color: "#334155" }}>
                      {row.date || "—"}
                    </td>

                    {/* Truck No */}
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: "6px",
                        fontWeight: "800",
                        fontFamily: "var(--font-mono, monospace)",
                        border: "1px solid #dbeafe"
                      }}>
                        <HighlightText text={row.truckNo} highlight={searchTerm} />
                      </span>
                    </td>

                    {/* Qty */}
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: "800", color: "#0f172a", fontFamily: "var(--font-mono, monospace)" }}>
                      {Number(row.qty).toFixed(2)}
                    </td>

                    {/* Party Name */}
                    <td style={{ padding: "10px 14px", fontWeight: "700", color: "#0f172a" }}>
                      <HighlightText text={row.partyName} highlight={searchTerm} />
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(row)}
                          style={{
                            background: "#f0fdf4",
                            color: "#16a34a",
                            border: "1px solid #bbf7d0",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            cursor: "pointer"
                          }}
                          title="Edit Record"
                        >
                          Edit
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(row)}
                          style={{
                            background: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            cursor: "pointer"
                          }}
                          title="Delete Record"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                      No Truck Dispatch Records Found
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      Click "Upload Excel Sheet" to import your sheet or click "Manual Entry" to create a new record.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MOBILE CARDS VIEW (RESPONSIVE CARDS FOR MOBILE) ── */}
      <div className="truck-mobile-cards-view">
        {paginatedData.length > 0 ? (
          paginatedData.map((row, idx) => (
            <div
              key={row.id || idx}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "12px 14px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              {/* Header: S.No + Truck No + Qty */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontFamily: "var(--font-mono, monospace)" }}>
                    #{idx + 1}
                  </span>
                  <span style={{
                    padding: "3px 8px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    borderRadius: "6px",
                    fontWeight: "800",
                    fontSize: "13px",
                    fontFamily: "var(--font-mono, monospace)",
                    border: "1px solid #dbeafe"
                  }}>
                    <HighlightText text={row.truckNo} highlight={searchTerm} />
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a", fontFamily: "var(--font-mono, monospace)" }}>
                    {Number(row.qty).toFixed(2)}
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", marginLeft: "3px" }}>MT</span>
                </div>
              </div>

              {/* Body: Party Name */}
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", lineHeight: "1.3" }}>
                <HighlightText text={row.partyName} highlight={searchTerm} />
              </div>

              {/* Footer: Date + Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #f1f5f9", marginTop: "2px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                  {row.date || "—"}
                </span>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {/* View Eye */}
                  <button
                    onClick={() => { setViewingItem(row); setIsViewModalOpen(true); }}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0284c7",
                      cursor: "pointer"
                    }}
                    title="View Details"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEdit(row)}
                    style={{
                      background: "#f0fdf4",
                      color: "#16a34a",
                      border: "1px solid #bbf7d0",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    Edit
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(row)}
                    style={{
                      background: "#fef2f2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "30px 16px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
              No Truck Dispatch Records Found
            </div>
            <div style={{ fontSize: "12px" }}>
              Click "Upload Excel Sheet" or "Manual Entry" above to add records.
            </div>
          </div>
        )}

        {/* Mobile Load More */}
        {visibleCount < filteredData.length && (
          <button
            onClick={() => setVisibleCount(prev => Math.min(prev + 50, filteredData.length))}
            style={{
              padding: "10px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              color: "#0284c7",
              fontSize: "12.5px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
            }}
          >
            Load More Records ({filteredData.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backdropFilter: "blur(2px)"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "14px",
            width: "90%",
            maxWidth: "480px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "visible"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc"
            }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                {editingItem ? "Edit Truck Dispatch Record" : "Add New Truck Dispatch"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "2px 6px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveModal} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", overflow: "visible" }}>
              {/* Date with Calendar Picker */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                  DATE *
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="date"
                    required
                    value={toDateInputVal(formData.date)}
                    onChange={(e) => setFormData({ ...formData, date: fromDateInputVal(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      outline: "none",
                      cursor: "pointer",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontWeight: "600"
                    }}
                  />
                </div>
              </div>

              {/* Truck No - Professional Searchable Combobox */}
              <div ref={truckRef} style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>TRUCK NO.</span>
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: "500" }}>
                    Select existing or type new
                  </span>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    value={formData.truckNo}
                    onFocus={() => { setTruckDropdownOpen(true); setPartyDropdownOpen(false); }}
                    onChange={(e) => {
                      setFormData({ ...formData, truckNo: e.target.value.toUpperCase() });
                      setTruckDropdownOpen(true);
                    }}
                    placeholder="Search or enter Truck (e.g. CG15EC8810)"
                    style={{
                      width: "100%",
                      padding: "9px 34px 9px 12px",
                      border: truckDropdownOpen ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      outline: "none",
                      fontFamily: "var(--font-mono, monospace)",
                      fontWeight: "700",
                      background: "#ffffff",
                      boxShadow: truckDropdownOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
                      transition: "border-color 0.15s, box-shadow 0.15s"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => { setTruckDropdownOpen(!truckDropdownOpen); setPartyDropdownOpen(false); }}
                    style={{
                      position: "absolute",
                      right: "6px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b"
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: truckDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>

                {/* Custom Elegant Dropdown Menu */}
                {truckDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "4px",
                    background: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
                    maxHeight: "180px",
                    overflowY: "auto",
                    zIndex: 100,
                    padding: "4px"
                  }}>
                    {uniqueTrucksList
                      .filter(t => t !== "ALL" && t.toLowerCase().includes((formData.truckNo || "").toLowerCase()))
                      .slice(0, 50)
                      .map((truck) => (
                        <div
                          key={truck}
                          onClick={() => {
                            setFormData({ ...formData, truckNo: truck });
                            setTruckDropdownOpen(false);
                          }}
                          style={{
                            padding: "7px 12px",
                            fontSize: "12.5px",
                            fontFamily: "var(--font-mono, monospace)",
                            fontWeight: "600",
                            color: formData.truckNo === truck ? "#2563eb" : "#1e293b",
                            background: formData.truckNo === truck ? "#eff6ff" : "transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "background 0.12s"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = formData.truckNo === truck ? "#eff6ff" : "transparent"; }}
                        >
                          <span>{truck}</span>
                          {formData.truckNo === truck && (
                            <span style={{ color: "#2563eb", fontSize: "11px", fontWeight: "700" }}>✓</span>
                          )}
                        </div>
                      ))}
                    {uniqueTrucksList.filter(t => t !== "ALL" && t.toLowerCase().includes((formData.truckNo || "").toLowerCase())).length === 0 && (
                      <div style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                        New truck will be added: <strong style={{ color: "#0f172a" }}>"{formData.truckNo}"</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                  <span>QTY. (MT)</span>
                  <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                  placeholder="e.g. 39.84"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    outline: "none",
                    fontFamily: "var(--font-mono, monospace)",
                    background: "#ffffff"
                  }}
                />
              </div>

              {/* Party Name - Professional Searchable Combobox */}
              <div ref={partyRef} style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>PARTY NAME</span>
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: "500" }}>
                    Select existing or type new
                  </span>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    value={formData.partyName}
                    onFocus={() => { setPartyDropdownOpen(true); setTruckDropdownOpen(false); }}
                    onChange={(e) => {
                      setFormData({ ...formData, partyName: e.target.value });
                      setPartyDropdownOpen(true);
                    }}
                    placeholder="Search or enter Party (e.g. RUDRAA ENTERPRISES)"
                    style={{
                      width: "100%",
                      padding: "9px 34px 9px 12px",
                      border: partyDropdownOpen ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      outline: "none",
                      background: "#ffffff",
                      boxShadow: partyDropdownOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
                      transition: "border-color 0.15s, box-shadow 0.15s"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => { setPartyDropdownOpen(!partyDropdownOpen); setTruckDropdownOpen(false); }}
                    style={{
                      position: "absolute",
                      right: "6px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b"
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: partyDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>

                {/* Custom Elegant Dropdown Menu */}
                {partyDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "4px",
                    background: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
                    maxHeight: "180px",
                    overflowY: "auto",
                    zIndex: 100,
                    padding: "4px"
                  }}>
                    {uniqueParties
                      .filter(p => p !== "ALL" && p.toLowerCase().includes((formData.partyName || "").toLowerCase()))
                      .map((party) => (
                        <div
                          key={party}
                          onClick={() => {
                            setFormData({ ...formData, partyName: party });
                            setPartyDropdownOpen(false);
                          }}
                          style={{
                            padding: "7px 12px",
                            fontSize: "12.5px",
                            fontWeight: "600",
                            color: formData.partyName === party ? "#2563eb" : "#1e293b",
                            background: formData.partyName === party ? "#eff6ff" : "transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "background 0.12s"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = formData.partyName === party ? "#eff6ff" : "transparent"; }}
                        >
                          <span>{party}</span>
                          {formData.partyName === party && (
                            <span style={{ color: "#2563eb", fontSize: "11px", fontWeight: "700" }}>✓</span>
                          )}
                        </div>
                      ))}
                    {uniqueParties.filter(p => p !== "ALL" && p.toLowerCase().includes((formData.partyName || "").toLowerCase())).length === 0 && (
                      <div style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                        New party will be added: <strong style={{ color: "#0f172a" }}>"{formData.partyName}"</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(220, 38, 38, 0.25)"
                  }}
                >
                  {editingItem ? "Update Record" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EXCEL UPLOAD PREVIEW & CONFIRMATION MODAL ── */}
      {isPreviewOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backdropFilter: "blur(3px)"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "92%",
            maxWidth: "880px",
            maxHeight: "88vh",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 22px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                    Excel Sheet Preview
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                    Verify parsed records below before saving to Database ({previewData.length} total rows)
                  </span>
                </div>
              </div>

              <button
                onClick={() => { setIsPreviewOpen(false); setPreviewData([]); }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                ✕
              </button>
            </div>

            {/* 4 Summary Cards Row in Preview Modal */}
            <div style={{
              padding: "12px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px"
            }}>
              {/* Card 1: Total Rows */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Entries
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", fontFamily: "var(--font-mono, monospace)" }}>
                    {previewData.length} <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>Rows</span>
                  </div>
                </div>
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#e0f2fe",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                </div>
              </div>

              {/* Card 2: Total Tonnage */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Tonnage
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#16a34a", fontFamily: "var(--font-mono, monospace)" }}>
                    {previewData.reduce((acc, r) => acc + (Number(r.qty) || 0), 0).toFixed(2)} <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b" }}>MT</span>
                  </div>
                </div>
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                </div>
              </div>

              {/* Card 3: Unique Trucks */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Unique Vehicles
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#7c3aed", fontFamily: "var(--font-mono, monospace)" }}>
                    {new Set(previewData.map(r => r.truckNo).filter(Boolean)).size} <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>Trucks</span>
                  </div>
                </div>
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
              </div>

              {/* Card 4: Unique Parties */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Consignee Parties
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#ea580c", fontFamily: "var(--font-mono, monospace)" }}>
                    {new Set(previewData.map(r => r.partyName).filter(Boolean)).size} <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>Parties</span>
                  </div>
                </div>
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#ffedd5",
                  color: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            {/* Scrollable Preview Table */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", maxHeight: "55vh" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase", textAlign: "center", width: "50px" }}>
                      #
                    </th>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
                      DATE
                    </th>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
                      TRUCK NO.
                    </th>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>
                      QTY. (MT)
                    </th>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
                      PARTY NAME
                    </th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "12px", color: "#1e293b" }}>
                  {previewData.slice((previewPage - 1) * previewRowsPerPage, previewPage * previewRowsPerPage).map((row, idx) => {
                    const rowNumber = (previewPage - 1) * previewRowsPerPage + idx + 1;
                    return (
                      <tr
                        key={row.id || rowNumber}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: idx % 2 === 0 ? "#ffffff" : "#fafafa"
                        }}
                      >
                        <td style={{ padding: "8px 14px", textAlign: "center", fontWeight: "700", color: "#64748b", fontFamily: "var(--font-mono, monospace)" }}>
                          {rowNumber}
                        </td>
                        <td style={{ padding: "8px 14px", fontWeight: "600", color: "#334155" }}>
                          {row.date || "—"}
                        </td>
                        <td style={{ padding: "8px 14px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            borderRadius: "4px",
                            fontWeight: "800",
                            fontFamily: "var(--font-mono, monospace)"
                          }}>
                            {row.truckNo}
                          </span>
                        </td>
                        <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: "800", color: "#0f172a", fontFamily: "var(--font-mono, monospace)" }}>
                          {Number(row.qty).toFixed(2)}
                        </td>
                        <td style={{ padding: "8px 14px", fontWeight: "700", color: "#0f172a" }}>
                          {row.partyName || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Preview Pagination Toolbar */}
            {Math.ceil(previewData.length / previewRowsPerPage) > 1 && (
              <div style={{
                padding: "8px 22px",
                background: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                color: "#64748b"
              }}>
                <div>
                  Showing <strong>{(previewPage - 1) * previewRowsPerPage + 1}</strong> to <strong>{Math.min(previewPage * previewRowsPerPage, previewData.length)}</strong> of <strong>{previewData.length}</strong> preview records
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <button
                    type="button"
                    disabled={previewPage === 1}
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: previewPage === 1 ? "#f1f5f9" : "#ffffff",
                      color: previewPage === 1 ? "#94a3b8" : "#334155",
                      cursor: previewPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Prev
                  </button>

                  <span style={{ fontWeight: "700", color: "#0f172a" }}>
                    {previewPage} / {Math.ceil(previewData.length / previewRowsPerPage)}
                  </span>

                  <button
                    type="button"
                    disabled={previewPage === Math.ceil(previewData.length / previewRowsPerPage)}
                    onClick={() => setPreviewPage(p => Math.min(Math.ceil(previewData.length / previewRowsPerPage), p + 1))}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: previewPage === Math.ceil(previewData.length / previewRowsPerPage) ? "#f1f5f9" : "#ffffff",
                      color: previewPage === Math.ceil(previewData.length / previewRowsPerPage) ? "#94a3b8" : "#334155",
                      cursor: previewPage === Math.ceil(previewData.length / previewRowsPerPage) ? "not-allowed" : "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer with Cancel & Save Buttons */}
            <div style={{
              padding: "14px 22px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                Click <strong>"Save"</strong> to permanently store these {previewData.length} records into Database.
              </span>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  disabled={isSavingPreview}
                  onClick={() => { setIsPreviewOpen(false); setPreviewData([]); }}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: isSavingPreview ? "not-allowed" : "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSavingPreview}
                  onClick={handleConfirmSaveExcel}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 26px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: isSavingPreview ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)"
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {isSavingPreview ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── VIEW DETAILS MODAL ── */}
      {isViewModalOpen && viewingItem && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backdropFilter: "blur(2px)"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "90%",
            maxWidth: "520px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "#e0f2fe",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                    Truck Dispatch Details
                  </h3>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                    Record Information & Action Controls
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setIsViewModalOpen(false); setViewingItem(null); }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Information Grid */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    S.NO.
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", marginTop: "2px", fontFamily: "var(--font-mono, monospace)" }}>
                    #{viewingItem.sNo || 1}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    DATE / TIME
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                    {viewingItem.date || "—"}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#eff6ff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    TRUCK NO.
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#1e40af", marginTop: "2px", fontFamily: "var(--font-mono, monospace)" }}>
                    {viewingItem.truckNo || "—"}
                  </div>
                </div>

                <div style={{ background: "#f0fdf4", padding: "10px 14px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#15803d", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    QUANTITY
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#166534", marginTop: "2px", fontFamily: "var(--font-mono, monospace)" }}>
                    {Number(viewingItem.qty).toFixed(2)} <span style={{ fontSize: "12px" }}>MT</span>
                  </div>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  PARTY NAME (CONSIGNEE)
                </div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", marginTop: "3px" }}>
                  {viewingItem.partyName || "—"}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer: Edit & Delete Buttons inside View Modal */}
            <div style={{
              padding: "14px 20px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              {/* Delete inside View Modal */}
              <button
                onClick={() => {
                  const target = viewingItem;
                  setIsViewModalOpen(false);
                  setViewingItem(null);
                  handleDelete(target);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete Record
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => { setIsViewModalOpen(false); setViewingItem(null); }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#64748b",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>

                {/* Edit inside View Modal */}
                <button
                  onClick={() => {
                    const target = viewingItem;
                    setIsViewModalOpen(false);
                    setViewingItem(null);
                    handleOpenEdit(target);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0284c7",
                    color: "#ffffff",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)"
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXCEL UPLOAD PREVIEW & CONFIRMATION MODAL ── */}
      {isPreviewOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backdropFilter: "blur(3px)"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "92%",
            maxWidth: "880px",
            maxHeight: "88vh",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 22px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                    Excel Sheet Preview
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                    Verify parsed records below before saving to Database ({previewData.length} total rows)
                  </span>
                </div>
              </div>

              <button
                onClick={() => { setIsPreviewOpen(false); setPreviewData([]); }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                ✕
              </button>
            </div>

            {/* 4 Summary Cards Row in Preview Modal */}
            <div style={{
              padding: "12px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px"
            }}>
              {/* Card 1: Total Rows */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Entries
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", fontFamily: "var(--font-mono, monospace)" }}>
                    {previewData.length} <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>Rows</span>
                  </div>
                </div>
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#e0f2fe",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                </div>
              </div>

              {/* Card 2: Total Tonnage */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Tonnage
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#16a34a", fontFamily: "var(--font-mono, monospace)" }}>
                    {previewData.reduce((acc, r) => acc + (Number(r.qty) || 0), 0).toFixed(2)} <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b" }}>MT</span>
                  </div>
                </div>
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                </div>
              </div>

              {/* Card 3: Unique Trucks */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Unique Vehicles
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#7c3aed", fontFamily: "var(--font-mono, monospace)" }}>
                    {new Set(previewData.map(r => r.truckNo).filter(Boolean)).size} <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>Trucks</span>
                  </div>
                </div>
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
              </div>

              {/* Card 4: Unique Parties */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Consignee Parties
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#ea580c", fontFamily: "var(--font-mono, monospace)" }}>
                    {new Set(previewData.map(r => r.partyName).filter(Boolean)).size} <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>Parties</span>
                  </div>
                </div>
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#ffedd5",
                  color: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            {/* Scrollable Preview Table */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", maxHeight: "55vh" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase", textAlign: "center", width: "50px" }}>
                      #
                    </th>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
                      DATE
                    </th>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
                      TRUCK NO.
                    </th>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>
                      QTY. (MT)
                    </th>
                    <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
                      PARTY NAME
                    </th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "12px", color: "#1e293b" }}>
                  {previewData.slice((previewPage - 1) * previewRowsPerPage, previewPage * previewRowsPerPage).map((row, idx) => {
                    const rowNumber = (previewPage - 1) * previewRowsPerPage + idx + 1;
                    return (
                      <tr
                        key={row.id || rowNumber}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: idx % 2 === 0 ? "#ffffff" : "#fafafa"
                        }}
                      >
                        <td style={{ padding: "8px 14px", textAlign: "center", fontWeight: "700", color: "#64748b", fontFamily: "var(--font-mono, monospace)" }}>
                          {rowNumber}
                        </td>
                        <td style={{ padding: "8px 14px", fontWeight: "600", color: "#334155" }}>
                          {row.date || "—"}
                        </td>
                        <td style={{ padding: "8px 14px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            borderRadius: "4px",
                            fontWeight: "800",
                            fontFamily: "var(--font-mono, monospace)"
                          }}>
                            {row.truckNo}
                          </span>
                        </td>
                        <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: "800", color: "#0f172a", fontFamily: "var(--font-mono, monospace)" }}>
                          {Number(row.qty).toFixed(2)}
                        </td>
                        <td style={{ padding: "8px 14px", fontWeight: "700", color: "#0f172a" }}>
                          {row.partyName || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Preview Pagination Toolbar */}
            {Math.ceil(previewData.length / previewRowsPerPage) > 1 && (
              <div style={{
                padding: "8px 22px",
                background: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                color: "#64748b"
              }}>
                <div>
                  Showing <strong>{(previewPage - 1) * previewRowsPerPage + 1}</strong> to <strong>{Math.min(previewPage * previewRowsPerPage, previewData.length)}</strong> of <strong>{previewData.length}</strong> preview records
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <button
                    type="button"
                    disabled={previewPage === 1}
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: previewPage === 1 ? "#f1f5f9" : "#ffffff",
                      color: previewPage === 1 ? "#94a3b8" : "#334155",
                      cursor: previewPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Prev
                  </button>

                  <span style={{ fontWeight: "700", color: "#0f172a" }}>
                    {previewPage} / {Math.ceil(previewData.length / previewRowsPerPage)}
                  </span>

                  <button
                    type="button"
                    disabled={previewPage === Math.ceil(previewData.length / previewRowsPerPage)}
                    onClick={() => setPreviewPage(p => Math.min(Math.ceil(previewData.length / previewRowsPerPage), p + 1))}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: previewPage === Math.ceil(previewData.length / previewRowsPerPage) ? "#f1f5f9" : "#ffffff",
                      color: previewPage === Math.ceil(previewData.length / previewRowsPerPage) ? "#94a3b8" : "#334155",
                      cursor: previewPage === Math.ceil(previewData.length / previewRowsPerPage) ? "not-allowed" : "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer with Cancel & Save Buttons */}
            <div style={{
              padding: "14px 22px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                Click <strong>"Save"</strong> to permanently store these {previewData.length} records into Database.
              </span>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  disabled={isSavingPreview}
                  onClick={() => { setIsPreviewOpen(false); setPreviewData([]); }}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: isSavingPreview ? "not-allowed" : "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSavingPreview}
                  onClick={handleConfirmSaveExcel}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 26px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: isSavingPreview ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)"
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {isSavingPreview ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
