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
  ArrowRight
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
    const dateSuffix = (exportStart && exportEnd) ? `_${exportStart}_to_${exportEnd}` : '';

    if (format === 'excel') {
      const wsData = exportTruckWiseData.map((truck, idx) => ({
        "S.No.": idx + 1,
        "Date": formatDateDisplay(truck.date),
        "Vehicle No.": truck.name || '-',
        "Total Trips": truck.trips,
        "DO No.": truck.do_no || '-',
        "Freight (₹)": truck.freight || 0,
        "Total Diesel (L)": truck.diesel || 0,
        "Vehicle Bal. (₹)": truck.balance || 0
      }));
      
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trip Details");
      XLSX.writeFile(wb, `Trip_Details_Report${dateSuffix}.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF('landscape');
      doc.text(`Trip Details Report ${exportStart ? `(${formatDateDisplay(exportStart)} to ${formatDateDisplay(exportEnd)})` : ''}`, 14, 15);
      
      const tableColumn = ["S.No.", "Date", "Vehicle No.", "Total Trips", "DO No.", "Freight", "Total Diesel (L)", "Vehicle Bal."];
      const tableRows = [];

      exportTruckWiseData.forEach((truck, idx) => {
        tableRows.push([
          idx + 1,
          formatDateDisplay(truck.date),
          truck.name || '-',
          truck.trips,
          truck.do_no || '-',
          `Rs ${(truck.freight || 0).toLocaleString()}`,
          `${(truck.diesel || 0).toLocaleString()} L`,
          `Rs ${(truck.balance || 0).toLocaleString()}`
        ]);
      });

      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20, styles: { fontSize: 8 } });
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 text-red-600 rounded-lg shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Trip Details Report
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 ml-1">
                {searchedReports.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregated vehicle trip logs, fuel consumption, and balances
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
            
            {/* Search Box */}
            <div className="relative w-full sm:w-auto">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search trips, vehicles, DOs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-44 lg:w-56 pl-8 pr-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Dropdown Filters Grid */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              {/* Period Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 cursor-pointer shadow-2xs transition-all"
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
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 cursor-pointer shadow-2xs transition-all"
              >
                <option value="">All Vehicles</option>
                {uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}
              </select>

              {/* DO Filter */}
              <select
                value={filterDoNo}
                onChange={(e) => setFilterDoNo(e.target.value)}
                className="col-span-2 sm:col-span-1 w-full sm:w-auto px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 cursor-pointer shadow-2xs transition-all"
              >
                <option value="">All DO Numbers</option>
                {uniqueDoNumbers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {filterType === 'Custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none flex-1 sm:flex-initial"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none flex-1 sm:flex-initial"
                />
              </div>
            )}

            {/* Export Button */}
            <button 
              onClick={() => setShowExportModal(true)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/20 flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* ═══════════ DESKTOP TABLE VIEW (Visible on md and up) ═══════════ */}
        <div className="hidden md:block overflow-auto max-h-[420px] rounded-xl border border-slate-200/70">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5 text-center w-12">#</th>
                <th className="py-3 px-3.5 min-w-[120px]">Date</th>
                <th className="py-3 px-3.5 min-w-[140px]">Vehicle No.</th>
                <th className="py-3 px-3.5 text-center">Total Trips</th>
                <th className="py-3 px-3.5">DO No.</th>
                <th className="py-3 px-3.5 text-right">Freight (₹)</th>
                <th className="py-3 px-3.5 text-right">Diesel (L)</th>
                <th className="py-3 px-3.5 text-right">Vehicle Bal. (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {searchedReports.map((truck, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono font-medium">{idx + 1}</td>
                  <td className="py-2.5 px-3.5 text-slate-600 font-medium">{formatDateDisplay(truck.date)}</td>
                  <td className="py-2.5 px-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold font-mono text-[11px] border border-slate-200/80">
                      {truck.name ? (truck.name.toUpperCase().includes('CG') ? truck.name : `CG-10-CG ${truck.name}`) : '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold font-mono text-[11px] border border-blue-200/60">
                      {truck.trips}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-600 font-mono">{truck.do_no || '-'}</td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 font-mono">
                    ₹ {(truck.freight || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-purple-600 font-mono">
                    {(truck.diesel || 0).toLocaleString()} L
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-rose-600 font-mono">
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
              {/* Header: S.No + Vehicle No + Total Trips */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 font-mono shrink-0">#{idx + 1}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold font-mono text-xs border border-slate-200 shadow-2xs truncate">
                    <Truck className="h-3 w-3 mr-1 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {truck.name ? (truck.name.toUpperCase().includes('CG') ? truck.name : `CG-10-CG ${truck.name}`) : '-'}
                    </span>
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold font-mono text-xs border border-blue-200/60 shrink-0">
                  {truck.trips} Trips
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</div>
                  <div className="font-semibold text-slate-700 mt-0.5 truncate">{formatDateDisplay(truck.date)}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DO No.</div>
                  <div className="font-mono font-semibold text-slate-700 mt-0.5 truncate" title={truck.do_no}>
                    {truck.do_no || '-'}
                  </div>
                </div>
                <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/70">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Freight</div>
                  <div className="font-mono font-black text-emerald-700 mt-0.5 truncate">
                    ₹ {(truck.freight || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100/70">
                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Diesel</div>
                  <div className="font-mono font-black text-purple-700 mt-0.5 truncate">
                    {(truck.diesel || 0).toLocaleString()} L
                  </div>
                </div>
              </div>

              {/* Footer: Balance */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs">
                <span className="text-slate-500 font-medium">Vehicle Balance:</span>
                <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
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

    </div>
  );
}
