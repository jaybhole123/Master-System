import React, { useCallback, useState } from "react";
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import SECLPaymentAdviceResults from "../components/SECLPaymentAdviceResults";
import EditModal from "../components/EditModal";
import { parseSECLPaymentAdvice } from "../utils/seclPaymentAdviceParser";
import { supabase } from "../utils/supabase";

export default function SECLPaymentAdvicePage({ state, setState }) {
  const PAGE_SIZE = 50;
  const { view, loading, loadingName, error, data, fileName } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  React.useEffect(() => {
    const fetchSupabaseData = async () => {
      setIsFetching(true);
      try {
        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let { data: dbData, error, count } = await supabase
          .from('secl_payment_advices')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) {
          if (error.code === 'PGRST103' || error.message?.includes('416')) {
            dbData = [];
          } else {
            throw error;
          }
        }

        setTotalCount(count || 0);

        if (dbData && dbData.length > 0) {
          const formattedData = dbData.map(row => {
            const qty = row.quantity || 1;
            return {
              id: row.id,
              isManual: row.is_manual,
              createdAt: row.created_at,
              minesName: row.mines_name,
              customerName: row.customer_name,
              quantity: row.quantity,
              requisitePayment: row.requisite_payment,
              grandTotal: row.grand_total,
              grandPMT: row.grand_total !== null ? row.grand_total / qty : null,
              auctionDate: row.auction_date,
              dueDate: row.due_date,
              bidPrice: row.bid_price,
              pdfTcsTotal: row.pdf_tcs_total,
              tcsAmount: row.tcs_amount,
              incl50: row.incl_50,
              inclTotal: row.incl_total,
              pdfUrl: row.pdf_url || null,
              pdfName: "Supabase DB"
            };
          });

          setState(s => {
            const newData = currentPage === 1 ? formattedData : [...(s.data || []), ...formattedData];
            const uniqueData = Array.from(new Map(newData.map(item => [item.id || item, item])).values());
            
            return {
              ...s,
              view: "results",
              data: uniqueData,
              fileName: "Loaded from Supabase"
            };
          });
        } else if (currentPage === 1) {
          setState(s => ({ ...s, view: "drop", data: null, fileName: "" }));
        }
      } catch (err) {
        console.error("Failed to fetch from Supabase:", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchSupabaseData();
  }, [refreshTrigger, currentPage, setState]);

  const handleManualAdd = async (formData) => {
    const qty = parseFloat(formData.quantity) || 1;
    const req = parseFloat(formData.requisitePayment);
    const grand = parseFloat(formData.grandTotal);
    const bid = parseFloat(formData.bidPrice);
    
    let grandPMT = !isNaN(grand) ? grand / qty : null;
    let incl50 = formData.incl50 ? parseFloat(formData.incl50) : (grandPMT !== null ? grandPMT + 50 : null);
    let inclTotal = formData.inclTotal ? parseFloat(formData.inclTotal) : (incl50 !== null ? incl50 * qty : null);
    
    const newItem = {
      isManual: true,
      minesName: formData.minesName || 'Not Found',
      customerName: formData.customerName || 'Not Found',
      quantity: isNaN(parseFloat(formData.quantity)) ? null : parseFloat(formData.quantity),
      requisitePayment: isNaN(req) ? null : req,
      grandTotal: isNaN(grand) ? null : grand,
      grandPMT,
      auctionDate: formData.auctionDate || 'Not Found',
      dueDate: formData.dueDate || 'Not Found',
      bidPrice: isNaN(bid) ? null : bid,
      pdfTcsTotal: formData.tcsAmount ? parseFloat(formData.tcsAmount) : 0,
      tcsAmount: formData.tcsAmount ? parseFloat(formData.tcsAmount) : 0,
      incl50,
      inclTotal
    };

    try {
      const insertPayload = {
        is_manual: true,
        mines_name: newItem.minesName,
        customer_name: newItem.customerName,
        quantity: newItem.quantity,
        requisite_payment: newItem.requisitePayment,
        grand_total: newItem.grandTotal,
        auction_date: newItem.auctionDate,
        due_date: newItem.dueDate,
        bid_price: newItem.bidPrice,
        pdf_tcs_total: newItem.pdfTcsTotal,
        tcs_amount: newItem.tcsAmount,
        incl_50: newItem.incl50,
        incl_total: newItem.inclTotal
      };

      const { data: inserted, error } = await supabase
        .from('secl_payment_advices')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      newItem.id = inserted.id;

      setState((s) => ({
        ...s,
        data: s.data && Array.isArray(s.data) ? [...s.data, newItem] : [newItem],
        view: "results",
        fileName: s.fileName || "Manual Entry"
      }));
      setIsModalOpen(false);
      showToast("Manual entry saved to Supabase!");
    } catch (err) {
      console.error("Manual Add Error:", err);
      showToast("Error saving manual entry to Supabase");
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
        const settledResults = await Promise.allSettled(
          files.map(async (file) => {
            const parsed = await parseSECLPaymentAdvice(file);
            parsed.fileName = file.name;
            parsed.pdfUrl = URL.createObjectURL(file);
            parsed.pdfName = file.name;
            return parsed;
          })
        );
        
        const successfulResults = [];
        const failedFiles = [];

        settledResults.forEach((result, idx) => {
          if (result.status === "fulfilled") {
            successfulResults.push(result.value);
          } else {
            failedFiles.push(files[idx].name);
            console.error("Error parsing", files[idx].name, result.reason);
          }
        });

        if (failedFiles.length > 0 && successfulResults.length === 0) {
          throw new Error("All uploaded files failed to parse. Make sure they are SECL Payment Advices.");
        }

        setState((s) => {
          const newData = s.data && Array.isArray(s.data) ? [...s.data, ...successfulResults] : successfulResults;
          const newFileName = s.fileName ? s.fileName + ", " + (files.length > 1 ? `${files.length} files` : files[0].name) : (files.length > 1 ? `${files.length}_files` : files[0].name);
          return {
            ...s, loading: false, data: newData, fileName: newFileName, view: "results",
          };
        });
        
        if (failedFiles.length > 0) {
          alert(`The following files failed to parse:\n\n${failedFiles.join("\n")}`);
        }
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

  const handleSave = async () => {
    if (!data) return;
    
    const newItemsData = data.filter(d => !d.id);
    if (newItemsData.length === 0) {
      showToast("No new data to save.");
      return;
    }

    try {
      showToast("Saving new data and uploading PDFs...");
      const allItems = await Promise.all(
        newItemsData.map(async (d) => {
          let pdf_url = d.pdfUrl || null;

          if (pdf_url && pdf_url.startsWith("blob:")) {
            try {
              const response = await fetch(pdf_url);
              const blob = await response.blob();
              const fileName = d.pdfName || `secl_payment_${Date.now()}.pdf`;
              const filePath = `pdfs/${Date.now()}_${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from("secl-pdfs")
                .upload(filePath, blob, { contentType: "application/pdf", upsert: true });

              if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                  .from("secl-pdfs")
                  .getPublicUrl(filePath);
                pdf_url = publicUrlData?.publicUrl || null;
              } else {
                console.warn("PDF upload failed:", uploadError);
                pdf_url = null;
              }
            } catch (e) {
              console.warn("PDF upload error:", e);
              pdf_url = null;
            }
          }

          return {
            is_manual: d.isManual || false,
            mines_name: d.minesName || "",
            customer_name: d.customerName || "",
            quantity: d.quantity || null,
            requisite_payment: d.requisitePayment || null,
            grand_total: d.grandTotal || null,
            auction_date: d.auctionDate || "",
            due_date: d.dueDate || "",
            bid_price: d.bidPrice || null,
            pdf_tcs_total: d.pdfTcsTotal || null,
            tcs_amount: d.tcsAmount || null,
            incl_50: d.incl50 || null,
            incl_total: d.inclTotal || null,
            pdf_url,
          };
        })
      );

      const { data: insertedData, error } = await supabase.from('secl_payment_advices').insert(allItems).select();
      if (error) throw error;

      showToast("Data saved to Supabase successfully!");
      setRefreshTrigger(prev => prev + 1);

    } catch (err) {
      console.error("Supabase Save Error:", err);
      showToast("Error saving to Supabase");
    }
  };

  const handleDeleteRow = async (index) => {
    let itemToDelete = null;

    setState((s) => {
      const newData = [...s.data];
      itemToDelete = newData[index];
      newData.splice(index, 1);
      if (newData.length === 0) {
        return { ...s, view: "drop", data: null, fileName: "" };
      }
      return { ...s, data: newData };
    });

    if (itemToDelete && itemToDelete.id) {
      try {
        const { error } = await supabase.from('secl_payment_advices').delete().eq('id', itemToDelete.id);
        if (error) throw error;
        showToast("Deleted from Supabase successfully!");
      } catch (err) {
        console.error("Error deleting from Supabase:", err);
        showToast("Error deleting from Supabase");
      }
    }
  };

  const handleUpdateRow = async (index, updatedRow) => {
    let rowId = null;

    setState((s) => {
      const newData = [...s.data];
      rowId = newData[index].id;
      newData[index] = { ...newData[index], ...updatedRow };
      return { ...s, data: newData };
    });

    if (rowId) {
      try {
        const updatePayload = {
          mines_name: updatedRow.minesName,
          customer_name: updatedRow.customerName,
          quantity: updatedRow.quantity,
          requisite_payment: updatedRow.requisitePayment,
          grand_total: updatedRow.grandTotal,
          auction_date: updatedRow.auctionDate,
          due_date: updatedRow.dueDate,
          bid_price: updatedRow.bidPrice,
          tcs_amount: updatedRow.tcsAmount,
          incl_50: updatedRow.incl50,
          incl_total: updatedRow.inclTotal
        };
        const { error } = await supabase.from('secl_payment_advices').update(updatePayload).eq('id', rowId);
        if (error) throw error;
        showToast("Updated in Supabase successfully!");
      } catch (err) {
        console.error("Supabase Update Error:", err);
        showToast("Error updating in Supabase");
      }
    }
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
            title="Upload SECL Payment Advice"
            icon="📑"
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
                    <th>S.No</th>
                    <th>Mines Name</th>
                    <th>Customer Name</th>
                    <th>Quantity (MT)</th>
                    <th>Requisite Payment</th>
                    <th>Grand Total PMT</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
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
        <SECLPaymentAdviceResults
          data={data}
          fileName={fileName}
          onReset={handleReset}
          onAddFiles={handleFiles}
          onSave={handleSave}
          onDeleteRow={handleDeleteRow}
          onUpdateRow={handleUpdateRow}
          onAddManual={() => setIsModalOpen(true)}
          onPageChange={() => setCurrentPage(p => p + 1)}
          totalCount={totalCount}
          isFetching={isFetching}
        />
      )}

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleManualAdd}
        title="Add Manual Entry"
        initialData={{}}
        tableName="secl_payment_advices"
        columns={[
          { key: "minesName", dbKey: "mines_name", label: "Mines Name" },
          { key: "customerName", dbKey: "customer_name", label: "Customer Name" },
          { key: "quantity", dbKey: "quantity", label: "Quantity (MT)" },
          { key: "requisitePayment", dbKey: "requisite_payment", label: "Requisite Payment (INR)" },
          { key: "grandTotal", dbKey: "grand_total", label: "Grand Total (INR)" },
          { key: "auctionDate", label: "Auction Date" },
          { key: "dueDate", label: "Due Date" },
          { key: "bidPrice", dbKey: "bid_price", label: "Bid Price PMT" },
          { key: "incl50", dbKey: "incl_50", label: "Including 50 PMT Rate" },
          { key: "inclTotal", dbKey: "incl_total", label: "Including 50 Total" },
          { key: "tcsAmount", dbKey: "tcs_amount", label: "TCS Amount" }
        ]}
      />
    </div>
  );
}
