import { useState, useEffect } from "react";

const DropdownField = ({ value, onChange, isDate, styles, options }) => {
  const [isInput, setIsInput] = useState(false);

  if (isDate) {
    return (
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    );
  }

  if (isInput) {
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...styles.input, flex: 1 }}
          autoFocus
          placeholder="Enter custom value..."
        />
        <button
          type="button"
          onClick={() => setIsInput(false)}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "4px",
            padding: "0 12px",
            cursor: "pointer",
            color: "var(--text)",
            fontWeight: "bold"
          }}
          title="Select from list"
        >
          ▼
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <select
        value={value || ""}
        onChange={(e) => {
          if (e.target.value === "__ADD_NEW__") {
            setIsInput(true);
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
        style={{ ...styles.input, flex: 1 }}
      >
        <option value="" disabled>Select option...</option>
        {options && options.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
        {value && (!options || !options.includes(value)) && <option value={value}>{value}</option>}
        <option value="__ADD_NEW__" style={{ fontWeight: "bold", color: "#2563eb" }}>+ Add New</option>
      </select>
      
      {value && (
        <button
          type="button"
          onClick={() => setIsInput(true)}
          style={{
            background: "none",
            border: "1px solid var(--line)",
            borderRadius: "4px",
            padding: "8px 10px",
            cursor: "pointer",
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--panel)"
          }}
          title="Edit selected value"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
      )}
    </div>
  );
};

import { supabase } from "../utils/supabase";

export default function EditModal({ isOpen, onClose, onSave, title = "Edit Record", columns, initialData, showPdfUpload = true, tableName }) {
  const [formData, setFormData] = useState({});
  const [optionsMap, setOptionsMap] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    async function fetchOptions() {
      if (!isOpen || !tableName || !columns || columns.length === 0) return;
      
      const selectColumns = columns
        .filter(c => !/date|valid_from|valid_to/i.test(c.key || c.label) && c.type !== 'date')
        .map(c => c.dbKey || c.key || c.label)
        .join(',');
        
      if (!selectColumns) return;

      try {
        const { data, error } = await supabase.from(tableName).select(selectColumns);
        if (error) throw error;
        
        if (data && data.length > 0) {
          const newOptionsMap = {};
          columns.forEach(col => {
            const fieldKey = col.key || col.label;
            const dbFieldKey = col.dbKey || fieldKey;
            // Get unique, non-null/empty values
            const uniqueVals = [...new Set(data.map(item => item[dbFieldKey]).filter(val => val !== null && val !== "" && val !== undefined))];
            newOptionsMap[fieldKey] = uniqueVals;
          });
          setOptionsMap(newOptionsMap);
        }
      } catch (err) {
        console.error("Failed to fetch options for dropdowns:", err);
      }
    }
    
    fetchOptions();
  }, [isOpen, tableName, columns]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const formatDateForInput = (val) => {
    if (!val) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      // Offset timezone to avoid date shifting
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
    }
    return val;
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-content" style={styles.content}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        
        <div style={styles.body}>
          <div style={styles.grid}>
            {columns.map((col) => {
              const fieldKey = col.key || col.label;
              const isDate = /date|valid_from|valid_to/i.test(fieldKey) || col.type === 'date';
              const val = formData[fieldKey] || "";
              const displayVal = isDate && val ? formatDateForInput(val) : val;

              return (
                <div key={fieldKey} style={styles.formGroup}>
                  <label style={styles.label}>{col.label}</label>
                  <DropdownField
                    isDate={isDate}
                    value={displayVal}
                    onChange={(newVal) => handleChange(fieldKey, newVal)}
                    styles={styles}
                    options={optionsMap[fieldKey] || []}
                  />
                </div>
              );
            })}
            {showPdfUpload && (
              <div style={{ ...styles.formGroup, gridColumn: "1 / -1", marginTop: "10px" }}>
                <label style={styles.label}>ATTACH PDF (OPTIONAL)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleChange("pdfFile", file);
                    }
                  }}
                  style={{ ...styles.input, padding: "8px", background: "var(--bg)" }}
                />
                {formData.pdfUrl && !formData.pdfFile && (
                  <div style={{ fontSize: "12px", color: "var(--primary)", marginTop: "4px" }}>
                    A PDF is already attached. Upload a new one to replace it.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <button className="btn ghost" onClick={onClose} style={{ marginRight: 8 }}>Cancel</button>
          <button className="btn" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 20, 40, 0.5)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000, backdropFilter: "blur(3px)"
  },
  content: {
    backgroundColor: "var(--bg)",
    borderRadius: "8px", width: "90%", maxWidth: "800px",
    maxHeight: "90vh", display: "flex", flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
    border: "1px solid var(--line)"
  },
  header: {
    padding: "20px 24px", borderBottom: "1px solid var(--line)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "var(--panel)",
    borderTopLeftRadius: "8px", borderTopRightRadius: "8px"
  },
  title: { 
    margin: 0, fontSize: "16px", color: "var(--ember-bright)", 
    fontFamily: "var(--font-display)", textTransform: "uppercase",
    letterSpacing: "0.05em", fontWeight: "700"
  },
  closeBtn: {
    background: "none", border: "none", fontSize: "24px", cursor: "pointer",
    color: "var(--muted)", padding: 0, lineHeight: 1, transition: "color 0.2s"
  },
  body: {
    padding: "24px", overflowY: "auto", flex: 1,
    background: "var(--bg)"
  },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px"
  },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { 
    fontSize: "12px", fontWeight: "600", color: "var(--muted)",
    textTransform: "uppercase", letterSpacing: "0.04em",
    fontFamily: "var(--font-body)"
  },
  input: {
    padding: "12px 14px", borderRadius: "6px", border: "1px solid var(--line)",
    fontSize: "14px", color: "var(--text)", outline: "none", background: "var(--panel)",
    fontFamily: "var(--font-body)",
    transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
  footer: {
    padding: "16px 24px", borderTop: "1px solid var(--line)",
    display: "flex", justifyContent: "flex-end", backgroundColor: "var(--panel)",
    borderBottomLeftRadius: "8px", borderBottomRightRadius: "8px"
  }
};
