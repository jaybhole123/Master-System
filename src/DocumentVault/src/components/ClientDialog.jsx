import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { CLIENT_TYPES, CLIENT_TYPE_OPTIONS } from "../utils/constants";

export default function ClientDialog({ open, onClose, onSave, client }) {
  const [ctype, setCtype] = useState("Individual");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addr, setAddr] = useState("");
  const [fields, setFields] = useState({});

  useEffect(() => {
    if (open) {
      setCtype(client?.ctype || "Individual");
      setName(client?.name || "");
      setPhone(client?.phone || "");
      setEmail(client?.email || "");
      setAddr(client?.addr || "");
      setFields(client?.fields || {});
    }
  }, [open, client]);

  const ct = CLIENT_TYPES[ctype] || CLIENT_TYPES.Individual;

  const handleFieldChange = (k, v) => setFields((prev) => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!name.trim()) return;
    // Validate pattern fields
    for (const f of ct.f) {
      let v = (fields[f.k] || "").trim();
      if (f.up) v = v.toUpperCase();
      if (v && f.pat && !f.pat.test(v)) { alert(f.pm); return; }
    }
    const cleanFields = {};
    for (const f of ct.f) {
      let v = (fields[f.k] || "").trim();
      if (f.up) v = v.toUpperCase();
      if (v) cleanFields[f.k] = v;
    }
    onSave({
      id: client?.id || undefined,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      addr: addr.trim(),
      ctype,
      fields: cleanFields
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} className="wide">
      <h3>{client ? "Edit Person" : "Add Person"}</h3>
      <label className="dv-label">Person / Entity Type</label>
      <select className="dv-select" value={ctype} onChange={(e) => { setCtype(e.target.value); setFields({}); }}>
        {CLIENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <label className="dv-label">{ct.nl} *</label>
      <input className="dv-input" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="dv-two">
        <div>
          <label className="dv-label">Phone</label>
          <input className="dv-input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        <div>
          <label className="dv-label">Email</label>
          <input className="dv-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <label className="dv-label">Notes</label>
      <textarea className="dv-textarea" rows={3} value={addr} onChange={(e) => setAddr(e.target.value)} />
      {ct.f.length > 0 && (
        <>
          <div className="dv-dsec">{ctype === "Plant" ? "Plant / unit" : ctype} details</div>
          <div className="dv-dyn">
            {ct.f.map((f) => (
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
      <div className="dv-fa">
        <button className="dv-btn" onClick={onClose}>Cancel</button>
        <button className="dv-btn pri" onClick={handleSave}>Save client</button>
      </div>
    </Modal>
  );
}
