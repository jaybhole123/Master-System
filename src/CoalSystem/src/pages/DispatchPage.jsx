import React, { useState, useEffect } from "react";
import EditModal from "../components/EditModal";
import { downloadBlob } from "../utils/pdfParser";

const DISPATCH_COLS = [
  { key: "customerName", label: "Customer Name *" },
  { key: "dispatchId", label: "Dispatch ID *" },
  { key: "truckNumber", label: "Truck Number *" },
  { key: "driverName", label: "Driver Name *" },
  { key: "driverMobile", label: "Driver Mobile *" },
  { key: "transporter", label: "Transporter *" },
  { key: "loadingDate", label: "Loading Date *" },
  { key: "loadingTime", label: "Loading Time *" },
  { key: "mineWeight", label: "Mine Weight (MT) *" },
  { key: "royaltyNumber", label: "Royalty Number *" },
  { key: "destinationParty", label: "Destination Party *" },
  { key: "destination", label: "Destination *" },
  { key: "freightRate", label: "Freight Rate (₹/MT) *" },
  { key: "advancePaid", label: "Advance Paid (₹) *" },
  { key: "remarks", label: "Remarks" }
];

export default function DispatchPage() {
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dispatch_data");
      if (saved) {
        let parsed = JSON.parse(saved);
        const cleanBlobs = (obj) => {
          if (Array.isArray(obj)) return obj.map(cleanBlobs);
          if (obj !== null && typeof obj === 'object') {
            const newObj = {};
            for (let k in obj) {
              if (k === 'pdfUrl' && typeof obj[k] === 'string' && obj[k].startsWith('blob:')) {
                newObj[k] = null;
              } else {
                newObj[k] = cleanBlobs(obj[k]);
              }
            }
            return newObj;
          }
          return obj;
        };
        parsed = cleanBlobs(parsed);
        setData(parsed);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveToStorage = (newData) => {
    localStorage.setItem("dispatch_data", JSON.stringify(newData));
  };

  const handleManualAdd = (formData) => {
    let newData;
    
    const formattedItem = {
      ...formData,
      pdfUrl: formData.pdfFile ? URL.createObjectURL(formData.pdfFile) : null,
      pdfName: formData.pdfFile ? formData.pdfFile.name : null,
    };
    
    // Remove the File object before saving so it doesn't break JSON.stringify
    delete formattedItem.pdfFile;

    if (editingIndex !== null) {
      newData = [...data];
      // preserve existing pdfUrl if not updated
      if (!formattedItem.pdfUrl && newData[editingIndex].pdfUrl) {
         formattedItem.pdfUrl = newData[editingIndex].pdfUrl;
         formattedItem.pdfName = newData[editingIndex].pdfName;
      }
      newData[editingIndex] = formattedItem;
    } else {
      newData = [...data, formattedItem];
    }
    
    setData(newData);
    saveToStorage(newData);
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleEditClick = (index) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this row?")) {
      const newData = [...data];
      newData.splice(index, 1);
      setData(newData);
      saveToStorage(newData);
    }
  };

  const handleExportCsv = () => {
    if (data.length === 0) return;
    const header = DISPATCH_COLS.map(c => c.label).join(",") + "\n";
    const rows = data.map(row => 
      DISPATCH_COLS.map(col => `"${(row[col.key] || "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    downloadBlob(header + rows, "dispatch_data.csv", "text/csv");
  };

  const handleExportJson = () => {
    if (data.length === 0) return;
    downloadBlob(JSON.stringify(data, null, 2), "dispatch_data.json", "application/json");
  };

  return (
    <div className="page-content">
      <div style={{ padding: "0 0 20px 0", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24 }}>Dispatch Tracking</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn" onClick={() => { setEditingIndex(null); setIsModalOpen(true); }}>
              + Add Form
            </button>
          </div>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-table-wrap">
          <table className="stable" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>#</th>
                {DISPATCH_COLS.map(c => <th key={c.key}>{c.label.replace(" *", "")}</th>)}
                <th>PDF</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={DISPATCH_COLS.length + 3} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No dispatch records found. Click "+ Add Form" to create one.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i}>
                    <td className="row-num">{i + 1}</td>
                    {DISPATCH_COLS.map(c => (
                      <td key={c.key}>{row[c.key] || "-"}</td>
                    ))}
                    <td>
                      {row.pdfUrl ? (
                        <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                          View PDF
                        </a>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>-</span>
                      )}
                    </td>
                    <td style={{ display: "flex", gap: "6px" }}>
                      <button className="btn outline" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => handleEditClick(i)}>Edit</button>
                      <button className="btn ghost" style={{ padding: "4px 8px", fontSize: "11px", color: "#dc2626" }} onClick={() => handleDelete(i)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingIndex(null); }}
        onSave={handleManualAdd}
        title={editingIndex !== null ? "Edit Dispatch Record" : "Add Dispatch Record"}
        initialData={editingIndex !== null ? data[editingIndex] : {}}
        columns={DISPATCH_COLS}
      />
    </div>
  );
}
