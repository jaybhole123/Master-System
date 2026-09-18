import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import "../App.css";

export default function AuctionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [editId, setEditId] = useState(null);
  
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
  
  // Form State
  const [formData, setFormData] = useState({
    deal_id: "",
    bidder: "",
    auction_source: "",
    notification_date: "",
    bid_date: "",
    bid_closing_date: "",
    coal_company: "",
    remarks: ""
  });
  
  const [items, setItems] = useState([
    { id: Date.now(), mine: "", coal_grade: "", quantity_offered: "", base_price: "" }
  ]);
  
  const [pdfFile, setPdfFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchAuctions = async () => {
    setIsLoading(true);
    try {
      const { data: dbData, error } = await supabase
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(dbData || []);
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
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), mine: "", coal_grade: "", quantity_offered: "", base_price: "" }]);
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
      deal_id: "", bidder: "", auction_source: "", notification_date: "", 
      bid_date: "", bid_closing_date: "", coal_company: "", remarks: ""
    });
    setItems([{ id: Date.now(), mine: "", coal_grade: "", quantity_offered: "", base_price: "" }]);
    setPdfFile(null);
  };

  const handleEditClick = async (row) => {
    setEditId(row.id);
    setFormData({
      deal_id: row.deal_id || "",
      bidder: row.bidder || "",
      auction_source: row.auction_source || "",
      notification_date: row.notification_date || "",
      bid_date: row.bid_date || "",
      bid_closing_date: row.bid_closing_date || "",
      coal_company: row.coal_company || "",
      remarks: row.remarks || ""
    });
    setPdfFile(null);

    try {
      const { data: itemsData, error } = await supabase
        .from('auction_items')
        .select('*')
        .eq('auction_id', row.id);
      
      if (error) throw error;
      
      if (itemsData && itemsData.length > 0) {
        setItems(itemsData.map(i => ({ ...i, id: i.id || Date.now() + Math.random() })));
      } else {
        setItems([{ id: Date.now(), mine: "", coal_grade: "", quantity_offered: "", base_price: "" }]);
      }
    } catch (err) {
      console.error("Error fetching items:", err);
      setItems([{ id: Date.now(), mine: "", coal_grade: "", quantity_offered: "", base_price: "" }]);
    }
    
    setIsViewModalOpen(false);
    setIsModalOpen(true);
  };

  const handleViewClick = async (row) => {
    setViewData({ ...row, items: [] });
    setIsViewModalOpen(true);

    try {
      const { data: itemsData, error } = await supabase
        .from('auction_items')
        .select('*')
        .eq('auction_id', row.id);
      
      if (!error && itemsData) {
        setViewData(prev => ({ ...prev, items: itemsData }));
      }
    } catch (err) {
      console.error("Error fetching view items:", err);
    }
  };

  const handleSave = async () => {
    try {
      showToast("Saving...");
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

      // Prepare main auction payload
      const payload = {
        deal_id: formData.deal_id || null,
        bidder: formData.bidder || null,
        auction_source: formData.auction_source || null,
        notification_date: formData.notification_date || null,
        bid_date: formData.bid_date || null,
        bid_closing_date: formData.bid_closing_date || null,
        coal_company: formData.coal_company || null,
        remarks: formData.remarks || null,
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

      // Insert items if they have data
      const validItems = items.filter(i => i.mine || i.coal_grade);
      if (validItems.length > 0) {
        const itemsToInsert = validItems.map(i => ({
          auction_id: auctionIdToUse,
          mine: i.mine || "",
          coal_grade: i.coal_grade || "",
          quantity_offered: parseFloat(i.quantity_offered) || 0,
          base_price: parseFloat(i.base_price) || 0
        }));

        const { error: itemsError } = await supabase
          .from('auction_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      showToast("Auction Data Saved Successfully!");
      setIsModalOpen(false);
      resetForm();
      fetchAuctions();
      
    } catch (err) {
      console.error("Save Error:", err);
      showToast("Error saving data: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this auction?")) {
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

  return (
    <div className="page-content">
      {toastMessage && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", background: "#16a34a", color: "white",
          padding: "12px 24px", borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          zIndex: 9999, fontWeight: 500, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          {toastMessage}
        </div>
      )}

      <div className="results-bar" style={{ marginBottom: "24px" }}>
        <div>
          <div className="results-file" style={{ fontSize: "20px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Auction Management
          </div>
          <div className="results-hint" style={{ marginTop: "4px" }}>Manage and track all auction notifications</div>
        </div>
        <div className="results-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="btn" onClick={() => { resetForm(); setIsModalOpen(true); }} style={{ display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            ADD AUCTION
          </button>
        </div>
      </div>

      <div className="summary-section" style={{ marginTop: 0 }}>
        <div className="summary-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div className="summary-title" style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)" }}>Registered Auctions</div>
        </div>
        <div className="summary-table-wrap">
          <table className="stable">
            <thead>
              <tr>
                <th>S.NO</th>
                <th>DEAL ID</th>
                <th>BIDDER</th>
                <th>AUCTION SOURCE</th>
                <th>NOTIFICATION DATE</th>
                <th>BID DATE</th>
                <th>COAL COMPANY</th>
                <th>PREVIEW</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>Loading...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No auction data available. Click "Add Form" to create a new entry.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id}>
                    <td style={{ textAlign: "center", fontWeight: "500", color: "var(--muted)" }}>{String(i + 1).padStart(2, '0')}</td>
                    <td>{row.deal_id || "-"}</td>
                    <td>{row.bidder || "-"}</td>
                    <td>{row.auction_source || "-"}</td>
                    <td>{formatDate(row.notification_date)}</td>
                    <td>{formatDate(row.bid_date)}</td>
                    <td>{row.coal_company || "-"}</td>
                    <td>
                      {row.pdf_url ? (
                        <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "rgba(239, 68, 68, 0.1)", color: "#dc2626", borderRadius: "4px", textDecoration: "none", fontWeight: 600, fontSize: "12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          PDF
                        </a>
                      ) : <span style={{ color: "var(--muted)" }}>-</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                        <button
                          style={{
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                            padding: "6px 10px", fontSize: "12px", fontWeight: "600", borderRadius: "6px",
                            border: "none", background: "#e0e7ff", color: "#4338ca", transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "#c7d2fe"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "#e0e7ff"; }}
                          onClick={() => handleViewClick(row)}
                          title="View Details"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          View
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

      {isModalOpen && (
        <div className="auction-modal-overlay">
          <div className="auction-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="auction-modal-header">
              <div className="auction-badge">PROCESS ACTION</div>
              <h2 className="auction-modal-title">Auction Notification</h2>
              <button className="auction-close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <div className="auction-modal-body">
              <div className="auction-grid-2">
                <div className="auction-form-group">
                  <label className="auction-label">DEAL ID</label>
                  <input type="text" name="deal_id" className="auction-input" placeholder="DEAL-2026-747" value={formData.deal_id} onChange={handleInputChange} />
                </div>
                <div className="auction-form-group">
                  <label className="auction-label">BIDDER</label>
                  <input type="text" name="bidder" className="auction-input" value={formData.bidder} onChange={handleInputChange} />
                </div>
                
                <div className="auction-form-group">
                  <label className="auction-label">AUCTION SOURCE</label>
                  <input type="text" name="auction_source" className="auction-input" value={formData.auction_source} onChange={handleInputChange} />
                </div>
                <div className="auction-form-group">
                  <label className="auction-label">NOTIFICATION DATE</label>
                  <input type="date" name="notification_date" className="auction-input" value={formData.notification_date} onChange={handleInputChange} />
                </div>
                
                <div className="auction-form-group">
                  <label className="auction-label">BID DATE</label>
                  <input type="date" name="bid_date" className="auction-input" value={formData.bid_date} onChange={handleInputChange} />
                </div>
                <div className="auction-form-group">
                  <label className="auction-label">BID CLOSING DATE</label>
                  <input type="date" name="bid_closing_date" className="auction-input" value={formData.bid_closing_date} onChange={handleInputChange} />
                </div>
                
                <div className="auction-form-group">
                  <label className="auction-label">COAL COMPANY</label>
                  <input type="text" name="coal_company" className="auction-input" value={formData.coal_company} onChange={handleInputChange} />
                </div>
              </div>

              <div className="auction-section-title">MINE DETAILS</div>
              
              {items.map((item, index) => (
                <div key={item.id} className="auction-item-card" style={{ position: 'relative' }}>
                  <div className="auction-item-badge" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>ITEM {index + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => handleRemoveItem(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: 0 }}>&times;</button>
                    )}
                  </div>
                  <div className="auction-grid-4">
                    <div className="auction-form-group">
                      <label className="auction-label">MINE</label>
                      <input type="text" className="auction-input" value={item.mine} onChange={(e) => handleItemChange(item.id, 'mine', e.target.value)} />
                    </div>
                    <div className="auction-form-group">
                      <label className="auction-label">COAL GRADE</label>
                      <input type="text" className="auction-input" value={item.coal_grade} onChange={(e) => handleItemChange(item.id, 'coal_grade', e.target.value)} />
                    </div>
                    <div className="auction-form-group">
                      <label className="auction-label">QUANTITY OFFERED (MT)</label>
                      <input type="number" className="auction-input" value={item.quantity_offered} onChange={(e) => handleItemChange(item.id, 'quantity_offered', e.target.value)} />
                    </div>
                    <div className="auction-form-group">
                      <label className="auction-label">BASE PRICE (₹/MT)</label>
                      <input type="number" className="auction-input" value={item.base_price} onChange={(e) => handleItemChange(item.id, 'base_price', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <button className="auction-add-btn" onClick={handleAddItem}>
                <span>+</span> Add Another
              </button>

              <div className="auction-section-title">NOTIFICATION DOCUMENT</div>
              <input 
                type="file" 
                accept=".pdf" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: "none" }} 
              />
              <div className="auction-upload-box" onClick={() => fileInputRef.current?.click()}>
                <span style={{ color: pdfFile ? "var(--text)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pdfFile ? pdfFile.name : "Click to Upload PDF"}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>

              <div className="auction-section-title">REMARKS</div>
              <textarea name="remarks" className="auction-textarea" placeholder="Enter notes for Remarks..." value={formData.remarks} onChange={handleInputChange}></textarea>
            </div>

            <div className="auction-modal-footer">
              <button className="auction-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="auction-btn-save" onClick={handleSave}>
                Save & Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewData && (
        <div className="auction-modal-overlay">
          <div className="auction-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="auction-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--line)", background: "linear-gradient(to right, #f8fafc, #ffffff)", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "#e0e7ff", color: "#4f46e5", borderRadius: "10px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div>
                  <h2 className="auction-modal-title" style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>Auction Details</h2>
                  <div style={{ color: "#64748b", fontSize: "13px", marginTop: "4px", fontWeight: "500" }}>ID: {viewData.deal_id || "N/A"}</div>
                </div>
              </div>
              <button className="auction-close-btn" style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#0f172a"; }} onMouseOut={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }} onClick={() => setIsViewModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="auction-modal-body" style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>BIDDER</strong> 
                  </div>
                  <span style={{ color: "#0f172a", fontSize: "15px", fontWeight: "600" }}>{viewData.bidder || "-"}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
                    <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>COAL COMPANY</strong> 
                  </div>
                  <span style={{ color: "#0f172a", fontSize: "15px", fontWeight: "600" }}>{viewData.coal_company || "-"}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>AUCTION SOURCE</strong> 
                  </div>
                  <span style={{ color: "#0f172a", fontSize: "15px", fontWeight: "600" }}>{viewData.auction_source || "-"}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>NOTIFICATION DATE</strong> 
                  </div>
                  <span style={{ color: "#0f172a", fontSize: "15px", fontWeight: "600" }}>{formatDate(viewData.notification_date)}</span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>BID DATE</strong> 
                  </div>
                  <span style={{ color: "#0f172a", fontSize: "15px", fontWeight: "600" }}>{formatDate(viewData.bid_date)}</span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ef4444" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>BID CLOSING DATE</strong> 
                  </div>
                  <span style={{ color: "#0f172a", fontSize: "15px", fontWeight: "600" }}>{formatDate(viewData.bid_closing_date)}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", letterSpacing: "0.5px", textTransform: "uppercase" }}>MINE DETAILS</div>
              </div>
              {(!viewData.items || viewData.items.length === 0) ? (
                <div style={{ padding: "24px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", color: "#64748b", fontSize: "14px", border: "1px dashed #cbd5e1" }}>No mine details available.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
                  {viewData.items.map((item, idx) => (
                    <div key={idx} style={{ padding: "20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "#4f46e5" }}></div>
                      <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", background: "#e0e7ff", color: "#4338ca", fontSize: "11px", fontWeight: "700", borderRadius: "6px", marginBottom: "16px" }}>ITEM {idx + 1}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><strong style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>MINE</strong> <span style={{ color: "#0f172a", fontSize: "14px", fontWeight: "500" }}>{item.mine || "-"}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><strong style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>COAL GRADE</strong> <span style={{ color: "#0f172a", fontSize: "14px", fontWeight: "500" }}>{item.coal_grade || "-"}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><strong style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>QTY OFFERED</strong> <span style={{ color: "#0f172a", fontSize: "14px", fontWeight: "500" }}>{item.quantity_offered || "-"} <span style={{ color: "#64748b", fontSize: "12px" }}>MT</span></span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><strong style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>BASE PRICE</strong> <span style={{ fontSize: "14px", fontWeight: "600", color: "#059669" }}>₹{item.base_price || "-"}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewData.remarks && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", letterSpacing: "0.5px", textTransform: "uppercase" }}>REMARKS</div>
                  </div>
                  <div style={{ padding: "16px", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: "12px", fontSize: "14px", lineHeight: "1.5", marginBottom: "32px", whiteSpace: "pre-wrap" }}>
                    {viewData.remarks}
                  </div>
                </>
              )}
            </div>

            <div className="auction-modal-footer" style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid var(--line)", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
              <div>
                {viewData.pdf_url && (
                  <a href={viewData.pdf_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: "white", color: "#4f46e5", border: "1px solid #c7d2fe", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", borderRadius: "8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    View Document
                  </a>
                )}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  className="btn" 
                  style={{ background: "white", color: "#10b981", border: "1px solid #10b981", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", borderRadius: "8px" }}
                  onClick={() => handleEditClick(viewData)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Edit
                </button>
                <button 
                  className="btn" 
                  style={{ background: "#ef4444", color: "white", border: "none", boxShadow: "0 1px 2px 0 rgba(239, 68, 68, 0.3)", borderRadius: "8px" }}
                  onClick={() => handleDelete(viewData.id)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
