import { useState, useEffect, useMemo } from "react";
import { Plus, Search, FileText, Edit, Trash2, RotateCcw, ShieldCheck, AlertTriangle, Clock, Car, RefreshCw, ChevronRight, Eye, X, Shield, Calendar, User, Phone, CheckCircle2 } from "lucide-react";
import useDataStore from "../../store/dataStore";
import { fetchCarInsuranceFromGoogleSheets, submitToGoogleSheets } from "../../utils/googleSheetsService";
import { toast } from "react-hot-toast";
import AddCarInsurance from "./AddCarInsurance";
import EditCarInsurance from "./EditCarInsurance";
import RenewCarInsuranceModal from "./RenewCarInsuranceModal";
import VehicleReports from "../document/VehicleReports";
import { CarInsuranceItem } from "../../store/dataStore";

const CarInsurance = () => {
  const [activeTab, setActiveTab] = useState<'insurance' | 'vehicleReports'>('insurance');
  const { setCarInsurances, deleteCarInsurance, carInsurances: storeCarInsurances } = useDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CarInsuranceItem | null>(null);
  const [viewItem, setViewItem] = useState<CarInsuranceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !storeCarInsurances || storeCarInsurances.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Expiring Soon" | "Expired">("All");
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

  // Compute counts for cards
  const stats = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;

    documents.forEach((d) => {
      if (d.status === "Expired" || parseInt(d.daysRemaining) < 0) {
        expired++;
      } else if (d.status === "Expiring Soon" || (parseInt(d.daysRemaining) >= 0 && parseInt(d.daysRemaining) <= 30)) {
        expiring++;
      } else {
        active++;
      }
    });

    return {
      total: documents.length,
      active,
      expiring,
      expired,
    };
  }, [documents]);

  const filteredData = documents.filter((item) => {
    const searchString = `${item.vehicleNo} ${item.ownerName} ${item.insuranceCompany} ${item.policyNo}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "All") return true;
    if (statusFilter === "Expired") {
      return item.status === "Expired" || parseInt(item.daysRemaining) < 0;
    }
    if (statusFilter === "Expiring Soon") {
      return item.status === "Expiring Soon" || (parseInt(item.daysRemaining) >= 0 && parseInt(item.daysRemaining) <= 30);
    }
    if (statusFilter === "Active") {
      return item.status === "Active" && parseInt(item.daysRemaining) > 30;
    }
    return true;
  });

  return (
    <>
      <div className="space-y-4">
        {/* Tabs Header */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex gap-2">
          <button
            onClick={() => setActiveTab('insurance')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'insurance'
                ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <Car size={18} />
            <span>Car Insurance</span>
          </button>
          <button
            onClick={() => setActiveTab('vehicleReports')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'vehicleReports'
                ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <FileText size={18} />
            <span>Vehicle Reports</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'vehicleReports' ? (
          <div>
            <VehicleReports />
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Header and Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <Car size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Car Insurance</h1>
                <p className="text-gray-500 text-xs sm:text-sm">Manage, track & renew your car insurance policies</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search vehicle, owner, policy..."
                className="pl-9 pr-4 py-2 w-full text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50/70 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => loadData(true)}
              className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 hover:text-gray-800 transition-colors shadow-sm flex items-center justify-center"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin text-red-600" : ""} />
            </button>
            
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Add Policy</span>
            </button>
          </div>
        </div>

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Total Policies Card */}
          <div
            onClick={() => setStatusFilter("All")}
            className={`cursor-pointer px-3.5 py-2.5 rounded-xl transition-all border ${
              statusFilter === "All"
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/20 border-red-600 ring-2 ring-red-500/20"
                : "bg-white hover:border-red-200 text-gray-800 border-gray-100 shadow-sm hover:shadow"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${statusFilter === "All" ? "text-red-100" : "text-gray-500"}`}>
                  Total Policies
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none">{stats.total}</div>
              </div>
              <div className={`p-2 rounded-lg ${statusFilter === "All" ? "bg-white/20 text-white" : "bg-red-50 text-red-600"}`}>
                <Car size={16} />
              </div>
            </div>
            <div className={`text-[10px] mt-1.5 font-medium truncate ${statusFilter === "All" ? "text-red-100" : "text-gray-400"}`}>
              All registered vehicles
            </div>
          </div>

          {/* Active Policies Card */}
          <div
            onClick={() => setStatusFilter("Active")}
            className={`cursor-pointer px-3.5 py-2.5 rounded-xl transition-all border ${
              statusFilter === "Active"
                ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/20 border-red-600 ring-2 ring-red-500/20"
                : "bg-white hover:border-red-200 text-gray-800 border-gray-100 shadow-sm hover:shadow"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${statusFilter === "Active" ? "text-red-100" : "text-emerald-600"}`}>
                  Active
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none">{stats.active}</div>
              </div>
              <div className={`p-2 rounded-lg ${statusFilter === "Active" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"}`}>
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className={`text-[10px] mt-1.5 font-medium truncate ${statusFilter === "Active" ? "text-red-100" : "text-gray-400"}`}>
              Valid & Protected
            </div>
          </div>

          {/* Expiring Soon Card */}
          <div
            onClick={() => setStatusFilter("Expiring Soon")}
            className={`cursor-pointer px-3.5 py-2.5 rounded-xl transition-all border ${
              statusFilter === "Expiring Soon"
                ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/20 border-red-600 ring-2 ring-red-500/20"
                : "bg-white hover:border-red-200 text-gray-800 border-gray-100 shadow-sm hover:shadow"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${statusFilter === "Expiring Soon" ? "text-red-100" : "text-amber-600"}`}>
                  Expiring Soon
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none">{stats.expiring}</div>
              </div>
              <div className={`p-2 rounded-lg ${statusFilter === "Expiring Soon" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-600"}`}>
                <Clock size={16} />
              </div>
            </div>
            <div className={`text-[10px] mt-1.5 font-medium truncate ${statusFilter === "Expiring Soon" ? "text-red-100" : "text-gray-400"}`}>
              Within 30 days
            </div>
          </div>

          {/* Expired Policies Card */}
          <div
            onClick={() => setStatusFilter("Expired")}
            className={`cursor-pointer px-3.5 py-2.5 rounded-xl transition-all border ${
              statusFilter === "Expired"
                ? "bg-gradient-to-r from-red-700 to-rose-800 text-white shadow-md shadow-red-700/20 border-red-700 ring-2 ring-red-600/20"
                : "bg-white hover:border-red-200 text-gray-800 border-gray-100 shadow-sm hover:shadow"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${statusFilter === "Expired" ? "text-red-100" : "text-red-600"}`}>
                  Expired
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none">{stats.expired}</div>
              </div>
              <div className={`p-2 rounded-lg ${statusFilter === "Expired" ? "bg-white/20 text-white" : "bg-red-50 text-red-600"}`}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className={`text-[10px] mt-1.5 font-medium truncate ${statusFilter === "Expired" ? "text-red-100" : "text-gray-400"}`}>
              Needs renewal
            </div>
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
          <div className="hidden md:flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-320px)]">
            <div className="overflow-auto flex-1">
              <table className="w-full min-w-max text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-sm shadow-sm">
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                    <th className="px-3 py-2 text-left align-top bg-gray-50 w-12">S.No</th>
                    <th className="px-2 py-2 text-center align-top bg-gray-50 w-12">View</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Vehicle No.</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Owner Name</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Insurance Company</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Policy No.</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Start Date</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Expiry Date</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Days Remaining</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Status</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">IDV (₹)</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50">Premium (₹)</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50 min-w-[120px]">Agent / Contact</th>
                    <th className="px-3 py-2 text-left align-top bg-gray-50 min-w-[120px]">Remarks</th>
                    <th className="px-3 py-2 text-center align-top bg-gray-50 min-w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((doc, i) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-sm text-gray-600 font-medium align-top text-left">
                        {doc.sn || i + 1}
                      </td>
                      <td className="px-2 py-3 text-sm align-top text-center">
                        <button
                          className="p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-md transition-colors inline-flex items-center justify-center"
                          title="View Policy Details"
                          onClick={() => setViewItem(doc)}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-800 align-top text-left">
                        {doc.vehicleNo || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 align-top text-left">
                        {doc.ownerName || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 align-top text-left">
                        {doc.insuranceCompany || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 align-top text-left">
                        {doc.policyNo || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 align-top text-left">
                        {formatDate(doc.policyStartDate)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 align-top text-left">
                        {formatDate(doc.policyExpiryDate)}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold align-top text-left">
                        <span className={`px-2 py-1 rounded-md inline-block ${
                          parseInt(doc.daysRemaining) < 0 ? "bg-red-100 text-red-700" :
                          parseInt(doc.daysRemaining) <= 30 ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {doc.daysRemaining ? `${doc.daysRemaining} Days` : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm align-top text-left">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === "Expired" ? "bg-red-100 text-red-800" :
                          doc.status === "Expiring Soon" ? "bg-yellow-100 text-yellow-800" :
                          "bg-green-100 text-green-800"
                        }`}>
                          {doc.status || "Active"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 align-top text-left">
                        {doc.idv || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 font-medium align-top text-left">
                        {doc.premium || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 align-top text-left">
                        {doc.agentContact || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500 max-w-xs truncate align-top text-left" title={doc.remarks}>
                        {doc.remarks || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm align-top text-center bg-white group-hover:bg-gray-50">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold shadow-sm transition-all"
                            title="Renew Policy"
                            onClick={() => { setSelectedItem(doc); setIsRenewModalOpen(true); }}
                          >
                            <RotateCcw size={13} />
                            <span>Renew</span>
                          </button>
                          <button
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                            title="Edit"
                            onClick={() => { setSelectedItem(doc); setIsEditModalOpen(true); }}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                            title="Delete"
                            disabled={isDeleting === doc.id}
                            onClick={() => handleDelete(doc.id, doc.rowIndex)}
                          >
                            {isDeleting === doc.id ? (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
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

      {/* Renew Modal */}
      {isRenewModalOpen && (
        <RenewCarInsuranceModal
          isOpen={isRenewModalOpen}
          onClose={() => {
            setIsRenewModalOpen(false);
            setSelectedItem(null);
          }}
          carInsurance={selectedItem}
          onSuccess={() => loadData(true)}
        />
      )}

      {/* View Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50/80 via-white to-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-md shadow-red-600/20">
                  <Car size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                    {viewItem.vehicleNo || "Vehicle Details"}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      viewItem.status === "Expired" ? "bg-red-100 text-red-800" :
                      viewItem.status === "Expiring Soon" ? "bg-yellow-100 text-yellow-800" :
                      "bg-green-100 text-green-800"
                    }`}>
                      {viewItem.status || "Active"}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Car Insurance Policy Information</p>
                </div>
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Quick Summary Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Days Remaining</span>
                  <span className={`text-sm font-extrabold mt-1 block ${
                    parseInt(viewItem.daysRemaining) < 0 ? "text-red-600" :
                    parseInt(viewItem.daysRemaining) <= 30 ? "text-amber-600" :
                    "text-emerald-600"
                  }`}>
                    {viewItem.daysRemaining ? `${viewItem.daysRemaining} Days` : "-"}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IDV Value</span>
                  <span className="text-sm font-extrabold text-gray-800 mt-1 block">
                    {viewItem.idv ? `₹${viewItem.idv}` : "-"}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Premium</span>
                  <span className="text-sm font-extrabold text-emerald-700 mt-1 block">
                    {viewItem.premium ? `₹${viewItem.premium}` : "-"}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Policy No.</span>
                  <span className="text-xs font-bold text-gray-800 mt-1.5 block truncate" title={viewItem.policyNo}>
                    {viewItem.policyNo || "-"}
                  </span>
                </div>
              </div>

              {/* Full Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vehicle No.</span>
                  <b className="text-xs font-bold text-gray-900 mt-0.5 block">{viewItem.vehicleNo || "-"}</b>
                </div>
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Owner Name</span>
                  <b className="text-xs font-bold text-gray-900 mt-0.5 block">{viewItem.ownerName || "-"}</b>
                </div>
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Insurance Company</span>
                  <b className="text-xs font-bold text-gray-900 mt-0.5 block">{viewItem.insuranceCompany || "-"}</b>
                </div>
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Agent / Contact</span>
                  <b className="text-xs font-bold text-gray-900 mt-0.5 block">{viewItem.agentContact || "-"}</b>
                </div>
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Policy Start Date</span>
                  <b className="text-xs font-mono text-gray-800 mt-0.5 block">{formatDate(viewItem.policyStartDate)}</b>
                </div>
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Policy Expiry Date</span>
                  <b className="text-xs font-mono text-gray-800 mt-0.5 block">{formatDate(viewItem.policyExpiryDate)}</b>
                </div>
              </div>

              {/* Remarks */}
              {viewItem.remarks && (
                <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/60">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Vehicle / Policy Remarks</span>
                  <p className="text-xs text-gray-700 leading-relaxed">{viewItem.remarks}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const item = viewItem;
                    setViewItem(null);
                    setSelectedItem(item);
                    setIsRenewModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <RotateCcw size={13} />
                  <span>Renew Policy</span>
                </button>
                <button
                  onClick={() => {
                    const item = viewItem;
                    setViewItem(null);
                    setSelectedItem(item);
                    setIsEditModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors"
                >
                  <Edit size={13} />
                  <span>Edit</span>
                </button>
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CarInsurance;
