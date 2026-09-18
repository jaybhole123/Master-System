import { useCallback, useState } from "react";
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import Results from "../components/Results";
import EditModal from "../components/EditModal";
import { extractRows, parsePaymentAdvice, toCSV, downloadBlob } from "../utils/pdfParser";

/**
 * PaymentAdvicePage — owns the upload/result state for this page.
 * Props: state & setState passed from App so navigating away and back preserves data.
 */
export default function PaymentAdvicePage({ state, setState }) {
  const { view, loading, loadingName, error, data, fileName } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleManualAdd = (formData) => {
    const newItem = {
      pdfUrl: formData.pdfFile ? URL.createObjectURL(formData.pdfFile) : null,
      pdfName: formData.pdfFile ? formData.pdfFile.name : "Manual Entry",
      receiver: { 
        customerName: formData.customerName,
        customerCode: formData.customerCode,
        gstin: formData.gstin
      },
      areaOffice: formData.areaOffice,
      contract: { 
        salesDocNo: formData.salesDocNo,
        validToDate: formData.validToDate,
        salesOrderDate: formData.salesOrderDate,
        paymentDueDate: formData.paymentDueDate,
        auctionDateRef: formData.auctionDateRef
      },
      material: { 
        materialCode: formData.materialCode,
        description: formData.description,
        quantity: formData.quantity
      },
      totals: { requisitePayment: formData.requisitePayment },
      colliery: { 
        area: formData.area,
        grade: formData.grade,
        gcv: formData.gcv
      }
    };
    setState((s) => ({
      ...s,
      data: s.data && Array.isArray(s.data) ? [...s.data, newItem] : [newItem],
      view: "results",
      fileName: s.fileName || "Manual Entry"
    }));
    setIsModalOpen(false);
  };

  const handleFiles = useCallback(
    async (files) => {
      if (files.length === 0) {
        setState((s) => ({ ...s, error: "Please upload only PDF files." }));
        return;
      }

      setState((s) => ({
        ...s, error: null, loading: true, loadingName: files.length > 1 ? `${files.length} files` : files[0].name,
      }));

      try {
        const results = await Promise.all(
          files.map(async (file) => {
            const rows = await extractRows(file);
            const parsed = parsePaymentAdvice(rows);
            parsed.pdfUrl = URL.createObjectURL(file);
            parsed.pdfName = file.name;
            return parsed;
          })
        );
        setState((s) => {
          const newData = s.data && Array.isArray(s.data) ? [...s.data, ...results] : results;
          const newFileName = s.fileName ? s.fileName + ", " + (files.length > 1 ? `${files.length} files` : files[0].name) : (files.length > 1 ? `${files.length}_files` : files[0].name);
          return {
            ...s, loading: false, data: newData, fileName: newFileName, view: "results",
          };
        });
      } catch (err) {
        console.error(err);
        setState((s) => ({
          ...s,
          loading: false,
          error:
            "Failed to read PDF. File might be corrupt, password-protected, or in a different format. (" +
            (err?.message ?? "unknown error") +
            ")",
        }));
      }
    },
    [setState]
  );

  const handleReset = () =>
    setState({ view: "drop", loading: false, loadingName: "", error: null, data: null, fileName: "" });

  const handleExportJson = () => {
    if (!data) return;
    downloadBlob(JSON.stringify(data, null, 2), fileName.replace(/\.pdf$/i, "") + "_payment_advice.json", "application/json");
  };

  const handleSave = () => {
    if (!data) return;
    localStorage.setItem("payment_advice_data", JSON.stringify(data));
    showToast("Data saved to LocalStorage successfully!");
  };

  const handleExportCsv = () => {
    if (!data) return;
    downloadBlob(toCSV(data), fileName.replace(/\.pdf$/i, "") + ".csv", "text/csv");
  };

  const handleDeleteRow = (index) => {
    setState((s) => {
      const newData = [...s.data];
      newData.splice(index, 1);
      if (newData.length === 0) {
        return { ...s, view: "drop", data: null, fileName: "" };
      }
      return { ...s, data: newData };
    });
  };

  const handleUpdateRow = (index, updatedRow) => {
    setState((s) => {
      const newData = [...s.data];
      
      // Map flat updatedRow back to nested data structure
      const item = { ...newData[index] };
      item.receiver = {
        ...item.receiver,
        customerCode: updatedRow.customerCode,
        customerName: updatedRow.customerName,
        gstin: updatedRow.gstin,
      };
      item.areaOffice = updatedRow.areaOffice;
      item.contract = {
        ...item.contract,
        salesDocNo: updatedRow.salesDocNo,
        salesOrderDate: updatedRow.salesOrderDate,
        paymentDueDate: updatedRow.paymentDueDate,
        auctionDateRef: updatedRow.auctionDateRef,
      };
      item.material = {
        ...item.material,
        materialCode: updatedRow.materialCode,
        description: updatedRow.description,
        quantity: updatedRow.quantity,
      };
      item.totals = {
        ...item.totals,
        requisitePayment: updatedRow.requisitePayment ? updatedRow.requisitePayment.replace(/[^0-9.]/g, "") : null,
      };
      
      newData[index] = item;
      return { ...s, data: newData };
    });
  };

  return (
    <div>
      {view === "drop" && (
        <>
          <Dropzone
            onFiles={handleFiles}
            loading={loading}
            loadingName={loadingName}
            error={error}
            title="Upload Payment Advice"
            icon="💵"
          />
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ color: "var(--muted)", marginRight: 15, fontSize: "14px" }}>Or enter data manually</span>
            <button className="btn outline" onClick={() => setIsModalOpen(true)}>+ Add Form</button>
          </div>
          <div className="summary-section" style={{ marginTop: 40, opacity: 0.6, pointerEvents: "none" }}>
            <div className="summary-header">
              <div className="summary-title">Data Preview (Upload PDF to populate)</div>
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
                  <tr>
                    <td colSpan="19" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                      Upload a PDF to view extracted data
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {view === "results" && data && (
        <Results
          data={data}
          fileName={fileName}
          onReset={handleReset}
          onAddFiles={handleFiles}
          onExportJson={handleExportJson}
          onExportCsv={handleExportCsv}
          onSave={handleSave}
          onDeleteRow={handleDeleteRow}
          onUpdateRow={handleUpdateRow}
          onAddManual={() => setIsModalOpen(true)}
        />
      )}

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleManualAdd}
        title="Add Manual Entry"
        initialData={{}}
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
          { key: "materialCode", label: "Mat. Code" },
          { key: "description", label: "Description" },
          { key: "quantity", label: "Quantity" },
          { key: "requisitePayment", label: "Requisite Payment (INR)" }
        ]}
      />
    </div>
  );
}
