import { useState, useCallback } from "react";
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import InvoiceResults from "../components/InvoiceResults";
import EditModal from "../components/EditModal";
import { extractRows, downloadBlob } from "../utils/pdfParser";
import { parseInvoiceText, toInvoiceCSV, INVOICE_COLS } from "../utils/invoiceParser";
import { supabase } from "../utils/supabase";
import React from "react";

export default function InvoicePage({ state, setState }) {
  const { view, loading, loadingName, error, data, fileName } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  React.useEffect(() => {
    const fetchSupabaseData = async () => {
      try {
        const { data: dbData, error } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (dbData && dbData.length > 0) {
          const formattedData = dbData.map(row => {
            return {
              id: row.id,
              isManual: row.is_manual,
              submittedDate: row.submitted_date || row.created_at,
              invoiceNo: row.invoice_no,
              invoiceDate: row.invoice_date,
              irn: row.irn,
              ackNo: row.ack_no,
              ackDate: row.ack_date,
              ewayBillNo: row.eway_bill_no,
              vehicleNo: row.vehicle_no,
              transport: row.transport,
              placeOfSupply: row.place_of_supply,
              supplierName: row.supplier_name,
              supplierGSTIN: row.supplier_gstin,
              supplierAddress: row.supplier_address,
              supplierContact: row.supplier_contact,
              buyerName: row.buyer_name,
              buyerAddress: row.buyer_address,
              buyerGSTIN: row.buyer_gstin,
              buyerPAN: row.buyer_pan,
              bankName: row.bank_name,
              bankAccount: row.bank_account,
              ifsc: row.ifsc,
              totalQuantity: row.total_quantity,
              rate: row.rate,
              totalAmount: row.total_amount,
              amountInWords: row.amount_in_words,
              cgst: row.cgst,
              sgst: row.sgst,
              igst: row.igst,
              taxableAmt: row.taxable_amt,
              roundOff: row.round_off,
              pdfUrl: row.pdf_url || null,
              pdfName: row.pdf_name || "Supabase DB"
            };
          });

          setState(s => ({
            ...s,
            view: "results",
            data: formattedData,
            fileName: "Loaded from Supabase"
          }));
        } else {
          setState(s => ({ ...s, view: "drop", data: null, fileName: "" }));
        }
      } catch (err) {
        console.error("Failed to fetch from Supabase:", err);
      }
    };
    fetchSupabaseData();
  }, [refreshTrigger, setState]);

  const handleManualAdd = async (formData) => {
    const newItem = {
      isManual: true,
      invoiceNo: formData.invoiceNo || null,
      invoiceDate: formData.invoiceDate || null,
      irn: formData.irn || null,
      ackNo: formData.ackNo || null,
      ackDate: formData.ackDate || null,
      ewayBillNo: formData.ewayBillNo || null,
      vehicleNo: formData.vehicleNo || null,
      transport: formData.transport || null,
      placeOfSupply: formData.placeOfSupply || null,
      supplierName: formData.supplierName || null,
      supplierGSTIN: formData.supplierGSTIN || null,
      supplierAddress: formData.supplierAddress || null,
      supplierContact: formData.supplierContact || null,
      buyerName: formData.buyerName || null,
      buyerAddress: formData.buyerAddress || null,
      buyerGSTIN: formData.buyerGSTIN || null,
      buyerPAN: formData.buyerPAN || null,
      bankName: formData.bankName || null,
      bankAccount: formData.bankAccount || null,
      ifsc: formData.ifsc || null,
      totalQuantity: formData.totalQuantity || null,
      rate: formData.rate ? parseFloat(formData.rate) : null,
      totalAmount: formData.totalAmount ? parseFloat(formData.totalAmount) : null,
      amountInWords: formData.amountInWords || null,
      cgst: formData.cgst ? parseFloat(formData.cgst) : null,
      sgst: formData.sgst ? parseFloat(formData.sgst) : null,
      igst: formData.igst ? parseFloat(formData.igst) : null,
      taxableAmt: formData.taxableAmt ? parseFloat(formData.taxableAmt) : null,
      roundOff: formData.roundOff ? parseFloat(formData.roundOff) : null
    };

    try {
      let pdfUrl = null;
      let pdfName = "Manual Entry";

      if (formData.pdfFile) {
        const fileExt = formData.pdfFile.name.split('.').pop();
        const fName = `${Math.random()}.${fileExt}`;
        const filePath = `${fName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('invoice-pdfs')
          .upload(filePath, formData.pdfFile);
          
        if (uploadError) {
          console.error("Upload error:", uploadError);
          showToast("Failed to upload PDF", "error");
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('invoice-pdfs')
            .getPublicUrl(filePath);
          pdfUrl = publicUrlData.publicUrl;
          pdfName = formData.pdfFile.name;
        }
      }

      const dbPayload = {
        is_manual: true,
        pdf_url: pdfUrl,
        pdf_name: pdfName,
        submitted_date: new Date().toISOString().split('T')[0],
        invoice_no: newItem.invoiceNo,
        invoice_date: newItem.invoiceDate,
        irn: newItem.irn,
        ack_no: newItem.ackNo,
        ack_date: newItem.ackDate,
        eway_bill_no: newItem.ewayBillNo,
        vehicle_no: newItem.vehicleNo,
        transport: newItem.transport,
        place_of_supply: newItem.placeOfSupply,
        supplier_name: newItem.supplierName,
        supplier_gstin: newItem.supplierGSTIN,
        supplier_address: newItem.supplierAddress,
        supplier_contact: newItem.supplierContact,
        buyer_name: newItem.buyerName,
        buyer_address: newItem.buyerAddress,
        buyer_gstin: newItem.buyerGSTIN,
        buyer_pan: newItem.buyerPAN,
        bank_name: newItem.bankName,
        bank_account: newItem.bankAccount,
        ifsc: newItem.ifsc,
        total_quantity: newItem.totalQuantity,
        rate: newItem.rate,
        total_amount: newItem.totalAmount,
        amount_in_words: newItem.amountInWords,
        cgst: newItem.cgst,
        sgst: newItem.sgst,
        igst: newItem.igst,
        taxable_amt: newItem.taxableAmt,
        round_off: newItem.roundOff
      };

      const { error: insertError } = await supabase
        .from('invoices')
        .insert([dbPayload]);

      if (insertError) throw insertError;

      showToast("Manual entry saved to Supabase!");
      setRefreshTrigger(prev => prev + 1);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save error:", err);
      showToast("Error saving to Supabase", "error");
    }
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
            const parsed = parseInvoiceText(rows);
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
          error: "Failed to read PDF. File might be corrupt, password-protected, or in a different format. (" + (err?.message ?? "unknown error") + ")",
        }));
      }
    },
    [setState]
  );

  const handleReset = () =>
    setState({ view: "drop", loading: false, loadingName: "", error: null, data: null, fileName: "" });

  const handleExportJson = () => {
    if (!data) return;
    downloadBlob(JSON.stringify(data, null, 2), fileName.replace(/\.pdf$/i, "") + "_invoice.json", "application/json");
  };

  const handleSave = async () => {
    if (!data || data.length === 0) return;

    try {
      const recordsToInsert = [];

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // Skip if already has ID (came from DB)
        if (item.id) continue;

        let pdfUrl = item.pdfUrl;
        let pdfName = item.pdfName;

        // Try to fetch blob and upload if it's a blob url
        if (pdfUrl && pdfUrl.startsWith('blob:')) {
          try {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            const fileExt = "pdf";
            const fName = `${Math.random()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('invoice-pdfs')
              .upload(fName, blob, { contentType: 'application/pdf' });

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('invoice-pdfs')
                .getPublicUrl(fName);
              pdfUrl = publicUrlData.publicUrl;
            }
          } catch (uploadErr) {
            console.error("Blob upload error:", uploadErr);
          }
        }

        recordsToInsert.push({
          is_manual: item.isManual || false,
          submitted_date: item.submittedDate || new Date().toISOString().split('T')[0],
          pdf_url: pdfUrl,
          pdf_name: pdfName,
          invoice_no: item.invoiceNo || null,
          invoice_date: item.invoiceDate || null,
          irn: item.irn || null,
          ack_no: item.ackNo || null,
          ack_date: item.ackDate || null,
          eway_bill_no: item.ewayBillNo || null,
          vehicle_no: item.vehicleNo || null,
          transport: item.transport || null,
          place_of_supply: item.placeOfSupply || null,
          supplier_name: item.supplierName || null,
          supplier_gstin: item.supplierGSTIN || null,
          supplier_address: item.supplierAddress || null,
          supplier_contact: item.supplierContact || null,
          buyer_name: item.buyerName || null,
          buyer_address: item.buyerAddress || null,
          buyer_gstin: item.buyerGSTIN || null,
          buyer_pan: item.buyerPAN || null,
          bank_name: item.bankName || null,
          bank_account: item.bankAccount || null,
          ifsc: item.ifsc || null,
          total_quantity: item.totalQuantity || null,
          rate: item.rate ? parseFloat(String(item.rate).replace(/,/g, '')) : null,
          total_amount: item.totalAmount ? parseFloat(String(item.totalAmount).replace(/,/g, '')) : null,
          amount_in_words: item.amountInWords || null,
          cgst: item.cgst ? parseFloat(String(item.cgst).replace(/,/g, '')) : null,
          sgst: item.sgst ? parseFloat(String(item.sgst).replace(/,/g, '')) : null,
          igst: item.igst ? parseFloat(String(item.igst).replace(/,/g, '')) : null,
          taxable_amt: item.taxableAmt ? parseFloat(String(item.taxableAmt).replace(/,/g, '')) : null,
          round_off: item.roundOff ? parseFloat(String(item.roundOff).replace(/,/g, '')) : null
        });
      }

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('invoices')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
        showToast("Data saved to Supabase successfully!");
        setRefreshTrigger(prev => prev + 1);
      } else {
        showToast("No new data to save.", "info");
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast("Error saving data to Supabase", "error");
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    downloadBlob(toInvoiceCSV(data), fileName.replace(/\.pdf$/i, "") + "_invoice.csv", "text/csv");
  };

  const handleDeleteRow = async (index) => {
    const item = data[index];
    if (item.id) {
      try {
        const { error } = await supabase.from('invoices').delete().eq('id', item.id);
        if (error) throw error;
        showToast("Record deleted from Supabase!");
      } catch (err) {
        console.error("Delete error:", err);
        showToast("Error deleting record", "error");
        return;
      }
    }
    
    setState((s) => {
      const newData = [...s.data];
      newData.splice(index, 1);
      if (newData.length === 0) {
        return { ...s, view: "drop", data: null, fileName: "" };
      }
      return { ...s, data: newData };
    });
  };

  const handleUpdateRow = async (index, updatedRow) => {
    if (updatedRow.id) {
      try {
        const dbPayload = {
          invoice_no: updatedRow.invoiceNo || null,
          invoice_date: updatedRow.invoiceDate || null,
          irn: updatedRow.irn || null,
          ack_no: updatedRow.ackNo || null,
          ack_date: updatedRow.ackDate || null,
          eway_bill_no: updatedRow.ewayBillNo || null,
          vehicle_no: updatedRow.vehicleNo || null,
          transport: updatedRow.transport || null,
          place_of_supply: updatedRow.placeOfSupply || null,
          supplier_name: updatedRow.supplierName || null,
          supplier_gstin: updatedRow.supplierGSTIN || null,
          supplier_address: updatedRow.supplierAddress || null,
          supplier_contact: updatedRow.supplierContact || null,
          buyer_name: updatedRow.buyerName || null,
          buyer_address: updatedRow.buyerAddress || null,
          buyer_gstin: updatedRow.buyerGSTIN || null,
          buyer_pan: updatedRow.buyerPAN || null,
          bank_name: updatedRow.bankName || null,
          bank_account: updatedRow.bankAccount || null,
          ifsc: updatedRow.ifsc || null,
          total_quantity: updatedRow.totalQuantity || null,
          rate: updatedRow.rate ? parseFloat(String(updatedRow.rate).replace(/,/g, '')) : null,
          total_amount: updatedRow.totalAmount ? parseFloat(String(updatedRow.totalAmount).replace(/,/g, '')) : null,
          amount_in_words: updatedRow.amountInWords || null,
          cgst: updatedRow.cgst ? parseFloat(String(updatedRow.cgst).replace(/,/g, '')) : null,
          sgst: updatedRow.sgst ? parseFloat(String(updatedRow.sgst).replace(/,/g, '')) : null,
          igst: updatedRow.igst ? parseFloat(String(updatedRow.igst).replace(/,/g, '')) : null,
          taxable_amt: updatedRow.taxableAmt ? parseFloat(String(updatedRow.taxableAmt).replace(/,/g, '')) : null,
          round_off: updatedRow.roundOff ? parseFloat(String(updatedRow.roundOff).replace(/,/g, '')) : null
        };
        const { error } = await supabase.from('invoices').update(dbPayload).eq('id', updatedRow.id);
        if (error) throw error;
        showToast("Record updated in Supabase!");
      } catch (err) {
        console.error("Update error:", err);
        showToast("Error updating record", "error");
      }
    }
    
    setState((s) => {
      const newData = [...s.data];
      newData[index] = updatedRow;
      return { ...s, data: newData };
    });
  };

  return (
    <div className="page-content">
      <div className="topbar">
        <h2>Invoice Reader</h2>
        <span className="badge">PDF PROCESSING</span>
      </div>

      {view === "drop" && (
        <>
          <Dropzone
            onFiles={handleFiles}
            loading={loading}
            loadingName={loadingName}
            error={error}
            title="Upload Invoice PDF"
            icon="📑"
          />
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ color: "var(--muted)", marginRight: 15, fontSize: "14px" }}>Or enter data manually</span>
            <button className="btn outline" onClick={() => setIsModalOpen(true)}>+ Add Form</button>
          </div>
          <div className="table-card" style={{ marginTop: 40, opacity: 0.6, pointerEvents: "none" }}>
            <div className="table-header">
              <div className="table-title">Data Preview (Upload PDF to populate)</div>
            </div>
            <div className="table-scroll" style={{ overflowX: "auto" }}>
              <table className="stable" style={{ minWidth: 1200 }}>
                <thead>
                  <tr>
                    <th className="num-h">#</th>
                    <th>INVOICE NO</th>
                    <th>INVOICE DATE</th>
                    <th>IRN</th>
                    <th>BUYER GSTIN</th>
                    <th>SUPPLIER NAME</th>
                    <th>E-WAY BILL NO</th>
                    <th>VEHICLE NO</th>
                    <th>QUANTITY</th>
                    <th>TOTAL AMOUNT</th>
                    <th>Preview</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="12" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
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
        <InvoiceResults
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
        columns={INVOICE_COLS}
      />
    </div>
  );
}
