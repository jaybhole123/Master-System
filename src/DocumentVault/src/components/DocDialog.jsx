import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { TYPES, PERSONAL, COMPANY_DOC_TYPES, COMPANY_CHECKLIST_SECTIONS, MAX_FILE_SIZE } from "../utils/constants";

export default function DocDialog({ open, onClose, onSave, doc, clientId, defaultCategory = "Individual", hideCategoryToggle = false }) {
  const isFirmDefault = defaultCategory === "Firm" || defaultCategory === "Company" || defaultCategory === "Plant";
  const [docCategory, setDocCategory] = useState(isFirmDefault ? "Company" : "Personal");
  const [type, setType] = useState(isFirmDefault ? COMPANY_DOC_TYPES[0] : PERSONAL[0]);
  const [num, setNum] = useState("");
  const [issue, setIssue] = useState("");
  const [expiry, setExpiry] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({});

  useEffect(() => {
    if (open) {
      const isCompanyDoc = doc?.category === "Company" || COMPANY_DOC_TYPES.includes(doc?.type);
      const cat = doc?.category || (isCompanyDoc ? "Company" : (isFirmDefault ? "Company" : "Personal"));
      setDocCategory(cat);
      setType(doc?.type || (cat === "Company" ? COMPANY_DOC_TYPES[0] : PERSONAL[0]));
      setNum(doc?.num || "");
      setIssue(doc?.issue || "");
      setExpiry(doc?.expiry || "");
      setNote(doc?.note || "");
      setFile(null);
      setFields(doc?.fields || {});
    }
  }, [open, doc, isFirmDefault]);

  const typeConf = TYPES[type] || TYPES.Other;
  const handleFieldChange = (k, v) => setFields((prev) => ({ ...prev, [k]: v }));

  const handleTypeChange = (newType) => {
    // Preserve any overlapping keys
    const prev = { ...fields };
    setType(newType);
    setFields(prev);
  };

  const handleSave = () => {
    // Validate pattern fields
    for (const f of typeConf.f) {
      let v = (fields[f.k] || "").trim();
      if (f.up) v = v.toUpperCase();
      if (v && f.pat && !f.pat.test(v)) { alert(f.pm); return; }
    }
    const n = typeConf.pat ? num.trim().toUpperCase() : num.trim();
    if (typeConf.pat && n && !typeConf.pat.test(n)) { alert(typeConf.pm); return; }

    const chosenFile = file || doc?.file || null;
    if (file && file.size > MAX_FILE_SIZE) { alert("File is larger than 15 MB. Choose a smaller file."); return; }

    const finalIssue = typeConf.needIssue ? issue : "";
    const finalExpiry = typeConf.needExpiry ? expiry : "";

    if (finalIssue && finalExpiry && finalExpiry < finalIssue) { alert("Expiry date must be after the issue date."); return; }

    const cleanFields = {};
    for (const f of typeConf.f) {
      let v = (fields[f.k] || "").trim();
      if (f.up) v = v.toUpperCase();
      if (v) cleanFields[f.k] = v;
    }

    onSave({
      id: doc?.id || undefined,
      cid: doc?.cid || clientId,
      history: doc?.history || [],
      type, num: n,
      category: docCategory,
      issue: finalIssue,
      expiry: finalExpiry,
      note: note.trim(),
      file: chosenFile,
      fname: file ? file.name : (doc?.fname || ""),
      fields: cleanFields
    });
    onClose();
  };

  const shouldHideToggle = hideCategoryToggle || defaultCategory === "Personal" || defaultCategory === "Individual" || isFirmDefault;

  return (
    <Modal open={open} onClose={onClose} className="wide">
      <h3>{doc ? "Edit document" : "Add document"}</h3>

      {/* Scope / Category Toggle - only show if not dedicated to a specific vault module */}
      {!shouldHideToggle && (
        <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              setDocCategory("Personal");
              if (COMPANY_DOC_TYPES.includes(type)) setType(PERSONAL[0]);
            }}
            className={`dv-btn ${docCategory === "Personal" ? "pri" : ""}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Personal / Individual Doc
          </button>
          <button
            type="button"
            onClick={() => {
              setDocCategory("Company");
              if (PERSONAL.includes(type)) setType(COMPANY_DOC_TYPES[0]);
            }}
            className={`dv-btn ${docCategory === "Company" ? "pri" : ""}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Company / Firm Checklist Doc
          </button>
        </div>
      )}

      <label className="dv-label">Document type *</label>
      <select className="dv-select" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
        {docCategory === "Company" ? (
          COMPANY_CHECKLIST_SECTIONS.map((sec) => (
            <optgroup key={sec.code} label={`${sec.code}. ${sec.title}`}>
              {sec.items.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </optgroup>
          ))
        ) : (
          PERSONAL.map((t) => <option key={t} value={t}>{t}</option>)
        )}
        {doc && typeof doc.type === "string" && !PERSONAL.includes(doc.type) && !COMPANY_DOC_TYPES.includes(doc.type) && (
          <option value={doc.type}>{doc.type}</option>
        )}
      </select>

      <label className="dv-label">{typeConf.n}</label>
      <input className="dv-input" value={num} onChange={(e) => setNum(typeConf.pat ? e.target.value.toUpperCase() : e.target.value)} style={typeConf.pat ? { textTransform: "uppercase" } : undefined} />

      {(typeConf.needIssue || typeConf.needExpiry) && (
        <div className={typeConf.needIssue && typeConf.needExpiry ? "dv-two" : ""}>
          {typeConf.needIssue && (
            <div>
              <label className="dv-label">Issue date</label>
              <input className="dv-input" type="date" value={issue} onChange={(e) => setIssue(e.target.value)} />
            </div>
          )}
          {typeConf.needExpiry && (
            <div>
              <label className="dv-label">Expiry date</label>
              <input className="dv-input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          )}
        </div>
      )}

      {typeConf.f.length > 0 && (
        <>
          <div className="dv-dsec">{type} details</div>
          <div className="dv-dyn">
            {typeConf.f.map((f) => (
              <div key={f.k} className={f.t === "textarea" ? "full" : ""}>
                <label className="dv-label">{f.l}</label>
                {f.t === "select" ? (
                  <select className="dv-select" value={fields[f.k] || ""} onChange={(e) => handleFieldChange(f.k, e.target.value)}>
                    <option value="">Select</option>
                    {f.opts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : f.t === "textarea" ? (
                  <textarea className="dv-textarea" rows={2} value={fields[f.k] || ""} onChange={(e) => handleFieldChange(f.k, e.target.value)} />
                ) : (
                  <input className="dv-input" type={f.t} value={fields[f.k] || ""} onChange={(e) => handleFieldChange(f.k, f.up ? e.target.value.toUpperCase() : e.target.value)} style={f.up ? { textTransform: "uppercase" } : undefined} />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <label className="dv-label">File (PDF, image, Excel, Word)</label>
      <input className="dv-input" type="file" accept=".pdf,image/*,.xls,.xlsx,.csv,.doc,.docx" onChange={(e) => setFile(e.target.files[0] || null)} />
      <div className="dv-hint">
        {doc?.file ? `Current file: ${doc.fname}. Choose a new file only to replace it.` : "Up to 15 MB per file."}
      </div>

      <label className="dv-label">Remarks</label>
      <textarea className="dv-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

      <div className="dv-fa">
        <button className="dv-btn" onClick={onClose}>Cancel</button>
        <button className="dv-btn pri" onClick={handleSave}>Save document</button>
      </div>
    </Modal>
  );
}
