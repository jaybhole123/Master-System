import React, { useState, useMemo } from "react";
import { useVault } from "../context/VaultContext";
import Icon from "../components/Icon";
import DocRow, { DocTableHeader } from "../components/DocRow";
import ClientDialog from "../components/ClientDialog";
import DocDialog from "../components/DocDialog";
import RenewDialog from "../components/RenewDialog";
import ConfirmDialog from "../components/ConfirmDialog";
import PreviewDialog from "../components/PreviewDialog";
import { 
  CLIENT_TYPES, 
  COMPANY_CHECKLIST_SECTIONS, 
  COMPANY_DOC_TYPES 
} from "../utils/constants";
import { ini, status, isoShort } from "../utils/helpers";
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Upload, 
  Plus, 
  Search, 
  ChevronRight, 
  CheckSquare, 
  Square,
  ShieldCheck,
  Building,
  FileCheck,
  Briefcase,
  User,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  File,
  Eye,
  ChevronDown,
  ChevronUp,
  Layers
} from "lucide-react";

export default function CompanyVaultPage() {
  const {
    clients, docs, selCompany, view, filt, q, ctf,
    dispatch, warning, toast, showToast,
    saveClient, deleteClient, saveDoc, deleteDoc
  } = useVault();

  // Dialog states
  const [clientDlg, setClientDlg] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [docDlg, setDocDlg] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [prefilledType, setPrefilledType] = useState(null);
  const [renewDlg, setRenewDlg] = useState(false);
  const [renewDoc, setRenewDoc] = useState(null);
  const [previewDlg, setPreviewDlg] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);

  // Toggle for Stored Documents Table (opens directly under the card on click)
  const [showDocsTable, setShowDocsTable] = useState(false);

  // Toggle for Checklist Sections View (only show when + Add/Upload Document button is clicked)
  const [showChecklist, setShowChecklist] = useState(false);

  // Active section filter (All or A, B, C, D, E)
  const [activeSection, setActiveSection] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Only business / firm / company / plant entities
  const firmClients = useMemo(() => {
    return clients
      .filter((c) => c.ctype === "Firm" || c.ctype === "Company" || c.ctype === "Plant")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  // Current selected entity
  const curClient = useMemo(() => {
    if (!firmClients.length) return null;
    const found = firmClients.find((x) => x.id === selCompany);
    return found || firmClients[0];
  }, [firmClients, selCompany]);

  // Documents belonging to the current firm/company
  const curDocs = useMemo(() => {
    if (!curClient) return [];
    return docs.filter((d) => d.cid === curClient.id);
  }, [docs, curClient]);

  // Map checklist items to status for current client
  const checklistProgress = useMemo(() => {
    const total = COMPANY_DOC_TYPES.length;
    let completed = 0;
    COMPANY_DOC_TYPES.forEach((type) => {
      const exists = curDocs.some((d) => d.type === type && (d.file || d.num));
      if (exists) completed++;
    });
    return {
      total,
      completed,
      pct: total ? Math.round((completed / total) * 100) : 0
    };
  }, [curDocs]);

  // Filtered sections & items
  const filteredSections = useMemo(() => {
    return COMPANY_CHECKLIST_SECTIONS.filter((sec) => {
      if (activeSection !== "All" && sec.code !== activeSection) return false;
      return true;
    }).map((sec) => {
      const items = sec.items.filter((item) => {
        if (!searchQuery.trim()) return true;
        const ql = searchQuery.toLowerCase();
        return item.toLowerCase().includes(ql) || sec.title.toLowerCase().includes(ql);
      });
      return { ...sec, items };
    }).filter((sec) => sec.items.length > 0);
  }, [activeSection, searchQuery]);

  // Handlers
  const openAddEntity = () => { 
    setEditClient({ ctype: "Company" }); 
    setClientDlg(true); 
  };
  const openEditEntity = () => { 
    setEditClient(curClient); 
    setClientDlg(true); 
  };
  const openAddDoc = (specificType = null) => { 
    setEditDoc(null); 
    setPrefilledType(specificType);
    setDocDlg(true); 
  };
  const openEditDoc = (d) => { setEditDoc(d); setDocDlg(true); };
  const openRenew = (d) => { setRenewDoc(d); setRenewDlg(true); };
  const openPreview = (d) => { setPreviewDoc(d); setPreviewDlg(true); };

  const handleDeleteClient = () => {
    setConfirmDlg({
      title: "Delete Entity?",
      message: `${curClient?.name} and all associated corporate checklist documents will be deleted permanently.`,
      onConfirm: () => deleteClient(curClient.id)
    });
  };

  const handleDeleteDoc = (d) => {
    setConfirmDlg({
      title: "Delete Document?",
      message: `Delete ${d.type}? This action cannot be undone.`,
      onConfirm: () => deleteDoc(d.id)
    });
  };

  const cinfo = (c) => {
    if (!c) return [];
    const ct = CLIENT_TYPES[c.ctype || "Company"] || CLIENT_TYPES.Company;
    const v = c.fields || {};
    return ct.f.filter((x) => v[x.k] && x.t !== "textarea").slice(0, 6);
  };

  const infoFields = cinfo(curClient);
  const v = curClient?.fields || {};

  return (
    <div className="dv-container">
      {/* Header */}
      <header className="dv-top">
        <div className="dv-brand">
          <span className="dv-logo">
            <Building2 size={22} />
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1>Firm & Corporate Document Vault</h1>
              <span className="dv-type-tag" style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}>
                Company Checklist
              </span>
            </div>
            <small>Company registration, MOA/AOA, GST, ITR, audits, MCA filings & corporate records checklist</small>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a
            href="/document-vault"
            className="dv-btn"
            style={{
              background: "#ffffff",
              color: "#334155",
              borderColor: "var(--dv-line)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 14px"
            }}
          >
            <User size={15} /> Individual Vault
          </a>
          {/* Quick Add Entity Button */}
          <button className="dv-btn pri" onClick={openAddEntity}>
            <Plus size={16} /> Add Firm / Company
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="dv-page-body">
        {/* Top Summary Stat Cards */}
        <div className="dv-tiles">
          <div className="dv-tile">
            <span className="dv-ti">
              <Building size={20} />
            </span>
            <span>
              <b>{firmClients.length}</b>
              <small>Firms / Companies</small>
            </span>
          </div>

          <div className="dv-tile">
            <span className="dv-ti">
              <FileCheck size={20} />
            </span>
            <span>
              <b>{curDocs.length}</b>
              <small>Attached Documents</small>
            </span>
          </div>

          <div className="dv-tile ok">
            <span className="dv-ti" style={{ color: "#16a34a", background: "#f0fdf4" }}>
              <CheckCircle2 size={20} />
            </span>
            <span>
              <b>{checklistProgress.completed} / {checklistProgress.total}</b>
              <small>Checklist Progress ({checklistProgress.pct}%)</small>
            </span>
          </div>

          <div className="dv-tile warn">
            <span className="dv-ti" style={{ color: "#d97706", background: "#fffbeb" }}>
              <Briefcase size={20} />
            </span>
            <span>
              <b>{COMPANY_CHECKLIST_SECTIONS.length}</b>
              <small>Categories (A to E)</small>
            </span>
          </div>
        </div>

        {/* Firm / Company Selector Bar */}
        <div className="dv-toolbar-card">
          <div className="dv-toolbar-row">
            {/* Entity Selector Dropdown */}
            <div className="dv-select-wrap" style={{ flex: 1, minWidth: 260 }}>
              <select
                className="dv-filter-select"
                value={curClient?.id || ""}
                onChange={(e) => dispatch({ type: "SET_SEL_COMPANY", id: e.target.value })}
              >
                {firmClients.length === 0 ? (
                  <option value="">No firms/companies created yet</option>
                ) : (
                  firmClients.map((c) => {
                    const n = docs.filter((d) => d.cid === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.ctype}) - {n} docs
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Checklist Search Filter & Chips (Only visible when Checklist is active) */}
            {showChecklist && (
              <>
                <div className="dv-search-wrap" style={{ flex: 1.5 }}>
                  <span className="dv-search-icon">
                    <Search size={15} />
                  </span>
                  <input
                    className="dv-search-input"
                    type="search"
                    placeholder="Search checklist document items (e.g. GST, MOA, PAN, Audit, Bank)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="dv-search-clear" onClick={() => setSearchQuery("")}>×</button>
                  )}
                </div>

                {/* Category Filter Chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["All", "A", "B", "C", "D", "E"].map((code) => (
                    <button
                      key={code}
                      className={`dv-chip ${activeSection === code ? "on" : ""}`}
                      style={activeSection === code ? { background: "var(--dv-acc)", borderColor: "var(--dv-acc)", color: "#fff" } : {}}
                      onClick={() => setActiveSection(code)}
                    >
                      {code === "All" ? "All Sections" : `Section ${code}`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* If no firm exists, prompt to create */}
        {!curClient ? (
          <div className="dv-empty-pro" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--dv-line)" }}>
            <div className="dv-empty-icon-box" style={{ background: "#fef2f2", color: "var(--dv-acc)" }}>
              <Building2 size={36} />
            </div>
            <h3>No Firms or Companies Added Yet</h3>
            <p>Add your first company, partnership firm, proprietorship or plant entity to begin storing and managing corporate checklist documents.</p>
            <button className="dv-btn pri" onClick={openAddEntity} style={{ marginTop: 16 }}>
              + Add First Company / Firm
            </button>
          </div>
        ) : (
          <div className="dv-client-view-container">
            {/* Entity Hero Information Card - Modern Luxury Micro-Bar */}
            <div 
              className="dv-client-hero-card" 
              style={{ 
                background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
                border: "1px solid #e2e8f0",
                borderLeft: "4px solid #dc2626",
                borderRadius: 16,
                padding: "20px 24px",
                minHeight: 88,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)",
                gap: 16
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "nowrap" }}>
                {/* Left: Avatar + Firm Brand + Badges + Contact info in clean inline pill design */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1 }}>
                  {/* Distinctive Gradient Avatar */}
                  <div 
                    style={{ 
                      width: 50, 
                      height: 50, 
                      minWidth: 50, 
                      borderRadius: 14, 
                      fontSize: 18, 
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", 
                      color: "#ffffff", 
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 3px 10px rgba(220, 38, 38, 0.28)"
                    }}
                  >
                    {ini(curClient.name)}
                  </div>

                  {/* Primary Details Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                      {curClient.name}
                    </h2>

                    <span style={{ 
                      background: "#fef2f2", 
                      color: "#dc2626", 
                      border: "1px solid #fecaca", 
                      padding: "4px 12px", 
                      borderRadius: 7, 
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em"
                    }}>
                      {curClient.ctype}
                    </span>

                    <span style={{ 
                      background: "#f0fdf4", 
                      color: "#15803d", 
                      border: "1px solid #bbf7d0", 
                      padding: "4px 12px", 
                      borderRadius: 7, 
                      fontSize: 12,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                      {curDocs.length} Docs
                    </span>

                    {/* Clean Contact Indicators */}
                    {curClient.phone && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "4px 12px", borderRadius: 7, border: "1px solid #f1f5f9" }}>
                        <Phone size={13} style={{ color: "#94a3b8" }} /> {curClient.phone}
                      </span>
                    )}
                    {curClient.email && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "4px 12px", borderRadius: 7, border: "1px solid #f1f5f9" }}>
                        <Mail size={13} style={{ color: "#94a3b8" }} /> {curClient.email}
                      </span>
                    )}

                    {/* Metadata tags (e.g. GSTIN, PAN) */}
                    {infoFields.map((x) => (
                      <span key={x.k} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #dbeafe", padding: "4px 12px", borderRadius: 7, fontSize: 12.5 }}>
                        <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 11.5 }}>{x.l}:</span>
                        <strong style={{ color: "#1e3a8a", fontFamily: "monospace", letterSpacing: "0.02em" }}>{isoShort(v[x.k])}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Modern Metric Capsule + Polished Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  {/* Micro Progress Capsule */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12, 
                    background: "#ffffff", 
                    padding: "8px 14px", 
                    borderRadius: 12, 
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                  }}>
                    <div style={{ width: 75, height: 7, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ 
                        width: `${checklistProgress.pct}%`, 
                        height: "100%", 
                        background: checklistProgress.pct === 100 ? "#16a34a" : "linear-gradient(90deg, #f87171 0%, #dc2626 100%)",
                        borderRadius: 99
                      }} />
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: checklistProgress.pct === 100 ? "#16a34a" : "#dc2626" }}>
                      {checklistProgress.pct}%
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                      ({checklistProgress.completed}/{checklistProgress.total})
                    </span>
                  </div>

                  {/* Clean Icon Action Group */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button 
                      onClick={() => setShowDocsTable(!showDocsTable)}
                      title={showDocsTable ? "Hide Attached Documents" : `View Attached Documents (${curDocs.length})`}
                      style={{ 
                        position: "relative", 
                        width: 40, 
                        height: 40, 
                        borderRadius: 11,
                        border: showDocsTable ? "1px solid #dc2626" : "1px solid #fecaca",
                        background: showDocsTable ? "#b91c1c" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                        color: "#ffffff",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        transition: "all .15s ease",
                        boxShadow: "0 2px 5px rgba(220, 38, 38, 0.22)"
                      }}
                    >
                      <Eye size={18} />
                      {curDocs.length > 0 && (
                        <span style={{
                          position: "absolute",
                          top: -5,
                          right: -5,
                          background: "#0f172a",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "1px 5px",
                          borderRadius: 99,
                          border: "1.5px solid #fff",
                          lineHeight: "14px"
                        }}>
                          {curDocs.length}
                        </span>
                      )}
                    </button>

                    <button 
                      onClick={() => setShowChecklist(!showChecklist)}
                      title={showChecklist ? "Hide Checklist Items" : "Add / Upload Checklist Document"}
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 11,
                        border: showChecklist ? "1px solid #dc2626" : "1px solid #fecaca",
                        background: showChecklist ? "#dc2626" : "#fef2f2",
                        color: showChecklist ? "#ffffff" : "#dc2626",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        transition: "all .15s ease"
                      }}
                    >
                      <Plus size={20} />
                    </button>

                    <button 
                      onClick={openEditEntity}
                      title="Edit Entity Details"
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 11,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#475569",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        transition: "all .15s ease"
                      }}
                    >
                      <Edit2 size={16} />
                    </button>

                    <button 
                      onClick={handleDeleteClient}
                      title="Delete Entity"
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 11,
                        border: "1px solid #fee2e2",
                        background: "#ffffff",
                        color: "#ef4444",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        transition: "all .15s ease"
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stored Documents Table directly under this Firm card on clicking View Documents */}
              {showDocsTable && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px dashed #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                        <Layers size={16} color="#dc2626" /> All Stored Documents for <span style={{ color: "#dc2626" }}>{curClient.name}</span> ({curDocs.length})
                      </h3>
                      <small style={{ color: "#64748b" }}>Currently attached checklist and corporate documents for this entity</small>
                    </div>
                    <button className="dv-btn pri" onClick={() => openAddDoc()} style={{ fontSize: 12, padding: "5px 12px" }}>
                      <Plus size={13} /> Add Additional Document
                    </button>
                  </div>
                  {curDocs.length > 0 ? (
                    <div className="dv-docs">
                      <DocTableHeader />
                      {curDocs.map((d, idx) => (
                        <DocRow 
                          key={d.id} 
                          doc={d} 
                          index={idx} 
                          clients={firmClients}
                          onView={openPreview} 
                          onEdit={openEditDoc} 
                          onRenew={openRenew} 
                          onDelete={handleDeleteDoc} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "20px 14px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: 8, fontSize: 13 }}>
                      No documents attached yet for {curClient.name}. Click "Upload Document" to attach one.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Checklist Sections View (Only visible when clicking the + Add Doc button) */}
            {showChecklist && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fee2e2" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
                    Select Document Category & Type to Attach
                  </span>
                  <button 
                    onClick={() => setShowChecklist(false)} 
                    className="dv-btn"
                    style={{ fontSize: 11, padding: "3px 10px", background: "#fff" }}
                  >
                    ✕ Close Checklist
                  </button>
                </div>
                {filteredSections.map((sec) => {
                const sectionItems = sec.items;
                const completedInSec = sectionItems.filter((item) => curDocs.some((d) => d.type === item)).length;

                return (
                  <div key={sec.code} style={{ background: "#ffffff", borderRadius: 14, border: "1px solid var(--dv-line)", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                    {/* Section Header */}
                    <div style={{ 
                      padding: "14px 20px", 
                      background: "#f8fafc", 
                      borderBottom: "1px solid var(--dv-line)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between" 
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ 
                          width: 26, 
                          height: 26, 
                          borderRadius: "50%", 
                          background: "#dc2626", 
                          color: "#fff", 
                          display: "grid", 
                          placeItems: "center", 
                          fontSize: 12, 
                          fontWeight: 700 
                        }}>
                          {sec.code}
                        </span>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                          {sec.title}
                        </h3>
                      </div>
                      <span className="dv-pill" style={{ background: completedInSec === sectionItems.length ? "#dcfce7" : "#f1f5f9", color: completedInSec === sectionItems.length ? "#16a34a" : "#64748b", fontWeight: 600 }}>
                        {completedInSec} / {sectionItems.length} Uploaded
                      </span>
                    </div>

                    {/* Checklist Items Table */}
                    <div style={{ padding: "8px 12px" }}>
                      {sectionItems.map((itemTitle, iIdx) => {
                        const matchingDocs = curDocs.filter((d) => d.type === itemTitle);
                        const isUploaded = matchingDocs.length > 0;

                        return (
                          <div 
                            key={itemTitle} 
                            style={{ 
                              padding: "10px 14px", 
                              borderBottom: iIdx === sectionItems.length - 1 ? "none" : "1px solid #f1f5f9",
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between",
                              gap: 12,
                              background: isUploaded ? "#fdfefe" : "#fff",
                              borderRadius: 8
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
                              <span style={{ marginTop: 2, color: isUploaded ? "#16a34a" : "#94a3b8" }}>
                                {isUploaded ? <CheckCircle2 size={18} /> : <Square size={18} />}
                              </span>
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: isUploaded ? "#0f172a" : "#334155" }}>
                                  {itemTitle}
                                </div>
                                {isUploaded && matchingDocs.map((md) => (
                                  <div key={md.id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: 12, color: "#64748b" }}>
                                    {md.num && <span style={{ fontWeight: 600, color: "#1e293b" }}>Ref: {md.num}</span>}
                                    {md.fname && (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <File size={12} /> {md.fname}
                                      </span>
                                    )}
                                    {md.issue && <span>Issued: {isoShort(md.issue)}</span>}
                                    {md.expiry && <span className={`dv-pill ${status(md).k}`} style={{ fontSize: 10, padding: "2px 8px" }}>{status(md).t}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Actions on this checklist item */}
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {isUploaded ? (
                                <>
                                  <button 
                                    className="dv-btn ic" 
                                    onClick={() => openPreview(matchingDocs[0])} 
                                    title="View Document"
                                  >
                                    <Icon name="eye" />
                                  </button>
                                  <button 
                                    className="dv-btn ic" 
                                    onClick={() => openEditDoc(matchingDocs[0])} 
                                    title="Edit Document"
                                  >
                                    <Icon name="ed" />
                                  </button>
                                  <button 
                                    className="dv-btn ic dng" 
                                    onClick={() => handleDeleteDoc(matchingDocs[0])} 
                                    title="Delete Document"
                                  >
                                    <Icon name="tr" />
                                  </button>
                                </>
                              ) : (
                                <button 
                                  className="dv-btn outline" 
                                  style={{ fontSize: 12, padding: "4px 10px" }}
                                  onClick={() => openAddDoc(itemTitle)}
                                >
                                  <Upload size={13} style={{ marginRight: 4 }} /> Attach Doc
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            )}

          </div>
        )}
      </main>

      {/* Toast Notification */}
      <div className={`dv-toast${toast ? " show" : ""}`} role="status">{toast}</div>

      {/* Dialogs */}
      <ClientDialog 
        open={clientDlg} 
        onClose={() => setClientDlg(false)} 
        onSave={saveClient} 
        client={editClient} 
        defaultType="Company"
        allowedTypes={["Company", "Firm", "Plant"]}
      />
      <DocDialog 
        open={docDlg} 
        onClose={() => { setDocDlg(false); setPrefilledType(null); }} 
        onSave={saveDoc} 
        doc={editDoc || (prefilledType ? { type: prefilledType, category: "Company" } : null)} 
        clientId={curClient?.id} 
        defaultCategory="Company"
      />
      <RenewDialog 
        open={renewDlg} 
        onClose={() => setRenewDlg(false)} 
        onSave={saveDoc} 
        doc={renewDoc} 
      />
      <PreviewDialog 
        open={previewDlg} 
        onClose={() => setPreviewDlg(false)} 
        doc={previewDoc} 
      />
      <ConfirmDialog 
        open={!!confirmDlg} 
        onClose={() => setConfirmDlg(null)}
        title={confirmDlg?.title} 
        message={confirmDlg?.message} 
        onConfirm={confirmDlg?.onConfirm} 
      />
    </div>
  );
}
