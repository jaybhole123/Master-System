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

  // Toggle for Stored Documents Table
  const [showDocsTable, setShowDocsTable] = useState(false);
  // Toggle for Checklist Sections View
  const [showChecklist, setShowChecklist] = useState(false);

  // Per-firm expanded states for Documents Table and Checklist
  const [openDocsMap, setOpenDocsMap] = useState({});
  const [openChecklistMap, setOpenChecklistMap] = useState({});

  const toggleDocsForFirm = (id) => {
    setOpenDocsMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChecklistForFirm = (id) => {
    setOpenChecklistMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Active section filter (All or A, B, C, D, E)
  const [activeSection, setActiveSection] = useState("All");
  // Global search input for firms, documents and details
  const [globalSearch, setGlobalSearch] = useState("");
  // Checklist item filter search query
  const [searchQuery, setSearchQuery] = useState("");

  // Only business / firm / company / plant entities
  const firmClients = useMemo(() => {
    return clients
      .filter((c) => c.ctype === "Firm" || c.ctype === "Company" || c.ctype === "Plant")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  // Filtered firm list based on global search bar
  const filteredFirmClients = useMemo(() => {
    const k = globalSearch.trim().toLowerCase();
    if (!k) return firmClients;
    return firmClients.filter((c) => {
      const fieldValues = Object.values(c.fields || {}).map((v) => (v || "").toString().toLowerCase());
      return (
        c.name.toLowerCase().includes(k) ||
        (c.phone && c.phone.toLowerCase().includes(k)) ||
        (c.email && c.email.toLowerCase().includes(k)) ||
        fieldValues.some((v) => v.includes(k)) ||
        docs.some((d) => d.cid === c.id && [d.num, d.type, ...Object.values(d.fields || {})].some((val) => (val || "").toString().toLowerCase().includes(k)))
      );
    });
  }, [firmClients, docs, globalSearch]);

  // Current selected entity
  const curClient = useMemo(() => {
    if (!firmClients.length) return null;
    const found = filteredFirmClients.find((x) => x.id === selCompany) || firmClients.find((x) => x.id === selCompany);
    return found || filteredFirmClients[0] || firmClients[0];
  }, [firmClients, filteredFirmClients, selCompany]);

  // All documents belonging to firm clients
  const firmDocs = useMemo(() => {
    const firmIds = new Set(firmClients.map((c) => c.id));
    return docs.filter((d) => firmIds.has(d.cid));
  }, [docs, firmClients]);

  // Overall checklist progress across firms
  const overallChecklistProgress = useMemo(() => {
    if (!firmClients.length) return { total: 0, completed: 0, pct: 0 };
    const totalPossible = firmClients.length * COMPANY_DOC_TYPES.length;
    let completed = 0;
    firmClients.forEach((fc) => {
      const cDocs = docs.filter((d) => d.cid === fc.id);
      COMPANY_DOC_TYPES.forEach((t) => {
        if (cDocs.some((d) => d.type === t && (d.file || d.num))) completed++;
      });
    });
    return {
      total: totalPossible,
      completed,
      pct: totalPossible ? Math.round((completed / totalPossible) * 100) : 0
    };
  }, [firmClients, docs]);

  // Documents belonging to the current firm/company
  const curDocs = useMemo(() => {
    if (!curClient) return [];
    return docs.filter((d) => d.cid === curClient.id);
  }, [docs, curClient]);

  // Display docs - if globalSearch is entered, filter and show matching documents upfront
  const displayedDocs = useMemo(() => {
    if (!globalSearch.trim()) return curDocs;
    const q = globalSearch.trim().toLowerCase();
    const matches = curDocs.filter((d) => {
      const fieldVals = Object.values(d.fields || {}).map((v) => (v || "").toString().toLowerCase());
      return (
        (d.type && d.type.toLowerCase().includes(q)) ||
        (d.num && d.num.toLowerCase().includes(q)) ||
        (d.note && d.note.toLowerCase().includes(q)) ||
        (d.fname && d.fname.toLowerCase().includes(q)) ||
        fieldVals.some((val) => val.includes(q))
      );
    });
    return matches.length > 0 ? matches : curDocs;
  }, [curDocs, globalSearch]);

  // Auto-expand table when search matches any documents or firm attributes
  const isTableVisible = showDocsTable || (Boolean(globalSearch.trim()) && displayedDocs.length > 0);

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

  // Highlight text helper with yellow mark
  const highlightText = (text, query) => {
    if (!text || !query || !query.trim()) return text;
    const q = query.trim();
    const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} style={{ background: "#fef08a", color: "#854d0e", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

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
  const openEditEntity = (client) => { 
    setEditClient(client); 
    setClientDlg(true); 
  };
  const openAddDoc = (clientId, specificType = null) => { 
    setEditDoc(null); 
    setPrefilledType(specificType || null);
    dispatch({ type: "SET_SEL_COMPANY", id: clientId });
    setDocDlg(true); 
  };
  const openEditDoc = (d) => { setEditDoc(d); setDocDlg(true); };
  const openRenew = (d) => { setRenewDoc(d); setRenewDlg(true); };
  const openPreview = (d) => { setPreviewDoc(d); setPreviewDlg(true); };

  const handleDeleteClient = (client) => {
    setConfirmDlg({
      title: "Delete Entity?",
      message: `${client?.name} and all associated corporate checklist documents will be deleted permanently.`,
      onConfirm: () => deleteClient(client.id)
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
          {/* Quick Add Entity Button */}
          <button 
            className="dv-btn pri" 
            onClick={openAddEntity}
            style={{
              background: "#dc2626",
              borderColor: "#dc2626",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 16px",
              boxShadow: "0 2px 5px rgba(220, 38, 38, 0.25)"
            }}
          >
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
              <b>{firmDocs.length}</b>
              <small>Attached Documents</small>
            </span>
          </div>

          <div className="dv-tile ok">
            <span className="dv-ti" style={{ color: "#16a34a", background: "#f0fdf4" }}>
              <CheckCircle2 size={20} />
            </span>
            <span>
              <b>{overallChecklistProgress.completed} / {overallChecklistProgress.total}</b>
              <small>Checklist Progress ({overallChecklistProgress.pct}%)</small>
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

        {/* Firm / Company Selector Bar with Global Search */}
        <div className="dv-toolbar-card">
          <div className="dv-toolbar-row">
            {/* Global Search Bar */}
            <div className="dv-search-wrap" style={{ flex: 1.2 }}>
              <span className="dv-search-icon">
                <Search size={15} />
              </span>
              <input
                className="dv-search-input"
                type="search"
                placeholder="Search firm / company by name, GSTIN, PAN, phone or doc ref..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              {globalSearch && (
                <button className="dv-search-clear" onClick={() => setGlobalSearch("")}>×</button>
              )}
            </div>

            {/* Entity Selector Dropdown */}
            <div className="dv-select-wrap" style={{ flex: 1, minWidth: 260 }}>
              <select
                className="dv-filter-select"
                value={curClient?.id || ""}
                onChange={(e) => dispatch({ type: "SET_SEL_COMPANY", id: e.target.value })}
              >
                {filteredFirmClients.length === 0 ? (
                  <option value="">{globalSearch ? "No firms match search" : "No firms/companies created yet"}</option>
                ) : (
                  filteredFirmClients.map((c) => {
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
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
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
            )}
          </div>
        </div>

        {/* If no firm exists, prompt to create */}
        {filteredFirmClients.length === 0 ? (
          <div className="dv-empty-pro" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--dv-line)" }}>
            <div className="dv-empty-icon-box" style={{ background: "#fef2f2", color: "var(--dv-acc)" }}>
              <Building2 size={36} />
            </div>
            <h3>{globalSearch ? `No firms match "${globalSearch}"` : "No Firms or Companies Added Yet"}</h3>
            <p>{globalSearch ? "Try searching by another name, GSTIN or phone." : "Add your first company, partnership firm, proprietorship or plant entity to begin storing and managing corporate checklist documents."}</p>
            <button className="dv-btn pri" onClick={openAddEntity} style={{ marginTop: 16 }}>
              + Add First Company / Firm
            </button>
          </div>
        ) : (
          <div className="dv-client-view-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Render all firms one by one, firm-wise */}
            {filteredFirmClients.map((client) => {
              const clientDocs = docs.filter((d) => d.cid === client.id);
              const infoFields = cinfo(client);
              const v = client.fields || {};

              // Per-firm progress
              let completed = 0;
              COMPANY_DOC_TYPES.forEach((t) => {
                if (clientDocs.some((d) => d.type === t && (d.file || d.num))) completed++;
              });
              const pct = COMPANY_DOC_TYPES.length ? Math.round((completed / COMPANY_DOC_TYPES.length) * 100) : 0;

              // Filtered docs for this firm
              const clientDisplayDocs = globalSearch.trim()
                ? clientDocs.filter((d) => {
                    const q = globalSearch.trim().toLowerCase();
                    const fieldVals = Object.values(d.fields || {}).map((val) => (val || "").toString().toLowerCase());
                    return (
                      (d.type && d.type.toLowerCase().includes(q)) ||
                      (d.num && d.num.toLowerCase().includes(q)) ||
                      (d.note && d.note.toLowerCase().includes(q)) ||
                      (d.fname && d.fname.toLowerCase().includes(q)) ||
                      fieldVals.some((val) => val.includes(q))
                    );
                  })
                : clientDocs;

              const isDocsOpen = Boolean(openDocsMap[client.id]) || (Boolean(globalSearch.trim()) && clientDisplayDocs.length > 0);
              const isChecklistOpen = Boolean(openChecklistMap[client.id]);

              return (
                <div 
                  key={client.id}
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
                        {ini(client.name)}
                      </div>

                      {/* Primary Details Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                          {highlightText(client.name, globalSearch)}
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
                          {client.ctype}
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
                          {clientDocs.length} Docs
                        </span>

                        {/* Clean Contact Indicators */}
                        {client.phone && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "4px 12px", borderRadius: 7, border: "1px solid #f1f5f9" }}>
                            <Phone size={13} style={{ color: "#94a3b8" }} /> {highlightText(client.phone, globalSearch)}
                          </span>
                        )}
                        {client.email && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "4px 12px", borderRadius: 7, border: "1px solid #f1f5f9" }}>
                            <Mail size={13} style={{ color: "#94a3b8" }} /> {highlightText(client.email, globalSearch)}
                          </span>
                        )}

                        {/* Metadata tags (e.g. GSTIN, PAN) */}
                        {infoFields.map((x) => (
                          <span key={x.k} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #dbeafe", padding: "4px 12px", borderRadius: 7, fontSize: 12.5 }}>
                            <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 11.5 }}>{x.l}:</span>
                            <strong style={{ color: "#1e3a8a", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                              {highlightText(isoShort(v[x.k]), globalSearch)}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Modern Metric Capsule + Action Buttons */}
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
                            width: `${pct}%`, 
                            height: "100%", 
                            background: pct === 100 ? "#16a34a" : "linear-gradient(90deg, #f87171 0%, #dc2626 100%)",
                            borderRadius: 99
                          }} />
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: pct === 100 ? "#16a34a" : "#dc2626" }}>
                          {pct}%
                        </span>
                        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                          ({completed}/{COMPANY_DOC_TYPES.length})
                        </span>
                      </div>

                      {/* Clean Icon Action Group */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button 
                          onClick={() => toggleDocsForFirm(client.id)}
                          title={isDocsOpen ? "Hide Attached Documents" : `View Attached Documents (${clientDocs.length})`}
                          style={{ 
                            position: "relative", 
                            width: 40, 
                            height: 40, 
                            borderRadius: 11,
                            border: isDocsOpen ? "1px solid #dc2626" : "1px solid #fecaca",
                            background: isDocsOpen ? "#b91c1c" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            color: "#ffffff",
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                            transition: "all .15s ease",
                            boxShadow: "0 2px 5px rgba(220, 38, 38, 0.22)"
                          }}
                        >
                          <Eye size={18} />
                          {clientDocs.length > 0 && (
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
                              {clientDocs.length}
                            </span>
                          )}
                        </button>

                        <button 
                          onClick={() => toggleChecklistForFirm(client.id)}
                          title={isChecklistOpen ? "Hide Checklist Items" : "Add / Upload Checklist Document"}
                          style={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: 11,
                            border: isChecklistOpen ? "1px solid #dc2626" : "1px solid #fecaca",
                            background: isChecklistOpen ? "#dc2626" : "#fef2f2",
                            color: isChecklistOpen ? "#ffffff" : "#dc2626",
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                            transition: "all .15s ease"
                          }}
                        >
                          <Plus size={20} />
                        </button>

                        <button 
                          onClick={() => openEditEntity(client)}
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
                          onClick={() => handleDeleteClient(client)}
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

                  {/* Stored Documents Table directly under this Firm card */}
                  {isDocsOpen && (
                    <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px dashed #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                            <Layers size={16} color="#dc2626" /> All Stored Documents for <span style={{ color: "#dc2626" }}>{highlightText(client.name, globalSearch)}</span> ({clientDisplayDocs.length})
                            {globalSearch.trim() && (
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#b45309", background: "#fef3c7", padding: "2px 8px", borderRadius: 6 }}>
                                Filtered by: "{globalSearch}"
                              </span>
                            )}
                          </h3>
                          <small style={{ color: "#64748b" }}>Currently attached checklist and corporate documents for this entity</small>
                        </div>
                        <button className="dv-btn pri" onClick={() => openAddDoc(client.id)} style={{ fontSize: 12, padding: "5px 12px" }}>
                          <Plus size={13} /> Add Additional Document
                        </button>
                      </div>
                      {clientDisplayDocs.length > 0 ? (
                        <div className="dv-docs">
                          <DocTableHeader />
                          {clientDisplayDocs.map((d, idx) => (
                            <DocRow 
                              key={d.id} 
                              doc={d} 
                              index={idx} 
                              clients={firmClients}
                              highlight={globalSearch}
                              onView={openPreview} 
                              onEdit={openEditDoc} 
                              onRenew={openRenew} 
                              onDelete={handleDeleteDoc} 
                            />
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: "20px 14px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: 8, fontSize: 13 }}>
                          No matching documents found. Click "Add Additional Document" to attach.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checklist Sections View directly under this Firm card */}
                  {isChecklistOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14, paddingTop: 18, borderTop: "1px dashed #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fee2e2" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
                          Checklist Categories & Document Upload for {client.name}
                        </span>
                        <button 
                          onClick={() => toggleChecklistForFirm(client.id)} 
                          className="dv-btn"
                          style={{ fontSize: 11, padding: "3px 10px", background: "#fff" }}
                        >
                          ✕ Close Checklist
                        </button>
                      </div>
                      {filteredSections.map((sec) => {
                        const sectionItems = sec.items;
                        const completedInSec = sectionItems.filter((item) => clientDocs.some((d) => d.type === item)).length;

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
                              {sectionItems.map((itemTitle) => {
                                const matchingDocs = clientDocs.filter((d) => d.type === itemTitle);
                                const isUploaded = matchingDocs.length > 0;

                                return (
                                  <div
                                    key={itemTitle}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "10px 14px",
                                      borderBottom: "1px solid #f1f5f9",
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
                                            {md.num && <span style={{ fontWeight: 600, color: "#1e293b" }}>Ref: {highlightText(md.num, globalSearch)}</span>}
                                            {md.fname && (
                                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                <File size={12} /> {highlightText(md.fname, globalSearch)}
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
                                          onClick={() => openAddDoc(client.id, itemTitle)}
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
              );
            })}
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
