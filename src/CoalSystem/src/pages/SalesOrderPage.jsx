import { useCallback, useState, useEffect } from "react";
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import SalesOrderResults from "../components/SalesOrderResults";
import EditModal from "../components/EditModal";
import { extractTextFromPdf, parseSalesOrder, toCSVSalesOrder, downloadBlob } from "../utils/salesOrderParser";
import { supabase } from "../utils/supabase";

/**
 * SalesOrderPage — owns the upload/result state for this page.
 * Props: state & setState passed from App so navigating away and back preserves data.
 */
export default function SalesOrderPage({ state, setState }) {
  const PAGE_SIZE = 50;
  const { view, loading, loadingName, error, data, fileName } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      try {
        setState(s => ({ ...s, loading: true, loadingName: "Loading data from database..." }));
        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let { data: dbData, error: dbError, count } = await supabase
          .from('sales_orders')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (dbError) {
          // If the requested range is out of bounds (e.g. page 2 when only 10 records exist), PostgREST returns 416
          if (dbError.code === 'PGRST103' || dbError.message?.includes('416')) {
            dbData = [];
          } else {
            throw dbError;
          }
        }

        setTotalCount(count || 0);

        if (dbData && dbData.length > 0) {
          const mappedData = dbData.map(row => ({
            id: row.id,
            created_at: row.created_at,
            pdfName: row.pdf_name || "From Database",
            pdfUrl: row.pdf_url || null,
            sold_to_party: { name: row.name },
            order_info: { 
              sales_order_number: row.sales_order_number,
              sales_order_valid_from: row.sales_order_valid_from,
              sales_order_valid_to: row.sales_order_valid_to
            },
            company: { office_area: row.office_area },
            mine_info: {
              area: row.office_area,
              mine: row.mine
            },
            line_items: [{
              quantity: row.quantity,
              mine: row.mine
            }],
            pricing: [{
              description: "Requisite Payment",
              rate_per_te: row.rate_per_te,
              amount: row.amount
            }],
            totals: {
              requisite_payment: row.amount
            },
            so_value_rate: row.so_value_rate
          }));

          setState(s => {
            // Append data if loading subsequent pages, otherwise replace
            const newData = currentPage === 1 ? mappedData : [...(s.data || []), ...mappedData];
            
            // Remove duplicates by ID in case of overlapping fetches
            const uniqueData = Array.from(new Map(newData.map(item => [item.id || item, item])).values());
            
            return { 
              ...s, 
              data: uniqueData, 
              view: "results", 
              fileName: "Database Data",
              loading: false 
            };
          });
        } else if (currentPage === 1) {
          setState(s => ({ ...s, loading: false, view: "drop", data: null, fileName: "" }));
        } else {
          setState(s => ({ ...s, loading: false }));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        showToast("Error loading data from database");
        setState(s => ({ ...s, loading: false }));
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [currentPage, refreshTrigger, setState]);


  const handleManualAdd = async (formData) => {
    try {
      let pdf_url = null;

      // Upload PDF to Supabase Storage if provided
      if (formData.pdfFile) {
        const fileExt = (formData.pdfFile.name || "document.pdf").split('.').pop();
        const filePath = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(filePath, formData.pdfFile, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('pdfs')
            .getPublicUrl(filePath);
          pdf_url = publicUrlData?.publicUrl || null;
        } else {
          console.warn("PDF upload failed:", uploadError);
        }
      }

      const parseNum = (val) => {
        if (!val) return 0;
        const parsed = parseFloat(val.toString().replace(/,/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      };

      const parseDate = (val) => {
        if (!val || val === "-") return null;
        const d = new Date(val);
        if (isNaN(d)) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const insertPayload = {
        pdf_name: formData.pdfFile ? formData.pdfFile.name : "Manual Entry",
        pdf_url,
        name: formData.name || null,
        sales_order_number: formData.sales_order_number || null,
        sales_order_valid_from: parseDate(formData.sales_order_valid_from),
        sales_order_valid_to: parseDate(formData.sales_order_valid_to),
        office_area: formData.office_area || null,
        mine: formData.mine || null,
        quantity: parseNum(formData.quantity),
        so_value_rate: parseNum(formData.so_value_rate),
        rate_per_te: parseNum(formData.rate_per_te),
        amount: parseNum(formData.amount),
      };

      const { data: inserted, error } = await supabase
        .from('sales_orders')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      // Add to local state with DB id
      const newItem = {
        id: inserted.id,
        created_at: inserted.created_at,
        pdfUrl: pdf_url,
        pdfName: insertPayload.pdf_name,
        sold_to_party: { name: formData.name },
        order_info: {
          sales_order_number: formData.sales_order_number,
          sales_order_valid_from: formData.sales_order_valid_from,
          sales_order_valid_to: formData.sales_order_valid_to
        },
        mine_info: {
          area: formData.office_area,
          mine: formData.mine
        },
        line_items: [{ quantity: formData.quantity, mine: formData.mine }],
        pricing: [{ description: "Requisite Payment", rate_per_te: formData.rate_per_te, amount: formData.amount }],
        totals: { requisite_payment: formData.amount },
        so_value_rate: formData.so_value_rate
      };

      setState((s) => ({
        ...s,
        data: s.data && Array.isArray(s.data) ? [...s.data, newItem] : [newItem],
        view: "results",
        fileName: s.fileName || "Manual Entry"
      }));

      setIsModalOpen(false);
      showToast("Entry saved to database successfully!");
    } catch (err) {
      console.error("Manual Add Error:", err);
      showToast("Error saving entry: " + err.message);
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
            const text = await extractTextFromPdf(file);
            const parsed = parseSalesOrder(text);
            
            // Fallback to calculate quantity from amount and rate if missing or if it contains text (like "THREE THOUSAND")
            let qty = parsed.line_items?.[0]?.quantity || parsed.mine_info?.quantity_words;
            let isText = qty && /[a-zA-Z]/.test(qty);
            
            if (!qty || isText) {
              const reqPay = parsed.pricing?.find(p => p.description?.toLowerCase().includes("requisite payment"));
              if (reqPay && reqPay.amount && reqPay.rate_per_te) {
                const amt = parseFloat(reqPay.amount.replace(/,/g, ''));
                const rate = parseFloat(reqPay.rate_per_te.replace(/,/g, ''));
                if (amt && rate && rate > 0) {
                  const calculatedQty = Math.round(amt / rate).toString();
                  if (!parsed.mine_info) parsed.mine_info = {};
                  parsed.mine_info.quantity_words = calculatedQty;
                  if (parsed.line_items && parsed.line_items.length > 0) {
                    parsed.line_items[0].quantity = calculatedQty;
                  } else {
                    parsed.line_items = [{ quantity: calculatedQty, mine: parsed.mine_info.mine }];
                  }
                }
              }
            }

            parsed.pdfUrl = URL.createObjectURL(file);
            parsed.pdfName = file.name;
            parsed.rawFile = file; // Save raw file for uploading
            return parsed;
          })
        );

        const successfulResults = [];
        const failedFiles = [];

        settledResults.forEach((res, index) => {
          if (res.status === "fulfilled") {
            successfulResults.push(res.value);
          } else {
            failedFiles.push(files[index].name);
            console.error(`Failed to parse ${files[index].name}:`, res.reason);
          }
        });

        if (failedFiles.length > 0) {
          // We will show these in the UI instead of an alert
        }

        if (successfulResults.length === 0) {
          setState((s) => ({
            ...s,
            loading: false,
            error: "None of the uploaded files were valid Sales Order PDFs.",
          }));
          return;
        }

        setState((s) => {
          const newData = s.data && Array.isArray(s.data) ? [...s.data, ...successfulResults] : successfulResults;
          
          let newFileName = s.fileName || "";
          if (successfulResults.length > 0) {
             const addedNames = successfulResults.length > 1 ? `${successfulResults.length} files` : successfulResults[0].pdfName;
             newFileName = newFileName ? `${newFileName}, ${addedNames}` : addedNames;
          }

          return {
            ...s, loading: false, data: newData, fileName: newFileName, view: "results", error: null, failedFiles
          };
        });
      } catch (err) {
        console.error(err);
        setState((s) => ({
          ...s,
          loading: false,
          error: "An unexpected error occurred while processing files.",
        }));
      }
    },
    [setState]
  );

  const handleReset = () =>
    setState({ view: "drop", loading: false, loadingName: "", error: null, data: null, fileName: "" });

  const handleExportJson = () => {
    if (!data) return;
    downloadBlob(JSON.stringify(data, null, 2), fileName.replace(/\.pdf$/i, "") + "_sales_order.json", "application/json");
  };

  const handleSave = async () => {
    if (!data || data.length === 0) return;
    
    const newItemsData = data.filter(d => !d.id);
    if (newItemsData.length === 0) {
      showToast("No new data to save.");
      return;
    }

    try {
      showToast("Saving new data and uploading PDFs...");
      
      const formattedData = await Promise.all(newItemsData.map(async (d) => {
        let finalPdfUrl = d.pdfUrl;
        
        // Upload if we have a new PDF
        if (finalPdfUrl && finalPdfUrl.startsWith("blob:")) {
          try {
            const response = await fetch(finalPdfUrl);
            const blob = await response.blob();
            const fileExt = (d.pdfName || "document.pdf").split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('pdfs')
              .upload(fileName, blob, { contentType: "application/pdf", upsert: false });
              
            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('pdfs')
                .getPublicUrl(fileName);
              finalPdfUrl = publicUrlData.publicUrl;
            } else {
              console.warn("PDF upload failed:", uploadError);
              finalPdfUrl = null;
            }
          } catch (e) {
            console.warn("PDF upload error:", e);
            finalPdfUrl = null;
          }
        }

        const reqPay = d.pricing?.find(p => p.description?.toLowerCase().includes("requisite payment"));
        const royalty = d.pricing?.find(p => p.description?.toLowerCase().includes("royalty"));
        const nmet = d.pricing?.find(p => {
          const lower = p.description?.toLowerCase() || "";
          return lower.includes("nmet") || lower.includes("nemt") || lower.includes("nmedt") || lower.includes("national mineral");
        });
        const dmf = d.pricing?.find(p => {
          const lower = p.description?.toLowerCase() || "";
          return lower.includes("dmf") || lower.includes("district mineral");
        });
        const tcsObj = d.pricing?.find(p => p.description?.toLowerCase().includes("tcs"));
        let tcsValue = null;
        if (tcsObj) {
          tcsValue = tcsObj.rate_per_te;
        }

        const soValueObj = d.pricing?.find(p => p.description?.toLowerCase().includes("so value") || p.description?.toLowerCase().includes("grand total including emd"));
        let soValueRate = soValueObj ? soValueObj.rate_per_te : null;

        const emdObj = d.pricing?.find(p => p.description?.toLowerCase().includes("less emd"));
        let lessEmdRate = emdObj ? emdObj.rate_per_te : null;
        
        // Helper to parse numerical fields safely
        const parseNum = (val) => {
          if (val === undefined || val === null || val === "") return null;
          const parsed = parseFloat(val.toString().replace(/,/g, ''));
          return isNaN(parsed) ? null : parsed;
        };

        // Helper to parse dates safely
        const parseDate = (val) => {
          if (!val || val === "-") return null;
          const d = new Date(val);
          if (isNaN(d)) return null;
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        return {
          pdf_name: d.pdfName || "Manual Entry",
          pdf_url: finalPdfUrl && finalPdfUrl.startsWith('http') ? finalPdfUrl : null,
          name: d.sold_to_party?.name || d.receiver?.name || null,
          sales_order_number: d.order_info?.sales_order_number || null,
          sales_order_valid_from: parseDate(d.order_info?.sales_order_valid_from),
          sales_order_valid_to: parseDate(d.order_info?.sales_order_valid_to),
          office_area: d.company?.office_area || d.mine_info?.area || null,
          mine: d.mine_info?.mine || d.line_items?.[0]?.mine || null,
          quantity: parseNum(d.line_items?.[0]?.quantity || d.mine_info?.quantity_words),
          rate_per_te: parseNum(reqPay?.rate_per_te || d.pricing?.[0]?.rate_per_te),
          amount: parseNum(reqPay?.amount || d.totals?.requisite_payment || d.pricing?.[0]?.amount),
          royalty_pmt: parseNum(royalty?.rate_per_te),
          nemt: nmet?.description ? parseNum(nmet.description.match(/(\d+(?:\.\d+)?)%/)?.[1]) || 2 : 2,
          dmf: dmf?.description ? parseNum(dmf.description.match(/(\d+(?:\.\d+)?)%/)?.[1]) || 30 : 30,
          tcs: parseNum(tcsValue),
          so_value_rate: parseNum(soValueRate),
          less_emd: parseNum(lessEmdRate)
        };
      }));

      const { error: dbError } = await supabase.from('sales_orders').insert(formattedData);
      
      if (dbError) throw dbError;
      
      showToast("Data and PDFs saved successfully!");
      
      // Trigger a re-fetch to get correct IDs from DB
      setCurrentPage(1);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Supabase Save Error:", err);
      showToast("Error saving: " + err.message);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    downloadBlob(toCSVSalesOrder(data), fileName.replace(/\.pdf$/i, "") + "_SO.csv", "text/csv");
  };

  const handleDeleteRow = async (index) => {
    const item = data[index];
    
    // If it has an id, delete it from Supabase
    if (item && item.id) {
      try {
        const { error: dbError } = await supabase.from('sales_orders').delete().eq('id', item.id);
        if (dbError) throw dbError;
        showToast("Deleted from database successfully");
      } catch (err) {
        console.error("Error deleting from database:", err);
        showToast("Error deleting from database: " + err.message);
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
    const item = { ...data[index] };
    
    // Update nested objects safely
    item.receiver = { ...item.receiver, name: updatedRow.name };
    item.sold_to_party = { ...item.sold_to_party, name: updatedRow.name };
    item.company = { ...item.company, office_area: updatedRow.office_area };
    item.mine_info = { ...item.mine_info, mine: updatedRow.mine };
    
    item.order_info = { 
      ...item.order_info, 
      sales_order_number: updatedRow.sales_order_number,
      sales_order_valid_from: updatedRow.sales_order_valid_from,
      sales_order_valid_to: updatedRow.sales_order_valid_to
    };
    
    if (item.line_items && item.line_items.length > 0) {
      item.line_items[0] = {
        ...item.line_items[0],
        quantity: updatedRow.quantity,
        mine: updatedRow.mine
      };
    }
    
    // Find Requisite Payment row to update
    if (item.pricing && item.pricing.length > 0) {
      const reqIndex = item.pricing.findIndex(p => p.description?.toLowerCase().includes("requisite payment"));
      if (reqIndex !== -1) {
        item.pricing[reqIndex] = {
          ...item.pricing[reqIndex],
          rate_per_te: updatedRow.rate_per_te,
          amount: updatedRow.amount
        };
      } else {
        // Fallback, update the first pricing item
        item.pricing[0] = {
          ...item.pricing[0],
          rate_per_te: updatedRow.rate_per_te,
          amount: updatedRow.amount
        };
      }
    }

    // If it has an id, update it in Supabase
    if (item.id) {
      try {
        const parseNum = (val) => {
          if (!val) return 0;
          const parsed = parseFloat(val.toString().replace(/,/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        };
        const parseDate = (val) => {
          if (!val || val === "-") return null;
          const d = new Date(val);
          if (isNaN(d)) return null;
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const updatePayload = {
          name: updatedRow.name || null,
          sales_order_number: updatedRow.sales_order_number || null,
          sales_order_valid_from: parseDate(updatedRow.sales_order_valid_from),
          sales_order_valid_to: parseDate(updatedRow.sales_order_valid_to),
          office_area: updatedRow.office_area || null,
          mine: updatedRow.mine || null,
          quantity: parseNum(updatedRow.quantity),
          rate_per_te: parseNum(updatedRow.rate_per_te),
          amount: parseNum(updatedRow.amount)
        };

        const { error: dbError } = await supabase.from('sales_orders').update(updatePayload).eq('id', item.id);
        if (dbError) throw dbError;
        showToast("Updated in database successfully");
      } catch (err) {
        console.error("Error updating database:", err);
        showToast("Error updating database: " + err.message);
        return;
      }
    }

    setState((s) => {
      const newData = [...s.data];
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
            title="Upload Sales Order PDF"
            icon="📄"
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
                    <th>Name</th>
                    <th>Sales Order Number</th>
                    <th>Sales Order Valid From</th>
                    <th>Sales Order Valid To</th>
                    <th>Office Area</th>
                    <th>Quantity</th>
                    <th>Mine</th>
                    <th className="num">Rate Per TE(INR)</th>
                    <th className="num">Amount(INR)</th>
                    <th>Left Days</th>
                    <th>Submitted Date</th>
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
        <SalesOrderResults
          data={data}
          fileName={fileName}
          failedFiles={state.failedFiles}
          onReset={handleReset}
          onAddFiles={handleFiles}
          onExportJson={handleExportJson}
          onExportCsv={handleExportCsv}
          onSave={handleSave}
          onDeleteRow={handleDeleteRow}
          onUpdateRow={handleUpdateRow}
          onAddManual={() => setIsModalOpen(true)}
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          isFetching={isFetching}
          onPageChange={(page) => {
            setCurrentPage(page);
          }}
        />
      )}

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleManualAdd}
        title="Add Manual Entry"
        initialData={{}}
        columns={[
          { key: "name", label: "Name" },
          { key: "sales_order_number", label: "Sales Order Number" },
          { key: "sales_order_valid_from", label: "Sales Order Valid From" },
          { key: "sales_order_valid_to", label: "Sales Order Valid To" },
          { key: "office_area", label: "Office Area" },
          { key: "quantity", label: "Quantity" },
          { key: "mine", label: "Mine" },
          { key: "rate_per_te", label: "Rate Per TE(INR)" },
          { key: "amount", label: "Amount(INR)" },
        ]}
        tableName="sales_orders"
      />
    </div>
  );
}