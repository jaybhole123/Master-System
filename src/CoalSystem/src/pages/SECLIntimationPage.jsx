import { useState, useCallback, useEffect } from "react";
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import SECLIntimationResults from "../components/SECLIntimationResults";
import EditModal from "../components/EditModal";
import SECLFormat2Page from "./SECLFormat2Page";
import { extractSECLData, toSECLCSV, COLS } from "../utils/seclParser";
import { downloadBlob } from "../utils/pdfParser";
import { supabase } from "../utils/supabase";
/**
 * SECLIntimationPage — owns the upload/result state for this page.
 */
export default function SECLIntimationPage({ state, setState }) {
  const PAGE_SIZE = 10;
  const [activeTab, setActiveTab] = useState("format1");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { view, loading, loadingName, error, data, fileName } = state;

  useEffect(() => {
    const fetchSupabaseData = async () => {
      setIsFetching(true);
      try {
        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data: dbData, error, count } = await supabase
          .from('secl_intimation_format_1')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        setTotalCount(count || 0);

        if (dbData && dbData.length > 0) {
          const formattedData = dbData.map(row => ({
            id: row.id,
            pdfName: "Supabase DB",
            pdfUrl: row.pdf_url || null,
            meta: {
              "Name of Bidder": row.name_of_bidder,
              "Submitted Date": row.submitted_date,
              "Date of Auction": row.date_of_auction
            },
            details: {},
            items: [{
              "Seller Name": row.seller_name,
              "Source Name": row.source_name,
              "Grade / Size": row.grade_size,
              "Quantity Allotted": row.quantity_allotted,
              "Winning Bid Price (Rs/MT)": row.winning_bid_price_rs_mt,
              "Prev": row.previous_value || ""
            }]
          }));

          setState(s => ({
            ...s,
            view: "results",
            data: formattedData,
            fileName: "Loaded from Supabase"
          }));
        } else if (currentPage === 1) {
          // No data at all
          setState(s => ({ ...s, view: "drop", data: null, fileName: "" }));
        }
      } catch (err) {
        console.error("Failed to fetch from Supabase:", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchSupabaseData();
  }, [currentPage, refreshTrigger, setState]);


  const handleManualAdd = async (formData) => {
    try {
      let pdf_url = null;

      // Upload PDF to Supabase Storage if provided
      if (formData.pdfFile) {
        const filePath = `pdfs/${Date.now()}_${formData.pdfFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("secl-pdfs")
          .upload(filePath, formData.pdfFile, { contentType: "application/pdf", upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("secl-pdfs")
            .getPublicUrl(filePath);
          pdf_url = publicUrlData?.publicUrl || null;
        } else {
          console.warn("PDF upload failed:", uploadError);
        }
      }

      const insertPayload = {
        name_of_bidder: formData.bidderName || "",
        submitted_date: formData.submittedDate || new Date().toISOString().split('T')[0],
        date_of_auction: formData.auctionDate || "",
        seller_name: formData.sellerName || "",
        source_name: formData.sourceName || "",
        grade_size: formData.gradeSize || "",
        quantity_allotted: parseFloat(formData.qtyAllotted) || 0,
        winning_bid_price_rs_mt: parseFloat(formData.bidPrice) || 0,
        pdf_url,
      };

      const { data: inserted, error } = await supabase
        .from('secl_intimation_format_1')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      // Add to local state with DB id
      const newItem = {
        id: inserted.id,
        pdfUrl: pdf_url,
        pdfName: formData.pdfFile ? formData.pdfFile.name : "Manual Entry",
        meta: {
          "Name of Bidder": formData.bidderName,
          "Submitted Date": formData.submittedDate || new Date().toISOString().split('T')[0],
          "Date of Auction": formData.auctionDate
        },
        details: {},
        items: [{
          "Seller Name": formData.sellerName,
          "Source Name": formData.sourceName,
          "Grade / Size": formData.gradeSize,
          "Quantity Allotted": formData.qtyAllotted,
          "Winning Bid Price (Rs/MT)": formData.bidPrice
        }]
      };

      setState((s) => ({
        ...s,
        data: s.data && Array.isArray(s.data) ? [...s.data, newItem] : [newItem],
        view: "results",
        fileName: s.fileName || "Manual Entry"
      }));

      setIsModalOpen(false);
      showToast("Entry saved to Supabase successfully!");
    } catch (err) {
      console.error("Manual Add Error:", err);
      showToast("Error saving entry to Supabase");
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
            const data = await extractSECLData(file);
            data.pdfUrl = URL.createObjectURL(file);
            data.pdfName = file.name;
            return data;
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
            "Failed to read PDF. (" +
            (err?.message ?? "unknown error") +
            ")",
        }));
      }
    },
    [setState]
  );

  const handleReset = () =>
    setState((s) => ({ ...s, view: "drop", loading: false, loadingName: "", error: null }));

  const handleExportJson = () => {
    if (!data) return;
    downloadBlob(JSON.stringify(data, null, 2), fileName.replace(/\.pdf$/i, "") + "_secl.json", "application/json");
  };

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
        newItemsData.flatMap((d) =>
          (d.items || []).map(async (item) => {
            let pdf_url = d.pdfUrl || null;

            // If pdfUrl is a blob URL, upload to Supabase Storage
            if (pdf_url && pdf_url.startsWith("blob:")) {
              try {
                const response = await fetch(pdf_url);
                const blob = await response.blob();
                const fileName = d.pdfName || `secl_${Date.now()}.pdf`;
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
              name_of_bidder: d.meta?.["Name of Bidder"] || "",
              submitted_date: d.meta?.["Submitted Date"] || new Date().toISOString().split('T')[0],
              date_of_auction: d.meta?.["Date of Auction"] || "",
              seller_name: item["Seller Name"] || "",
              source_name: item["Source Name"] || "",
              grade_size: item["Grade / Size"] || "",
              quantity_allotted: parseFloat(item["Quantity Allotted"]) || 0,
              winning_bid_price_rs_mt: parseFloat(item["Winning Bid Price (Rs/MT)"] || item["Winning Bid Price Rs/MT"]) || 0,
              pdf_url,
            };
          })
        )
      );

      const { data: insertedData, error } = await supabase.from('secl_intimation_format_1').insert(allItems).select();
      if (error) throw error;

      showToast("Data saved to Supabase successfully!");
      
      // Trigger a re-fetch to get correct IDs from DB without setting data to null
      setRefreshTrigger(prev => prev + 1);

    } catch (err) {
      console.error("Supabase Save Error:", err);
      showToast("Error saving to Supabase");
    }
  };


  const handleExportCsv = () => {
    if (!data) return;
    const allItems = data.flatMap((d, index) => d.items.map(item => ({ pdfIndex: index + 1, ...d.details, ...item })));
    downloadBlob(toSECLCSV(COLS, allItems), fileName.replace(/\.pdf$/i, "") + "_secl.csv", "text/csv");
  };

  const handleDeleteRow = async (index) => {
    let itemToDelete = null;
    
    setState((s) => {
      const newData = [...s.data];
      let currentIndex = 0;
      for (let i = 0; i < newData.length; i++) {
        const itemsCount = newData[i].items ? newData[i].items.length : 0;
        if (index >= currentIndex && index < currentIndex + itemsCount) {
          const itemIndex = index - currentIndex;
          itemToDelete = newData[i]; // Store the parent object that contains id
          
          const newItems = [...newData[i].items];
          newItems.splice(itemIndex, 1);
          newData[i] = { ...newData[i], items: newItems };
          break;
        }
        currentIndex += itemsCount;
      }
      
      // We will perform DB deletion outside the setState
      
      const hasAnyItems = newData.some(d => d.items && d.items.length > 0);
      if (!hasAnyItems) {
        return { ...s, view: "drop", data: null, fileName: "" };
      }
      return { ...s, data: newData };
    });

    if (itemToDelete && itemToDelete.id) {
      try {
        const { error } = await supabase.from('secl_intimation_format_1').delete().eq('id', itemToDelete.id);
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
      let currentIndex = 0;
      for (let i = 0; i < newData.length; i++) {
        const itemsCount = newData[i].items ? newData[i].items.length : 0;
        if (index >= currentIndex && index < currentIndex + itemsCount) {
          const itemIndex = index - currentIndex;
          // Get the id from the parent record (each Supabase row = one item)
          rowId = newData[i].id;

          const newItems = [...newData[i].items];
          newItems[itemIndex] = updatedRow;
          // Also update meta if bidder/date changed
          const updatedMeta = {
            ...newData[i].meta,
            "Name of Bidder": updatedRow["Name of Bidder"] || newData[i].meta?.["Name of Bidder"],
            "Date of Auction": updatedRow["Date of Auction"] || newData[i].meta?.["Date of Auction"],
          };
          newData[i] = { ...newData[i], items: newItems, meta: updatedMeta };
          break;
        }
        currentIndex += itemsCount;
      }
      return { ...s, data: newData };
    });

    // Update in Supabase if we have an id
    if (rowId) {
      try {
        const updatePayload = {
          name_of_bidder: updatedRow["Name of Bidder"] || updatedRow._meta?.["Name of Bidder"] || "",
          submitted_date: updatedRow["Submitted Date"] || updatedRow._meta?.["Submitted Date"] || "",
          date_of_auction: updatedRow["Date of Auction"] || updatedRow._meta?.["Date of Auction"] || "",
          seller_name: updatedRow["Seller Name"] || "",
          source_name: updatedRow["Source Name"] || "",
          grade_size: updatedRow["Grade / Size"] || "",
          quantity_allotted: parseFloat(updatedRow["Quantity Allotted"]) || 0,
          winning_bid_price_rs_mt: parseFloat(updatedRow["Winning Bid Price (Rs/MT)"] || updatedRow["Winning Bid Price Rs/MT"]) || 0,
        };
        const { error } = await supabase.from('secl_intimation_format_1').update(updatePayload).eq('id', rowId);
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
      <div style={{ padding: "0 0 20px 0", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 16px 0", fontFamily: "var(--font-display)", fontSize: 24 }}>SECL Extractions</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            className={`btn ${activeTab === 'format1' ? '' : 'outline'}`} 
            onClick={() => setActiveTab('format1')}
          >
            Format 1 (Intimation)
          </button>
          <button 
            className={`btn ${activeTab === 'format2' ? '' : 'outline'}`} 
            onClick={() => setActiveTab('format2')}
          >
            Format 2 (Allocation)
          </button>
        </div>
      </div>

      {activeTab === 'format1' && (
        <div>
          {view === "drop" && (
        <>
          <Dropzone
            onFiles={handleFiles}
            loading={loading}
            loadingName={loadingName}
            error={error}
            title="Upload SECL PDF"
            icon="📄"
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
              <table className="stable">
                <thead>
                  <tr>
                    <th>Name of Bidder</th>
                    <th>Date of Auction</th>
                    <th>Seller Name</th>
                    <th>Source Name</th>
                    <th>Grade / Size</th>
                    <th>Quantity Allotted</th>
                    <th>Winning Bid Price Rs/MT</th>
                    <th>Preview</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
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
        <SECLIntimationResults
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
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          isFetching={isFetching}
          onPageChange={(page) => {
            setCurrentPage(page);
            setState(s => ({ ...s, data: null }));
          }}
        />
      )}
        </div>
      )}

      {activeTab === 'format2' && (
        <SECLFormat2Page />
      )}

      {activeTab === 'format1' && (
        <EditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleManualAdd}
          title="Add Manual Entry"
          initialData={{}}
          columns={[
            { key: "bidderName", label: "Name of Bidder" },
            { key: "submittedDate", label: "Submitted Date (YYYY-MM-DD)" },
            { key: "auctionDate", label: "Date of Auction (YYYY-MM-DD)" },
            { key: "sellerName", label: "Seller Name" },
            { key: "sourceName", label: "Source Name" },
            { key: "gradeSize", label: "Grade / Size" },
            { key: "qtyAllotted", label: "Quantity Allotted" },
            { key: "bidPrice", label: "Winning Bid Price Rs/MT" }
          ]}
        />
      )}
    </div>
  );
}
