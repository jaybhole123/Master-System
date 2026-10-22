import React, { useState, useEffect } from 'react';
import supabase from '../../../SupabaseClient';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Truck,
  Route,
  TrendingUp,
  Wallet,
  Fuel,
  IndianRupee,
  Search,
  Filter,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  X,
  ChevronDown,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  MapPin,
  Building2
} from 'lucide-react';

const FINANCIAL_COLORS = ['#f59e0b', '#10b981'];

export default function TransportDashboard() {
  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState('All Time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicleNo, setFilterVehicleNo] = useState('');
  const [filterDoNo, setFilterDoNo] = useState('');

  // Vehicle Trip History Modal State
  const [vehicleHistoryModal, setVehicleHistoryModal] = useState({
    isOpen: false,
    vehicleNo: '',
    trips: []
  });

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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 border-3 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading Transport Analytics Dashboard...</p>
      </div>
    );
  }

  // Filtering Logic
  const getFilteredData = () => {
    let filtered = [...reportsData];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    filtered = filtered.filter(item => {
      if (filterVehicleNo && item.vehicle_no !== filterVehicleNo) return false;
      if (filterDoNo && item.do_no !== filterDoNo) return false;

      if (!item.date) {
        return filterType === 'All Time';
      }
      
      const itemDate = new Date(item.date);
      
      if (customStart || customEnd) {
        if (customStart && customEnd) {
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          return itemDate >= start && itemDate <= end;
        } else if (customStart) {
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          return itemDate >= start;
        } else if (customEnd) {
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          return itemDate <= end;
        }
      }

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
  const totalDieselLiter = filteredReports.reduce((sum, item) => sum + (Number(item.diesel) || parseFloat(String(item.diesel || '').replace(/[^0-9.]/g, '')) || 0), 0);
  const totalDistance = filteredReports.reduce((sum, item) => sum + (Number(item.distance) || 0), 0);

  // Financial Distribution Pie Chart Data
  const financialData = [
    { name: 'Total Advance', value: totalAdvance },
    { name: 'Total Balance', value: totalBalance },
  ];

  // Truck-wise Trips Mapping
  const truckWiseCount = filteredReports.reduce((acc, curr) => {
    const truck = curr.vehicle_no || 'Unknown';
    const dieselVal = Number(curr.diesel) || parseFloat(String(curr.diesel || '').replace(/[^0-9.]/g, '')) || 0;
    if (!acc[truck]) {
      acc[truck] = { 
        name: truck, 
        trips: 0, 
        freight: 0,
        balance: 0,
        diesel: 0,
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
    acc[truck].diesel += dieselVal;
    return acc;
  }, {});

  const truckWiseData = Object.values(truckWiseCount).sort((a, b) => b.trips - a.trips);
  const topTruckWiseData = truckWiseData.slice(0, 16);

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

  // Open Vehicle Trip History Modal
  const openVehicleHistory = (vehicleNo) => {
    // Get all trips for this specific vehicle from reportsData, sorted by date descending (or id descending)
    const vehicleTrips = reportsData
      .filter(item => String(item.vehicle_no || '').trim().toLowerCase() === String(vehicleNo || '').trim().toLowerCase())
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      });

    setVehicleHistoryModal({
      isOpen: true,
      vehicleNo: vehicleNo,
      trips: vehicleTrips
    });
  };

  // Export Handler
  const handleExport = (format) => {
    // Priority: exportStart/exportEnd modal inputs if provided, otherwise active table date filter
    const activeStart = exportStart || customStart;
    const activeEnd = exportEnd || customEnd;

    let exportData = [...reportsData];
    
    // Also apply vehicle and DO filters if active in view
    if (filterVehicleNo) {
      exportData = exportData.filter(item => item.vehicle_no === filterVehicleNo);
    }
    if (filterDoNo) {
      exportData = exportData.filter(item => item.do_no === filterDoNo);
    }

    if (activeStart || activeEnd) {
      const start = activeStart ? new Date(activeStart) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = activeEnd ? new Date(activeEnd) : null;
      if (end) end.setHours(23, 59, 59, 999);
      
      exportData = exportData.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        if (start && end) return d >= start && d <= end;
        if (start) return d >= start;
        if (end) return d <= end;
        return true;
      });
    }

    const exportTruckWiseCount = exportData.reduce((acc, curr) => {
      const truck = curr.vehicle_no || 'Unknown';
      const dieselVal = Number(curr.diesel) || parseFloat(String(curr.diesel || '').replace(/[^0-9.]/g, '')) || 0;
      if (!acc[truck]) {
        acc[truck] = { 
          name: truck, trips: 0, freight: 0, balance: 0, diesel: 0,
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
      acc[truck].diesel += dieselVal;
      return acc;
    }, {});

    const exportTruckWiseData = Object.values(exportTruckWiseCount).sort((a, b) => b.trips - a.trips);
    const dateRangeLabel = (activeStart && activeEnd) 
      ? `${formatDateDisplay(activeStart)} to ${formatDateDisplay(activeEnd)}` 
      : activeStart 
        ? `From ${formatDateDisplay(activeStart)}` 
        : activeEnd 
          ? `Up to ${formatDateDisplay(activeEnd)}` 
          : 'All Recorded Dates';
    const dateSuffix = (activeStart && activeEnd) ? `_${activeStart}_to_${activeEnd}` : '';

    if (format === 'excel') {
      const wsData = exportTruckWiseData.map((truck, idx) => ({
        "S.No.": idx + 1,
        "Date": formatDateDisplay(truck.date),
        "Vehicle No.": truck.name || '-',
        "Total Trips": truck.trips,
        "Total Diesel (L)": truck.diesel || 0,
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
      
      // Title & Date Range Header
      doc.setFontSize(16);
      doc.setTextColor(220, 38, 38);
      doc.text("Trip Details Report", 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date Range: ${dateRangeLabel}`, 14, 22);
      doc.text(`Generated On: ${formatDateDisplay(new Date())} | Total Vehicles: ${exportTruckWiseData.length}`, 14, 28);
      
      const tableColumn = ["S.No.", "Date", "Vehicle No.", "Total Trips", "Total Diesel (L)", "DO No.", "Freight", "Vehicle Bal."];
      const tableRows = [];

      exportTruckWiseData.forEach((truck, idx) => {
        tableRows.push([
          idx + 1,
          formatDateDisplay(truck.date),
          truck.name || '-',
          truck.trips,
          `${(truck.diesel || 0).toLocaleString()} L`,
          truck.do_no || '-',
          `Rs ${(truck.freight || 0).toLocaleString()}`,
          `Rs ${(truck.balance || 0).toLocaleString()}`
        ]);
      });

      autoTable(doc, { 
        head: [tableColumn], 
        body: tableRows, 
        startY: 33, 
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' }
      });
      doc.save(`Trip_Details_Report${dateSuffix}.pdf`);
    }
    
    setShowExportModal(false);
  };

  return (
    <div className="w-full px-2.5 sm:px-6 py-2 space-y-5 sm:space-y-7 animate-in fade-in duration-300">
      
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-[11px] font-bold text-red-600 mb-2 uppercase tracking-wider shadow-2xs">
            <Truck className="h-3.5 w-3.5 text-red-500" />
            <span>Fleet & Logistics Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Transport Analytics Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time fleet performance, operational trips, and financial distribution
          </p>
        </div>

        {/* Top Summary Capsules */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2.5 sm:gap-3 bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Truck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Active Trucks</div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">{truckWiseData.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Total Freight</div>
              <div className="text-sm sm:text-base font-extrabold text-emerald-600 leading-tight truncate">₹ {totalFreight.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TOP 6 KPI METRICS - RESPONSIVE GRID ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        
        {/* TOTAL TRIPS */}
        <div className="bg-white rounded-xl p-3 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Total Trips">
              Total Trips
            </span>
            <div className="p-1 rounded-lg shrink-0 bg-blue-50 text-blue-600">
              <Truck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-blue-600 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
            {totalTrips}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            Completed Trips
          </div>
        </div>

        {/* TOTAL DISTANCE */}
        <div className="bg-white rounded-xl p-3 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Total Distance">
              Total Distance
            </span>
            <div className="p-1 rounded-lg shrink-0 bg-teal-50 text-teal-600">
              <Route className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-teal-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
            {totalDistance.toLocaleString()} km
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            Road Travelled
          </div>
        </div>

        {/* TOTAL FREIGHT */}
        <div className="bg-white rounded-xl p-3 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Total Freight">
              Total Freight
            </span>
            <div className="p-1 rounded-lg shrink-0 bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
            ₹ {totalFreight.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            Gross Billed
          </div>
        </div>

        {/* TOTAL ADVANCE */}
        <div className="bg-white rounded-xl p-3 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Total Advance">
              Total Advance
            </span>
            <div className="p-1 rounded-lg shrink-0 bg-amber-50 text-amber-600">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-amber-600 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
            ₹ {totalAdvance.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            Paid in Advance
          </div>
        </div>

        {/* TOTAL DIESEL LITER */}
        <div className="bg-white rounded-xl p-3 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Diesel Consumption">
              Diesel Liter
            </span>
            <div className="p-1 rounded-lg shrink-0 bg-purple-50 text-purple-600">
              <Fuel className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-purple-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
            {totalDieselLiter.toLocaleString(undefined, { maximumFractionDigits: 1 })} L
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            Fuel Consumed
          </div>
        </div>

        {/* TOTAL VEHICLE BAL. */}
        <div className="bg-white rounded-xl p-3 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Vehicle Balance">
              Vehicle Bal.
            </span>
            <div className="p-1 rounded-lg shrink-0 bg-rose-50 text-rose-600">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-rose-600 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
            ₹ {totalBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            Pending Balance
          </div>
        </div>

      </div>

      {/* ═══════════ CHARTS ROW ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 w-full">
        
        {/* Truck Wise Trips (Bar Chart) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs w-full">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Truck Wise Trips
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Top {topTruckWiseData.length} Vehicles
            </span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTruckWiseData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: "#64748b" }} 
                  angle={-35} 
                  textAnchor="end" 
                  interval={0}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-xl border border-slate-200 text-xs font-semibold">
                          <p className="font-extrabold text-slate-900 mb-1">{data.name}</p>
                          <p className="text-blue-600">Total Trips: <span className="font-mono font-black">{data.trips}</span></p>
                          <p className="text-emerald-600">Freight: <span className="font-mono font-bold">₹{(data.freight || 0).toLocaleString()}</span></p>
                          <p className="text-purple-600">Diesel: <span className="font-mono">{(data.diesel || 0).toLocaleString()} L</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="trips" fill="#3b82f6" radius={[5, 5, 0, 0]} barSize={22} name="Number of Trips" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Distribution (Pie / Donut Chart) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between w-full">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Financial Distribution
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Advance vs Balance
            </span>
          </div>

          <div className="h-60 sm:h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financialData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {financialData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={FINANCIAL_COLORS[index % FINANCIAL_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const total = totalAdvance + totalBalance;
                      const pct = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                      return (
                        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-xl border border-slate-200 text-xs font-semibold">
                          <p className="font-bold text-slate-700">{data.name}</p>
                          <p className="font-black font-mono text-slate-900 mt-0.5">₹ {data.value?.toLocaleString()}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Ratio: {pct}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={32} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
      
      {/* ═══════════ DETAILED TRUCK STATS REPORT ═══════════ */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3.5 sm:p-5 lg:p-6 overflow-hidden w-full">
        
        {/* Table Header & Controls Bar */}
        <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-slate-100">
          {/* Title Row */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Trip Details Report
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {searchedReports.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aggregated vehicle trip logs, fuel consumption, and balances
              </p>
            </div>
          </div>

          {/* Single Line Filter & Actions Row */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search trips, vehicles, DOs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Period Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 cursor-pointer shadow-2xs transition-all shrink-0"
            >
              {['This Month', 'Last Month', 'Last 3 Months', 'This Year', 'All Time', 'Custom'].map((filter) => (
                <option key={filter} value={filter}>
                  {filter}
                </option>
              ))}
            </select>
            
            {/* Vehicle Filter */}
            <select
              value={filterVehicleNo}
              onChange={(e) => setFilterVehicleNo(e.target.value)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 cursor-pointer shadow-2xs transition-all shrink-0"
            >
              <option value="">All Vehicles</option>
              {uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            {/* DO Filter */}
            <select
              value={filterDoNo}
              onChange={(e) => setFilterDoNo(e.target.value)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 cursor-pointer shadow-2xs transition-all shrink-0"
            >
              <option value="">All DO Numbers</option>
              {uniqueDoNumbers.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Date Range Filter (Start Date to End Date) */}
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all shrink-0">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  if (filterType !== 'Custom') setFilterType('Custom');
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                title="Start Date"
              />
              <span className="text-slate-400 text-xs font-semibold px-0.5">to</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  if (filterType !== 'Custom') setFilterType('Custom');
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                title="End Date"
              />
              {(customStart || customEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStart('');
                    setCustomEnd('');
                    setFilterType('All Time');
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Clear Date Range"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Export Button on Same Line */}
            <button 
              onClick={() => {
                if (customStart) setExportStart(customStart);
                if (customEnd) setExportEnd(customEnd);
                setShowExportModal(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/20 flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shrink-0 ml-auto"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* ═══════════ DESKTOP TABLE VIEW (Visible on md and up) ═══════════ */}
        <div className="hidden md:block overflow-auto max-h-[460px] rounded-xl border border-slate-200/70">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
              <tr className="border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-3.5 text-center w-12 whitespace-nowrap">#</th>
                <th className="py-3.5 px-2.5 text-center whitespace-nowrap w-12">View</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Vehicle No.</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Total Trips</th>
                <th className="py-3.5 px-3.5 text-left whitespace-nowrap">Diesel (L)</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">DO No.</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Freight (₹)</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Vehicle Bal. (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 bg-white">
              {searchedReports.map((truck, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3.5 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                  <td className="py-3 px-2.5 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openVehicleHistory(truck.name)}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-all shadow-2xs hover:shadow-sm cursor-pointer group"
                      title={`View trip history for ${truck.name}`}
                    >
                      <Eye className="h-4 w-4 transition-transform group-hover:scale-110" />
                    </button>
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-black font-mono text-xs border border-slate-200/90 shadow-2xs">
                      {truck.name ? (truck.name.toUpperCase().includes('CG') ? truck.name : `CG-10-CG ${truck.name}`) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-black font-mono text-xs border border-blue-200/70">
                      {truck.trips}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-left font-black text-purple-700 font-mono whitespace-nowrap">
                    {(truck.diesel || 0).toLocaleString()} L
                  </td>
                  <td className="py-3 px-3.5 text-slate-700 font-mono font-semibold whitespace-nowrap">{truck.do_no || '-'}</td>
                  <td className="py-3 px-3.5 text-right font-black text-emerald-700 font-mono whitespace-nowrap">
                    ₹ {(truck.freight || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-rose-600 font-mono whitespace-nowrap">
                    ₹ {(truck.balance || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {searchedReports.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                    No matching trip records found for analysis
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ═══════════ MOBILE CARDS VIEW (Visible on mobile screens) ═══════════ */}
        <div className="block md:hidden space-y-2.5">
          {searchedReports.map((truck, idx) => (
            <div key={idx} className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-3 border border-slate-200/80 shadow-2xs space-y-2.5 transition-all">
              {/* Header: S.No + Eye Button + Vehicle No + Total Trips */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-slate-400 font-mono shrink-0">#{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => openVehicleHistory(truck.name)}
                    className="p-1 rounded-md bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-colors cursor-pointer shrink-0"
                    title={`View trip history for ${truck.name}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white text-slate-800 font-black font-mono text-xs border border-slate-200 shadow-2xs truncate">
                    <Truck className="h-3 w-3 mr-1 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {truck.name ? (truck.name.toUpperCase().includes('CG') ? truck.name : `CG-10-CG ${truck.name}`) : '-'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold font-mono text-xs border border-blue-200/60">
                    {truck.trips} Trips
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5 truncate">{formatDateDisplay(truck.date)}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DO No.</div>
                  <div className="text-sm font-mono font-bold text-slate-800 mt-0.5 truncate" title={truck.do_no}>
                    {truck.do_no || '-'}
                  </div>
                </div>
                <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/70">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Freight</div>
                  <div className="text-sm font-mono font-black text-emerald-700 mt-0.5 truncate">
                    ₹ {(truck.freight || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100/70">
                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Diesel</div>
                  <div className="text-sm font-mono font-black text-purple-700 mt-0.5 truncate">
                    {(truck.diesel || 0).toLocaleString()} L
                  </div>
                </div>
              </div>

              {/* Footer: Balance */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs">
                <span className="text-slate-500 font-semibold">Vehicle Balance:</span>
                <span className="text-sm font-mono font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200/60">
                  ₹ {(truck.balance || 0).toLocaleString()}
                </span>
              </div>
            </div>
          ))}

          {searchedReports.length === 0 && (
            <div className="py-10 text-center text-slate-400 font-medium bg-slate-50/50 rounded-xl border border-slate-200/60">
              No matching trip records found for analysis
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ EXPORT CUSTOM DATE MODAL ═══════════ */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <Download className="h-4 w-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Export Report</h3>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Select an optional date range to filter the exported dataset, or leave blank to export all recorded trips.
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">From Date</label>
                <input 
                  type="date" 
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-red-500 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">To Date</label>
                <input 
                  type="date" 
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-red-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button 
                onClick={() => handleExport('excel')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Download Excel Sheet (.xlsx)</span>
              </button>
              <button 
                onClick={() => handleExport('pdf')}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>Download PDF Document (.pdf)</span>
              </button>
              <button 
                onClick={() => setShowExportModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-xs font-semibold transition-colors mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VEHICLE TRIP HISTORY MODAL (Trip-wise & Date-wise) ═══════════ */}
      {vehicleHistoryModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-red-50/20 to-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Vehicle Trip History
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-red-100 text-red-700 font-black font-mono text-xs border border-red-200">
                      {vehicleHistoryModal.vehicleNo?.toUpperCase().includes('CG') 
                        ? vehicleHistoryModal.vehicleNo 
                        : `CG-10-CG ${vehicleHistoryModal.vehicleNo}`}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {vehicleHistoryModal.trips.length} Total {vehicleHistoryModal.trips.length === 1 ? 'Trip' : 'Trips'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Complete trip-wise operational and financial history strictly for this vehicle
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setVehicleHistoryModal({ isOpen: false, vehicleNo: '', trips: [] })}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics Summary Bar */}
            <div className="bg-slate-50/80 px-4 sm:px-6 py-3 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Trips</div>
                <div className="text-sm font-black text-blue-700 font-mono mt-0.5">
                  {vehicleHistoryModal.trips.length}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Diesel (L)</div>
                <div className="text-sm font-black text-purple-700 font-mono mt-0.5">
                  {vehicleHistoryModal.trips.reduce((sum, t) => sum + (Number(t.diesel) || parseFloat(String(t.diesel || '').replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString()} L
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Diesel Price</div>
                <div className="text-sm font-black text-purple-900 font-mono mt-0.5">
                  ₹ {vehicleHistoryModal.trips.reduce((sum, t) => {
                    const dL = Number(t.diesel) || parseFloat(String(t.diesel || '').replace(/[^0-9.]/g, '')) || 0;
                    const dP = parseFloat(t.diesel_price) || 0;
                    return sum + Math.round(dL * dP);
                  }, 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Freight</div>
                <div className="text-sm font-black text-emerald-700 font-mono mt-0.5">
                  ₹ {vehicleHistoryModal.trips.reduce((sum, t) => sum + (Number(t.total_freight) || 0), 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicle Balance</div>
                <div className="text-sm font-black text-rose-600 font-mono mt-0.5">
                  ₹ {vehicleHistoryModal.trips.reduce((sum, t) => sum + (Number(t.vehicle_balance) || 0), 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Modal Body / Table Content */}
            <div className="p-4 overflow-y-auto flex-1 max-h-[60vh] space-y-3">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 text-center w-10">#</th>
                      <th className="py-3 px-3 whitespace-nowrap">Trip Date</th>
                      <th className="py-3 px-3 whitespace-nowrap">Route (From → To)</th>
                      <th className="py-3 px-3 whitespace-nowrap">Party / Consignee</th>
                      <th className="py-3 px-3 whitespace-nowrap">DO No. / DO Party</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Diesel (L)</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Total Diesel Price</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Advance</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Freight</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {vehicleHistoryModal.trips.map((trip, tIdx) => {
                      const dieselVal = Number(trip.diesel) || parseFloat(String(trip.diesel || '').replace(/[^0-9.]/g, '')) || 0;
                      const dieselPriceVal = parseFloat(trip.diesel_price) || 0;
                      const totalDieselPrice = Math.round(dieselVal * dieselPriceVal);

                      return (
                        <tr key={trip.id || tIdx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                            {tIdx + 1}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 font-mono">
                              <Calendar className="h-3 w-3 text-red-500" />
                              {formatDateDisplay(trip.date)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {(trip.from_location || trip.to_location) ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                <span>{trip.from_location || '-'}</span>
                                <ArrowRight className="h-3 w-3 text-red-500 shrink-0" />
                                <span>{trip.to_location || '-'}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-700" title={trip.party_name}>
                              {trip.party_name || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-slate-800">
                                {trip.do_no ? `#${trip.do_no}` : '-'}
                              </span>
                              {trip.do_party_name && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[140px]" title={trip.do_party_name}>
                                  {trip.do_party_name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-purple-700 font-mono whitespace-nowrap">
                            {dieselVal > 0 ? `${dieselVal.toLocaleString()} L` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-purple-900 font-mono whitespace-nowrap bg-purple-50/30">
                            {totalDieselPrice > 0 ? (
                              <span>
                                ₹ {totalDieselPrice.toLocaleString('en-IN')}
                                {dieselPriceVal > 0 && (
                                  <span className="block text-[10px] font-normal text-slate-400">
                                    (@ ₹{dieselPriceVal}/L)
                                  </span>
                                )}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-600 font-mono whitespace-nowrap">
                            ₹ {Number(trip.advance || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-700 font-mono whitespace-nowrap">
                            ₹ {Number(trip.total_freight || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-600 font-mono whitespace-nowrap">
                            ₹ {Number(trip.vehicle_balance || 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View for Vehicle Trips */}
              <div className="block sm:hidden space-y-2.5">
                {vehicleHistoryModal.trips.map((trip, tIdx) => {
                  const dieselVal = Number(trip.diesel) || parseFloat(String(trip.diesel || '').replace(/[^0-9.]/g, '')) || 0;
                  const dieselPriceVal = parseFloat(trip.diesel_price) || 0;
                  const totalDieselPrice = Math.round(dieselVal * dieselPriceVal);

                  return (
                    <div key={trip.id || tIdx} className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
                        <span className="font-bold text-slate-400 font-mono">Trip #{tIdx + 1}</span>
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 font-mono">
                          <Calendar className="h-3 w-3 text-red-500" />
                          {formatDateDisplay(trip.date)}
                        </span>
                      </div>

                      {(trip.from_location || trip.to_location) && (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white p-1.5 rounded-lg border border-slate-100">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{trip.from_location || '-'}</span>
                          <ArrowRight className="h-3 w-3 text-red-500 shrink-0" />
                          <span className="truncate">{trip.to_location || '-'}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Party / DO</div>
                          <div className="font-semibold text-slate-800 truncate" title={trip.party_name}>
                            {trip.party_name || '-'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {trip.do_no ? `DO: ${trip.do_no}` : ''}
                          </div>
                        </div>

                        <div className="bg-purple-50/60 p-2 rounded-lg border border-purple-100">
                          <div className="text-[10px] text-purple-700 font-bold uppercase">Diesel (L)</div>
                          <div className="font-mono font-black text-purple-800">
                            {dieselVal > 0 ? `${dieselVal.toLocaleString()} L` : '0 L'}
                          </div>
                        </div>

                        <div className="bg-purple-100/60 p-2 rounded-lg border border-purple-200 col-span-2 flex items-center justify-between">
                          <div className="text-[10px] text-purple-900 font-bold uppercase">Total Diesel Price</div>
                          <div className="font-mono font-black text-purple-950 text-sm">
                            {totalDieselPrice > 0 ? `₹ ${totalDieselPrice.toLocaleString('en-IN')}` : '₹ 0'}
                            {dieselPriceVal > 0 && (
                              <span className="text-[10px] font-normal text-slate-500 ml-1">
                                (@ ₹{dieselPriceVal}/L)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-emerald-700 font-bold uppercase">Freight</div>
                          <div className="font-mono font-black text-emerald-800">
                            ₹ {Number(trip.total_freight || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                          <div className="text-[10px] text-rose-700 font-bold uppercase">Balance</div>
                          <div className="font-mono font-black text-rose-800">
                            ₹ {Number(trip.vehicle_balance || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {vehicleHistoryModal.trips.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <Truck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No trip records found for this vehicle</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <span className="text-xs font-semibold text-slate-500">
                Displaying all recorded trips for <span className="text-slate-800 font-bold font-mono">{vehicleHistoryModal.vehicleNo}</span>
              </span>
              <button
                type="button"
                onClick={() => setVehicleHistoryModal({ isOpen: false, vehicleNo: '', trips: [] })}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
