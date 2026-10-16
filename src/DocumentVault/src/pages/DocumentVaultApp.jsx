import React, { useState, useRef, useCallback, useMemo } from "react";
import { useVault } from "../context/VaultContext";
import Icon from "../components/Icon";
import DocRow, { DocTableHeader } from "../components/DocRow";
import ClientDialog from "../components/ClientDialog";
import DocDialog from "../components/DocDialog";
import RenewDialog from "../components/RenewDialog";
import ConfirmDialog from "../components/ConfirmDialog";
import PreviewDialog from "../components/PreviewDialog";
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

  const restoreRef = useRef(null);

  // Filtered client list
  const filteredClients = useMemo(() => {
    const k = q.trim().toLowerCase();
    return clients
      .filter((c) => {
        if (ctf !== "All" && (c.ctype || "Individual") !== ctf) return false;
        if (!k) return true;
        return [c.name, c.phone, c.email, ...Object.values(c.fields || {})].some((v) => (v || "").toLowerCase().includes(k))
          || docs.some((d) => d.cid === c.id && [d.num, d.type, ...Object.values(d.fields || {})].some((v) => (v || "").toLowerCase().includes(k)));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, docs, q, ctf]);

  const curClient = clients.find((x) => x.id === sel);
  const curDocs = useMemo(() => docs.filter((d) => d.cid === sel).sort((a, b) => a.type.localeCompare(b.type)), [docs, sel]);
  const docTypes = useMemo(() => [...new Set(curDocs.map((d) => d.type))], [curDocs]);
  const activeFilt = filt !== "All" && !docTypes.includes(filt) ? "All" : filt;
  const shownDocs = activeFilt === "All" ? curDocs : curDocs.filter((d) => d.type === activeFilt);

  // Stats
  const statuses = useMemo(() => docs.map(status), [docs]);
  const warnCount = statuses.filter((x) => x.k === "warn").length;
  const badCount = statuses.filter((x) => x.k === "bad").length;

  // Handlers
  const openAddClient = () => { setEditClient(null); setClientDlg(true); };
  const openEditClient = () => { setEditClient(curClient); setClientDlg(true); };
  const openAddDoc = () => { setEditDoc(null); setDocDlg(true); };
  const openEditDoc = (d) => { setEditDoc(d); setDocDlg(true); };
  const openRenew = (d) => { setRenewDoc(d); setRenewDlg(true); };
  const openPreview = (d) => { setPreviewDoc(d); setPreviewDlg(true); };

  const handleDeleteClient = () => {
    setConfirmDlg({
      title: "Delete client?",
      message: `${curClient?.name} and all their documents will be deleted. This cannot be undone.`,
      onConfirm: () => deleteClient(sel)
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
        <span><b>{clients.length}</b><small>Persons</small></span>
      </div>
      <div className="dv-tile">
        <span className="dv-ti"><Icon name="fl" size={20} /></span>
        <span><b>{docs.length}</b><small>Documents</small></span>
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
    const list = docs.filter((d) => status(d).k === view).sort((a, b) => (a.expiry || "").localeCompare(b.expiry || ""));
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
    if (!curClient) {
      return (
        <div className="dv-docs">
          <div className="dv-empty-pro">
            <div className="dv-empty-icon-box">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3>{clients.length ? "Select a person above" : "No persons created yet"}</h3>
            <p>{clients.length ? "Click on any person chip from the top list to view, attach, and renew their documents." : "Create your first person to start storing driving licenses, property papers, insurance, and bank documents."}</p>
            {!clients.length && (
              <button className="dv-btn pri" onClick={openAddClient} style={{ marginTop: 14 }}>
                + Add First Person
              </button>
            )}
          </div>
        </div>
      );
    }

    const meta = [curClient.phone, curClient.email, curClient.addr].filter(Boolean).join("  •  ");
    const infoFields = cinfo(curClient);
    const v = curClient.fields || {};

    return (
      <div className="dv-client-view-container">
        {/* Modern Client Info Card */}
        <div className="dv-client-hero-card">
          {/* Top Row: Avatar + Name/Badges + Action Buttons */}
          <div className="dv-hero-top-row">
            <div className="dv-hero-profile-group">
              <div className="dv-client-hero-avatar">
                {ini(curClient.name)}
              </div>
              <div className="dv-client-main-heading">
                <div className="dv-client-title-row">
                  <h2 className="dv-client-name">{curClient.name}</h2>
                  <span className="dv-type-tag">
                    {curClient.ctype === "Plant" ? "Plant / Unit" : curClient.ctype || "Individual"}
                  </span>
                  <span className="dv-doc-count-badge">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block" }}></span>
                    {curDocs.length} Document{curDocs.length === 1 ? "" : "s"}
                  </span>
                </div>
                
                {/* Contact Items Line */}
                <div className="dv-client-contact-row">
                  {curClient.phone && (
                    <span className="dv-contact-item" title="Mobile Number">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {curClient.phone}
                    </span>
                  )}
                  {curClient.email && (
                    <span className="dv-contact-item" title="Email Address">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      {curClient.email}
                    </span>
                  )}
                  {curClient.addr && (
                    <span className="dv-contact-item" title="Address / Location">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      {curClient.addr}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="dv-hero-actions">
              <button className="dv-btn pri" onClick={openAddDoc}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Document
              </button>
              <button className="dv-btn" onClick={openEditClient}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                Edit Details
              </button>
              <button className="dv-btn dng" onClick={handleDeleteClient}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                Delete
              </button>
            </div>
          </div>

          {/* Bottom Row: Metadata Badges (GSTIN, PAN, Firm Type, etc.) */}
          {infoFields.length > 0 && (
            <div className="dv-custom-tags-wrap">
              {infoFields.map((x) => (
                <span className="dv-custom-tag" key={x.k}>
                  <span className="dv-tag-label">{x.l}:</span>
                  <strong className="dv-tag-val">{isoShort(v[x.k])}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Filter Chips if multiple document types */}
        {docTypes.length > 1 && (
          <div className="dv-category-bar">
            <span className="dv-category-title">Document Categories:</span>
            <div className="dv-chips">
              {["All", ...docTypes].map((t) => (
                <button key={t} className={`dv-chip${t === activeFilt ? " on" : ""}`}
                  onClick={() => dispatch({ type: "SET_FILT", filt: t })}>
                  {t} ({t === "All" ? curDocs.length : curDocs.filter((d) => d.type === t).length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents Table or Empty State */}
        <div className="dv-docs">
          {shownDocs.length > 0 ? (
            <>
              <DocTableHeader />
              {shownDocs.map((d, idx) => (
                <DocRow key={d.id} doc={d} index={idx} clients={clients}
                  onView={openPreview} onEdit={openEditDoc} onRenew={openRenew} onDelete={handleDeleteDoc} />
              ))}
            </>
          ) : (
            <div className="dv-empty-pro">
              <div className="dv-empty-icon-box">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <h3>No documents attached for this person</h3>
              <p>Add vehicle insurance, pollution certificates, GST papers, PAN card or licenses to track renewals automatically.</p>
              <button className="dv-btn pri" onClick={openAddDoc} style={{ marginTop: 14 }}>
                + Upload First Document
              </button>
            </div>
          )}
        </div>
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
            <h1>Document Vault</h1>
            <small>Legal, identity & vehicle document renewals repository</small>
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

            {/* Client Type Dropdown */}
            <div className="dv-select-wrap">
              <select
                className="dv-filter-select"
                value={ctf}
                onChange={(e) => dispatch({ type: "SET_CTF", ctf: e.target.value })}
              >
                <option value="All">All Entities / Types</option>
                {CLIENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Persons Dropdown */}
            <div className="dv-select-wrap">
              <select
                className="dv-filter-select"
                value={view === "client" && sel ? sel : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    dispatch({ type: "SET_VIEW", view: "client" });
                    dispatch({ type: "SET_SEL", id: val });
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
      <ClientDialog open={clientDlg} onClose={() => setClientDlg(false)} onSave={saveClient} client={editClient} />
      <DocDialog open={docDlg} onClose={() => setDocDlg(false)} onSave={saveDoc} doc={editDoc} clientId={sel} />
      <RenewDialog open={renewDlg} onClose={() => setRenewDlg(false)} onSave={saveDoc} doc={renewDoc} />
      <PreviewDialog open={previewDlg} onClose={() => setPreviewDlg(false)} doc={previewDoc} />
      <ConfirmDialog open={!!confirmDlg} onClose={() => setConfirmDlg(null)}
        title={confirmDlg?.title} message={confirmDlg?.message} onConfirm={confirmDlg?.onConfirm} />
    </div>
  );
}
