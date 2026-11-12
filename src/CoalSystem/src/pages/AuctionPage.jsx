import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../utils/supabase";
import "../App.css";
import { extractAuctionNoticeFromPdf, extractAuctionNoticeFromImage } from "../utils/auctionNoticeOcr";

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
  const [isReadingDocument, setIsReadingDocument] = useState(false);
  const [readingStatusText, setReadingStatusText] = useState("");
  const [alertModal, setAlertModal] = useState(null);
  const fileInputRef = useRef(null);
  const isReadingPdf = useRef(false);

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
        // Auto sync representative_size <-> size if size is empty
        if (field === 'representative_size' && (!updated.size || updated.size === "")) {
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

  // Reads the uploaded notice PDF or Image (scanned pages included) with AI and pre-fills the form below.
  // Anything the file does not contain is left as it is; the user reviews and edits before saving.
  const executeReadFile = async (file) => {
    isReadingPdf.current = true;
    setIsReadingDocument(true);
    const isImage = file.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);
    const initialMsg = isImage ? "AI Image Reader Engine started: Scanning document..." : "AI Engine started: Reading notice PDF pages...";
    setReadingStatusText(initialMsg);
    setToastMessage(initialMsg);

    const onStageUpdate = (msg) => {
      setReadingStatusText(msg);
      setToastMessage(msg);
    };

    try {
      const { form, items: pdfItems, warnings, corrections } = isImage 
        ? await extractAuctionNoticeFromImage(file, onStageUpdate)
        : await extractAuctionNoticeFromPdf(file, onStageUpdate);

      if (pdfItems.length === 0 && !Object.values(form).some(Boolean)) {
        showToast("No auction notice data found in this file");
        return;
      }

      setFormData(prev => {
        const next = { ...prev };
        Object.entries(form).forEach(([key, value]) => { if (value) next[key] = value; });
        return next;
      });
      if (pdfItems.length > 0) {
        setItems(pdfItems.map(item => ({ ...defaultNewItem(), ...item })));
      }

      showToast(`Read ${pdfItems.length} cluster offer lines from the document. Please review before saving.`);
      if (warnings.length > 0 || corrections.length > 0) {
        const lines = [...warnings];
        if (corrections.length > 0) lines.push(`A second check corrected ${corrections.length} value(s).`);
        setAlertModal({
          type: 'warning',
          title: 'Document Verification Notice',
          subtitle: 'The AI Reader Engine extracted the auction notice data. Please verify these specific points against your uploaded document:',
          points: lines,
          confirmText: 'Understood, Review Form',
          onConfirm: () => setAlertModal(null)
        });
      }
    } catch (err) {
      console.error("Document read error:", err);
      setToastMessage("");
      setAlertModal({
        type: 'error',
        title: 'Document Processing Error',
        subtitle: 'The AI Reader Engine encountered an issue reading this document:',
        points: [err.message || 'Please check that the document is legible and try again.'],
        confirmText: 'Close',
        onConfirm: () => setAlertModal(null)
      });
    } finally {
      isReadingPdf.current = false;
      setIsReadingDocument(false);
      setReadingStatusText("");
    }
  };

  const fillFormFromFile = async (file) => {
    if (isReadingPdf.current) return;
    const hasEnteredClusters = items.some(i => i.cluster_name || i.source || i.loading_point || i.mine || i.coal_grade || i.quantity_offered || i.total_offer);
    if (hasEnteredClusters) {
      setAlertModal({
        type: 'confirm',
        title: 'Replace Current Form Data?',
        subtitle: 'You already have cluster offers entered in this form. Would you like to replace them with data from this new document?',
        points: ['Existing cluster offer entries will be refreshed with newly extracted lines from the uploaded document.'],
        confirmText: 'Yes, Replace & Read',
        cancelText: 'Keep Current Data',
        onConfirm: () => {
          setAlertModal(null);
          executeReadFile(file);
        },
        onCancel: () => setAlertModal(null)
      });
      return;
    }
    await executeReadFile(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPdfFile(file);
      e.target.value = "";
      fillFormFromFile(file);
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
      scheme_name: row.scheme_name || meta.scheme_name || "",
      coal_company: row.coal_company || "",
      department: row.department || meta.department || "",
      registered_office: row.registered_office || meta.registered_office || "",
      coal_type: row.coal_type || meta.coal_type || "",
      total_offered_tonnes: row.total_offered_tonnes ?? meta.total_offered_tonnes ?? "",
      auction_month_year: row.auction_month_year || meta.auction_month_year || "",
      service_provider: row.service_provider || meta.service_provider || "",
      service_provider_hindi: row.service_provider_hindi || meta.service_provider_hindi || "",
      remarks_annexure: row.remarks_annexure || meta.remarks_annexure || "",
      rail_deposit_clause: row.rail_deposit_clause || meta.rail_deposit_clause || "",
      road_deposit_clause: row.road_deposit_clause || meta.road_deposit_clause || "",
      notice_ref_no: row.notice_ref_no || meta.notice_ref_no || "",
      notification_date: row.notification_date || "",
      bid_date: row.bid_date || "",
      bid_closing_date: row.bid_closing_date || "",
      bidder: row.bidder || "",
      auction_source: row.auction_source || "",
      payment_timeline_clause: row.payment_timeline_clause || meta.payment_timeline_clause || "",
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
            cluster_name: i.cluster_name || extra.cluster_name || "",
            total_offer: i.total_offer ?? extra.total_offer ?? i.quantity_offered ?? "",
            representative_grade: i.representative_grade || extra.representative_grade || "",
            representative_size: i.representative_size || extra.representative_size || extra.size || "",
            cluster_modulated_price: i.cluster_modulated_price ?? extra.cluster_modulated_price ?? extra.modulated_price ?? "",
            floor_price: i.floor_price ?? extra.floor_price ?? i.base_price ?? "",
            source: i.source || extra.source || i.mine || "",
            loading_point: i.loading_point || extra.loading_point || extra.source || i.mine || "",
            mode: i.mode || extra.mode || "",
            feeding_collieries: i.feeding_collieries || extra.feeding_collieries || "",
            mine: i.mine || "",
            coal_grade: i.grade || extra.grade || (i.coal_grade && !i.coal_grade.startsWith("{") ? i.coal_grade : extra.grade) || "",
            size: i.size || extra.size || "",
            quantity_offered: i.quantity_offered ?? extra.quantity_offered ?? "",
            base_price: i.base_price ?? "",
            modulated_price: i.modulated_price ?? extra.modulated_price ?? "",
            modulated_price_rep_grade: i.modulated_price_rep_grade ?? extra.modulated_price_rep_grade ?? extra.modulated_price ?? "",
            supply_pattern: i.supply_pattern || extra.supply_pattern || "",
            no_of_lots: i.no_of_lots || extra.no_of_lots || ""
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
            cluster_name: i.cluster_name || extra.cluster_name || "-",
            total_offer: i.total_offer ?? extra.total_offer ?? "-",
            cluster_modulated_price: i.cluster_modulated_price ?? extra.cluster_modulated_price ?? "-",
            representative_size: i.representative_size || extra.representative_size || "-",
            source: i.source || extra.source || i.mine || "-",
            mode: i.mode || extra.mode || "-",
            feeding_collieries: i.feeding_collieries || extra.feeding_collieries || "-",
            grade: i.grade || extra.grade || (i.coal_grade && !i.coal_grade.startsWith("{") ? i.coal_grade : extra.grade) || "-",
            representative_grade: i.representative_grade || extra.representative_grade || "-",
            size: i.size || extra.size || "-",
            quantity_offered: i.quantity_offered ?? extra.quantity_offered ?? "-",
            modulated_price: i.modulated_price ?? extra.modulated_price ?? "-",
            modulated_price_rep_grade: i.modulated_price_rep_grade ?? extra.modulated_price_rep_grade ?? "-",
            floor_price: i.floor_price ?? extra.floor_price ?? i.base_price ?? "-",
            supply_pattern: i.supply_pattern || extra.supply_pattern || "-",
            no_of_lots: i.no_of_lots || extra.no_of_lots || "-"
          };
        });
        setViewData(prev => ({ ...prev, items: enrichedItems }));
      }
    } catch (err) {
      console.error("Error fetching view items:", err);
    }
  };

  const handleDeleteClick = (row) => {
    setAlertModal({
      type: 'confirm-delete',
      title: 'Delete Auction Record?',
      subtitle: `Are you sure you want to permanently delete auction record #${row.id} (${row.coal_company || 'Auction Notice'})?`,
      points: [
        'All associated cluster offers and saved line items for this auction notice will be deleted from the database.',
        'This action is permanent and cannot be undone.'
      ],
      confirmText: 'Yes, Delete Auction',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setAlertModal(null);
        try {
          showToast("Deleting Auction Record...");
          // Delete child items first if foreign key cascade not set
          await supabase.from('auction_items').delete().eq('auction_id', row.id);
          
          const { error } = await supabase.from('auctions').delete().eq('id', row.id);
          if (error) throw error;

          showToast("Auction deleted successfully!");
          fetchAuctions();
        } catch (err) {
          console.error("Error deleting auction:", err);
          setAlertModal({
            type: 'error',
            title: 'Failed to Delete Auction',
            subtitle: 'Database returned an error while deleting this record:',
            points: [err.message || 'Unknown database error'],
            confirmText: 'Close',
            onConfirm: () => setAlertModal(null)
          });
        }
      },
      onCancel: () => setAlertModal(null)
    });
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
        remarks: JSON.stringify(metaEnvelope),
        // Direct DB Columns for Notice & Scheme
        scheme_name: formData.scheme_name || null,
        service_provider: formData.service_provider || null,
        service_provider_hindi: formData.service_provider_hindi || null,
        notice_ref_no: formData.notice_ref_no || null,
        department: formData.department || null,
        registered_office: formData.registered_office || null,
        coal_type: formData.coal_type || null,
        total_offered_tonnes: parseFloat(formData.total_offered_tonnes) || null,
        auction_month_year: formData.auction_month_year || null,
        remarks_annexure: formData.remarks_annexure || null,
        rail_deposit_clause: formData.rail_deposit_clause || null,
        road_deposit_clause: formData.road_deposit_clause || null,
        payment_timeline_clause: formData.payment_timeline_clause || null
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
          const mineName = i.mine || i.source || i.cluster_name || "";
          const gradeVal = i.coal_grade || i.representative_grade || "";
          const floorPriceVal = parseFloat(i.floor_price || i.base_price) || 0;

          return {
            auction_id: auctionIdToUse,
            mine: mineName,
            coal_grade: gradeVal, // Pure clean grade text (e.g. 'G11', 'G8'), no JSON string
            quantity_offered: parseFloat(i.quantity_offered) || parseFloat(i.total_offer) || 0,
            base_price: floorPriceVal,
            // Direct DB Columns for Page 2 Cluster Summary & Description
            cluster_name: i.cluster_name || null,
            total_offer: parseFloat(i.total_offer) || null,
            representative_grade: i.representative_grade || null,
            representative_size: i.representative_size || null,
            cluster_modulated_price: parseFloat(i.cluster_modulated_price) || null,
            floor_price: floorPriceVal || null,
            source: i.source || i.loading_point || mineName || null,
            loading_point: i.loading_point || i.source || mineName || null,
            mode: i.mode || null,
            feeding_collieries: i.feeding_collieries || null,
            size: i.size || null,
            modulated_price: parseFloat(i.modulated_price) || null,
            modulated_price_rep_grade: parseFloat(i.modulated_price_rep_grade) || null,
            supply_pattern: i.supply_pattern || null,
            no_of_lots: i.no_of_lots ? String(i.no_of_lots) : null
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

  const handleDelete = (id) => {
    setAlertModal({
      type: 'confirm-delete',
      title: 'Delete Auction Notification?',
      subtitle: 'Are you sure you want to delete this auction notification?',
      points: ['All associated records and cluster items will be permanently removed from the database.'],
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setAlertModal(null);
        try {
          const { error } = await supabase.from('auctions').delete().eq('id', id);
          if (error) throw error;
          showToast("Deleted successfully");
          setIsViewModalOpen(false);
          fetchAuctions();
        } catch (err) {
          showToast("Error deleting: " + err.message);
        }
      },
      onCancel: () => setAlertModal(null)
    });
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
            ADD AUCTION
          </button>
        </div>
      </div>

      {/* Summary Stat Cards - Dynamically calculated from original database records */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div style={{ background: "white", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Registered Auctions</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>{data.length}</div>
          <div style={{ fontSize: "11px", color: data.length > 0 ? "#16a34a" : "#94a3b8", fontWeight: "600", marginTop: "4px" }}>
            {data.length > 0 ? "Total Recorded Notices" : "No records"}
          </div>
        </div>
        <div style={{ background: "white", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Coal Companies</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#dc2626", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[...new Set(data.map(d => d.coal_company).filter(Boolean))].length}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
            {[...new Set(data.map(d => d.coal_company).filter(Boolean))].slice(0, 2).join(", ") || "No records"}
          </div>
        </div>
        <div style={{ background: "white", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Bidders Active</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#4f46e5", marginTop: "4px" }}>
            {[...new Set(data.map(d => d.bidder).filter(Boolean))].length}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
            {data.length > 0 ? "Unique Registered Bidders" : "No active bidders"}
          </div>
        </div>
        <div style={{ background: "white", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Offered Qty</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0891b2", marginTop: "4px" }}>
            {filteredData.reduce((acc, row) => acc + (Number(row.totalQty) || 0), 0).toLocaleString()} <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Tes</span>
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
            {filteredData.length > 0 ? `Across ${filteredData.length} recorded notice(s)` : "No active notices"}
          </div>
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

        {/* Desktop Table View */}
        <div className="summary-table-wrap auction-desktop-table" style={{ overflowX: "auto" }}>
          <table className="auction-main-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center", width: "50px" }}>S.NO</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center", width: "70px" }}>VIEW</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "left" }}>DATE (दिनांक)</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "left" }}>SERVICE PROVIDER (सेवा प्रदायकर्ता)</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "left" }}>REMARKS / ANNEXURE</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "left" }}>OFFERED CLUSTER(S)</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center" }}>MODE</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "right" }}>OFFERED QTY (TES)</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center" }}>PREVIEW</th>
                <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: "800", color: "#64748b", textAlign: "center", minWidth: "140px" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid #fecaca", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                    <div style={{ marginTop: "8px", fontWeight: "600", fontSize: "13px" }}>Loading auction records...</div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: "0 auto 8px" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <div style={{ fontWeight: "700", color: "#64748b", fontSize: "14px" }}>No auction notifications found</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>Click "+ Add Auction" to create a new SECL / CIL e-auction record.</div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, i) => {
                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                      <td data-label="S.NO" style={{ textAlign: "center", fontWeight: "700", color: "#94a3b8", fontSize: "12px", padding: "12px 14px" }}>
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td data-label="VIEW" style={{ textAlign: "center", padding: "12px 14px" }}>
                        <button
                          style={{
                            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px",
                            padding: "5px 10px", fontSize: "11px", fontWeight: "700", borderRadius: "6px",
                            border: "1px solid #fee2e2", background: "#fef2f2", color: "#dc2626", transition: "all 0.15s"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "white"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}
                          onClick={() => handleViewClick(row)}
                          title="View Details"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          View
                        </button>
                      </td>
                      <td data-label="DATE (दिनांक)" style={{ fontSize: "12px", color: "#0f172a", fontWeight: "800", padding: "12px 14px" }}>
                        <div>{formatDate(row.bid_date)}</div>
                        {row.notification_date && row.notification_date !== row.bid_date && (
                          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "500" }}>
                            Notif: {formatDate(row.notification_date)}
                          </div>
                        )}
                      </td>
                      <td data-label="SERVICE PROVIDER" style={{ fontSize: "12px", padding: "12px 14px" }}>
                        <div style={{ fontWeight: "800", color: "#dc2626" }}>
                          {row.meta?.service_provider_hindi || row.meta?.service_provider || row.coal_company || "CMPDIL"}
                        </div>
                        {row.meta?.service_provider && row.meta?.service_provider_hindi && (
                          <div style={{ color: "#475569", fontSize: "11px", fontWeight: "600" }}>
                            {row.meta.service_provider}
                          </div>
                        )}
                      </td>
                      <td data-label="REMARKS / ANNEXURE" style={{ fontSize: "11px", color: "#475569", maxWidth: "240px", padding: "12px 14px" }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={row.meta?.remarks_annexure || row.remarks}>
                          {row.meta?.remarks_annexure || (row.remarks && !row.remarks.startsWith("{") ? row.remarks : "Annexure A & B")}
                        </div>
                      </td>
                      <td data-label="OFFERED CLUSTER(S)" style={{ fontSize: "12px", padding: "12px 14px" }}>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>
                          {row.clusterNamesDisplay}
                        </div>
                        {row.clusterCount > 0 && (
                          <div style={{ fontSize: "10px", color: "#64748b" }}>
                            {row.clusterCount} {row.clusterCount === 1 ? 'Cluster Offer' : 'Cluster Offers'}
                          </div>
                        )}
                      </td>
                      <td data-label="MODE" style={{ textAlign: "center", padding: "12px 14px" }}>
                        <span style={{ 
                          display: "inline-block", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                          background: row.modeDisplay?.toLowerCase().includes("rail") ? "#ecfeff" : "#fef3c7",
                          color: row.modeDisplay?.toLowerCase().includes("rail") ? "#0891b2" : "#b45309"
                        }}>
                          {row.modeDisplay || "Road"}
                        </span>
                      </td>
                      <td data-label="OFFERED QTY (TES)" style={{ textAlign: "right", fontWeight: "800", color: "#0f172a", fontSize: "13px", padding: "12px 14px" }}>
                        {typeof row.totalQty === 'number' ? row.totalQty.toLocaleString() : (row.totalQty || "-")}
                        <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "3px" }}>Tes</span>
                      </td>
                      <td data-label="PREVIEW" style={{ textAlign: "center", padding: "12px 14px" }}>
                        {row.pdf_url ? (
                          <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", textDecoration: "none", fontWeight: 700, fontSize: "11px", border: "1px solid #fecaca" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            {/\.(jpg|jpeg|png|webp)$/i.test(row.pdf_url) ? "IMG" : "PDF"}
                          </a>
                        ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td data-label="ACTION" style={{ textAlign: "center", padding: "12px 14px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            style={{
                              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px",
                              padding: "5px 10px", fontSize: "11px", fontWeight: "700", borderRadius: "6px",
                              border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", transition: "all 0.15s"
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                            onClick={() => handleEditClick(row)}
                            title="Update Auction Record"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Update
                          </button>
                          <button
                            style={{
                              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px",
                              padding: "5px 10px", fontSize: "11px", fontWeight: "700", borderRadius: "6px",
                              border: "1px solid #fee2e2", background: "#fef2f2", color: "#ef4444", transition: "all 0.15s"
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "white"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#ef4444"; }}
                            onClick={() => handleDeleteClick(row)}
                            title="Delete Auction Record"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Dedicated Clean Cards */}
        <div className="auction-mobile-cards">
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Loading records...</div>
          ) : filteredData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>No records found</div>
          ) : (
            filteredData.map((row, i) => (
              <div key={row.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "14px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                {/* Header row with Serial No and View button */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", background: "#f8fafc", padding: "2px 6px", borderRadius: "4px" }}>
                      #{String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ 
                      padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                      background: row.modeDisplay?.toLowerCase().includes("rail") ? "#ecfeff" : "#fef3c7",
                      color: row.modeDisplay?.toLowerCase().includes("rail") ? "#0891b2" : "#b45309"
                    }}>
                      {row.modeDisplay || "Road"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleViewClick(row)}
                    style={{
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "5px 12px", fontSize: "11px", fontWeight: "700", borderRadius: "6px",
                      border: "1px solid #fee2e2", background: "#fef2f2", color: "#dc2626"
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    View
                  </button>
                </div>

                {/* Details list */}
                <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b", fontWeight: "700", fontSize: "11px" }}>DATE (दिनांक)</span>
                    <span style={{ fontWeight: "800", color: "#0f172a" }}>{formatDate(row.bid_date)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b", fontWeight: "700", fontSize: "11px" }}>SERVICE PROVIDER</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "800", color: "#dc2626" }}>
                        {row.meta?.service_provider_hindi || row.meta?.service_provider || row.coal_company || "CMPDIL"}
                      </div>
                      {row.meta?.service_provider && row.meta?.service_provider_hindi && (
                        <div style={{ fontSize: "10px", color: "#64748b" }}>{row.meta.service_provider}</div>
                      )}
                    </div>
                  </div>

                  {row.remarks && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748b", fontWeight: "700", fontSize: "11px" }}>REMARKS</span>
                      <span style={{ color: "#475569", fontSize: "11px", maxWidth: "180px", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.meta?.remarks_annexure || (row.remarks && !row.remarks.startsWith("{") ? row.remarks : "Annexure A & B")}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b", fontWeight: "700", fontSize: "11px" }}>OFFERED CLUSTER</span>
                    <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.clusterNamesDisplay}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b", fontWeight: "700", fontSize: "11px" }}>OFFERED QTY</span>
                    <span style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>
                      {typeof row.totalQty === 'number' ? row.totalQty.toLocaleString() : (row.totalQty || "-")} Tes
                    </span>
                  </div>

                  {row.pdf_url && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748b", fontWeight: "700", fontSize: "11px" }}>DOCUMENT PREVIEW</span>
                      <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", textDecoration: "none", fontWeight: 700, fontSize: "11px", border: "1px solid #fecaca" }}>
                        📄 {/\.(jpg|jpeg|png|webp)$/i.test(row.pdf_url) ? "IMG" : "PDF"}
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer action buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                  <button
                    onClick={() => handleEditClick(row)}
                    style={{
                      flex: 1, cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "4px",
                      padding: "8px 12px", fontSize: "12px", fontWeight: "700", borderRadius: "6px",
                      border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a"
                    }}
                  >
                    ✏️ Update
                  </button>
                  <button
                    onClick={() => handleDeleteClick(row)}
                    style={{
                      flex: 1, cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "4px",
                      padding: "8px 12px", fontSize: "12px", fontWeight: "700", borderRadius: "6px",
                      border: "1px solid #fee2e2", background: "#fef2f2", color: "#ef4444"
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ADD / EDIT MODAL - CLEAN & PROFESSIONAL DESIGN
      ═══════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="auction-modal-overlay" style={{ backdropFilter: "blur(4px)", background: "rgba(15, 23, 42, 0.6)" }}>
          <div className="auction-modal" style={{ maxWidth: '980px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', border: "1px solid #e2e8f0", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            
            {/* Modal Header */}
            <div className="auction-modal-header" style={{ padding: "20px 28px", background: "#ffffff", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: "800", padding: "4px 10px", borderRadius: "6px", letterSpacing: "0.5px" }}>
                      {editId ? 'UPDATE AUCTION' : 'CIL / SECL E-AUCTION'}
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                      Single Window Mode Agnostic Policy
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.3px" }}>
                    {editId ? 'Edit Auction Notification' : 'Record New Auction Notification'}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", color: "#64748b", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="auction-modal-body" style={{ padding: "24px 28px", background: "#f8fafc" }}>
              
              {/* Card 1: AI Auto-Extract & Document Upload */}
              <div style={{
                background: isReadingDocument ? "#fff5f5" : "#ffffff",
                border: isReadingDocument ? "2px solid #dc2626" : "1.5px dashed #cbd5e1",
                borderRadius: "12px",
                padding: "18px 22px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                flexWrap: "wrap",
                transition: "all 0.2s",
                boxShadow: isReadingDocument ? "0 4px 20px rgba(220, 38, 38, 0.15)" : "none"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: isReadingDocument ? "#fee2e2" : "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #fee2e2"
                  }}>
                    {isReadingDocument ? (
                      <svg style={{ animation: "spin 1s linear infinite", width: "22px", height: "22px" }} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>Upload Official Notice Document (PDF / Image)</span>
                      {isReadingDocument && (
                        <span style={{ fontSize: "10px", background: "#dc2626", color: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontWeight: "800" }}>
                          AI READING...
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: isReadingDocument ? "#dc2626" : "#64748b", marginTop: "2px", fontWeight: isReadingDocument ? "600" : "normal" }}>
                      {isReadingDocument ? (
                        <span>⏳ AI Reader Engine processing: {readingStatusText || "Scanning document..."}</span>
                      ) : pdfFile ? (
                        <span style={{ color: "#16a34a", fontWeight: "700" }}>
                          ✓ Attached: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                        </span>
                      ) : "Attach official notice to auto-extract details or preserve document record"}
                    </div>
                  </div>
                </div>

                <div>
                  <input 
                    type="file" 
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: "none" }} 
                  />
                  <button
                    type="button"
                    disabled={isReadingDocument}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: isReadingDocument ? "#fee2e2" : (pdfFile ? "#ffffff" : "#dc2626"),
                      color: isReadingDocument ? "#dc2626" : (pdfFile ? "#dc2626" : "#ffffff"),
                      border: (isReadingDocument || pdfFile) ? "1.5px solid #dc2626" : "none",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: isReadingDocument ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: isReadingDocument ? 0.9 : 1,
                      boxShadow: pdfFile ? "none" : "0 2px 8px rgba(220, 38, 38, 0.2)"
                    }}
                  >
                    {isReadingDocument ? (
                      <>
                        <svg style={{ animation: "spin 1s linear infinite", width: "15px", height: "15px" }} viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Reading Engine Active...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>{pdfFile ? "Replace Document" : "Upload & Auto-Fill"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active AI Processing Live Banner */}
              {isReadingDocument && (
                <div style={{
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
                  border: "1px solid #334155",
                  color: "#ffffff"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "rgba(220, 38, 38, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ef4444"
                    }}>
                      <svg style={{ animation: "spin 1s linear infinite", width: "22px", height: "22px" }} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "800", letterSpacing: "0.3px" }}>
                          AI Image & Notice Reader Engine Active
                        </span>
                        <span style={{
                          background: "#dc2626",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          letterSpacing: "0.5px"
                        }}>
                          LIVE OCR
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px", fontWeight: "500" }}>
                        {readingStatusText || "Scanning document pages, extracting cluster tables and notice metadata..."}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 8px #22c55e"
                    }}></span>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#cbd5e1" }}>
                      Processing with AI...
                    </span>
                  </div>
                </div>
              )}

              {/* Card 2: Schedule & Notice Details */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px 22px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "4px", height: "14px", background: "#dc2626", borderRadius: "2px" }}></span>
                  Auction Schedule & Details
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>
                      Auction Date (e-Auction दिनांक) *
                    </label>
                    <input 
                      type="date" 
                      name="bid_date" 
                      className="auction-input" 
                      style={{ width: "100%", padding: "9px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: "600" }} 
                      value={formData.bid_date} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>
                      Service Provider (Hindi / English) *
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input 
                        type="text" 
                        name="service_provider_hindi" 
                        className="auction-input" 
                        style={{ width: "50%", padding: "9px 12px", fontSize: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: "600" }} 
                        placeholder="e.g. सीएमपीडीआईएल" 
                        value={formData.service_provider_hindi} 
                        onChange={handleInputChange} 
                      />
                      <input 
                        type="text" 
                        name="service_provider" 
                        className="auction-input" 
                        style={{ width: "50%", padding: "9px 12px", fontSize: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: "600" }} 
                        placeholder="e.g. CMPDIL / MSTC" 
                        value={formData.service_provider} 
                        onChange={handleInputChange} 
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>
                      Notice Ref No / Scheme
                    </label>
                    <input 
                      type="text" 
                      name="notice_ref_no" 
                      className="auction-input" 
                      style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: "600" }} 
                      placeholder="e.g. SECL/BSP/H-360" 
                      value={formData.notice_ref_no || ""} 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>
                    Remarks / Annexure Notes
                  </label>
                  <input 
                    type="text" 
                    name="remarks_annexure" 
                    className="auction-input" 
                    style={{ width: "100%", padding: "9px 12px", fontSize: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff" }} 
                    placeholder="e.g. Details provided in Annexure A & B" 
                    value={formData.remarks_annexure} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Card 3: Cluster Offers */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "4px", height: "14px", background: "#dc2626", borderRadius: "2px" }}></span>
                    Cluster Offers & Pricing
                  </div>
                  <span style={{ fontSize: "11px", color: "#475569", fontWeight: "700", background: "#e2e8f0", padding: "3px 10px", borderRadius: "6px" }}>
                    {items.length} {items.length === 1 ? 'Cluster' : 'Clusters'}
                  </span>
                </div>

                {items.map((item, index) => (
                  <div key={item.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px", marginBottom: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "14px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px", border: "1px solid #fecaca" }}>
                          CLUSTER #{index + 1}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                          {item.cluster_name || 'New Cluster Offer'}
                        </span>
                      </div>

                      {items.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(item.id)} 
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    {/* Clean Grid Format for Cluster Details */}
                    {/* TABLE 1: CLUSTER OFFER SUMMARY (PAGE 2 HEADER TABLE) */}
                    <div style={{ marginBottom: "14px", background: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#dc2626" }}></span>
                        Table 1: Cluster Offer Summary (Page 2 Header Table)
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#475569", marginBottom: "3px", textTransform: "uppercase" }}>Cluster Name *</label>
                          <input 
                            type="text" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "700", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }} 
                            placeholder="e.g. Saraipalli G10 / Gevra OC" 
                            value={item.cluster_name} 
                            onChange={(e) => handleItemChange(item.id, 'cluster_name', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#475569", marginBottom: "3px", textTransform: "uppercase" }}>Total Offer (Tes) *</label>
                          <input 
                            type="number" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "800", color: "#dc2626", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }} 
                            placeholder="e.g. 504000" 
                            value={item.total_offer} 
                            onChange={(e) => handleItemChange(item.id, 'total_offer', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#475569", marginBottom: "3px", textTransform: "uppercase" }}>Representative Grade</label>
                          <input 
                            type="text" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "600", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }} 
                            placeholder="e.g. G11, G10, G6" 
                            value={item.representative_grade} 
                            onChange={(e) => handleItemChange(item.id, 'representative_grade', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#475569", marginBottom: "3px", textTransform: "uppercase" }}>Representative Size</label>
                          <input 
                            type="text" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "600", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }} 
                            placeholder="Sized Rom (-100mm)" 
                            value={item.representative_size || item.size} 
                            onChange={(e) => handleItemChange(item.id, 'representative_size', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#475569", marginBottom: "3px", textTransform: "uppercase" }}>Modulated Price (₹)</label>
                          <input 
                            type="number" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "700", color: "#0891b2", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }} 
                            placeholder="e.g. 1184" 
                            value={item.cluster_modulated_price || item.modulated_price} 
                            onChange={(e) => handleItemChange(item.id, 'cluster_modulated_price', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#475569", marginBottom: "3px", textTransform: "uppercase" }}>Floor Price (₹) *</label>
                          <input 
                            type="number" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "800", color: "#16a34a", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }} 
                            placeholder="e.g. 1421" 
                            value={item.floor_price} 
                            onChange={(e) => handleItemChange(item.id, 'floor_price', e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* TABLE 2: CLUSTER DESCRIPTION & OFFER DETAILS (PAGE 2 DETAIL TABLE) */}
                    <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0f172a" }}></span>
                        Table 2: Cluster Description & Specifications (Page 2 Detail Table)
                      </div>

                      {/* Row 1: Source, Mode, Feeding Collieries, Grade */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Source / Loading Point *</label>
                          <input 
                            type="text" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="e.g. Gevra OC / RLS Laxman / Burhar Siding" 
                            value={item.source || item.loading_point || item.mine} 
                            onChange={(e) => handleItemChange(item.id, 'source', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Mode</label>
                          <select 
                            className="auction-input" 
                            style={{ width: "100%", padding: "6px 10px", fontSize: "12px", fontWeight: "600", borderRadius: "6px", border: "1px solid #cbd5e1", height: "35px" }} 
                            value={item.mode} 
                            onChange={(e) => handleItemChange(item.id, 'mode', e.target.value)}
                          >
                            <option value="">Select Mode</option>
                            <option value="Road">Road</option>
                            <option value="Rail">Rail</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Feeding Collieries</label>
                          <input 
                            type="text" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="e.g. Amlai OC, Sharda HW, Rampur Batura OC" 
                            value={item.feeding_collieries} 
                            onChange={(e) => handleItemChange(item.id, 'feeding_collieries', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Grade</label>
                          <input 
                            type="text" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "700", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="e.g. G11 / G8 / G6" 
                            value={item.coal_grade || item.grade} 
                            onChange={(e) => handleItemChange(item.id, 'coal_grade', e.target.value)} 
                          />
                        </div>
                      </div>

                      {/* Row 2: Size, Evacuation Capacity / Qty, Line Modulated Price, Price of Rep Grade */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Size</label>
                          <input 
                            type="text" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="(-) 100 mm" 
                            value={item.size} 
                            onChange={(e) => handleItemChange(item.id, 'size', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Evacuation Capacity / Qty (Tes) *</label>
                          <input 
                            type="number" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "800", color: "#dc2626", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="e.g. 500000 / 4000" 
                            value={item.quantity_offered} 
                            onChange={(e) => handleItemChange(item.id, 'quantity_offered', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Line Modulated Price (₹)</label>
                          <input 
                            type="number" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="e.g. 1184 / 1931" 
                            value={item.modulated_price} 
                            onChange={(e) => handleItemChange(item.id, 'modulated_price', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Price of Rep. Grade (₹)</label>
                          <input 
                            type="number" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="e.g. 2761" 
                            value={item.modulated_price_rep_grade} 
                            onChange={(e) => handleItemChange(item.id, 'modulated_price_rep_grade', e.target.value)} 
                          />
                        </div>
                      </div>

                      {/* Row 3: Supply Pattern, No of Lots */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>Supply Pattern</label>
                          <input 
                            type="text" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="e.g. 100% / 0%-20% / 10%-30%" 
                            value={item.supply_pattern} 
                            onChange={(e) => handleItemChange(item.id, 'supply_pattern', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "3px", textTransform: "uppercase" }}>No of Lots</label>
                          <input 
                            type="number" 
                            className="auction-input" 
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", fontWeight: "700", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                            placeholder="1" 
                            value={item.no_of_lots} 
                            onChange={(e) => handleItemChange(item.id, 'no_of_lots', e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Cluster Button & Summary */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "#ffffff", padding: "12px 18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", gap: "20px" }}>
                    <div style={{ fontSize: "12px" }}>
                      <span style={{ color: "#64748b", fontWeight: "600" }}>Total Lots:</span>{" "}
                      <strong style={{ color: "#0f172a" }}>{items.reduce((sum, item) => sum + (parseInt(item.no_of_lots, 10) || 0), 0)}</strong>
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      <span style={{ color: "#64748b", fontWeight: "600" }}>Total Offered Qty:</span>{" "}
                      <strong style={{ color: "#dc2626" }}>{items.reduce((sum, item) => sum + (parseFloat(item.quantity_offered || item.total_offer) || 0), 0).toLocaleString()} Tes</strong>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleAddItem}
                    style={{ background: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", padding: "7px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    + Add Cluster Offer
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="auction-modal-footer" style={{ padding: "16px 28px", background: "#ffffff", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "10px", position: "sticky", bottom: 0, zIndex: 10 }}>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", padding: "9px 18px", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={isReadingDocument}
                onClick={handleSave}
                style={{
                  background: isReadingDocument ? "#94a3b8" : "#dc2626",
                  border: "none",
                  color: "#ffffff",
                  padding: "9px 22px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: isReadingDocument ? "not-allowed" : "pointer",
                  boxShadow: isReadingDocument ? "none" : "0 4px 12px rgba(220, 38, 38, 0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {isReadingDocument && (
                  <svg style={{ animation: "spin 1s linear infinite", width: "14px", height: "14px" }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isReadingDocument ? 'AI Reading in Progress...' : (editId ? 'Update Auction Record' : 'Save Auction Record')}
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
              {(viewData.meta?.rail_deposit_clause || viewData.meta?.road_deposit_clause || viewData.meta?.payment_timeline_clause) && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "10px", marginBottom: "24px", fontSize: "12px", color: "#1e40af", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "16px" }}>ℹ️</span>
                  <div>
                    <strong>Important Notice Clauses & Policy (Extracted from Document):</strong>
                    {viewData.meta?.rail_deposit_clause && (
                      <div style={{ marginTop: "3px" }}>
                        • <strong>Rail Mode:</strong> {viewData.meta.rail_deposit_clause}
                      </div>
                    )}
                    {viewData.meta?.road_deposit_clause && (
                      <div style={{ marginTop: "2px" }}>
                        • <strong>Road Mode:</strong> {viewData.meta.road_deposit_clause}
                      </div>
                    )}
                    {viewData.meta?.payment_timeline_clause && (
                      <div style={{ marginTop: "2px" }}>
                        • <strong>Payment & Timeline:</strong> {viewData.meta.payment_timeline_clause}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cluster Offers Table */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Offered Clusters / Mine Details ({viewData.items?.length || 0})
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                  Total Offered Qty: <span style={{ color: "#dc2626", fontWeight: "800" }}>
                    {(viewData.items || []).reduce((sum, item) => sum + (Number(item.quantity_offered) || Number(item.total_offer) || 0), 0).toLocaleString()} MT
                  </span>
                </div>
              </div>

              {(!viewData.items || viewData.items.length === 0) ? (
                <div style={{ padding: "24px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", color: "#64748b", fontSize: "13px", border: "1px dashed #cbd5e1" }}>
                  No mine cluster details recorded for this auction.
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "12px", marginBottom: "24px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "1350px" }}>
                    <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                      <tr>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", whiteSpace: "nowrap" }}>#</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", whiteSpace: "nowrap" }}>Cluster Name</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", whiteSpace: "nowrap" }}>Source / Loading Point</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", whiteSpace: "nowrap" }}>Mode</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", whiteSpace: "nowrap" }}>Feeding Collieries</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", whiteSpace: "nowrap" }}>Grade (Rep.)</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", whiteSpace: "nowrap" }}>Size (Rep.)</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", textAlign: "right", whiteSpace: "nowrap" }}>Total Offer (MT)</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", textAlign: "right", whiteSpace: "nowrap" }}>Offered Qty (MT)</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", textAlign: "right", whiteSpace: "nowrap" }}>Modulated (₹)</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", textAlign: "right", whiteSpace: "nowrap" }}>Modulated Rep (₹)</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", textAlign: "right", whiteSpace: "nowrap" }}>Floor Price (₹)</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", textAlign: "center", whiteSpace: "nowrap" }}>Supply Pattern</th>
                        <th style={{ padding: "10px 14px", fontWeight: "800", color: "#475569", textAlign: "center", whiteSpace: "nowrap" }}>No of Lots</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewData.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: "700" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 12px", fontWeight: "700", color: "#dc2626" }}>
                            {item.cluster_name && item.cluster_name !== "-" ? item.cluster_name : (item.mine || "-")}
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: "600", color: "#0f172a" }}>
                            <div>{item.source || item.loading_point || item.mine || "-"}</div>
                            {item.loading_point && item.loading_point !== item.source && (
                              <div style={{ fontSize: "10px", color: "#64748b" }}>Pt: {item.loading_point}</div>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ 
                              padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700",
                              background: item.mode?.toLowerCase() === "rail" ? "#ecfeff" : "#fef3c7",
                              color: item.mode?.toLowerCase() === "rail" ? "#0891b2" : "#b45309"
                            }}>
                              {item.mode || "-"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#475569" }}>{item.feeding_collieries || "-"}</td>
                          <td style={{ padding: "10px 12px", fontWeight: "700", color: "#0f172a" }}>
                            {item.coal_grade || item.grade || "-"}
                            {item.representative_grade && item.representative_grade !== "-" && item.representative_grade !== (item.coal_grade || item.grade) && (
                              <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>({item.representative_grade})</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>
                            <div>{item.size || "-"}</div>
                            {item.representative_size && item.representative_size !== "-" && item.representative_size !== item.size && (
                              <div style={{ fontSize: "10px", color: "#94a3b8" }}>Rep: {item.representative_size}</div>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontWeight: "700" }}>
                            {item.total_offer && item.total_offer !== "-" ? Number(item.total_offer).toLocaleString() : "-"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>
                            {Number(item.quantity_offered || item.total_offer || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontWeight: "600" }}>
                            {item.modulated_price && item.modulated_price !== "-" ? `₹${Number(item.modulated_price).toLocaleString()}` : (item.cluster_modulated_price && item.cluster_modulated_price !== "-" ? `₹${Number(item.cluster_modulated_price).toLocaleString()}` : "-")}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontWeight: "600" }}>
                            {item.modulated_price_rep_grade && item.modulated_price_rep_grade !== "-" ? `₹${Number(item.modulated_price_rep_grade).toLocaleString()}` : "-"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "800", color: "#16a34a" }}>
                            ₹{Number(item.floor_price || item.base_price || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569", fontSize: "11px", fontWeight: "600" }}>
                            {item.supply_pattern || "-"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "700", color: "#0f172a" }}>
                            {item.no_of_lots || "-"}
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
                    {/\.(jpg|jpeg|png|webp)$/i.test(viewData.pdf_url) ? "View Official Notice Image" : "View Official PDF Notice"}
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

      {/* ═══════════════════════════════════════════════════════════════
          PROFESSIONAL DIALOG MODAL (Alerts, Warnings & Confirms)
      ═══════════════════════════════════════════════════════════════ */}
      {alertModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "18px",
            maxWidth: "520px",
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
            border: "1px solid #e2e8f0",
            overflow: "hidden"
          }}>
            {/* Header with Icon */}
            <div style={{
              padding: "24px 26px 16px 26px",
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              borderBottom: "1px solid #f1f5f9"
            }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? "#fef2f2" : "#fffbeb",
                color: alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? "#dc2626" : "#d97706",
                border: alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? "1px solid #fee2e2" : "1px solid #fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                {alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                    {alertModal.title}
                  </h3>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    background: alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? "#fee2e2" : "#fef3c7",
                    color: alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? "#b91c1c" : "#b45309"
                  }}>
                    {alertModal.type === 'error' ? 'ERROR' : (alertModal.type === 'confirm-delete' ? 'CONFIRM' : 'REVIEW NEEDED')}
                  </span>
                </div>
                {alertModal.subtitle && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                    {alertModal.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Points List */}
            {alertModal.points && alertModal.points.length > 0 && (
              <div style={{ padding: "18px 26px", maxHeight: "240px", overflowY: "auto", background: "#f8fafc" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {alertModal.points.map((pt, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "12px",
                        color: "#334155",
                        lineHeight: "1.5",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px"
                      }}
                    >
                      <span style={{
                        color: alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? "#dc2626" : "#d97706",
                        fontWeight: "800",
                        fontSize: "14px",
                        lineHeight: "1",
                        marginTop: "2px"
                      }}>
                        •
                      </span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{
              padding: "16px 26px",
              background: "#ffffff",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}>
              {alertModal.cancelText && (
                <button
                  type="button"
                  onClick={alertModal.onCancel || (() => setAlertModal(null))}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  {alertModal.cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={alertModal.onConfirm || (() => setAlertModal(null))}
                style={{
                  background: alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? "#dc2626" : "#0f172a",
                  border: "none",
                  color: "#ffffff",
                  padding: "9px 20px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: alertModal.type === 'error' || alertModal.type === 'confirm-delete' ? "0 4px 12px rgba(220, 38, 38, 0.25)" : "0 4px 12px rgba(15, 23, 42, 0.2)"
                }}
              >
                {alertModal.confirmText || 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
