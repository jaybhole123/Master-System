import React, { useState, useEffect } from "react";
import EditModal from "../components/EditModal";
import { downloadBlob } from "../utils/pdfParser";
import { supabase } from "../utils/supabase";

const INITIAL_COLS = [
  { key: "doNo", label: "DO No *" },
  { key: "truckNumber", label: "Truck No *", type: "text" },
  { key: "truckQty", label: "Truck No Qty *", type: "text" },
  { key: "freight", label: "Freight *", type: "text" },
  { key: "receiverParty", label: "Receiver Party *", type: "text" },
  { key: "plantName", label: "Plant Name *", type: "text" },
  { key: "minesName", label: "Mines Name *", type: "text" }
];

export default function DispatchPage() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState(INITIAL_COLS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    async function fetchDoNumbers() {
      try {
        const { data: soData, error } = await supabase
          .from("sales_orders")
          .select("sales_order_number");
        
        if (!error && soData) {
          const uniqueOptions = [...new Set(soData.map(s => s.sales_order_number).filter(Boolean))];
          setColumns(prev => prev.map(c => 
            c.key === "doNo" ? { ...c, options: uniqueOptions } : c
          ));
        }
      } catch (err) {
        console.error("Error fetching SO numbers:", err);
      }
    }
    fetchDoNumbers();
  }, []);

  const fetchDispatchData = async () => {
    try {
      const { data: records, error } = await supabase
        .from("dispatch_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (records) {
        const mappedData = records.map(r => ({
          id: r.id,
          doNo: r.do_no,
          truckNumber: r.truck_no,
          truckQty: r.truck_qty,
          freight: r.freight,
          receiverParty: r.receiver_party,
          plantName: r.plant_name,
          minesName: r.mines_name,
          pdfUrl: r.pdf_url,
          pdfName: r.pdf_name
        }));
        setData(mappedData);
      }
    } catch (err) {
      console.error("Error fetching dispatch records:", err);
    }
  };

  useEffect(() => {
    fetchDispatchData();
  }, []);

  const handleManualAdd = async (formData) => {
    try {
      let pdfUrl = formData.pdfUrl || null;
      let pdfName = formData.pdfName || null;

      // Basic PDF Upload logic if provided
      if (formData.pdfFile) {
        const fileExt = formData.pdfFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Ensure bucket exists in your Supabase setup, e.g. "documents"
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(`dispatch/${fileName}`, formData.pdfFile);
        
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(`dispatch/${fileName}`);
          pdfUrl = publicUrlData.publicUrl;
          pdfName = formData.pdfFile.name;
        } else {
          console.error("PDF upload failed:", uploadError);
        }
      }

      const payload = {
        do_no: formData.doNo || null,
        truck_no: formData.truckNumber || null,
        truck_qty: formData.truckQty ? parseFloat(formData.truckQty) : null,
        freight: formData.freight ? parseFloat(formData.freight) : null,
        receiver_party: formData.receiverParty || null,
        plant_name: formData.plantName || null,
        mines_name: formData.minesName || null,
        pdf_url: pdfUrl,
        pdf_name: pdfName
      };

      if (editingIndex !== null && data[editingIndex]?.id) {
        // Update existing record
        const recordId = data[editingIndex].id;
        const { error } = await supabase
          .from("dispatch_records")
          .update(payload)
          .eq("id", recordId);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("dispatch_records")
          .insert([payload]);
          
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingIndex(null);
      fetchDispatchData();
    } catch (err) {
      console.error("Error saving dispatch record:", err);
      alert("Failed to save record.");
    }
  };

  const handleEditClick = (index) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleDelete = async (index) => {
    if (window.confirm("Are you sure you want to delete this row?")) {
      try {
        const recordId = data[index].id;
        if (!recordId) {
          const newData = [...data];
          newData.splice(index, 1);
          setData(newData);
          return;
        }

        const { error } = await supabase
          .from("dispatch_records")
          .delete()
          .eq("id", recordId);
          
        if (error) throw error;
        
        fetchDispatchData();
      } catch (err) {
        console.error("Error deleting record:", err);
        alert("Failed to delete record.");
      }
    }
  };

  const handleExportCsv = () => {
    if (data.length === 0) return;
    const header = columns.map(c => c.label).join(",") + "\n";
    const rows = data.map(row => 
      columns.map(col => `"${(row[col.key] || "").replace(/"/g, '""')}"`).join(",")
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
                {columns.map(c => <th key={c.key}>{c.label.replace(" *", "")}</th>)}
                <th>PDF</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 3} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No dispatch records found. Click "+ Add Form" to create one.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i}>
                    <td className="row-num" data-label="#">{i + 1}</td>
                    {columns.map(c => (
                      <td key={c.key} data-label={c.label.replace(" *", "")}>{row[c.key] || "-"}</td>
                    ))}
                    <td data-label="PDF">
                      {row.pdfUrl ? (
                        <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                          View PDF
                        </a>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>-</span>
                      )}
                    </td>
                    <td data-label="Action">
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button className="btn outline" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => handleEditClick(i)}>Edit</button>
                        <button className="btn ghost" style={{ padding: "4px 8px", fontSize: "11px", color: "#dc2626" }} onClick={() => handleDelete(i)}>Delete</button>
                      </div>
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
        columns={columns}
      />
    </div>
  );
}
