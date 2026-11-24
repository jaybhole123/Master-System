import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

const DropdownField = ({ value, onChange, isDate, type, options, disabled, isAddMode, colName }) => {
  const [isInput, setIsInput] = useState(false);

  if (isDate) {
    return (
      <div className="coal-field-wrapper">
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="coal-modal-input"
          style={{ backgroundColor: disabled ? "#f8fafc" : "#ffffff" }}
          disabled={disabled}
        />
      </div>
    );
  }

  if (type !== "select") {
    return (
      <div className="coal-field-wrapper">
        <input
          type={type || "text"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="coal-modal-input"
          style={{ backgroundColor: disabled ? "#f8fafc" : "#ffffff" }}
          placeholder={`Enter ${colName || "value"}...`}
          disabled={disabled}
        />
      </div>
    );
  }

  if (isInput) {
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="coal-modal-input"
          style={{ flex: 1, backgroundColor: disabled ? "#f8fafc" : "#ffffff" }}
          autoFocus
          placeholder="Enter custom value..."
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setIsInput(false)}
          className="coal-select-btn"
          title="Select from dropdown list"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
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
        className="coal-modal-select"
        style={{ flex: 1, backgroundColor: disabled ? "#f8fafc" : "#ffffff" }}
        disabled={disabled}
      >
        <option value="" disabled>Select {colName || "option"}...</option>
        {options && options.map((opt, i) => {
          if (typeof opt === 'object' && opt !== null) {
            return <option key={i} value={opt.value}>{opt.label}</option>;
          }
          return <option key={i} value={opt}>{opt}</option>;
        })}
        {value && (!options || !options.some(o => typeof o === 'object' ? o.value === value : o === value)) && <option value={value}>{value}</option>}
        <option value="__ADD_NEW__" style={{ fontWeight: "700", color: "#dc2626" }}>+ Add New Entry</option>
      </select>
      
      {value && (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => onChange("")}
            className="coal-icon-action-btn delete-btn"
            title="Clear selection"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <button
            type="button"
            onClick={() => setIsInput(true)}
            className="coal-icon-action-btn edit-btn"
            title="Edit value as text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default function EditModal({ isOpen, onClose, onSave, onFieldChange, title = "Edit Record", columns, initialData, showPdfUpload = true, tableName, customContent, maxWidth }) {
  const [formData, setFormData] = useState({});
  const [optionsMap, setOptionsMap] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (isOpen) {
      setFormData({});
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
    setFormData((prev) => {
      const newData = { ...prev, [key]: value };
      if (onFieldChange) {
        return onFieldChange(key, value, newData) || newData;
      }
      return newData;
    });
  };

  const formatDateForInput = (val) => {
    if (!val) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
    }
    return val;
  };

  const handleSave = () => {
    onSave(formData);
  };

  const isEditMode = initialData && Object.keys(initialData).length > 0;

  return (
    <div className="coal-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="coal-modal-container" style={{ maxWidth: maxWidth || "860px" }}>
        
        {/* Modal Header */}
        <div className="coal-modal-header">
          <div className="coal-modal-header-left">
            <div className="coal-modal-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <div>
              <div className="coal-modal-tag">
                {isEditMode ? "RECORD UPDATE" : "COAL SYSTEM ENTRY"}
              </div>
              <h2 className="coal-modal-heading">{title}</h2>
            </div>
          </div>
          <button className="coal-modal-close-btn" onClick={onClose} title="Close form">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="coal-modal-body custom-scroll">
          <div className="coal-modal-grid">
            {columns.map((col) => {
              const fieldKey = col.key || col.label;
              const isDate = /date|valid_from|valid_to/i.test(fieldKey) || col.type === 'date';
              const val = formData[fieldKey] || "";
              const displayVal = isDate && val ? formatDateForInput(val) : val;

              return (
                <div key={fieldKey} className="coal-form-group">
                  <label className="coal-form-label">
                    <span>{col.label}</span>
                    {col.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <DropdownField
                    isDate={isDate}
                    type={col.type}
                    value={displayVal}
                    onChange={(newVal) => handleChange(fieldKey, newVal)}
                    options={col.options || optionsMap[fieldKey] || []}
                    disabled={col.disabled}
                    isAddMode={!isEditMode}
                    colName={col.label}
                  />
                </div>
              );
            })}
            
            {customContent && (
              <div style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
                {customContent}
              </div>
            )}

            {showPdfUpload && (
              <div className="coal-upload-box" style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                <div className="coal-upload-header">
                  <div className="coal-upload-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="coal-upload-title">ATTACH DOCUMENT / OFFICIAL NOTICE (OPTIONAL)</label>
                    <p className="coal-upload-subtitle">Upload official invoice, DO, notice or receipt in PDF or Image format</p>
                  </div>
                </div>

                <div className="coal-file-input-wrapper">
                  <input
                    type="file"
                    id="coal-file-upload-input"
                    accept=".pdf,application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleChange("pdfFile", file);
                      }
                    }}
                    style={{ display: "none" }}
                  />
                  <label htmlFor="coal-file-upload-input" className="coal-file-browse-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Choose Document
                  </label>
                  <span className="coal-file-selected-text">
                    {formData.pdfFile ? formData.pdfFile.name : (formData.pdfName || "No file chosen yet")}
                  </span>
                </div>

                {(formData.pdfUrl || formData.pdfFile) && (
                  <div className="coal-file-preview-card">
                    {(() => {
                      const fileUrl = formData.pdfFile ? URL.createObjectURL(formData.pdfFile) : formData.pdfUrl;
                      const fileName = formData.pdfFile ? formData.pdfFile.name : (formData.pdfName || "Attached Document");
                      const isImg = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(fileName || fileUrl);

                      return (
                        <>
                          <div className="coal-preview-pill">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            <span>Attached: {isImg ? "Image File" : "PDF Document"}</span>
                          </div>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="coal-preview-action-btn"
                          >
                            Preview File ↗
                          </a>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="coal-modal-footer">
          <button type="button" className="coal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="coal-btn-save" onClick={handleSave}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            {isEditMode ? "Save Changes" : "Save Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
