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

  const filteredData = useMemo(() => {
    return reports.filter(item => {
      const searchLower = deferredSearch.toLowerCase();
      return String(item.ownerName || '').toLowerCase().includes(searchLower) ||
        String(item.vehicleNo || '').toLowerCase().includes(searchLower) ||
        String(item.vehicleName || '').toLowerCase().includes(searchLower) ||
        String(item.policyNumber || '').toLowerCase().includes(searchLower);
    });
  }, [reports, deferredSearch]);

  if (loading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 text-red-600 animate-spin" />
          <p className="text-gray-600">Loading vehicle reports...</p>
        </div>
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-600 font-medium mb-2">Error Loading Data</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl shadow-input">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Vehicle Reports</h1>
            <p className="text-gray-500 text-sm mt-1">
              Track vehicle details and policies from Google Sheets
              {reports.length > 0 && (
                <span className="ml-2 text-xs font-semibold text-green-600">
                  ({reports.length} records)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search owner, vehicle no..."
                className="pl-10 pr-4 py-2.5 w-full shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 min-w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add New</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-input overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wide">
                  <th className="px-3 py-3 w-12 text-center">S.No.</th>
                  <th className="px-3 py-3 whitespace-nowrap">OWNER NAME</th>
                  <th className="px-3 py-3 whitespace-nowrap">VEHICLE NO.</th>
                  <th className="px-3 py-3 whitespace-nowrap">VEHICLE NAME</th>
                  <th className="px-3 py-3 whitespace-nowrap">Policy Number</th>
                  <th className="px-3 py-3">bank</th>
                  <th className="px-3 py-3 whitespace-nowrap">premium date</th>
                  <th className="px-3 py-3 whitespace-nowrap">model number</th>
                  <th className="px-3 py-3">Anual</th>
                  <th className="px-3 py-3 whitespace-nowrap">purchase date</th>
                  <th className="px-3 py-3 whitespace-nowrap">premium amount</th>
                  <th className="px-3 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-2 text-center font-semibold text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">{item.ownerName}</td>
                    <td className="px-3 py-2 font-bold font-mono text-gray-700 whitespace-nowrap">{item.vehicleNo}</td>
                    <td className="px-3 py-2 text-gray-700">{item.vehicleName}</td>
                    <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">{item.policyNumber}</td>
                    <td className="px-3 py-2 text-gray-700">{item.bank}</td>
                    <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">{item.premiumDate}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{item.modelNumber}</td>
                    <td className="px-3 py-2 text-gray-700">{item.anual}</td>
                    <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">{item.purchaseDate}</td>
                    <td className="px-3 py-2 font-bold text-gray-900 whitespace-nowrap">
                      {item.premiumAmount ? `₹${item.premiumAmount}` : ''}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && !loading && (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <Car className="h-12 w-12 text-gray-300 mb-3" />
                <p className="font-medium text-lg">No records found</p>
                <p className="text-sm">Try adjusting your search criteria or add a new record.</p>
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
