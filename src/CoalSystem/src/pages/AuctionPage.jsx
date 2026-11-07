import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../utils/supabase";
import "../App.css";

export default function AuctionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [editId, setEditId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "-") return "-";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIndex = parseInt(parts[1], 10) - 1;
      return `${parts[2]}-${monthNames[mIndex]}-${parts[0]}`;
    }
    return dateStr;
  };

  const defaultNewItem = () => ({
    id: Date.now() + Math.random(),
    // Cluster summary / header fields (Table 1)
    cluster_name: "",
    total_offer: "",
    representative_grade: "",
    representative_size: "",
    cluster_modulated_price: "",
    floor_price: "",
    // Line item fields (Table 2 - Cluster Description)
    source: "",
    loading_point: "",
    mode: "",
    feeding_collieries: "",
    mine: "",
    coal_grade: "",
    size: "",
    quantity_offered: "",
    base_price: "",
    modulated_price: "",
    modulated_price_rep_grade: "",
    supply_pattern: "",
    no_of_lots: ""
  });
  
  // Form State - Clean initial values (No hardcoded values, completely dynamic)
  const [formData, setFormData] = useState({
    deal_id: "",
    notice_ref_no: "",
    notification_date: "",
    coal_company: "",
    department: "",
    registered_office: "",
    scheme_name: "",
    coal_type: "",
    total_offered_tonnes: "",
    auction_month_year: "",
    bid_date: "",
    service_provider: "",
    service_provider_hindi: "",
    remarks_annexure: "",
    rail_deposit_clause: "",
    road_deposit_clause: "",
    bid_closing_date: "",
    bidder: "",
    auction_source: "",
    payment_timeline_clause: "",
    remarks: ""
  });
  
  const [items, setItems] = useState([defaultNewItem()]);
  const [pdfFile, setPdfFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchAuctions = async () => {
    setIsLoading(true);
    try {
      const { data: dbData, error } = await supabase
        .from('auctions')
        .select(`
          *,
          auction_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback without join if foreign relationship differs
        const { data: simpleData, error: simpleErr } = await supabase
          .from('auctions')
          .select('*')
          .order('created_at', { ascending: false });
        if (simpleErr) throw simpleErr;
        setData(simpleData || []);
      } else {
        setData(dbData || []);
      }
    } catch (err) {
      console.error("Error fetching auctions:", err);
      showToast("Error loading data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Sync mine <-> source <-> loading_point
        if (field === 'loading_point') {
          updated.source = value;
          updated.mine = value;
        } else if (field === 'source') {
          updated.loading_point = value;
          if (!updated.mine) updated.mine = value;
        } else if (field === 'mine') {
          if (!updated.source) updated.source = value;
          if (!updated.loading_point) updated.loading_point = value;
        }
        // Sync floor_price <-> base_price
        if (field === 'floor_price') {
          updated.base_price = value;
        } else if (field === 'base_price') {
          updated.floor_price = value;
        }
        // Auto sync total_offer <-> quantity_offered if total_offer is set
        if (field === 'total_offer' && (!updated.quantity_offered || updated.quantity_offered === "")) {
          updated.quantity_offered = value;
        }
        // Auto sync representative_size <-> size
        if (field === 'representative_size' && (!updated.size || updated.size === "Sized Rom (-100mm)")) {
          updated.size = value;
        }
        // Auto sync modulated_price <-> cluster_modulated_price
        if (field === 'cluster_modulated_price' && (!updated.modulated_price || updated.modulated_price === "")) {
          updated.modulated_price = value;
          if (!updated.modulated_price_rep_grade) updated.modulated_price_rep_grade = value;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleAddItem = () => {
    setItems([...items, defaultNewItem()]);
  };

  const handleRemoveItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setPdfFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      deal_id: "",
      notice_ref_no: "",
      notification_date: "",
      coal_company: "",
      department: "",
      registered_office: "",
      scheme_name: "",
      coal_type: "",
      total_offered_tonnes: "",
      auction_month_year: "",
      bid_date: "",
      service_provider: "",
      service_provider_hindi: "",
      remarks_annexure: "",
      rail_deposit_clause: "",
      road_deposit_clause: "",
      bid_closing_date: "",
      bidder: "",
      auction_source: "",
      payment_timeline_clause: "",
      remarks: ""
    });
    setItems([defaultNewItem()]);
    setPdfFile(null);
  };

  const parseRemarksExtra = (remarksStr) => {
    if (!remarksStr) return { remarks: "", meta: {} };
    if (remarksStr.startsWith("{") && remarksStr.includes('"__is_secl_pdf_meta":true')) {
      try {
        const parsed = JSON.parse(remarksStr);
        return { remarks: parsed.userRemarks || "", meta: parsed };
      } catch {
        return { remarks: remarksStr, meta: {} };
      }
    }
    return { remarks: remarksStr, meta: {} };
  };

  const handleEditClick = async (row) => {
    setEditId(row.id);
    const { remarks: parsedRemarks, meta } = parseRemarksExtra(row.remarks);

    setFormData({
      deal_id: row.deal_id || "",
      scheme_name: meta.scheme_name || "",
      coal_company: row.coal_company || "",
      department: meta.department || "",
      registered_office: meta.registered_office || "",
      coal_type: meta.coal_type || "",
      total_offered_tonnes: meta.total_offered_tonnes || "",
      auction_month_year: meta.auction_month_year || "",
      service_provider: meta.service_provider || "",
      service_provider_hindi: meta.service_provider_hindi || "",
      remarks_annexure: meta.remarks_annexure || "",
      rail_deposit_clause: meta.rail_deposit_clause || "",
      road_deposit_clause: meta.road_deposit_clause || "",
      notice_ref_no: meta.notice_ref_no || "",
      notification_date: row.notification_date || "",
      bid_date: row.bid_date || "",
      bid_closing_date: row.bid_closing_date || "",
      bidder: row.bidder || "",
      auction_source: row.auction_source || "",
      payment_timeline_clause: meta.payment_timeline_clause || "",
      remarks: parsedRemarks
    });
    setPdfFile(null);

    try {
      const { data: itemsData, error } = await supabase
        .from('auction_items')
        .select('*')
        .eq('auction_id', row.id);
      
      if (error) throw error;
      
      if (itemsData && itemsData.length > 0) {
        setItems(itemsData.map(i => {
          let extra = {};
          if (i.coal_grade && i.coal_grade.startsWith("{")) {
            try { extra = JSON.parse(i.coal_grade); } catch {}
          }
          return {
            id: i.id || Date.now() + Math.random(),
            cluster_name: extra.cluster_name || "",
            total_offer: extra.total_offer || i.quantity_offered || "",
            representative_grade: extra.representative_grade || "",
            representative_size: extra.representative_size || extra.size || "Sized Rom (-100mm)",
            cluster_modulated_price: extra.cluster_modulated_price || extra.modulated_price || "",
            floor_price: extra.floor_price || i.base_price || "",
            source: extra.source || i.mine || "",
            loading_point: extra.loading_point || extra.source || i.mine || "",
            mode: extra.mode || "Road",
            feeding_collieries: extra.feeding_collieries || "",
            mine: i.mine || "",
            coal_grade: extra.grade || i.coal_grade || "",
            size: extra.size || "Sized Rom (-100mm)",
            quantity_offered: i.quantity_offered || "",
            base_price: i.base_price || "",
            modulated_price: extra.modulated_price || "",
            modulated_price_rep_grade: extra.modulated_price_rep_grade || extra.modulated_price || "",
            supply_pattern: extra.supply_pattern || "100%",
            no_of_lots: extra.no_of_lots || "1"
          };
        }));
      } else {
        setItems([defaultNewItem()]);
      }
    } catch (err) {
      console.error("Error fetching items:", err);
      setItems([defaultNewItem()]);
    }
    
    setIsViewModalOpen(false);
    setIsModalOpen(true);
  };

  const handleViewClick = async (row) => {
    const { remarks: parsedRemarks, meta } = parseRemarksExtra(row.remarks);
    const enrichedRow = {
      ...row,
      displayRemarks: parsedRemarks,
      meta,
      items: []
    };
    setViewData(enrichedRow);
    setIsViewModalOpen(true);

    try {
      const { data: itemsData, error } = await supabase
        .from('auction_items')
        .select('*')
        .eq('auction_id', row.id);
      
      if (!error && itemsData) {
        const enrichedItems = itemsData.map(i => {
          let extra = {};
          if (i.coal_grade && i.coal_grade.startsWith("{")) {
            try { extra = JSON.parse(i.coal_grade); } catch {}
          }
          return {
            ...i,
            cluster_name: extra.cluster_name || "-",
            source: extra.source || i.mine || "-",
            mode: extra.mode || "Road",
            feeding_collieries: extra.feeding_collieries || "-",
            grade: extra.grade || i.coal_grade || "-",
            representative_grade: extra.representative_grade || "-",
            size: extra.size || "Sized Rom (-100mm)",
            modulated_price: extra.modulated_price || "-",
            floor_price: extra.floor_price || i.base_price || "-",
            supply_pattern: extra.supply_pattern || "100%",
            no_of_lots: extra.no_of_lots || "1"
          };
        });
        setViewData(prev => ({ ...prev, items: enrichedItems }));
      }
    } catch (err) {
      console.error("Error fetching view items:", err);
    }
  };

  const handleSave = async () => {
    try {
      showToast("Saving Auction Notification...");
      let finalPdfUrl = null;

      // Upload PDF if exists
      if (pdfFile) {
        const fileExt = (pdfFile.name || "document.pdf").split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, pdfFile, { cacheControl: '3600', upsert: false });
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);
          
        finalPdfUrl = publicUrlData.publicUrl;
      }

      // Pack PDF notice metadata cleanly into remarks JSON envelope
      const metaEnvelope = {
        __is_secl_pdf_meta: true,
        scheme_name: formData.scheme_name,
        service_provider: formData.service_provider,
        service_provider_hindi: formData.service_provider_hindi,
        notice_ref_no: formData.notice_ref_no,
        department: formData.department,
        registered_office: formData.registered_office,
        coal_type: formData.coal_type,
        total_offered_tonnes: formData.total_offered_tonnes,
        auction_month_year: formData.auction_month_year,
        remarks_annexure: formData.remarks_annexure,
        rail_deposit_clause: formData.rail_deposit_clause,
        road_deposit_clause: formData.road_deposit_clause,
        payment_timeline_clause: formData.payment_timeline_clause,
        userRemarks: formData.remarks || ""
      };

      const payload = {
        deal_id: formData.deal_id || null,
        bidder: formData.bidder || null,
        auction_source: formData.auction_source || "SECL Road/Rail Mode",
        notification_date: formData.notification_date || null,
        bid_date: formData.bid_date || null,
        bid_closing_date: formData.bid_closing_date || null,
        coal_company: formData.coal_company || "SECL",
        remarks: JSON.stringify(metaEnvelope)
      };
      
      if (finalPdfUrl) {
        payload.pdf_url = finalPdfUrl;
      }

      let auctionIdToUse;

      if (editId) {
        const { error: auctionError } = await supabase
          .from('auctions')
          .update(payload)
          .eq('id', editId);

        if (auctionError) throw auctionError;
        auctionIdToUse = editId;

        // Delete existing items before re-inserting
        await supabase.from('auction_items').delete().eq('auction_id', editId);
      } else {
        const { data: auctionData, error: auctionError } = await supabase
          .from('auctions')
          .insert([payload])
          .select()
          .single();

        if (auctionError) throw auctionError;
        auctionIdToUse = auctionData.id;
      }

      // Insert cluster/offer items
      const validItems = items.filter(i => i.mine || i.source || i.coal_grade || i.cluster_name);
      if (validItems.length > 0) {
        const itemsToInsert = validItems.map(i => {
          const mineName = i.mine || i.source || i.cluster_name || "SECL Mine";
          const gradeVal = i.coal_grade || i.representative_grade || "G-Grade";
          const floorPriceVal = parseFloat(i.floor_price || i.base_price) || 0;
          
          // Pack extra cluster/offer fields into coal_grade JSON envelope while keeping standard grade string
          const extraItemMeta = {
            cluster_name: i.cluster_name,
            total_offer: i.total_offer || i.quantity_offered,
            representative_grade: i.representative_grade,
            representative_size: i.representative_size || i.size,
            cluster_modulated_price: i.cluster_modulated_price || i.modulated_price,
            source: i.source || i.loading_point || mineName,
            loading_point: i.loading_point || i.source || mineName,
            mode: i.mode,
            feeding_collieries: i.feeding_collieries,
            grade: gradeVal,
            size: i.size,
            modulated_price: i.modulated_price,
            modulated_price_rep_grade: i.modulated_price_rep_grade || i.modulated_price,
            floor_price: floorPriceVal,
            supply_pattern: i.supply_pattern,
            no_of_lots: i.no_of_lots
          };

          return {
            auction_id: auctionIdToUse,
            mine: mineName,
            coal_grade: JSON.stringify(extraItemMeta),
            quantity_offered: parseFloat(i.quantity_offered) || 0,
            base_price: floorPriceVal
          };
        });

        const { error: itemsError } = await supabase
          .from('auction_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      showToast("Auction Notification Saved Successfully!");
      setIsModalOpen(false);
      resetForm();
      fetchAuctions();
      
    } catch (err) {
      console.error("Save Error:", err);
      showToast("Error saving data: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this auction notification?")) {
      try {
        const { error } = await supabase.from('auctions').delete().eq('id', id);
        if (error) throw error;
        showToast("Deleted successfully");
        setIsViewModalOpen(false);
        fetchAuctions();
      } catch (err) {
        showToast("Error deleting: " + err.message);
      }
    }
  };

  // Filtered auctions
  const filteredData = useMemo(() => {
    return data.map(row => {
      const { meta } = parseRemarksExtra(row.remarks);
      const itemsList = row.auction_items || [];
      const firstItem = itemsList[0] || {};
      let firstItemMeta = {};
      if (firstItem.coal_grade && firstItem.coal_grade.startsWith("{")) {
        try { firstItemMeta = JSON.parse(firstItem.coal_grade); } catch {}
      }

      const clusterNames = itemsList.map(it => {
        try {
          if (it.coal_grade && it.coal_grade.startsWith("{")) {
            return JSON.parse(it.coal_grade).cluster_name || it.mine;
          }
        } catch {}
        return it.mine;
      }).filter(Boolean);

      const totalQty = itemsList.reduce((acc, it) => acc + (Number(it.quantity_offered) || 0), 0);

      return {
        ...row,
        meta,
        firstItemMeta,
        clusterCount: itemsList.length,
        clusterNamesDisplay: clusterNames.length > 0 ? clusterNames.slice(0, 2).join(", ") + (clusterNames.length > 2 ? ` (+${clusterNames.length - 2})` : "") : "-",
        totalQty: totalQty > 0 ? totalQty : (firstItem.quantity_offered || "-"),
        representativeGrade: firstItemMeta.representative_grade || firstItem.coal_grade || "-",
        representativeSize: firstItemMeta.representative_size || firstItemMeta.size || "-",
        serviceProviderDisplay: meta.service_provider || meta.service_provider_hindi || row.coal_company || "CMPDIL",
        modeDisplay: firstItemMeta.mode || row.auction_source || "Road"
      };
    }).filter(row => {
      const q = searchQuery.toLowerCase();
      const meta = row.meta || {};
      const matchesSearch = !searchQuery || (
        (row.deal_id && row.deal_id.toLowerCase().includes(q)) ||
        (meta.service_provider && meta.service_provider.toLowerCase().includes(q)) ||
        (meta.service_provider_hindi && meta.service_provider_hindi.toLowerCase().includes(q)) ||
        (row.clusterNamesDisplay && row.clusterNamesDisplay.toLowerCase().includes(q)) ||
        (row.coal_company && row.coal_company.toLowerCase().includes(q)) ||
        (row.auction_source && row.auction_source.toLowerCase().includes(q))
      );

      const matchesSource = filterSource === "all" || (
        row.modeDisplay?.toLowerCase().includes(filterSource.toLowerCase()) ||
        row.auction_source?.toLowerCase().includes(filterSource.toLowerCase())
      );

      return matchesSearch && matchesSource;
    });
  }, [data, searchQuery, filterSource]);

  return (
    <div className="page-content" style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 24px" }}>
      {toastMessage && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", background: "#16a34a", color: "white",
          padding: "12px 24px", borderRadius: "10px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
          zIndex: 9999, fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          {toastMessage}
        </div>
      )}

      {/* Header section with Stats & PDF scheme highlight */}
      <div className="results-bar" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div className="results-file" style={{ fontSize: "22px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px", color: "#0f172a" }}>
            <span style={{ display: "inline-flex", p: "8px", background: "#fee2e2", color: "#dc2626", borderRadius: "10px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </span>
            Coal Auction Management
            <span style={{ fontSize: "11px", fontWeight: "700", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "2px 8px", borderRadius: "999px" }}>
              CIL / SECL E-Auction Scheme
            </span>
          </div>
          <div className="results-hint" style={{ marginTop: "6px", color: "#64748b", fontSize: "13px" }}>
            Single Window Mode Agnostic e-Auction Scheme 2022 • Road & Rail Cluster Offers • Modulated & Floor Pricing
          </div>
        </div>

        <div className="results-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button 
            className="btn" 
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            style={{ 
              display: "inline-flex", alignItems: "center", gap: "8px", 
              background: "#dc2626", color: "white", padding: "10px 18px", 
              borderRadius: "10px", fontWeight: "700", fontSize: "13px",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)", border: "none", cursor: "pointer" 
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + ADD AUCTION
          </button>
        </div>
      </div>

      {/* Summary Stat Cards - Dynamically calculated from original database records */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div style={{ background: "white", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Registered Auctions</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>{data.length}</div>
          <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600", marginTop: "4px" }}>Total Recorded Notices</div>
        </div>
        <div style={{ background: "white", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Coal Companies</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#dc2626", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[...new Set(data.map(d => d.coal_company).filter(Boolean))].length || 0}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
            {[...new Set(data.map(d => d.coal_company).filter(Boolean))].slice(0, 2).join(", ") || "No records"}
          </div>
        </div>
        <div style={{ background: "white", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Bidders Active</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#4f46e5", marginTop: "4px" }}>
            {[...new Set(data.map(d => d.bidder).filter(Boolean))].length || 0}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Unique Registered Bidders</div>
        </div>
        <div style={{ background: "white", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rail Booking Policy</div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#0891b2", marginTop: "4px" }}>4,150 T / Rake</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>SECL Standard Notice Value</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="summary-section" style={{ marginTop: 0, background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* Search & Filter Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Registered Auctions</h3>
            <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px" }}>
              {filteredData.length} records
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ position: "relative", minWidth: "240px" }}>
              <input 
                type="text" 
                placeholder="Search deal ID, company, bidder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px 8px 32px", fontSize: "12px",
                  border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none",
                  background: "#f8fafc"
                }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              style={{
                padding: "8px 12px", fontSize: "12px", fontWeight: "600",
                border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc",
                color: "#334155", outline: "none"
              }}
            >
              <option value="all">All Auction Sources</option>
              <option value="road">Road Mode</option>
              <option value="rail">Rail Mode</option>
              <option value="secl">SECL</option>
            </select>
          </div>
        </div>

        <div className="summary-table-wrap" style={{ overflowX: "auto" }}>
          <table className="stable" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center", width: "50px" }}>S.NO</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "left" }}>DATE (दिनांक)</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "left" }}>SERVICE PROVIDER (सेवा प्रदायकर्ता)</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "left" }}>REMARKS / ANNEXURE</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "left" }}>OFFERED CLUSTER(S)</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center" }}>MODE</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "right" }}>OFFERED QTY (TES)</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center" }}>PREVIEW</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid #fecaca", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                    <div style={{ marginTop: "8px", fontWeight: "600", fontSize: "13px" }}>Loading auction records...</div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: "0 auto 8px" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <div style={{ fontWeight: "700", color: "#64748b", fontSize: "14px" }}>No auction notifications found</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>Click "+ Add Auction" to create a new SECL / CIL e-auction record.</div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, i) => {
                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                      <td style={{ textAlign: "center", fontWeight: "700", color: "#94a3b8", fontSize: "12px" }}>
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td style={{ fontSize: "12px", color: "#0f172a", fontWeight: "800" }}>
                        <div>{formatDate(row.bid_date)}</div>
                        {row.notification_date && row.notification_date !== row.bid_date && (
                          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "500" }}>
                            Notif: {formatDate(row.notification_date)}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "12px" }}>
                        <div style={{ fontWeight: "800", color: "#dc2626" }}>
                          {row.meta?.service_provider_hindi || row.meta?.service_provider || row.coal_company || "CMPDIL"}
                        </div>
                        {row.meta?.service_provider && row.meta?.service_provider_hindi && (
                          <div style={{ color: "#475569", fontSize: "11px", fontWeight: "600" }}>
                            {row.meta.service_provider}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "11px", color: "#475569", maxWidth: "240px" }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={row.meta?.remarks_annexure || row.remarks}>
                          {row.meta?.remarks_annexure || (row.remarks && !row.remarks.startsWith("{") ? row.remarks : "Annexure A & B")}
                        </div>
                      </td>
                      <td style={{ fontSize: "12px" }}>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>
                          {row.clusterNamesDisplay}
                        </div>
                        {row.clusterCount > 0 && (
                          <div style={{ fontSize: "10px", color: "#64748b" }}>
                            {row.clusterCount} {row.clusterCount === 1 ? 'Cluster Offer' : 'Cluster Offers'}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ 
                          display: "inline-block", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                          background: row.modeDisplay?.toLowerCase().includes("rail") ? "#ecfeff" : "#fef3c7",
                          color: row.modeDisplay?.toLowerCase().includes("rail") ? "#0891b2" : "#b45309"
                        }}>
                          {row.modeDisplay || "Road"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>
                        {typeof row.totalQty === 'number' ? row.totalQty.toLocaleString() : (row.totalQty || "-")}
                        <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "3px" }}>Tes</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {row.pdf_url ? (
                          <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", textDecoration: "none", fontWeight: 700, fontSize: "11px", border: "1px solid #fecaca" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            PDF
                          </a>
                        ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          style={{
                            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px",
                            padding: "6px 12px", fontSize: "12px", fontWeight: "700", borderRadius: "8px",
                            border: "1px solid #fee2e2", background: "#fef2f2", color: "#dc2626", transition: "all 0.15s"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "white"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}
                          onClick={() => handleViewClick(row)}
                          title="View Details"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ADD / EDIT MODAL - REDESIGNED PER SECL NOTICE PDF
      ═══════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="auction-modal-overlay">
          <div className="auction-modal" style={{ maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px' }}>
            <div className="auction-modal-header" style={{ padding: "18px 24px", background: "linear-gradient(to right, #fef2f2, #ffffff)", borderBottom: "1px solid #fee2e2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="auction-badge" style={{ background: "#dc2626", color: "white", borderRadius: "6px" }}>
                  {editId ? 'UPDATE AUCTION' : 'CIL E-AUCTION ENTRY'}
                </span>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#dc2626", background: "#fee2e2", padding: "3px 8px", borderRadius: "6px" }}>
                  Single Window Mode Agnostic Policy
                </span>
              </div>
              <h2 className="auction-modal-title" style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>
                {editId ? 'Edit Auction Notification' : 'Record New Coal Auction Notification'}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Enter parameters as per official SECL / CIL Auction Notice & Annexure Cluster Offers
              </p>
              <button className="auction-close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <div className="auction-modal-body" style={{ padding: "20px 24px" }}>
              {/* Section 1: Notice Conduction Schedule (Page 1 Table Structure) */}
              <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                
                {/* Page 1 Service Provider Table (Date | Service Provider | Remarks) */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#dc2626" }}></span>
                    Service Provider & Conduction Schedule (Page 1 Table Structure)
                  </div>
                  <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #cbd5e1", width: "25%" }}>
                            Date (दिनांक)
                          </th>
                          <th style={{ padding: "8px 12px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #cbd5e1", width: "35%" }}>
                            Service Provider (सेवा प्रदायकर्ता)
                          </th>
                          <th style={{ padding: "8px 12px", fontWeight: "800", color: "#0f172a", width: "40%" }}>
                            Remarks (रिमार्क्स)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: "#ffffff" }}>
                          <td style={{ padding: "8px 12px", borderRight: "1px solid #cbd5e1", verticalAlign: "top" }}>
                            <input 
                              type="date" 
                              name="bid_date" 
                              className="auction-input" 
                              style={{ margin: 0, padding: "6px 8px", fontSize: "12px", fontWeight: "700" }} 
                              value={formData.bid_date} 
                              onChange={handleInputChange} 
                            />
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                              Auction Conduction Date (Page 1 e-Auction Date)
                            </div>
                          </td>
                          <td style={{ padding: "8px 12px", borderRight: "1px solid #cbd5e1", verticalAlign: "top" }}>
                            <input 
                              type="text" 
                              name="service_provider_hindi" 
                              className="auction-input" 
                              style={{ margin: 0, padding: "4px 8px", fontSize: "12px", marginBottom: "4px", fontWeight: "700" }} 
                              placeholder="सेवा प्रदायकर्ता (हिंदी) e.g. सीएमपीडीआईएल" 
                              value={formData.service_provider_hindi} 
                              onChange={handleInputChange} 
                            />
                            <input 
                              type="text" 
                              name="service_provider" 
                              className="auction-input" 
                              style={{ margin: 0, padding: "4px 8px", fontSize: "12px" }} 
                              placeholder="Service Provider (English) e.g. CMPDIL / MSTC" 
                              value={formData.service_provider} 
                              onChange={handleInputChange} 
                            />
                          </td>
                          <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                            <textarea 
                              name="remarks_annexure" 
                              className="auction-textarea" 
                              style={{ margin: 0, padding: "6px 8px", fontSize: "11px", minHeight: "56px" }} 
                              placeholder="Enter remarks or annexure note..." 
                              value={formData.remarks_annexure} 
                              onChange={handleInputChange}
                            ></textarea>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Section 2: Cluster Offer & Cluster Description Tables (Per Page 2 of Notice PDF) */}
              <div style={{ marginTop: "24px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "13px", color: "#dc2626", letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    2. Cluster Offers & Cluster Description Tables (Page 2 Notice Format)
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Exact table structure per SECL CIL E-Auction Notice: Cluster Offer summary table + Cluster Description line items
                  </div>
                </div>
                <span style={{ fontSize: "11px", color: "#475569", fontWeight: "700", background: "#f1f5f9", padding: "4px 10px", borderRadius: "999px" }}>
                  {items.length} {items.length === 1 ? 'Cluster Offer' : 'Cluster Offers'}
                </span>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="auction-item-card" style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px", marginBottom: "20px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                  
                  {/* Cluster Offer Item Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ background: "#dc2626", color: "#ffffff", fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px" }}>
                        CLUSTER OFFER #{index + 1}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                        {item.cluster_name ? `${item.cluster_name} Cluster Offer` : 'New Cluster Offer'}
                      </span>
                    </div>

                    {items.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(item.id)} 
                        style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: "700", padding: "4px 10px", borderRadius: "6px" }}
                        title="Remove Cluster Offer"
                      >
                        ✕ Remove Cluster
                      </button>
                    )}
                  </div>

                  {/* TABLE 1: [Cluster Name] Cluster Offer Header Table (Page 2 Table Format) */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "800", color: "#475569", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#dc2626" }}></span>
                      Table 1: Cluster Offer Summary
                    </div>
                    
                    <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Cluster Name *</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Total Offer (Tes) *</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Representative Grade</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Representative Size</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Modulated Price (₹)</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a" }}>Floor Price (₹) *</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: "#ffffff" }}>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "160px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px", fontWeight: "600" }} 
                                placeholder="e.g. Saraipalli G10 / Gevra" 
                                value={item.cluster_name} 
                                onChange={(e) => handleItemChange(item.id, 'cluster_name', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "130px" }}>
                              <input 
                                type="number" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px", fontWeight: "600" }} 
                                placeholder="e.g. 50000" 
                                value={item.total_offer} 
                                onChange={(e) => handleItemChange(item.id, 'total_offer', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "120px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px", fontWeight: "600" }} 
                                placeholder="e.g. G10, G11" 
                                value={item.representative_grade} 
                                onChange={(e) => handleItemChange(item.id, 'representative_grade', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "140px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="Sized Rom (-100mm)" 
                                value={item.representative_size} 
                                onChange={(e) => handleItemChange(item.id, 'representative_size', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "120px" }}>
                              <input 
                                type="number" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="e.g. 1184" 
                                value={item.cluster_modulated_price} 
                                onChange={(e) => handleItemChange(item.id, 'cluster_modulated_price', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", minWidth: "120px" }}>
                              <input 
                                type="number" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px", fontWeight: "700", color: "#16a34a" }} 
                                placeholder="e.g. 1421" 
                                value={item.floor_price} 
                                onChange={(e) => handleItemChange(item.id, 'floor_price', e.target.value)} 
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TABLE 2: Cluster Description / Offer Description Table (Page 2 Sub-Table Format) */}
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "800", color: "#475569", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#0891b2" }}></span>
                      Table 2: Cluster Description / Offer Line Items
                    </div>

                    <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", whiteSpace: "nowrap" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Source / Loading Points</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Mode</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Feeding Collieries</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Grade</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Size</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Evacuation Qty (Tes)</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Modulated Price (₹)</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Mod. Price of Rep. Grade (₹)</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Supply Pattern</th>
                            <th style={{ padding: "8px 10px", fontWeight: "800", color: "#0f172a" }}>No of Lots</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: "#ffffff" }}>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "160px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="e.g. Saraipalli Road / Gevra OC" 
                                value={item.loading_point || item.source} 
                                onChange={(e) => handleItemChange(item.id, 'loading_point', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "110px" }}>
                              <select 
                                className="auction-input" 
                                style={{ margin: 0, padding: "4px 8px", fontSize: "12px", height: "32px" }} 
                                value={item.mode} 
                                onChange={(e) => handleItemChange(item.id, 'mode', e.target.value)}
                              >
                                <option value="Road">Road</option>
                                <option value="Rail">Rail</option>
                              </select>
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "150px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="e.g. Amlai OC, Sharda HW" 
                                value={item.feeding_collieries} 
                                onChange={(e) => handleItemChange(item.id, 'feeding_collieries', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "90px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px", fontWeight: "600" }} 
                                placeholder="G10" 
                                value={item.coal_grade} 
                                onChange={(e) => handleItemChange(item.id, 'coal_grade', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "130px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="Sized Rom (-100mm)" 
                                value={item.size} 
                                onChange={(e) => handleItemChange(item.id, 'size', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "120px" }}>
                              <input 
                                type="number" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px", fontWeight: "700" }} 
                                placeholder="50000" 
                                value={item.quantity_offered} 
                                onChange={(e) => handleItemChange(item.id, 'quantity_offered', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "110px" }}>
                              <input 
                                type="number" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="1184" 
                                value={item.modulated_price} 
                                onChange={(e) => handleItemChange(item.id, 'modulated_price', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "120px" }}>
                              <input 
                                type="number" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="1184" 
                                value={item.modulated_price_rep_grade} 
                                onChange={(e) => handleItemChange(item.id, 'modulated_price_rep_grade', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0", minWidth: "110px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="100%" 
                                value={item.supply_pattern} 
                                onChange={(e) => handleItemChange(item.id, 'supply_pattern', e.target.value)} 
                              />
                            </td>
                            <td style={{ padding: "6px 8px", minWidth: "80px" }}>
                              <input 
                                type="text" 
                                className="auction-input" 
                                style={{ margin: 0, padding: "6px 8px", fontSize: "12px" }} 
                                placeholder="1" 
                                value={item.no_of_lots} 
                                onChange={(e) => handleItemChange(item.id, 'no_of_lots', e.target.value)} 
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              ))}

              {/* Page 2 Summary Box: Total Lots and Total Offered Qty */}
              <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px 18px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>TOTAL LOTS:</span>
                    <span style={{ marginLeft: "8px", fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                      {items.reduce((sum, item) => sum + (parseInt(item.no_of_lots, 10) || 1), 0)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>TOTAL OFFERED QTY (IN TES):</span>
                    <span style={{ marginLeft: "8px", fontSize: "15px", fontWeight: "800", color: "#dc2626" }}>
                      {items.reduce((sum, item) => sum + (parseFloat(item.quantity_offered || item.total_offer) || 0), 0).toLocaleString()} Tes
                    </span>
                  </div>
                </div>

                <button 
                  type="button"
                  className="auction-add-btn" 
                  onClick={handleAddItem}
                  style={{ border: "1px dashed #dc2626", color: "#dc2626", background: "#fef2f2", padding: "8px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span style={{ fontSize: "14px" }}>+</span> Add Another Cluster Offer Table
                </button>
              </div>

              {/* Section 3: Official Notice Document */}
              <div style={{ marginTop: "24px", marginBottom: "12px", fontWeight: "800", fontSize: "12px", color: "#dc2626", letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                3. Official Notice Document
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div className="auction-form-group">
                  <label className="auction-label">UPLOAD OFFICIAL NOTIFICATION PDF</label>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: "none" }} 
                  />
                  <div 
                    className="auction-upload-box" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span style={{ color: pdfFile ? "#0f172a" : "#64748b", fontWeight: "600", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pdfFile ? `📄 ${pdfFile.name}` : "Click to Upload Notice PDF"}
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="auction-modal-footer" style={{ padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
              <button className="auction-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button 
                className="auction-btn-save" 
                onClick={handleSave}
                style={{ background: "#dc2626", borderColor: "#dc2626", fontWeight: "700", boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)" }}
              >
                Save & Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW MODAL - FULL DETAILS PER SECL NOTICE PDF
      ═══════════════════════════════════════════════════════════════ */}
      {isViewModalOpen && viewData && (
        <div className="auction-modal-overlay">
          <div className="auction-modal" style={{ maxWidth: "1000px", maxHeight: '92vh', overflowY: 'auto', borderRadius: "16px" }}>
            <div className="auction-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #fee2e2", background: "linear-gradient(to right, #fef2f2, #ffffff)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "42px", height: "42px", background: "#fee2e2", color: "#dc2626", borderRadius: "10px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h2 className="auction-modal-title" style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                      Auction Notice Details
                    </h2>
                    <span style={{ padding: "2px 8px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                      {viewData.meta?.notice_ref_no || viewData.deal_id || "Notice"}
                    </span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px", fontWeight: "500" }}>
                    {viewData.meta?.scheme_name || "Single Window Mode Agnostic E-Auction Scheme 2022"}
                  </div>
                </div>
              </div>
              <button 
                className="auction-close-btn" 
                style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }} 
                onClick={() => setIsViewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="auction-modal-body" style={{ padding: "24px" }}>
              {/* Header Parameter Badges */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>COAL COMPANY</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>{viewData.coal_company || "SECL"}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>SERVICE PROVIDER</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#4f46e5", marginTop: "2px" }}>{viewData.meta?.service_provider || "MSTC Limited"}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>AUCTION SOURCE / MODE</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#b45309", marginTop: "2px" }}>{viewData.auction_source || "SECL Road/Rail"}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>NOTIFICATION DATE</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>{formatDate(viewData.notification_date)}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>BID / AUCTION DATE</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#dc2626", marginTop: "2px" }}>{formatDate(viewData.bid_date)}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>BID CLOSING / PAYMENT</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>{formatDate(viewData.bid_closing_date)}</div>
                </div>
              </div>

              {/* Special Terms Callout from PDF */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "10px", marginBottom: "24px", fontSize: "12px", color: "#1e40af", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "16px" }}>ℹ️</span>
                <div>
                  <strong>Important Notice Guidelines (per CIL SWMA Policy):</strong>
                  <div style={{ marginTop: "2px" }}>
                    • <strong>Rail Mode:</strong> Required to deposit coal value equivalent to 4,150 tonnes (per rake) of representative grade.
                  </div>
                  <div>
                    • <strong>Payment & Proforma:</strong> {viewData.meta?.payment_timeline_clause || "All road mode customers must deposit coal value through bank interface within timeline in clause 5.3 (Proforma in 3-5 days)."}
                  </div>
                </div>
              </div>

              {/* Cluster Offers Table */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Offered Clusters / Mine Details ({viewData.items?.length || 0})
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                  Total Offered Qty: <span style={{ color: "#dc2626", fontWeight: "800" }}>
                    {(viewData.items || []).reduce((sum, item) => sum + (Number(item.quantity_offered) || 0), 0).toLocaleString()} MT
                  </span>
                </div>
              </div>

              {(!viewData.items || viewData.items.length === 0) ? (
                <div style={{ padding: "24px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", color: "#64748b", fontSize: "13px", border: "1px dashed #cbd5e1" }}>
                  No mine cluster details recorded for this auction.
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "12px", marginBottom: "24px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                      <tr>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569" }}>#</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569" }}>Cluster / Source</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569" }}>Mode</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569" }}>Feeding Collieries</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569" }}>Grade (Rep.)</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569" }}>Size</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569", textAlign: "right" }}>Qty (MT)</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569", textAlign: "right" }}>Modulated (₹)</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569", textAlign: "right" }}>Floor Price (₹)</th>
                        <th style={{ padding: "10px 12px", fontWeight: "800", color: "#475569", textAlign: "center" }}>Pattern</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewData.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: "700" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 12px", fontWeight: "700", color: "#0f172a" }}>
                            <div>{item.source || item.mine}</div>
                            {item.cluster_name && item.cluster_name !== "-" && (
                              <div style={{ fontSize: "10px", color: "#dc2626", fontWeight: "600" }}>{item.cluster_name}</div>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ 
                              padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700",
                              background: item.mode?.toLowerCase() === "rail" ? "#ecfeff" : "#fef3c7",
                              color: item.mode?.toLowerCase() === "rail" ? "#0891b2" : "#b45309"
                            }}>
                              {item.mode || "Road"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#475569" }}>{item.feeding_collieries || "-"}</td>
                          <td style={{ padding: "10px 12px", fontWeight: "700", color: "#0f172a" }}>
                            {item.grade || item.coal_grade || "-"}
                            {item.representative_grade && item.representative_grade !== "-" && (
                              <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>({item.representative_grade})</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>{item.size || "-"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>
                            {Number(item.quantity_offered || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontWeight: "600" }}>
                            {item.modulated_price && item.modulated_price !== "-" ? `₹${item.modulated_price}` : "-"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "800", color: "#16a34a" }}>
                            ₹{Number(item.floor_price || item.base_price || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569", fontSize: "11px" }}>
                            {item.supply_pattern || "100%"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewData.displayRemarks && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>
                    REMARKS & NOTES
                  </div>
                  <div style={{ padding: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", borderRadius: "10px", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {viewData.displayRemarks}
                  </div>
                </div>
              )}
            </div>

            <div className="auction-modal-footer" style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
              <div>
                {viewData.pdf_url && (
                  <a href={viewData.pdf_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: "white", color: "#dc2626", border: "1px solid #fecaca", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "8px", fontWeight: "700", textDecoration: "none" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    View Official PDF Notice
                  </a>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  className="btn" 
                  style={{ background: "white", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: "700", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={() => handleEditClick(viewData)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Edit
                </button>
                <button 
                  className="btn" 
                  style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontWeight: "700", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={() => handleDelete(viewData.id)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
