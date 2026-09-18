import { useState, useRef } from "react";
import { InfoCard, MaterialCard } from "./Cards";
import PricingTable from "./PricingTable";
import { INR, display } from "../utils/format";
import EditModal from "./EditModal";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";

/**
 * Full results view — shown after a PDF is successfully parsed.
 *
 * Props:
 *   data        — parsed payment advice object
 *   fileName    — original filename string
 *   onReset     — callback to go back to dropzone
 *   onExportJson / onExportCsv — export callbacks
 */
export default function Results({ data, fileName, onReset, onAddFiles, onExportJson, onExportCsv,
  onExportExcel,
  onSave,
  onDeleteRow,
  onUpdateRow,
  onAddManual
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const fileInputRef = useRef(null);
  
  const dataArray = Array.isArray(data) ? data : [data];
  const firstData = dataArray[0];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length > 0 && onAddFiles) onAddFiles(files);
    e.target.value = "";
  };

  const handleEditClick = (index) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (updatedData) => {
    onUpdateRow && onUpdateRow(editingIndex, updatedData);
    setEditingIndex(null);
  };

  const buildSummaryRow = (d) => ({
    customerCode: display(d.receiver?.customerCode),
    customerName: display(d.receiver?.customerName),
    gstin: display(d.receiver?.gstin),
    areaOffice: display(d.areaOffice),
    salesDocNo: display(d.contract?.salesDocNo),
    validToDate: display(d.contract?.validToDate),
    salesOrderDate: display(d.contract?.salesOrderDate),
    grade: display(d.colliery?.grade),
    paymentDueDate: display(d.contract?.paymentDueDate),
    gcv: display(d.colliery?.gcv),
    auctionDateRef: display(d.contract?.auctionDateRef),
    area: display(d.colliery?.area),
    materialCode: display(d.material?.materialCode),
    description: display(d.material?.description),
    quantity: d.material ? `${d.material.quantity ?? "—"} ${d.material.unit ?? ""}`.trim() : "—",
    requisitePayment: d.totals?.requisitePayment !== null && d.totals?.requisitePayment !== undefined ? `₹ ${INR(d.totals.requisitePayment)}` : "—",
    pdfUrl: d.pdfUrl,
  });

  const columnsForExport = [
    { key: "customerCode", label: "Cust. Code" },
    { key: "customerName", label: "Cust. Name" },
    { key: "gstin", label: "GSTIN" },
    { key: "areaOffice", label: "Area Office" },
    { key: "salesDocNo", label: "Sales Doc" },
    { key: "validToDate", label: "Valid To" },
    { key: "salesOrderDate", label: "SO Date" },
    { key: "grade", label: "Grade" },
    { key: "paymentDueDate", label: "Due Date" },
    { key: "gcv", label: "GCV" },
    { key: "auctionDateRef", label: "Auction Date" },
    { key: "area", label: "Area" },
    { key: "materialCode", label: "Mat. Code" },
    { key: "description", label: "Description" },
    { key: "quantity", label: "Qty" },
    { key: "requisitePayment", label: "Req. Payment" }
  ];

  const handleExportExcel = () => {
    const formatted = dataArray.map(d => {
      const row = buildSummaryRow(d);
      // clean formatting characters like currency symbols
      row.requisitePayment = row.requisitePayment.replace(/[₹\s,]/g, "");
      return row;
    });
    exportToExcel(formatted, columnsForExport, fileName || "payment_advices");
  };

  const handleExportPdf = () => {
    const formatted = dataArray.map(d => {
      const row = buildSummaryRow(d);
      row.requisitePayment = row.requisitePayment.replace(/[₹\s,]/g, "");
      return row;
    });
    exportToPDF(formatted, columnsForExport, fileName || "payment_advices", "Payment Advice Summary");
  };

  return (
    <section id="results">
      {/* ── Action bar ── */}
      <div className="results-bar">
        <div>
          <div className="results-file" id="resFileName">{fileName}</div>
          <div className="results-hint">Extraction complete</div>
        </div>
        <div className="results-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>

          <button 
            className="btn ghost" 
            onClick={handleExportExcel} 
            style={{ 
              borderColor: "#107c41", 
              color: "#107c41", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px",
              background: "rgba(16, 124, 65, 0.04)"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="8" y1="13" x2="16" y2="13"></line>
              <line x1="8" y1="17" x2="16" y2="17"></line>
            </svg>
            EXCEL
          </button>
          <button 
            className="btn ghost" 
            onClick={handleExportPdf}
            style={{ 
              borderColor: "#d6251b", 
              color: "#d6251b", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px",
              background: "rgba(214, 37, 27, 0.04)"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M9 15h1a2 2 0 0 0 0-4H9v4Z"></path>
            </svg>
            PDF
          </button>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept=".pdf" />
          <button className="btn outline" onClick={onAddManual}>
            + ADD FORM
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            ADD PDF
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          FULL DATA CARDS (Per PDF) — hidden per user request
      ════════════════════════════════════════════ */}
      <div className="results-content" style={{ display: "none" }}>
        {dataArray.map((d, index) => (
          <div key={index} style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--text)" }}>
              File {index + 1} Extracted Data
            </h3>
            <div className="grid">
              <InfoCard
                title="Receiver Details"
                fields={[
                  ["Customer Code", d.receiver?.customerCode],
                  ["Customer Name", d.receiver?.customerName],
                  ["GSTIN", d.receiver?.gstin],
                  ["Area Office", d.areaOffice],
                ]}
              />
              <InfoCard
                title="Consignee Details"
                fields={[
                  ["Customer Code", d.consignee?.customerCode],
                  ["Customer Name", d.consignee?.customerName],
                  ["GSTIN", d.consignee?.gstin],
                ]}
              />
              <InfoCard
                title="Contract & Order Details"
                fields={[
                  ["Contract Number", d.contract?.contractNumber],
                  ["Sales Doc No", d.contract?.salesDocNo],
                  ["Sales Order Date", d.contract?.salesOrderDate],
                  ["PI Number", d.contract?.piNumber],
                  ["PI Date", d.contract?.piDate],
                  ["Payment Due Date", d.contract?.paymentDueDate],
                  ["Scheme", d.contract?.schemeName],
                  ["Bid ID", d.contract?.bidId],
                  ["Auction Date & Ref", d.contract?.auctionDateRef],
                  ["Contract Sign Date", d.contract?.contractSignDate],
                  ["Valid To", d.contract?.validToDate],
                  ["Type of Consumer", d.contract?.typeOfConsumer],
                  ["Mode of Transport", d.contract?.modeOfTransport],
                ]}
              />
              <InfoCard
                title="Colliery & Grade"
                fields={[
                  ["Area", d.colliery?.area],
                  ["Colliery", d.colliery?.colliery],
                  ["Grade", d.colliery?.grade],
                  ["Size", d.colliery?.size],
                  ["STC Distance", d.colliery?.stcDistance],
                  ["GCV", d.colliery?.gcv],
                ]}
              />
              <MaterialCard material={d.material} />
              {d.particulars && d.particulars.length > 0 && <PricingTable particulars={d.particulars} />}
              {/* Payment Totals hidden per user request */}
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          SUMMARY DATA TABLE
      ════════════════════════════════════════════ */}
      <div className="summary-section">
        <div className="summary-header">
          <div className="summary-title">Document Summary Table</div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--muted)",
              letterSpacing: "0.04em",
            }}
          >
            All key fields — 1 row per PDF
          </span>
        </div>

        <div className="summary-table-wrap">
          <table className="stable" id="summaryTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Code</th>
                <th>Customer Name</th>
                <th>GSTIN</th>
                <th>Area Office</th>
                <th>Sales Doc No</th>
                <th>Valid to Date</th>
                <th>Sales Order Date</th>
                <th>Grade</th>
                <th>Payment Due Date</th>
                <th>GCV</th>
                <th>Auction Date &amp; Ref</th>
                <th>Area</th>
                <th>Mat. Code</th>
                <th>Description</th>
                <th>Quantity</th>
                <th className="num-h">Requisite Payment (INR)</th>
                <th>Preview</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dataArray.map((d, index) => {
                const summaryRow = buildSummaryRow(d);
                return (
                  <tr key={index}>
                    <td className="row-num" data-label="#">{index + 1}</td>
                    <td data-label="Customer Code">{summaryRow.customerCode}</td>
                    <td className="text-cell" title={summaryRow.customerName} data-label="Customer Name">{summaryRow.customerName}</td>
                    <td data-label="GSTIN">{summaryRow.gstin}</td>
                    <td className="text-cell" title={summaryRow.areaOffice} data-label="Area Office">{summaryRow.areaOffice}</td>
                    <td data-label="Sales Doc No">{summaryRow.salesDocNo}</td>
                    <td data-label="Valid to Date">{summaryRow.validToDate}</td>
                    <td data-label="Sales Order Date">{summaryRow.salesOrderDate}</td>
                    <td data-label="Grade">{summaryRow.grade}</td>
                    <td data-label="Payment Due Date">{summaryRow.paymentDueDate}</td>
                    <td data-label="GCV">{summaryRow.gcv}</td>
                    <td className="text-cell" title={summaryRow.auctionDateRef} data-label="Auction Date & Ref">{summaryRow.auctionDateRef}</td>
                    <td data-label="Area">{summaryRow.area}</td>
                    <td data-label="Mat. Code">{summaryRow.materialCode}</td>
                    <td className="text-cell" title={summaryRow.description} data-label="Description">{summaryRow.description}</td>
                    <td data-label="Quantity">{summaryRow.quantity}</td>
                    <td className="amount-cell" data-label="Requisite Payment (INR)">{summaryRow.requisitePayment}</td>
                    <td data-label="Preview">
                      {summaryRow.pdfUrl ? (
                        <a href={summaryRow.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                          View PDF
                        </a>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>-</span>
                      )}
                    </td>
                    <td data-label="Action">
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                      <button
                          style={{
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                            padding: "4px 8px", fontSize: "11px", fontWeight: "500", borderRadius: "4px",
                            border: "1px solid #dcfce7", background: "#f0fdf4",
                            color: "#16a34a", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            transition: "all 0.15s ease",
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "#dcfce7"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
                          onClick={() => handleEditClick(index)}
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Edit
                      </button>
                      <button
                        style={{
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                          padding: "4px 8px", fontSize: "11px", fontWeight: "500", borderRadius: "4px",
                          border: "1px solid #fee2e2", background: "#fef2f2", color: "#dc2626",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.15s ease",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                        onClick={() => {
                          if(window.confirm("Are you sure you want to delete this row?")) {
                            onDeleteRow && onDeleteRow(index);
                          }
                        }}
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", background: "var(--panel)", borderBottomLeftRadius: "var(--radius)", borderBottomRightRadius: "var(--radius)" }}>
          <button className="btn" onClick={onSave} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--ember-bright)", color: "white", padding: "8px 24px", fontSize: "14px", fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            SAVE DATA
          </button>
        </div>
      </div>

      <EditModal
        isOpen={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        onSave={handleSaveEdit}
        title="Edit Payment Advice"
        initialData={editingIndex !== null ? buildSummaryRow(dataArray[editingIndex]) : null}
        columns={[
          { key: "customerCode", label: "Customer Code" },
          { key: "customerName", label: "Customer Name" },
          { key: "gstin", label: "GSTIN" },
          { key: "areaOffice", label: "Area Office" },
          { key: "salesDocNo", label: "Sales Doc No" },
          { key: "validToDate", label: "Valid to Date" },
          { key: "salesOrderDate", label: "Sales Order Date" },
          { key: "grade", label: "Grade" },
          { key: "paymentDueDate", label: "Payment Due Date" },
          { key: "gcv", label: "GCV" },
          { key: "auctionDateRef", label: "Auction Date & Ref" },
          { key: "area", label: "Area" },
          { key: "materialCode", label: "Material Code" },
          { key: "description", label: "Description" },
          { key: "quantity", label: "Quantity" },
          { key: "requisitePayment", label: "Requisite Payment (INR)" },
        ]}
      />
    </section>
  );
}
