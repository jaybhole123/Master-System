import React, { useState, useEffect } from 'react';
import supabase from '../../../SupabaseClient';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function TransportDashboard() {
  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState('All Time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicleNo, setFilterVehicleNo] = useState('');
  const [filterDoNo, setFilterDoNo] = useState('');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');

  // Date Formatting Helper (e.g., "23 - Sep - 2026")
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' }).substring(0, 3);
    const year = d.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('truck_reports')
        .select('*');
      
      if (error) throw error;
      if (data) setReportsData(data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-full animate-pulse">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded-md w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-md w-1/3"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-24">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="h-64 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
      </div>
    );
  }

  // Filtering Logic
  const getFilteredData = () => {
    let filtered = [...reportsData];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    filtered = filtered.filter(item => {
      if (filterVehicleNo && item.vehicle_no !== filterVehicleNo) return false;
      if (filterDoNo && item.do_no !== filterDoNo) return false;

      if (!item.date) {
        return filterType === 'All Time'; // Only show items without dates in All Time
      }
      
      const itemDate = new Date(item.date);
      
      switch (filterType) {
        case 'This Month':
          return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
        case 'Last Month':
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
        case 'Last 3 Months':
          const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
          threeMonthsAgo.setHours(0, 0, 0, 0);
          return itemDate >= threeMonthsAgo && itemDate <= today;
        case 'This Year':
          return itemDate.getFullYear() === today.getFullYear();
        case 'Custom':
          if (customStart && customEnd) {
            const start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            return itemDate >= start && itemDate <= end;
          }
          return true;
        case 'All Time':
        default:
          return true;
      }
    });
    return filtered;
  };

  const filteredReports = getFilteredData();

  // Extract unique options for dropdowns
  const uniqueVehicles = [...new Set(reportsData.map(item => item.vehicle_no).filter(Boolean))].sort();
  const uniqueDoNumbers = [...new Set(reportsData.map(item => item.do_no).filter(Boolean))].sort();

  // Analytics Calculations
  const totalTrips = filteredReports.length;
  const totalFreight = filteredReports.reduce((sum, item) => sum + (Number(item.total_freight) || 0), 0);
  const totalAdvance = filteredReports.reduce((sum, item) => sum + (Number(item.advance) || 0), 0);
  const totalBalance = filteredReports.reduce((sum, item) => sum + (Number(item.vehicle_balance) || 0), 0);
  const totalDieselLiter = filteredReports.reduce((sum, item) => sum + (Number(item.diesel) || 0), 0);
  const totalDistance = filteredReports.reduce((sum, item) => sum + (Number(item.distance) || 0), 0);

  // Pie Chart Data: Financial Distribution
  const financialData = [
    { name: 'Total Advance', value: totalAdvance },
    { name: 'Total Balance', value: totalBalance },
  ];

  // Bar Chart Data & Truck-wise Trips Mapping
  const truckWiseCount = filteredReports.reduce((acc, curr) => {
    const truck = curr.vehicle_no || 'Unknown';
    if (!acc[truck]) {
      acc[truck] = { 
        name: truck, 
        trips: 0, 
        freight: 0,
        balance: 0,
        date: curr.date,
        party_name: curr.party_name,
        do_no: curr.do_no,
        do_party_name: curr.do_party_name
      };
    } else if (curr.date && acc[truck].date) {
      if (new Date(curr.date) > new Date(acc[truck].date)) {
        acc[truck].date = curr.date;
        acc[truck].party_name = curr.party_name;
        acc[truck].do_no = curr.do_no;
        acc[truck].do_party_name = curr.do_party_name;
      }
    }
    acc[truck].trips += 1;
    acc[truck].freight += (Number(curr.total_freight) || 0);
    acc[truck].balance += (Number(curr.vehicle_balance) || 0);
    return acc;
  }, {});

  const truckWiseData = Object.values(truckWiseCount).sort((a, b) => b.trips - a.trips);

  // Table Search Logic
  const searchedReports = truckWiseData.filter(truck => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (truck.name && truck.name.toLowerCase().includes(query)) ||
      (truck.party_name && truck.party_name.toLowerCase().includes(query)) ||
      (truck.do_no && truck.do_no.toLowerCase().includes(query)) ||
      (truck.do_party_name && truck.do_party_name.toLowerCase().includes(query))
    );
  });

  // Export Handler
  const handleExport = (format) => {
    let exportData = [...reportsData];
    
    if (exportStart && exportEnd) {
      const start = new Date(exportStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(exportEnd);
      end.setHours(23, 59, 59, 999);
      
      exportData = exportData.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d >= start && d <= end;
      });
    }

    const exportTruckWiseCount = exportData.reduce((acc, curr) => {
      const truck = curr.vehicle_no || 'Unknown';
      if (!acc[truck]) {
        acc[truck] = { 
          name: truck, trips: 0, freight: 0, balance: 0,
          date: curr.date, party_name: curr.party_name, do_no: curr.do_no, do_party_name: curr.do_party_name
        };
      } else if (curr.date && acc[truck].date) {
        if (new Date(curr.date) > new Date(acc[truck].date)) {
          acc[truck].date = curr.date; acc[truck].party_name = curr.party_name;
          acc[truck].do_no = curr.do_no; acc[truck].do_party_name = curr.do_party_name;
        }
      }
      acc[truck].trips += 1;
      acc[truck].freight += (Number(curr.total_freight) || 0);
      acc[truck].balance += (Number(curr.vehicle_balance) || 0);
      return acc;
    }, {});

    const exportTruckWiseData = Object.values(exportTruckWiseCount).sort((a, b) => b.trips - a.trips);
    const dateSuffix = (exportStart && exportEnd) ? `_${exportStart}_to_${exportEnd}` : '';

    if (format === 'excel') {
      const wsData = exportTruckWiseData.map((truck, idx) => ({
        "S.No.": idx + 1,
        "Date": formatDateDisplay(truck.date),
        "Vehicle No.": truck.name || '-',
        "Total Trips": truck.trips,
        "DO No.": truck.do_no || '-',
        "Freight (₹)": truck.freight || 0,
        "Vehicle Bal. (₹)": truck.balance || 0
      }));
      
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trip Details");
      XLSX.writeFile(wb, `Trip_Details_Report${dateSuffix}.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF('landscape');
      doc.text(`Trip Details Report ${exportStart ? `(${formatDateDisplay(exportStart)} to ${formatDateDisplay(exportEnd)})` : ''}`, 14, 15);
      
      const tableColumn = ["S.No.", "Date", "Vehicle No.", "Total Trips", "DO No.", "Freight", "Vehicle Bal."];
      const tableRows = [];

      exportTruckWiseData.forEach((truck, idx) => {
        tableRows.push([
          idx + 1,
          formatDateDisplay(truck.date),
          truck.name || '-',
          truck.trips,
          truck.do_no || '-',
          `Rs ${(truck.freight || 0).toLocaleString()}`,
          `Rs ${(truck.balance || 0).toLocaleString()}`
        ]);
      });

      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20, styles: { fontSize: 8 } });
      doc.save(`Trip_Details_Report${dateSuffix}.pdf`);
    }
    
    setShowExportModal(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Transport Analytics Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of trips, trucks, and financial distribution.</p>
      </div>



      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '24px' }}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600 mb-1">{totalTrips}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Trips</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-cyan-600 mb-1">{totalDistance.toLocaleString()} km</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Distance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-green-600 mb-1">₹ {totalFreight.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Freight</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-orange-500 mb-1">₹ {totalAdvance.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Advance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-purple-600 mb-1">{totalDieselLiter.toLocaleString()} L</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Diesel Liter</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-red-600 mb-1">₹ {totalBalance.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Vehicle Bal.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Truck Wise Trips (Bar Chart) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Truck Wise Trips</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={truckWiseData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="trips" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Number of Trips" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Distribution (Pie Chart) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Financial Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financialData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {financialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹ ${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Detailed Truck Stats Table */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-lg font-bold text-gray-800">Trip Details Report</h2>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 cursor-pointer shadow-sm hover:border-gray-400 transition-colors"
            >
              {['This Month', 'Last Month', 'Last 3 Months', 'This Year', 'All Time', 'Custom'].map((filter) => (
                <option key={filter} value={filter}>
                  {filter}
                </option>
              ))}
            </select>
            
            <select
              value={filterVehicleNo}
              onChange={(e) => setFilterVehicleNo(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 cursor-pointer shadow-sm hover:border-gray-400 transition-colors"
            >
              <option value="">All Vehicles</option>
              {uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            <select
              value={filterDoNo}
              onChange={(e) => setFilterDoNo(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 cursor-pointer shadow-sm hover:border-gray-400 transition-colors"
            >
              <option value="">All DO Numbers</option>
              {uniqueDoNumbers.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {filterType === 'Custom' && (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-red-600"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-red-600"
                />
              </div>
            )}

            <div className="relative flex-1 sm:flex-none">
              <input 
                type="text" 
                placeholder="Search trips..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-red-600 w-full sm:w-64"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <button 
              onClick={() => setShowExportModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Export Report
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[350px]">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
              <tr className="border-b border-gray-200 text-sm font-medium text-gray-600">
                <th className="py-3 px-4">S.No.</th>
                <th className="py-3 px-4 min-w-[120px]">Date</th>
                <th className="py-3 px-4">Vehicle No.</th>
                <th className="py-3 px-4">Total Trips</th>
                <th className="py-3 px-4">DO No.</th>
                <th className="py-3 px-4">Freight (₹)</th>
                <th className="py-3 px-4">Vehicle Bal. (₹)</th>
              </tr>
            </thead>
            <tbody>
              {searchedReports.map((truck, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-600">{idx + 1}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDateDisplay(truck.date)}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">
                    {truck.name ? (truck.name.toUpperCase().includes('CG') ? truck.name : `CG-10-CG ${truck.name}`) : '-'}
                  </td>
                  <td className="py-3 px-4 text-blue-600 font-medium">{truck.trips}</td>
                  <td className="py-3 px-4 text-gray-600">{truck.do_no || '-'}</td>
                  <td className="py-3 px-4 text-green-600 font-medium">₹ {(truck.freight || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-red-500 font-medium">₹ {(truck.balance || 0).toLocaleString()}</td>
                </tr>
              ))}
              {searchedReports.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">No data available for analysis</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Custom Date Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Export Report</h3>
            <p className="text-sm text-gray-600 mb-4">Select a specific date range for the downloaded report. Leave blank to export all data.</p>
            
            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">From Date</label>
                <input 
                  type="date" 
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">To Date</label>
                <input 
                  type="date" 
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleExport('excel')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Download Excel
              </button>
              <button 
                onClick={() => handleExport('pdf')}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Download PDF
              </button>
              <button 
                onClick={() => setShowExportModal(false)}
                className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
