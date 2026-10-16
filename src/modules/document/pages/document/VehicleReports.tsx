import React, { useState, useEffect, useDeferredValue, useMemo } from 'react';
import { Plus, Search, Car, Loader, RefreshCw, Edit, Trash2 } from 'lucide-react';
import useHeaderStore from '../../store/headerStore';
import AddVehicleReport from './AddVehicleReport';
import { submitToGoogleSheets } from '../../utils/googleSheetsService';
import toast from 'react-hot-toast';

interface VehicleItem {
  id: string;
  rowIndex: number;
  sNo: string;
  ownerName: string;
  vehicleNo: string;
  vehicleName: string;
  policyNumber: string;
  bank: string;
  premiumDate: string;
  modelNumber: string;
  anual: string;
  purchaseDate: string;
  premiumAmount: string;
}

const VehicleReports = () => {
  const { setTitle } = useHeaderStore();
  const [reports, setReports] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVehiclesFromGoogleSheets = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      
      const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";
      if (!GOOGLE_SCRIPT_URL) throw new Error("Google Script URL is not defined");

      const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=VEHICLE&_t=${Date.now()}`);
      const json = await res.json();

      if (!json.success) throw new Error(json.error || "Failed to fetch vehicle reports");

      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return dateString;
          return date.toLocaleDateString('en-GB');
        } catch (e) {
          return dateString;
        }
      };

      const vehicleList: VehicleItem[] = (json.data || [])
        .slice(1) // skip header
        .map((row: any[], index: number) => {
          if (!row || row.length < 2) return null;
          
          return {
            id: `veh-${index}`,
            rowIndex: index + 2,
            sNo: (row[0] || '').toString().trim(),
            ownerName: (row[1] || '').toString().trim(),
            vehicleNo: (row[2] || '').toString().trim(),
            vehicleName: (row[3] || '').toString().trim(),
            policyNumber: (row[4] || '').toString().trim(),
            bank: (row[5] || '').toString().trim(),
            premiumDate: formatDate((row[6] || '').toString().trim()),
            modelNumber: (row[7] || '').toString().trim(),
            anual: (row[8] || '').toString().trim(),
            purchaseDate: formatDate((row[9] || '').toString().trim()),
            premiumAmount: (row[10] || '').toString().trim()
          };
        })
        .filter((item: VehicleItem | null): item is VehicleItem => item !== null && item.ownerName !== '');
        
      setReports(vehicleList);
    } catch (error) {
      console.error('Fetch Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTitle('Vehicle Reports');
    fetchVehiclesFromGoogleSheets();
  }, [setTitle]);

  const handleDelete = async (item: VehicleItem) => {
    if (!confirm('Are you sure you want to delete this vehicle report?')) return;
    
    try {
      setLoading(true);
      await submitToGoogleSheets({
        action: "update",
        sheetName: "VEHICLE",
        rowIndex: item.rowIndex,
        data: ["", "", "", "", "", "", "", "", "", "", ""]
      });
      fetchVehiclesFromGoogleSheets();
    } catch (err) {
      console.error(err);
      setLoading(false);
      toast.error("Failed to delete record");
    }
  };

  const handleRefresh = () => {
    fetchVehiclesFromGoogleSheets();
  };

  const [selectedOwner, setSelectedOwner] = useState('All');
  const [selectedBank, setSelectedBank] = useState('All');

  // Filter Lists
  const ownersList = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.ownerName && r.ownerName.trim()) set.add(r.ownerName.trim());
    });
    return Array.from(set).sort();
  }, [reports]);

  const banksList = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.bank && r.bank.trim()) set.add(r.bank.trim());
    });
    return Array.from(set).sort();
  }, [reports]);

  // Statistics for KPI Cards
  const stats = useMemo(() => {
    const totalVehicles = reports.length;
    const uniqueOwners = ownersList.length;
    const uniqueInsurers = banksList.length;
    const totalPremium = reports.reduce((sum, item) => {
      const cleanNum = parseFloat((item.premiumAmount || '').replace(/[^0-9.]/g, ''));
      return sum + (isNaN(cleanNum) ? 0 : cleanNum);
    }, 0);
    return {
      totalVehicles,
      uniqueOwners,
      uniqueInsurers,
      totalPremium: totalPremium > 0 ? `₹${totalPremium.toLocaleString('en-IN')}` : '₹0',
    };
  }, [reports, ownersList, banksList]);

  const filteredData = useMemo(() => {
    return reports.filter((item) => {
      const searchLower = deferredSearch.toLowerCase();
      const matchesSearch =
        !deferredSearch ||
        String(item.ownerName || '').toLowerCase().includes(searchLower) ||
        String(item.vehicleNo || '').toLowerCase().includes(searchLower) ||
        String(item.vehicleName || '').toLowerCase().includes(searchLower) ||
        String(item.policyNumber || '').toLowerCase().includes(searchLower);

      const matchesOwner = selectedOwner === 'All' || item.ownerName === selectedOwner;
      const matchesBank = selectedBank === 'All' || item.bank === selectedBank;

      return matchesSearch && matchesOwner && matchesBank;
    });
  }, [reports, deferredSearch, selectedOwner, selectedBank]);

  if (loading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 text-red-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading vehicle reports...</p>
        </div>
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <div className="text-red-600 font-bold mb-2">Error Loading Data</div>
          <p className="text-gray-700 text-sm mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition-colors mx-auto"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header and Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Car size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Vehicle Reports</h1>
              <p className="text-gray-500 text-xs">
                Comprehensive vehicle insurance and registration registry
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center w-full sm:w-auto gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search owner, vehicle no..."
                className="pl-9 pr-3 py-2 w-full text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50/70 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Owner Filter */}
            <div className="relative">
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-700 cursor-pointer hover:bg-gray-100 transition-all max-w-[140px] truncate"
              >
                <option value="All">All Owners ({ownersList.length})</option>
                {ownersList.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Bank/Insurer Filter */}
            <div className="relative hidden md:block">
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-700 cursor-pointer hover:bg-gray-100 transition-all max-w-[140px] truncate"
              >
                <option value="All">All Insurers</option>
                {banksList.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              title="Sync Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {/* Add New Button */}
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm shadow-red-200 whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Total Vehicles Card */}
          <div className="px-3.5 py-2.5 rounded-xl border bg-gradient-to-br from-red-600 to-red-700 text-white shadow-sm shadow-red-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-red-100">
                  Total Vehicles
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none">
                  {stats.totalVehicles}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm text-white">
                <Car size={16} />
              </div>
            </div>
            <div className="text-[10px] mt-1.5 font-medium text-red-100 truncate">
              Registered vehicle records
            </div>
          </div>

          {/* Owners Card */}
          <div className="px-3.5 py-2.5 rounded-xl border bg-white border-gray-100 shadow-sm hover:border-red-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                  Vehicle Owners
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none text-gray-800">
                  {stats.uniqueOwners}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <Car size={16} />
              </div>
            </div>
            <div className="text-[10px] mt-1.5 font-medium text-gray-400 truncate">
              Unique registered owners
            </div>
          </div>

          {/* Insurers Card */}
          <div className="px-3.5 py-2.5 rounded-xl border bg-white border-gray-100 shadow-sm hover:border-red-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                  Insurers / Banks
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none text-gray-800">
                  {stats.uniqueInsurers}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <RefreshCw size={16} />
              </div>
            </div>
            <div className="text-[10px] mt-1.5 font-medium text-gray-400 truncate">
              Associated insurers
            </div>
          </div>

          {/* Premium Amount Card */}
          <div className="px-3.5 py-2.5 rounded-xl border bg-white border-gray-100 shadow-sm hover:border-red-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                  Total Premium
                </span>
                <div className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5 leading-none text-emerald-700 truncate">
                  {stats.totalPremium}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <span className="text-xs font-bold leading-none">₹</span>
              </div>
            </div>
            <div className="text-[10px] mt-1.5 font-medium text-gray-400 truncate">
              Recorded vehicle premium
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="hidden md:flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-230px)]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-sm shadow-sm">
                <tr className="border-b border-gray-100 text-[11px] uppercase text-gray-500 font-semibold tracking-wider whitespace-nowrap">
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50 w-12">S.No.</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Owner Name</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Vehicle No.</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Vehicle Name</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Policy Number</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Bank / Insurer</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Premium Date</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Model Number</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Annual</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Registration Date</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Premium Amount</th>
                  <th className="px-3 py-2.5 text-center align-top bg-gray-50 sticky right-0 z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] min-w-[90px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-gray-500 align-top text-left">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap align-top text-left">{item.ownerName}</td>
                    <td className="px-3 py-2.5 font-bold font-mono text-gray-800 whitespace-nowrap align-top text-left">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-800 border border-gray-200">
                        {item.vehicleNo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 align-top text-left">{item.vehicleName || '-'}</td>
                    <td className="px-3 py-2.5 font-mono text-blue-600 font-bold whitespace-nowrap align-top text-left">{item.policyNumber || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-700 align-top text-left">{item.bank || '-'}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap align-top text-left">{item.premiumDate || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap align-top text-left">{item.modelNumber || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-700 align-top text-left">{item.anual || '-'}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap align-top text-left">{item.purchaseDate || '-'}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700 whitespace-nowrap align-top text-left">
                      {item.premiumAmount ? `₹${item.premiumAmount}` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top sticky right-0 z-10 bg-white group-hover:bg-gray-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && !loading && (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <Car className="h-10 w-10 text-gray-300 mb-2" />
                <p className="font-semibold text-sm text-gray-700">No records found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try adjusting your search criteria or add a new vehicle.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddVehicleReport
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={handleRefresh}
        editItem={editingItem}
        nextSNo={reports.length + 1}
      />
    </>
  );
};

export default VehicleReports;
