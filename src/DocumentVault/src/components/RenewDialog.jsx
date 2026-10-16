import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { MAX_FILE_SIZE } from "../utils/constants";
import { status, today } from "../utils/helpers";

export default function RenewDialog({ open, onClose, onSave, doc }) {
  const [num, setNum] = useState("");
  const [issue, setIssue] = useState(today());
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (open && doc) {
      setNum(doc.num || "");
      setIssue(today());
      setExpiry("");
      setFile(null);
    }
  }, [open, doc]);

  const handleSave = () => {
    if (!issue || !expiry) { alert("Please fill both issue and expiry dates."); return; }
    if (expiry <= issue) { alert("Expiry date must be after the issue date."); return; }
    if (file && file.size > MAX_FILE_SIZE) { alert("File is larger than 15 MB. Choose a smaller file."); return; }

    const renewed = {
      ...doc,
      history: [...(doc.history || []), {
        num: doc.num, issue: doc.issue, expiry: doc.expiry,
        fname: doc.fname, file: doc.file, fields: doc.fields, on: today()
      }],
      num: num.trim(),
      issue, expiry,
      file: file || doc.file,
      fname: file ? file.name : doc.fname
    };
    onSave(renewed);
    onClose();
  };

  const s = doc ? status(doc) : { t: "" };

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Renew document</h3>
      <p className="dv-hint">{doc?.type}{doc?.num ? " · " + doc.num : ""} — currently: {s.t}</p>
      <label className="dv-label">Document number</label>
      <input className="dv-input" value={num} onChange={(e) => setNum(e.target.value)} />
      <div className="dv-two">
        <div>
          <label className="dv-label">New issue date *</label>
          <input className="dv-input" type="date" value={issue} onChange={(e) => setIssue(e.target.value)} required />
        </div>
        <div>
          <label className="dv-label">New expiry date *</label>
          <input className="dv-input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} required />
        </div>
      </div>
      <label className="dv-label">New file (optional)</label>
      <input className="dv-input" type="file" accept=".pdf,image/*,.xls,.xlsx,.csv,.doc,.docx" onChange={(e) => setFile(e.target.files[0] || null)} />
      <div className="dv-hint">The previous number, dates and file are kept in the renewal history.</div>
      <div className="dv-fa">
        <button className="dv-btn" onClick={onClose}>Cancel</button>
        <button className="dv-btn pri" onClick={handleSave}>Confirm renewal</button>
      </div>
    </Modal>
  );
}
