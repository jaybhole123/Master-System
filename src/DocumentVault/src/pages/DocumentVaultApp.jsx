import React, { useState, useRef, useCallback, useMemo } from "react";
import { useVault } from "../context/VaultContext";
import Icon from "../components/Icon";
import DocRow, { DocTableHeader } from "../components/DocRow";
import ClientDialog from "../components/ClientDialog";
import DocDialog from "../components/DocDialog";
import RenewDialog from "../components/RenewDialog";
import ConfirmDialog from "../components/ConfirmDialog";
import PreviewDialog from "../components/PreviewDialog";
import { Eye, Plus, Edit2, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { CLIENT_TYPES, CLIENT_TYPE_OPTIONS } from "../utils/constants";
import { ini, worst, status, isoShort } from "../utils/helpers";

export default function DocumentVaultApp() {
  const {
    clients, docs, sel, view, filt, q, ctf,
    dispatch, warning, toast, showToast,
    saveClient, deleteClient, saveDoc, deleteDoc,
    backup, restore
  } = useVault();

  // Dialog states
  const [clientDlg, setClientDlg] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [docDlg, setDocDlg] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [renewDlg, setRenewDlg] = useState(false);
  const [renewDoc, setRenewDoc] = useState(null);
  const [previewDlg, setPreviewDlg] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [showDocsTable, setShowDocsTable] = useState(false);

  const restoreRef = useRef(null);

  // Only Individual persons
  const individualClients = useMemo(() => {
    return clients.filter((c) => !c.ctype || c.ctype === "Individual");
  }, [clients]);

  // Filtered client list
  const filteredClients = useMemo(() => {
    const k = q.trim().toLowerCase();
    return individualClients
      .filter((c) => {
        if (!k) return true;
        return [c.name, c.phone, c.email, ...Object.values(c.fields || {})].some((v) => (v || "").toLowerCase().includes(k))
          || docs.some((d) => d.cid === c.id && [d.num, d.type, ...Object.values(d.fields || {})].some((v) => (v || "").toLowerCase().includes(k)));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [individualClients, docs, q]);

  // Current selected individual person
  const curClient = useMemo(() => {
    if (!individualClients.length) return null;
    const found = individualClients.find((x) => x.id === sel);
    return found || individualClients[0];
  }, [individualClients, sel]);

  const curDocs = useMemo(() => {
    if (!curClient) return [];
    return docs.filter((d) => d.cid === curClient.id).sort((a, b) => a.type.localeCompare(b.type));
  }, [docs, curClient]);

  const docTypes = useMemo(() => [...new Set(curDocs.map((d) => d.type))], [curDocs]);
  const activeFilt = filt !== "All" && !docTypes.includes(filt) ? "All" : filt;
  const shownDocs = activeFilt === "All" ? curDocs : curDocs.filter((d) => d.type === activeFilt);

  // Stats for Individual Vault
  const individualDocs = useMemo(() => {
    const indIds = new Set(individualClients.map((c) => c.id));
    return docs.filter((d) => indIds.has(d.cid));
  }, [individualClients, docs]);

  const statuses = useMemo(() => individualDocs.map(status), [individualDocs]);
  const warnCount = statuses.filter((x) => x.k === "warn").length;
  const badCount = statuses.filter((x) => x.k === "bad").length;

  // Per-person expanded states for Documents Table
  const [openDocsMap, setOpenDocsMap] = useState({});
  const [activeFiltMap, setActiveFiltMap] = useState({});

  const toggleDocsForPerson = (id) => {
    setOpenDocsMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setPersonFilter = (personId, filtCategory) => {
    setActiveFiltMap((prev) => ({ ...prev, [personId]: filtCategory }));
  };

  // Target client for adding document
  const [docClientId, setDocClientId] = useState(null);

  // Handlers
  const openAddClient = () => { setEditClient({ ctype: "Individual" }); setClientDlg(true); };
  const openEditClient = (client) => { setEditClient(client || curClient); setClientDlg(true); };
  const openAddDoc = (targetClientId = null) => { 
    setEditDoc(null); 
    setDocClientId(targetClientId || curClient?.id);
    setDocDlg(true); 
  };
  const openEditDoc = (d) => { setEditDoc(d); setDocClientId(d.cid); setDocDlg(true); };
  const openRenew = (d) => { setRenewDoc(d); setRenewDlg(true); };
  const openPreview = (d) => { setPreviewDoc(d); setPreviewDlg(true); };

  const handleDeleteClient = (client) => {
    const target = client || curClient;
    setConfirmDlg({
      title: "Delete client?",
      message: `${target?.name} and all their documents will be deleted. This cannot be undone.`,
      onConfirm: () => deleteClient(target?.id)
    });
  };

  const handleDeleteDoc = (d) => {
    setConfirmDlg({
      title: "Delete document?",
      message: `This ${d.type}${d.num ? " (" + d.num + ")" : ""} will be deleted. This cannot be undone.`,
      onConfirm: () => deleteDoc(d.id)
    });
  };

  const handleGoClient = (id) => {
    dispatch({ type: "SET_SEL", id });
    setOpenDocsMap((prev) => ({ ...prev, [id]: true }));
  };

  // Highlight text helper with yellow mark
  const highlightText = (text, query) => {
    if (!text || !query || !query.trim()) return text;
    const qStr = query.trim();
    const parts = String(text).split(new RegExp(`(${qStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === qStr.toLowerCase() ? (
        <mark key={i} style={{ background: "#fef08a", color: "#854d0e", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Client info badges
  const cinfo = (c) => {
    const ct = CLIENT_TYPES[c.ctype || "Individual"] || CLIENT_TYPES.Individual;
    const v = c.fields || {};
    const filled = ct.f.filter((x) => v[x.k] && x.t !== "textarea").slice(0, 5);
    return filled;
  };

  const renderTiles = () => (
    <div className="dv-tiles">
      <div className="dv-tile">
        <span className="dv-ti"><Icon name="us" size={20} /></span>
        <span><b>{individualClients.length}</b><small>Persons</small></span>
      </div>
      <div className="dv-tile">
        <span className="dv-ti"><Icon name="fl" size={20} /></span>
        <span><b>{individualDocs.length}</b><small>Documents</small></span>
      </div>
      <button className={`dv-tile warn${view === "warn" ? " on" : ""}`} onClick={() => dispatch({ type: "SET_VIEW", view: view === "warn" ? "client" : "warn" })}>
        <span className="dv-ti"><Icon name="ck" size={20} /></span>
        <span><b>{warnCount}</b><small>Renewal due in 30 days</small></span>
      </button>
      <button className={`dv-tile bad${view === "bad" ? " on" : ""}`} onClick={() => dispatch({ type: "SET_VIEW", view: view === "bad" ? "client" : "bad" })}>
        <span className="dv-ti"><Icon name="wr" size={20} /></span>
        <span><b>{badCount}</b><small>Expired</small></span>
      </button>
    </div>
  );

  const renderAlertView = () => {
    const list = individualDocs.filter((d) => status(d).k === view).sort((a, b) => (a.expiry || "").localeCompare(b.expiry || ""));
    const isBad = view === "bad";
    return (
      <div className="dv-client-view-container">
        <div className="dv-client-hero-card" style={{ borderLeft: `4px solid ${isBad ? "#dc2626" : "#d97706"}` }}>
          <div className="dv-client-hero-main">
            <div className="dv-client-hero-avatar" style={{ background: isBad ? "#fef2f2" : "#fffbeb", color: isBad ? "#dc2626" : "#d97706", borderColor: isBad ? "#fee2e2" : "#fef3c7" }}>
              <Icon name={isBad ? "wr" : "ck"} size={22} />
            </div>
            <div className="dv-client-hero-info">
              <div className="dv-client-title-row">
                <h2 className="dv-client-name">{isBad ? "Expired Documents" : "Renewals Due in 30 Days"}</h2>
                <span className={`dv-pill ${isBad ? "bad" : "warn"}`}>
                  {list.length} Document{list.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="dv-client-contact-row">
                <span>Directly renew documents using the renew action button to retain audit history.</span>
              </div>
            </div>
          </div>
          <button className="dv-btn" onClick={() => dispatch({ type: "SET_VIEW", view: "client" })}>
            ← Back to Person View
          </button>
        </div>

        <div className="dv-docs">
          {list.length > 0 ? (
            <>
              <DocTableHeader />
              {list.map((d, idx) => (
                <DocRow key={d.id} doc={d} index={idx} clients={clients} showClient
                  onView={openPreview} onEdit={openEditDoc} onRenew={openRenew}
                  onDelete={handleDeleteDoc} onGoClient={handleGoClient} />
              ))}
            </>
          ) : (
            <div className="dv-empty-pro">
              <div className="dv-empty-icon-box" style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3>All clear!</h3>
              <p>There are no {isBad ? "expired" : "renewal-pending"} documents requiring attention at this time.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderClientView = () => {
    if (filteredClients.length === 0) {
      return (
        <div className="dv-empty-pro" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--dv-line)" }}>
          <div className="dv-empty-icon-box" style={{ background: "#fef2f2", color: "var(--dv-acc)" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3>{q.trim() ? `No persons match "${q}"` : "No Persons Added Yet"}</h3>
          <p>{q.trim() ? "Try searching by another name, phone, or document number." : "Create your first person to start storing driving licenses, property papers, insurance, and bank documents."}</p>
        </div>
      );
    }

    return (
      <div className="dv-client-view-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredClients.map((client) => {
          const clientDocs = docs.filter((d) => d.cid === client.id).sort((a, b) => a.type.localeCompare(b.type));
          const clientTypes = [...new Set(clientDocs.map((d) => d.type))];
          const activeFilter = activeFiltMap[client.id] || "All";
          
          // Filtered docs for this person based on search or category filter
          const clientFilteredDocs = clientDocs.filter((d) => {
            if (activeFilter !== "All" && d.type !== activeFilter) return false;
            if (q.trim()) {
              const ql = q.trim().toLowerCase();
              const fieldVals = Object.values(d.fields || {}).map((val) => (val || "").toString().toLowerCase());
              return (
                (d.type && d.type.toLowerCase().includes(ql)) ||
                (d.num && d.num.toLowerCase().includes(ql)) ||
                (d.note && d.note.toLowerCase().includes(ql)) ||
                (d.fname && d.fname.toLowerCase().includes(ql)) ||
                fieldVals.some((val) => val.includes(ql))
              );
            }
            return true;
          });

          const isDocsOpen = Boolean(openDocsMap[client.id]) || (Boolean(q.trim()) && clientFilteredDocs.length > 0);
          const infoFields = cinfo(client);
          const v = client.fields || {};

          return (
            <div 
              key={client.id}
              id={`person-card-${client.id}`}
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
                {/* Left: Avatar + Person Name + Badges + Contact info in clean inline pill design */}
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
                      {highlightText(client.name, q)}
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
                      {client.ctype || "Individual"}
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
                      {clientDocs.length} Document{clientDocs.length === 1 ? "" : "s"}
                    </span>

                    {/* Clean Contact Indicators */}
                    {client.phone && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "4px 12px", borderRadius: 7, border: "1px solid #f1f5f9" }}>
                        <Phone size={13} style={{ color: "#94a3b8" }} /> {highlightText(client.phone, q)}
                      </span>
                    )}
                    {client.email && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "4px 12px", borderRadius: 7, border: "1px solid #f1f5f9" }}>
                        <Mail size={13} style={{ color: "#94a3b8" }} /> {highlightText(client.email, q)}
                      </span>
                    )}
                    {client.addr && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "4px 12px", borderRadius: 7, border: "1px solid #f1f5f9" }}>
                        <MapPin size={13} style={{ color: "#94a3b8" }} /> {highlightText(client.addr, q)}
                      </span>
                    )}

                    {/* Metadata tags (e.g. Aadhaar, PAN) */}
                    {infoFields.map((x) => (
                      <span key={x.k} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #dbeafe", padding: "4px 12px", borderRadius: 7, fontSize: 12.5 }}>
                        <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 11.5 }}>{x.l}:</span>
                        <strong style={{ color: "#1e3a8a", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                          {highlightText(isoShort(v[x.k]), q)}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Clean Icon Action Group */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button 
                    onClick={() => toggleDocsForPerson(client.id)}
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
                    onClick={() => openAddDoc(client.id)}
                    title="Add / Upload New Document"
                    style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 11,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#dc2626",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      transition: "all .15s ease"
                    }}
                  >
                    <Plus size={20} />
                  </button>

                  <button 
                    onClick={() => openEditClient(client)}
                    title="Edit Person Details"
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
                    title="Delete Person"
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

              {/* Stored Documents Table directly under this Person card on clicking View Documents */}
              {isDocsOpen && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px dashed #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                        All Stored Documents for {highlightText(client.name, q)} ({clientFilteredDocs.length})
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748b" }}>
                        Driving license, Aadhaar, PAN, RC book, bank passbook, and individual personal records
                      </p>
                    </div>
                    <button 
                      className="dv-btn pri" 
                      onClick={() => openAddDoc(client.id)}
                      style={{ fontSize: 13, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Plus size={15} /> Upload Document
                    </button>
                  </div>

                  {/* Filter Chips if multiple document types */}
                  {clientTypes.length > 1 && (
                    <div className="dv-category-bar" style={{ marginBottom: 12 }}>
                      <span className="dv-category-title">Categories:</span>
                      <div className="dv-chips">
                        {["All", ...clientTypes].map((t) => (
                          <button 
                            key={t} 
                            className={`dv-chip${t === activeFilter ? " on" : ""}`}
                            onClick={() => setPersonFilter(client.id, t)}
                          >
                            {t} ({t === "All" ? clientDocs.length : clientDocs.filter((d) => d.type === t).length})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Table or Empty State */}
                  <div className="dv-docs" style={{ border: "1px solid var(--dv-line)", borderRadius: 12, overflow: "hidden" }}>
                    {clientFilteredDocs.length > 0 ? (
                      <>
                        <DocTableHeader />
                        {clientFilteredDocs.map((d, idx) => (
                          <DocRow key={d.id} doc={d} index={idx} clients={clients} highlight={q}
                            onView={openPreview} onEdit={openEditDoc} onRenew={openRenew} onDelete={handleDeleteDoc} />
                        ))}
                      </>
                    ) : (
                      <div className="dv-empty-pro" style={{ padding: 24 }}>
                        <div className="dv-empty-icon-box">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        </div>
                        <h3>No documents attached for this person</h3>
                        <p>Upload DL, Aadhaar, PAN card, or personal files.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="dv-container">
      {/* Header */}
      <header className="dv-top">
        <div className="dv-brand">
          <span className="dv-logo"><Icon name="shield" size={20} /></span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1>Individual / Personal Document Vault</h1>
              <span className="dv-type-tag" style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}>
                Individual Docs
              </span>
            </div>
            <small>Personal identity, DL, Aadhaar, PAN, voter card, vehicle RC, property and insurance repository</small>
          </div>
        </div>

      </header>

      {/* Warning bar */}
      {warning && <div className="dv-warn">{warning}</div>}

      {/* Main Full-Width Dashboard Content */}
      <main className="dv-page-body">
        {/* Top Summary Stat Cards */}
        {renderTiles()}

        {/* Professional Filter & Action Toolbar */}
        <div className="dv-toolbar-card">
          <div className="dv-toolbar-row">
            {/* Search Bar with icon */}
            <div className="dv-search-wrap">
              <span className="dv-search-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </span>
              <input
                className="dv-search-input"
                type="search"
                placeholder="Search by person name, mobile, document no..."
                value={q}
                onChange={(e) => dispatch({ type: "SET_SEARCH", q: e.target.value })}
              />
              {q && (
                <button className="dv-search-clear" onClick={() => dispatch({ type: "SET_SEARCH", q: "" })}>×</button>
              )}
            </div>

            {/* Persons Dropdown */}
            <div className="dv-select-wrap">
              <select
                className="dv-filter-select"
                value={view === "client" && curClient ? curClient.id : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    dispatch({ type: "SET_VIEW", view: "client" });
                    dispatch({ type: "SET_SEL", id: val });
                    setOpenDocsMap((prev) => ({ ...prev, [val]: true }));
                    const el = document.getElementById(`person-card-${val}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
              >
                <option value="" disabled>Select Person ({filteredClients.length})</option>
                {filteredClients.map((c) => {
                  const n = docs.filter((d) => d.cid === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({n} docs)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Quick Action: Add Client */}
            <button className="dv-btn pri" onClick={openAddClient}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add New Person
            </button>
          </div>
        </div>

        {/* View Content (Selected Client docs or Expiry Alert lists) */}
        <div className="dv-content-area">
          {view !== "client" ? renderAlertView() : renderClientView()}
        </div>
      </main>

      {/* Toast */}
      <div className={`dv-toast${toast ? " show" : ""}`} role="status">{toast}</div>

      {/* Dialogs */}
      <ClientDialog open={clientDlg} onClose={() => setClientDlg(false)} onSave={saveClient} client={editClient} defaultType="Individual" allowedTypes={["Individual"]} />
      <DocDialog open={docDlg} onClose={() => setDocDlg(false)} onSave={saveDoc} doc={editDoc} clientId={docClientId || curClient?.id} defaultCategory="Personal" />
      <RenewDialog open={renewDlg} onClose={() => setRenewDlg(false)} onSave={saveDoc} doc={renewDoc} />
      <PreviewDialog open={previewDlg} onClose={() => setPreviewDlg(false)} doc={previewDoc} />
      <ConfirmDialog open={!!confirmDlg} onClose={() => setConfirmDlg(null)}
        title={confirmDlg?.title} message={confirmDlg?.message} onConfirm={confirmDlg?.onConfirm} />
    </div>
  );
}
