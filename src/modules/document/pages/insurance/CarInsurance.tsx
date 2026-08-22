import { useState, useEffect } from "react";
import { Plus, Search, FileText, Edit, Trash2 } from "lucide-react";
import useDataStore from "../../store/dataStore";
import { fetchCarInsuranceFromGoogleSheets, submitToGoogleSheets } from "../../utils/googleSheetsService";
import { toast } from "react-hot-toast";
import AddCarInsurance from "./AddCarInsurance";
import EditCarInsurance from "./EditCarInsurance";
import { CarInsuranceItem } from "../../store/dataStore";

const CarInsurance = () => {
  const { setCarInsurances, deleteCarInsurance, carInsurances: storeCarInsurances } = useDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CarInsuranceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !storeCarInsurances || storeCarInsurances.length === 0);
  const [error, setError] = useState<string | null>(null);

  const [documents, setDocuments] = useState(() => storeCarInsurances || []);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Single helper to parse any date string into a Date object
  // Google Sheets (US locale) swaps DD-MM to MM-DD for ambiguous dates.
  // We detect and swap back so dates match the intended DD-MM-YYYY format.
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;

    // ISO format like "2026-08-01T18:30:00.000Z"
    if (dateString.includes('T')) {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return null;

      const month = d.getMonth() + 1; // 1-12
      const day = d.getDate();         // 1-31

      // If day <= 12, Google likely swapped DD↔MM. Swap back.
      // If day > 12, no swap was possible, date is correct.
      if (day <= 12 && month !== day) {
        return new Date(d.getFullYear(), day - 1, month);
      }

      return d;
    }

    // Handle slash or dash separated dates
    const sep = dateString.includes('/') ? '/' : '-';
    const parts = dateString.split(sep);

    if (parts.length === 3) {
      const p0 = parseInt(parts[0]);
      const p1 = parseInt(parts[1]);
      const p2 = parseInt(parts[2]);

      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const d = new Date(p0, p1 - 1, p2);
        return isNaN(d.getTime()) ? null : d;
      }

      // Always interpret as DD-MM-YYYY (Indian format)
      if (p0 > 12) {
        const d = new Date(p2, p1 - 1, p0);
        return isNaN(d.getTime()) ? null : d;
      }
      if (p1 > 12) {
        const d = new Date(p2, p0 - 1, p1);
        return isNaN(d.getTime()) ? null : d;
      }

      // Both <= 12: default to DD-MM-YYYY
      const d = new Date(p2, p1 - 1, p0);
      return isNaN(d.getTime()) ? null : d;
    }

    const fallback = new Date(dateString);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  // Format a date string to "DD MMM YYYY" e.g. "02 Aug 2026"
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = parseDate(dateString);
    if (!d) return dateString;
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const loadData = async (force = false) => {
    try {
      if (force || !storeCarInsurances || storeCarInsurances.length === 0) {
        setIsLoading(true);
      }
      setError(null);
      
      const fetchedDocs = await fetchCarInsuranceFromGoogleSheets();
      
      // Calculate Days Remaining and Status dynamically
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const processedDocs = fetchedDocs.map(doc => {
        let daysRemaining = "";
        let status = "Active";

        if (doc.policyExpiryDate) {
          const expiryDate = parseDate(doc.policyExpiryDate);

          if (expiryDate) {
            // Normalize expiry to midnight local for accurate day diff
            const expiryNorm = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
            const timeDiff = expiryNorm.getTime() - today.getTime();
            const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));
            
            daysRemaining = daysDiff.toString();
            
            if (daysDiff < 0) {
              status = "Expired";
            } else if (daysDiff <= 30) {
              status = "Expiring Soon";
            }
          }
        }

        return { ...doc, daysRemaining, status };
      });

      setDocuments(processedDocs);
      setCarInsurances(processedDocs);
    } catch (err: any) {
      console.error("Error loading car insurance data:", err);
      setError(err.message || "Failed to load data");
      
      if (storeCarInsurances && storeCarInsurances.length > 0) {
        setDocuments(storeCarInsurances);
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, rowIndex?: number) => {
    if (!rowIndex) {
      toast.error("Cannot delete: Row index missing. Please refresh the page.");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this record?")) {
      setIsDeleting(id);
      try {
        await submitToGoogleSheets({
          action: "delete",
          sheetName: "Car Insurance",
          rowIndex: rowIndex,
        });
        deleteCarInsurance(id);
        toast.success("Record deleted successfully");
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete record");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const filteredData = documents.filter((item) => {
    const searchString = `${item.vehicleNo} ${item.ownerName} ${item.insuranceCompany} ${item.policyNo}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <>
      <div className="space-y-4">
        {/* Header and Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl shadow-input">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Car Insurance</h1>
            <p className="text-gray-500 text-sm mt-1">Manage car insurance policies</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2.5 w-full shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* Loading and Error States */}
        {isLoading && (
          <div className="flex justify-center items-center py-12 bg-white rounded-xl shadow-input">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="text-gray-500 text-sm">Loading data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => loadData(true)}
                  className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table View */}
        {!isLoading && !error && (
          <div className="hidden md:flex flex-col bg-white rounded-xl shadow-input overflow-hidden h-[calc(100vh-350px)]">
            <div className="overflow-auto flex-1">
              <table className="w-full min-w-max text-center border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                    <th className="px-3 py-2 text-center bg-gray-50">S.No</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Vehicle No.</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Owner Name</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Insurance Company</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Policy No.</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Start Date</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Expiry Date</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Days Remaining</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Status</th>
                    <th className="px-3 py-2 text-center bg-gray-50">IDV (₹)</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Premium (₹)</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Agent / Contact</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Remarks</th>
                    <th className="px-3 py-2 text-center bg-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((doc, i) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-sm text-gray-600 font-medium">
                        {doc.sn || i + 1}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-800">
                        {doc.vehicleNo || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {doc.ownerName || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {doc.insuranceCompany || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {doc.policyNo || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {formatDate(doc.policyStartDate)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {formatDate(doc.policyExpiryDate)}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold">
                        <span className={`px-2 py-1 rounded-md ${
                          parseInt(doc.daysRemaining) < 0 ? "bg-red-100 text-red-700" :
                          parseInt(doc.daysRemaining) <= 30 ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {doc.daysRemaining ? `${doc.daysRemaining} Days` : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === "Expired" ? "bg-red-100 text-red-800" :
                          doc.status === "Expiring Soon" ? "bg-yellow-100 text-yellow-800" :
                          "bg-green-100 text-green-800"
                        }`}>
                          {doc.status || "Active"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {doc.idv || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 font-medium">
                        {doc.premium || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {doc.agentContact || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500 max-w-xs truncate" title={doc.remarks}>
                        {doc.remarks || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Edit"
                            onClick={() => { setSelectedItem(doc); setIsEditModalOpen(true); }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                            title="Delete"
                            disabled={isDeleting === doc.id}
                            onClick={() => handleDelete(doc.id, doc.rowIndex)}
                          >
                            {isDeleting === doc.id ? (
                              <div className="w-4 h-4 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="h-10 w-10 text-gray-400 mb-3" />
                          <p className="text-sm font-medium text-gray-900">No records found</p>
                          <p className="text-xs text-gray-500 mt-1">Try adjusting your search</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      
      {/* Add Modal */}
      {isAddModalOpen && (
        <AddCarInsurance
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => loadData(true)}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditCarInsurance
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }}
          carInsurance={selectedItem}
        />
      )}
    </>
  );
};

export default CarInsurance;
