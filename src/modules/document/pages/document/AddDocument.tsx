import { useState, useMemo, useEffect } from "react";
import useDataStore, { DocumentItem } from "../../store/dataStore";
import { toast } from "react-hot-toast";
import { X, Save, Plus, Upload, Trash2, Loader2 } from "lucide-react";
import SearchableInput from "../../components/SearchableInput";
import {
  fetchMasterFromGoogleSheets,
  submitToGoogleSheets,
  fetchDocumentTypesOnly,
  fetchRenewalFilterNames
} from "../../utils/googleSheetsService";

interface DocumentEntry {
  id: string;
  documentName: string;
  documentType: string;
  category: string;
  name: string; // The "Name" field (user entered name)
  companyName: string; // Company name from dropdown
  needsRenewal: boolean;
  renewalDate?: string;
  file: File | null;
  fileName: string;
  fileContent?: string;
  issueDate: string;
  concernPersonName: string;
  concernPersonMobile: string;
  concernPersonDepartment: string;
  autoDebited: string;
  dueDate: string;
  dateOfProposal: string;
  sumAssured: string;
  premium: string;
  premiumPayingTerm: string;
  policyTerm: string;
  firstPremiumDate: string;
  dueDateOfLastPremium: string;
  coverageTill: string;
  docRemarks: string;
}

interface AddDocumentProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddDocument: React.FC<AddDocumentProps> = ({ isOpen, onClose }) => {
  const { addDocuments, masterData, addMasterData } = useDataStore();
  const defaultCategories = ["Personal", "Company", "Director"];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remoteDocTypes, setRemoteDocTypes] = useState<string[]>([]);
  const [remoteCategories, setRemoteCategories] = useState<string[]>([]);
  const [remotePersonNames, setRemotePersonNames] = useState<string[]>([]);
  const [entries, setEntries] = useState<DocumentEntry[]>([
    {
      id: Math.random().toString(),
      documentName: "",
      documentType: "",
      category: "",
      name: "", // User entered name
      companyName: "", // Company name from dropdown
      needsRenewal: false,
      renewalDate: "",
      file: null,
      fileName: "",
      issueDate: "",
      concernPersonName: "",
      concernPersonMobile: "",
      concernPersonDepartment: "",
      autoDebited: "",
      dueDate: "",
      dateOfProposal: "",
      sumAssured: "",
      premium: "",
      premiumPayingTerm: "",
      policyTerm: "",
      firstPremiumDate: "",
      dueDateOfLastPremium: "",
      coverageTill: "",
      docRemarks: "",
    },
  ]);

  const [companies, setCompanies] = useState([
    "Botivate",
    "Tata Insurance",
    "Company A",
    "Company B",
    "Company C",
  ]);

  const typeOptions = useMemo(() => {
    const local = masterData?.map((m) => m.documentType) || [];
    return Array.from(new Set([...remoteDocTypes, ...local])).filter(Boolean);
  }, [masterData, remoteDocTypes]);

  const categoryOptions = useMemo(() => {
    const local = masterData?.map((m) => m.category) || [];
    return Array.from(
      new Set([...remoteCategories, ...local, ...defaultCategories]),
    ).filter(Boolean);
  }, [masterData, remoteCategories]);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    (async () => {
      try {
        const [rows, docTypesOnly, personNames] = await Promise.all([
          fetchMasterFromGoogleSheets(),
          fetchDocumentTypesOnly(),
          fetchRenewalFilterNames()
        ]);
        if (!mounted) return;

        const masterDocTypes = rows
          .map(
            (r: {
              documentType: string;
              category: string;
              companyName: string;
            }) => r.documentType,
          )
          .filter((v: string) => typeof v === "string" && v.trim().length > 0);
          
        const cats = rows
          .map(
            (r: {
              documentType: string;
              category: string;
              companyName: string;
            }) => r.category,
          )
          .filter((v: string) => typeof v === "string" && v.trim().length > 0);

        setRemoteDocTypes(Array.from(new Set([...masterDocTypes, ...docTypesOnly])));
        setRemoteCategories(Array.from(new Set(cats)));
        setRemotePersonNames(Array.from(new Set(personNames)));
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof DocumentEntry, value: any) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleFileChange = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEntries((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                ...item,
                file: file,
                fileName: file.name,
                fileContent: reader.result as string,
              }
              : item,
          ),
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const addEntry = () => {
    if (entries.length >= 10) {
      toast.error("You can add maximum 10 documents at a time.");
      return;
    }

    // Get the last entry (most recently filled)
    const lastEntry = entries[entries.length - 1];

    // Create new entry with all data copied from last entry EXCEPT Document Name and File
    const newEntry: DocumentEntry = {
      id: Math.random().toString(),
      documentName: "", // Document Name is left empty for user to fill
      documentType: lastEntry.documentType || "", // Copy document type
      category: lastEntry.category || "", // Copy category
      name: lastEntry.name || "", // Copy name
      companyName: lastEntry.companyName || "", // Copy company name
      needsRenewal: lastEntry.needsRenewal || false, // Copy needs renewal
      renewalDate: lastEntry.renewalDate || "", // Copy renewal date
      file: null, // File is not copied
      fileName: "", // File name is not copied
      issueDate: lastEntry.issueDate || "", // Copy issue date
      concernPersonName: lastEntry.concernPersonName || "", // Copy concern person name
      concernPersonMobile: lastEntry.concernPersonMobile || "", // Copy concern person mobile
      concernPersonDepartment: lastEntry.concernPersonDepartment || "", // Copy concern person department
      autoDebited: lastEntry.autoDebited || "", // Copy auto debited
      dueDate: lastEntry.dueDate || "",
      dateOfProposal: lastEntry.dateOfProposal || "",
      sumAssured: lastEntry.sumAssured || "",
      premium: lastEntry.premium || "",
      premiumPayingTerm: lastEntry.premiumPayingTerm || "",
      policyTerm: lastEntry.policyTerm || "",
      firstPremiumDate: lastEntry.firstPremiumDate || "",
      dueDateOfLastPremium: lastEntry.dueDateOfLastPremium || "",
      coverageTill: lastEntry.coverageTill || "",
      docRemarks: lastEntry.docRemarks || "",
    };

    setEntries((prev) => [...prev, newEntry]);

    // Show toast notification
    toast.success(
      "Previous entry data copied to new form. Please fill Document Name.",
    );
  };

  const removeEntry = (id: string) => {
    if (entries.length === 1) {
      toast.error("At least one document is required.");
      return;
    }
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const getNameLabel = (category: string) => {
    const c = category?.toLowerCase() || "";
    if (c.includes("personal")) return "Person Name";
    if (c.includes("director")) return "Director Name";
    if (c.includes("company")) return "Company Name";
    return "Name";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only Document Name is mandatory
    for (const entry of entries) {
      if (!entry.documentName || entry.documentName.trim() === "") {
        toast.error("Please fill Document Name for all entries.");
        return;
      }

      // Only check renewal date if needsRenewal is true
      if (entry.needsRenewal && !entry.renewalDate) {
        toast.error(
          "Please select a renewal date for entries that need renewal.",
        );
        return;
      }

      // All other fields are optional - NO VALIDATION
    }

    setIsSubmitting(true);

    // FETCH LATEST DATA: Critical for multi-user SN generation
    // Frontend SN generation removed

    const folderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;


    try {
      const newDocuments: DocumentItem[] = [];

      // Create an array to store file upload promises
      const uploadPromises = entries.map(async (entry, i) => {
        if (entry.file && entry.fileContent && folderId) {
          try {
            console.log(`Uploading file ${i + 1}: ${entry.fileName}`);
            const uploadRes = await submitToGoogleSheets({
              action: "uploadFile",
              sheetName: "Documents",
              data: {
                base64Data: entry.fileContent,
                fileName: entry.fileName,
                mimeType: entry.file.type,
                folderId: folderId,
              },
            });

            if (uploadRes && uploadRes.fileUrl) {
              console.log(`✅ Upload successful for file ${i + 1}`);
              return { index: i, fileUrl: uploadRes.fileUrl };
            } else {
              console.error(`❌ Upload failed for file ${i + 1}`);
              toast.error(`File ${entry.fileName} upload failed. Saving without file.`);
              return { index: i, fileUrl: null };
            }
          } catch (uploadErr) {
            console.error(`❌ Upload error for file ${i + 1}:`, uploadErr);
            toast.error(`Failed to upload ${entry.fileName}, saving without file.`);
            return { index: i, fileUrl: null };
          }
        }
        return { index: i, fileUrl: null };
      });

      // Wait for all file uploads to complete concurrently
      const uploadResults = await Promise.all(uploadPromises);

      // Now process all entries concurrently
      const insertPromises = entries.map(async (entry, index) => {
        // Only add to master data if all three fields are filled
        if (entry.name && entry.documentType && entry.category) {
          const exists = masterData?.some(
            (m) =>
              m.companyName.toLowerCase() === entry.name.toLowerCase() &&
              m.documentType.toLowerCase() ===
              entry.documentType.toLowerCase() &&
              m.category.toLowerCase() === entry.category.toLowerCase(),
          );

          if (!exists) {
            addMasterData({
              id: Math.random().toString(36).substr(2, 9),
              companyName: entry.name,
              documentType: entry.documentType,
              category: entry.category,
            });
          }
        }

        // Get file URL from upload results
        const uploadResult = uploadResults.find(r => r.index === index);
        const fileUrl = uploadResult?.fileUrl || "";

        // 2. Prepare Payload
        const now = new Date();
        const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

        // Format Renewal Date: YYYY-MM-DD HH:mm (For Google Sheets Formulas)
        let formattedRenewalDate = "";
        if (entry.renewalDate) {
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          formattedRenewalDate = `${entry.renewalDate} ${hours}:${minutes}`;
        }

        // Format Issue Date: YYYY-MM-DD (ISO 8601 to avoid DD/MM vs MM/DD confusion)
        let formattedIssueDate = "";
        if (entry.issueDate) {
          formattedIssueDate = entry.issueDate;
        }

        // Use empty strings for optional fields if not filled
        const sheetData = {
          Timestamp: formattedTimestamp,
          "Serial No": "", // Leave empty for backend to generate
          "Document name": entry.documentName,
          "Document Type": entry.documentType || "", // Empty if not filled
          Category: entry.category || "", // Empty if not filled
          Name: entry.name || "", // Empty if not filled
          "Need Renewal": entry.needsRenewal ? "Yes" : "No",
          "Renewal Date": formattedRenewalDate,
          Image: fileUrl || "",
          issueDate: formattedIssueDate,
          concernPersonName: entry.concernPersonName || "", // Empty if not filled
          concernPersonMobile: entry.concernPersonMobile || "", // Empty if not filled
          concernPersonDepartment: entry.concernPersonDepartment || "", // Empty if not filled
          CompanyName: entry.companyName || "", // Empty if not filled
          autoDebited: entry.autoDebited || "", // Empty if not filled
          dueDate: entry.dueDate || "",
          dateOfProposal: entry.dateOfProposal || "",
          sumAssured: entry.sumAssured || "",
          premium: entry.premium || "",
          premiumPayingTerm: entry.premiumPayingTerm || "",
          policyTerm: entry.policyTerm || "",
          firstPremiumDate: entry.firstPremiumDate || "",
          dueDateOfLastPremium: entry.dueDateOfLastPremium || "",
          coverageTill: entry.coverageTill || "",
          docRemarks: entry.docRemarks || "",
        };

        // 3. Submit Document
        let serverResponseSN = "";
        try {
          const res = await submitToGoogleSheets({
            action: "insert",
            sheetName: "Documents",
            data: [
              sheetData.Timestamp, // A
              sheetData["Serial No"], // B - will be empty string, server generates it
              sheetData["Document name"], // C
              sheetData["Document Type"], // D
              sheetData.Category, // E
              sheetData.Name, // F: Name (user entered)
              sheetData["Need Renewal"], // G
              sheetData["Renewal Date"], // H
              sheetData.Image, // I
              null, // J: Status
              null, // K: Planned1
              null, // L: Actual1
              sheetData.issueDate, // M
              sheetData.concernPersonName, // N
              sheetData.concernPersonMobile, // O
              sheetData.concernPersonDepartment, // P
              sheetData.CompanyName, // Q: Company Name (from dropdown)
              sheetData.autoDebited, // R: Auto Debited
              sheetData.dueDate, // S: Due Date
              sheetData.dateOfProposal, // T: Date of Proposal
              sheetData.sumAssured, // U: Sum Assured
              sheetData.premium, // V: Premium
              sheetData.premiumPayingTerm, // W: Premium Paying Term
              sheetData.policyTerm, // X: Policy Term
              sheetData.firstPremiumDate, // Y: First Premium Date
              sheetData.dueDateOfLastPremium, // Z: Due Date of Last Premium
              sheetData.coverageTill, // AA: Coverage Till
              sheetData.docRemarks, // AB: Remarks
            ],
          });

          console.log(`✅ Document ${index + 1} saved to Google Sheets`);
          if (res && res.serialNo) {
            serverResponseSN = res.serialNo;
          }
        } catch (error) {
          console.error(`❌ Error saving document ${index + 1}:`, error);
          throw error;
        }

        // Return new document item
        return {
          id: Math.random().toString(36).substr(2, 9),
          sn: serverResponseSN || "Pending", // Use SN from server
          documentName: entry.documentName,
          companyName: entry.name || "", // Empty if not filled
          pName: entry.name || "", // Empty if not filled
          documentType: entry.documentType || "", // Empty if not filled
          category: entry.category || "", // Empty if not filled
          needsRenewal: entry.needsRenewal,
          renewalDate: entry.needsRenewal ? entry.renewalDate : undefined,
          file: entry.fileName || null,
          fileContent: fileUrl || undefined, // Store URL only, avoid Base64 storage
          date: new Date().toISOString().split("T")[0],
          status: "Active",
          issueDate: entry.issueDate,
          concernPersonName: entry.concernPersonName,
          concernPersonMobile: entry.concernPersonMobile,
          concernPersonDepartment: entry.concernPersonDepartment,
          companyBranch: entry.companyName || "", // Empty if not filled
          autoDebited: entry.autoDebited || "",
          dueDate: entry.dueDate || "",
          dateOfProposal: entry.dateOfProposal || "",
          sumAssured: entry.sumAssured || "",
          premium: entry.premium || "",
          premiumPayingTerm: entry.premiumPayingTerm || "",
          policyTerm: entry.policyTerm || "",
          firstPremiumDate: entry.firstPremiumDate || "",
          dueDateOfLastPremium: entry.dueDateOfLastPremium || "",
          coverageTill: entry.coverageTill || "",
          docRemarks: entry.docRemarks || "",
          sharedExpiryDate: undefined,
          lastSharedAt: "",
        };
      });

      const insertedDocs = await Promise.all(insertPromises);
      newDocuments.push(...insertedDocs);

      addDocuments(newDocuments);
      toast.success(`${newDocuments.length} Document(s) added successfully`);
      onClose();

      setEntries([
        {
          id: Math.random().toString(),
          documentName: "",
          documentType: "",
          category: "",
          name: "", // Reset name
          companyName: "", // Reset company name
          needsRenewal: false,
          renewalDate: "",
          file: null,
          fileName: "",
          issueDate: "",
          concernPersonName: "",
          concernPersonMobile: "",
          concernPersonDepartment: "",
          autoDebited: "",
          dueDate: "",
          dateOfProposal: "",
          sumAssured: "",
          premium: "",
          premiumPayingTerm: "",
          policyTerm: "",
          firstPremiumDate: "",
          dueDateOfLastPremium: "",
          coverageTill: "",
          docRemarks: "",
        },
      ]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save to Google Sheets.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-4 w-full max-w-4xl bg-white rounded-xl shadow-input">
        {/* Header Compact */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              New Document Entry
            </h2>
            <p className="text-xs text-gray-500">Add details (Max 10)</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Compact */}
        <div className="p-4 max-h-[75vh] overflow-y-auto bg-gray-50/30">
          <form id="add-doc-form" onSubmit={handleSubmit} className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="relative p-4 bg-white rounded-lg shadow-input group"
              >
                <div className="flex justify-between items-center pb-1 mb-2 border-b border-gray-50">
                  <h3 className="text-xs font-bold tracking-wider text-gray-600 uppercase">
                    Document #{index + 1}
                    {index > 0 && (
                      <span className="ml-2 text-xs font-normal text-red-600">
                        (Auto-filled from previous)
                      </span>
                    )}
                  </h3>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 text-red-500 rounded transition-colors hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Compact Grid: Gaps reduced */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* 1. Document Name (Input) - ONLY MANDATORY */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">
                      Document Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.documentName}
                      onChange={(e) =>
                        handleChange(entry.id, "documentName", e.target.value)
                      }
                      placeholder="e.g. Agreement"
                    />
                  </div>

                  {/* 2. Document Type (Searchable) - OPTIONAL */}
                  <div>
                    <SearchableInput
                      compact
                      label="Document Type"
                      value={entry.documentType}
                      onChange={(val) =>
                        handleChange(entry.id, "documentType", val)
                      }
                      options={typeOptions}
                      placeholder="Select Type..."
                    />
                  </div>

                  {/* 3. Category (Searchable) - OPTIONAL */}
                  <div>
                    <SearchableInput
                      compact
                      label="Category"
                      value={entry.category}
                      onChange={(val) =>
                        handleChange(entry.id, "category", val)
                      }
                      options={categoryOptions}
                      placeholder="Select Category..."
                    />
                  </div>

                  {/* 4. Name (SearchableInput) - OPTIONAL */}
                  <div>
                    <SearchableInput
                      compact
                      label={getNameLabel(entry.category)}
                      value={entry.name}
                      onChange={(val) =>
                        handleChange(entry.id, "name", val)
                      }
                      options={remotePersonNames}
                      placeholder={`Enter ${getNameLabel(entry.category)}...`}
                    />
                  </div>

                  {/* 5. Company Name (Dropdown Field) - OPTIONAL */}

                  <div className="hidden">
                    <label className="block mb-1 text-xs font-semibold text-gray-600">
                      Company Name
                    </label>

                    <input
                      list="company-list"
                      placeholder="Type or select company"
                      className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.companyName}
                      onChange={(e) =>
                        handleChange(entry.id, "companyName", e.target.value)
                      }
                      onBlur={() => {
                        const value = entry.companyName?.trim();
                        if (value && !companies.includes(value)) {
                          setCompanies((prev) => [...prev, value]);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const value = entry.companyName?.trim();
                          if (value && !companies.includes(value)) {
                            setCompanies((prev) => [...prev, value]);
                          }
                        }
                      }}
                    />

                    <datalist id="company-list">
                      {companies.map((company, index) => (
                        <option key={index} value={company} />
                      ))}
                    </datalist>
                  </div>

                  {/* 6. Needs Renewal & Date - OPTIONAL */}
                  <div className="flex gap-3 items-center p-2 rounded-lg border border-gray-100 bg-gray-50/50">
                    <label className="flex gap-2 items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                        checked={entry.needsRenewal}
                        onChange={(e) =>
                          handleChange(
                            entry.id,
                            "needsRenewal",
                            e.target.checked,
                          )
                        }
                      />
                      <span className="text-xs font-medium text-gray-700">
                        Need Renewal
                      </span>
                    </label>

                    {entry.needsRenewal && (
                      <div className="flex-1">
                        <input
                          type="date"
                          className="w-full p-1.5 text-xs shadow-input border-none rounded focus:ring-1 focus:ring-red-500 outline-none bg-white"
                          value={entry.renewalDate || ""}
                          onChange={(e) =>
                            handleChange(
                              entry.id,
                              "renewalDate",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* 7. Issue Date - OPTIONAL */}
                  <div className="hidden">
                    <label className="block mb-1 text-xs font-semibold text-gray-600">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.issueDate}
                      onChange={(e) =>
                        handleChange(entry.id, "issueDate", e.target.value)
                      }
                    />
                  </div>

                  {/* 8. Concern Person Name - OPTIONAL */}
                  <div className="hidden">
                    <label className="block mb-1 text-xs font-semibold text-gray-600">
                      Conser Person Name
                    </label>
                    <input
                      type="text"
                      className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.concernPersonName || ""}
                      onChange={(e) =>
                        handleChange(
                          entry.id,
                          "concernPersonName",
                          e.target.value,
                        )
                      }
                      placeholder="Name (Optional)"
                    />
                  </div>

                  {/* 9. Concern Person Mobile - OPTIONAL */}
                  <div className="hidden">
                    <label className="block mb-1 text-xs font-semibold text-gray-600">
                      Conser Mobile
                    </label>
                    <input
                      type="text"
                      className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.concernPersonMobile}
                      onChange={(e) =>
                        handleChange(
                          entry.id,
                          "concernPersonMobile",
                          e.target.value,
                        )
                      }
                      placeholder="Mobile"
                    />
                  </div>

                  {/* 10. Concern Person Department - OPTIONAL */}
                  <div className="hidden">
                    <label className="block mb-1 text-xs font-semibold text-gray-600">
                      Issue By
                    </label>
                    <input
                      type="text"
                      className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.concernPersonDepartment}
                      onChange={(e) =>
                        handleChange(
                          entry.id,
                          "concernPersonDepartment",
                          e.target.value,
                        )
                      }
                    />
                  </div>



                  {/* 12. Due Date - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">DUE DATE</label>
                    <input type="date" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.dueDate} onChange={(e) => handleChange(entry.id, "dueDate", e.target.value)} />
                  </div>

                  {/* 13. Date of Proposal - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">DATE OF THE PROPOSAL</label>
                    <input type="date" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.dateOfProposal} onChange={(e) => handleChange(entry.id, "dateOfProposal", e.target.value)} />
                  </div>

                  {/* 14. Sum Assured - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Sum Assured (₹)</label>
                    <input type="number" placeholder="e.g. 1000000" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.sumAssured} onChange={(e) => handleChange(entry.id, "sumAssured", e.target.value)} />
                  </div>

                  {/* 15. Premium - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Premium (₹ / year)</label>
                    <input type="number" placeholder="e.g. 25000" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.premium} onChange={(e) => handleChange(entry.id, "premium", e.target.value)} />
                  </div>

                  {/* 16. Premium Paying Term - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Premium Paying Term</label>
                    <input type="text" placeholder="e.g. 20 years" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.premiumPayingTerm} onChange={(e) => handleChange(entry.id, "premiumPayingTerm", e.target.value)} />
                  </div>

                  {/* 17. Policy Term - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Policy Term</label>
                    <input type="text" placeholder="e.g. 25 years" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.policyTerm} onChange={(e) => handleChange(entry.id, "policyTerm", e.target.value)} />
                  </div>

                  {/* 18. First Premium Date - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">First Premium Date</label>
                    <input type="date" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.firstPremiumDate} onChange={(e) => handleChange(entry.id, "firstPremiumDate", e.target.value)} />
                  </div>

                  {/* 19. Due Date of Last Premium - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Due Date of Last Premium</label>
                    <input type="date" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.dueDateOfLastPremium} onChange={(e) => handleChange(entry.id, "dueDateOfLastPremium", e.target.value)} />
                  </div>

                  {/* 20. Coverage Till (years) - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Coverage Till (years)</label>
                    <input type="number" placeholder="e.g. 25" className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.coverageTill} onChange={(e) => handleChange(entry.id, "coverageTill", e.target.value)} />
                  </div>

                  {/* 21. Remarks - OPTIONAL */}
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Remarks</label>
                    <textarea rows={2} placeholder="Any additional notes..." className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white resize-none"
                      value={entry.docRemarks} onChange={(e) => handleChange(entry.id, "docRemarks", e.target.value)} />
                  </div>

                  {/* 22. File Upload - OPTIONAL */}
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">
                      Auto Debited
                    </label>
                    <input
                      type="text"
                      className="p-2 w-full text-xs font-medium rounded-lg border-none transition-colors outline-none shadow-input focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.autoDebited}
                      onChange={(e) =>
                        handleChange(
                          entry.id,
                          "autoDebited",
                          e.target.value,
                        )
                      }
                      placeholder="e.g. Yes / No"
                    />
                  </div>

                  {/* 23. File Upload - OPTIONAL */}
                  <div>
                    <div className="relative">
                      <label className="block mb-1 text-xs font-semibold text-gray-600">
                        Upload File
                      </label>
                      <input
                        type="file"
                        id={`file-${entry.id}`}
                        className="hidden"
                        onChange={(e) => handleFileChange(entry.id, e)}
                      />
                      <label
                        htmlFor={`file-${entry.id}`}
                        className="flex gap-2 justify-center items-center p-2 w-full text-gray-600 bg-white rounded-lg border border-gray-300 border-dashed transition-all cursor-pointer hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                      >
                        <Upload size={14} />
                        <span className="text-xs font-medium truncate max-w-[180px]">
                          {entry.fileName || "Choose File"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors bg-white shadow-sm"
              >
                <Plus size={16} />
                Add Another Document ({entries.length}/10)

              </button>
            </div>
          </form>
        </div>

        {/* Footer Compact */}
        <div className="flex gap-3 px-5 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 text-sm font-bold text-gray-700 rounded-lg border border-gray-200 shadow-sm transition-all hover:bg-white hover:border-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-doc-form"
            disabled={isSubmitting}
            className={`flex-[2] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-white text-sm font-bold transition-all shadow-md shadow-red-100 ${isSubmitting
              ? "bg-red-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700"
              }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDocument;
