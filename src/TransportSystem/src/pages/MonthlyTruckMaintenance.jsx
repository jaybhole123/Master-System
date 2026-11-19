import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, DollarSign, Calendar, Calculator, Download, 
  TrendingUp, TrendingDown, Save, RefreshCw, FileSpreadsheet,
  CheckCircle, ArrowUpRight, ArrowDownRight, Layers, Sparkles,
  Plus, Trash2, Eye, X, Edit3, Filter, Search
} from 'lucide-react';
import * as XLSX from 'xlsx';
import supabase from '../../../SupabaseClient';

// Helper: format month string like "2026-11" or "2026-10" to readable format e.g. "2026 Nov"
const formatDisplayMonth = (m) => {
  if (!m) return '—';
  const match = String(m).match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return m;
  const year = match[1];
  const monthNum = parseInt(match[2], 10);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[monthNum - 1] || match[2];
  return `${year} ${monthName}`;
};

export default function MonthlyTruckMaintenance() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [tripsData, setTripsData] = useState([]);
  const [registeredTrucksCount, setRegisteredTrucksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [viewDetailModal, setViewDetailModal] = useState({ isOpen: false, month: null, data: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [calendarMonthFilter, setCalendarMonthFilter] = useState('');

  // Form State for Entry Modal
  const [formData, setFormData] = useState({
    fleetCount: '20',
    otherExpensesItems: [{ name: '', amount: '' }],
    amcEmiPerTruck: '',
    officeRent: '',
    staffSalary: '',
    driverSalaryPerTruck: '',
    monthlyEmi: '',
    manualRevenue: ''
  });

  // State to store saved monthly records
  const [savedRecordsMap, setSavedRecordsMap] = useState(() => {
    const map = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('truck_monthly_form_')) {
        const m = key.replace('truck_monthly_form_', '');
        try {
          map[m] = JSON.parse(localStorage.getItem(key));
        } catch (e) {}
      }
    }
    return map;
  });

  // Load trucks and trips
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [trucksRes, reportsRes] = await Promise.all([
          supabase.from('trucks').select('id'),
          supabase.from('truck_reports').select('*').order('date', { ascending: false })
        ]);

        if (isMounted) {
          if (trucksRes.data) setRegisteredTrucksCount(trucksRes.data.length);
          if (reportsRes.data) setTripsData(reportsRes.data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Format with Indian commas
  const formatWithCommas = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const str = String(val).trim();
    if (!str) return '';
    if (/[+\-*/()]/.test(str)) return str;
    const cleanNum = str.replace(/,/g, '');
    if (isNaN(Number(cleanNum))) return str;
    const parts = cleanNum.split('.');
    const intPart = parts[0];
    const decPart = parts.length > 1 ? '.' + parts[1] : '';
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    const formatted = (otherNumbers !== '' ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + lastThree;
    return formatted + decPart;
  };

  // Math parser
  const parseAmount = (val) => {
    if (!val) return 0;
    const str = String(val).replace(/,/g, '').trim();
    if (!str) return 0;
    if (!isNaN(Number(str))) return Number(str);
    try {
      const sanitized = str.replace(/[^0-9+\-*/.() ]/g, '');
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      return isNaN(Number(result)) ? 0 : Number(result);
    } catch (e) {
      return 0;
    }
  };

  // Trips strictly for currently selected month in form
  const currentMonthTrips = useMemo(() => {
    if (!selectedMonth) return [];
    return tripsData.filter(t => {
      const d = t.date || t.trip_date || t.created_at;
      return d && d.startsWith(selectedMonth);
    });
  }, [tripsData, selectedMonth]);

  // Aggregate freight for selected month
  const currentMonthFreight = useMemo(() => {
    let freightSum = 0;
    currentMonthTrips.forEach(t => {
      const totalF = parseFloat(t.total_freight) || 0;
      if (totalF > 0) {
        freightSum += totalF;
      } else {
        const perMt = parseFloat(t.per_mt) || 0;
        const tonnage = parseFloat(t.tonnage) || parseFloat(t.weight) || 0;
        freightSum += Math.round(perMt * tonnage);
      }
    });
    return Math.round(freightSum);
  }, [currentMonthTrips]);

  // When selectedMonth changes, load its form data into modal form
  useEffect(() => {
    if (!selectedMonth) return;
    const storageKey = `truck_monthly_form_${selectedMonth}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.otherExpenses && !parsed.otherExpensesItems) {
          parsed.otherExpensesItems = [{ name: 'General', amount: parsed.otherExpenses }];
        }
        if (!parsed.otherExpensesItems || parsed.otherExpensesItems.length === 0) {
          parsed.otherExpensesItems = [{ name: '', amount: '' }];
        }
        setFormData(parsed);
        return;
      } catch (e) {}
    }

    setFormData({
      fleetCount: registeredTrucksCount > 0 ? String(registeredTrucksCount) : '20',
      otherExpensesItems: [{ name: '', amount: '' }],
      amcEmiPerTruck: '',
      officeRent: '',
      staffSalary: '',
      driverSalaryPerTruck: '',
      monthlyEmi: '',
      manualRevenue: ''
    });
  }, [selectedMonth, registeredTrucksCount]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddOtherExpenseRow = () => {
    setFormData(prev => ({
      ...prev,
      otherExpensesItems: [...(prev.otherExpensesItems || []), { name: '', amount: '' }]
    }));
  };

  const handleUpdateOtherExpenseRow = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.otherExpensesItems || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, otherExpensesItems: updated };
    });
  };

  const handleRemoveOtherExpenseRow = (index) => {
    setFormData(prev => {
      const updated = [...(prev.otherExpensesItems || [])];
      if (updated.length <= 1) {
        return { ...prev, otherExpensesItems: [{ name: '', amount: '' }] };
      }
      updated.splice(index, 1);
      return { ...prev, otherExpensesItems: updated };
    });
  };

  const handleBlurFormat = (field) => {
    setFormData(prev => {
      const val = prev[field];
      if (!val) return prev;
      return { ...prev, [field]: formatWithCommas(val) };
    });
  };

  const handleBlurOtherExpenseRow = (index) => {
    setFormData(prev => {
      const updated = [...(prev.otherExpensesItems || [])];
      if (updated[index] && updated[index].amount) {
        updated[index] = { ...updated[index], amount: formatWithCommas(updated[index].amount) };
      }
      return { ...prev, otherExpensesItems: updated };
    });
  };

  // Calculations for Active Form / Modal
  const modalFleetCount = parseAmount(formData.fleetCount) || 20;
  const modalOtherExpensesVal = (formData.otherExpensesItems || []).reduce((acc, item) => acc + parseAmount(item.amount), 0);
  const modalAmcTotal = parseAmount(formData.amcEmiPerTruck) * modalFleetCount;
  const modalOfficeRent = parseAmount(formData.officeRent);
  const modalStaffSalary = parseAmount(formData.staffSalary);
  const modalDriverSalaryTotal = parseAmount(formData.driverSalaryPerTruck) * modalFleetCount;
  const modalEmiTotal = parseAmount(formData.monthlyEmi);
  const modalTotalExpenses = modalOtherExpensesVal + modalAmcTotal + modalOfficeRent + modalStaffSalary + modalDriverSalaryTotal + modalEmiTotal;
  const modalRevenue = formData.manualRevenue !== '' && parseAmount(formData.manualRevenue) > 0 
    ? parseAmount(formData.manualRevenue) 
    : currentMonthFreight;
  const modalProfitLoss = modalTotalExpenses > 0 ? (modalRevenue - modalTotalExpenses) : 0;

  // Save Form Handler
  const handleSaveForm = (e) => {
    if (e) e.preventDefault();
    if (!selectedMonth) return;
    const storageKey = `truck_monthly_form_${selectedMonth}`;
    localStorage.setItem(storageKey, JSON.stringify(formData));
    setSavedRecordsMap(prev => ({ ...prev, [selectedMonth]: { ...formData } }));
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsFormModalOpen(false);
    }, 1000);
  };

  // Compile full list of months from DB trips + savedRecordsMap for Data Table
  const tableMonthsData = useMemo(() => {
    const monthsSet = new Set();
    tripsData.forEach(t => {
      const d = t.date || t.trip_date || t.created_at;
      if (d && /^\d{4}-\d{2}/.test(d)) {
        monthsSet.add(d.substring(0, 7));
      }
    });
    Object.keys(savedRecordsMap).forEach(m => monthsSet.add(m));

    const allMonths = Array.from(monthsSet).sort().reverse();

    return allMonths.map(month => {
      // Find trips in this month
      const mTrips = tripsData.filter(t => {
        const d = t.date || t.trip_date || t.created_at;
        return d && d.startsWith(month);
      });

      let autoFreight = 0;
      mTrips.forEach(t => {
        const totalF = parseFloat(t.total_freight) || 0;
        if (totalF > 0) {
          autoFreight += totalF;
        } else {
          const perMt = parseFloat(t.per_mt) || 0;
          const tonnage = parseFloat(t.tonnage) || parseFloat(t.weight) || 0;
          autoFreight += Math.round(perMt * tonnage);
        }
      });

      const saved = savedRecordsMap[month] || null;
      let fleet = 20;
      let otherExp = 0;
      let amc = 0;
      let rent = 0;
      let staff = 0;
      let driver = 0;
      let emi = 0;
      let manualRev = 0;

      if (saved) {
        fleet = parseAmount(saved.fleetCount) || 20;
        otherExp = (saved.otherExpensesItems || []).reduce((acc, i) => acc + parseAmount(i.amount), 0);
        amc = parseAmount(saved.amcEmiPerTruck) * fleet;
        rent = parseAmount(saved.officeRent);
        staff = parseAmount(saved.staffSalary);
        driver = parseAmount(saved.driverSalaryPerTruck) * fleet;
        emi = parseAmount(saved.monthlyEmi);
        manualRev = parseAmount(saved.manualRevenue);
      }

      const totalExp = otherExp + amc + rent + staff + driver + emi;
      const revenue = manualRev > 0 ? manualRev : autoFreight;
      const profitLoss = totalExp > 0 ? (revenue - totalExp) : 0;
      const isLoss = profitLoss < 0;

      return {
        month,
        tripsCount: mTrips.length,
        fleet,
        otherExp,
        amc,
        rent,
        staff,
        driver,
        emi,
        totalExp,
        revenue,
        profitLoss,
        isLoss,
        hasSavedForm: !!saved,
        savedData: saved
      };
    });
  }, [tripsData, savedRecordsMap]);

  // Filter Table data with Search & Calendar Month Filter
  const filteredTableData = useMemo(() => {
    return tableMonthsData.filter(r => {
      if (calendarMonthFilter && r.month !== calendarMonthFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const disp = formatDisplayMonth(r.month).toLowerCase();
        if (!r.month.toLowerCase().includes(q) && !disp.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [tableMonthsData, searchTerm, calendarMonthFilter]);

  // Open Eye Modal to view full details
  const handleOpenDetailModal = (row) => {
    setViewDetailModal({
      isOpen: true,
      month: row.month,
      data: row
    });
  };

  // Open Edit Form Modal for a specific month
  const handleOpenEditMonth = (month) => {
    setSelectedMonth(month);
    setIsFormModalOpen(true);
  };

  // Export full table to Excel
  const handleExportFullExcel = () => {
    const data = filteredTableData.map((r, idx) => ({
      'S.No.': idx + 1,
      'Month': r.month,
      'Fleet Count': r.fleet,
      'Trips Recorded': r.tripsCount,
      'Other Expenses (₹)': r.otherExp,
      'AMC EMI (₹)': r.amc,
      'Office Rent (₹)': r.rent,
      'Staff Salary (₹)': r.staff,
      'Driver Salary (₹)': r.driver,
      'Monthly EMI (₹)': r.emi,
      'Total Expenses (₹)': r.totalExp,
      'Gross Revenue (₹)': r.revenue,
      'Net Profit / Loss (₹)': r.profitLoss
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Truck Maintenance");
    XLSX.writeFile(wb, `Monthly_Truck_Maintenance_Records.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-800">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Monthly Truck Maintenance
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Month-wise Fleet Expenses, Revenue & Profit/Loss Statement Records
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Add / Edit Form Button */}
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-red-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Month Expense</span>
          </button>

          {/* Export Full Table */}
          <button
            onClick={handleExportFullExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all hover:shadow active:scale-95 cursor-pointer"
          >
            <Download size={16} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Main Content: Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        
        {/* Table Topbar: Search, Calendar Month Picker & Stats */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Month (e.g. 2026-11)..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-red-500 focus:ring-1 focus:ring-red-100 outline-none transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Calendar Month Picker */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs hover:border-slate-300 transition-colors">
              <Calendar size={14} className="text-red-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden xs:inline">Month:</span>
              <input 
                type="month"
                value={calendarMonthFilter}
                onChange={(e) => setCalendarMonthFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                title="Filter by calendar month"
              />
            </div>

            {/* Reset / Clear All Filters */}
            {(searchTerm || calendarMonthFilter) && (
              <button 
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCalendarMonthFilter('');
                }}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-2.5 py-1.5 rounded-lg border border-red-200 transition-all cursor-pointer flex items-center gap-1"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Total Records: <strong className="text-slate-900">{filteredTableData.length} Months</strong></span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-sidebar-scroll">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-3 text-center w-12">S.No.</th>
                <th className="py-3.5 px-4 text-center w-14">Action</th>
                <th className="py-3.5 px-4">Month</th>
                <th className="py-3.5 px-4 text-center">Fleet</th>
                <th className="py-3.5 px-4 text-center">Trips</th>
                <th className="py-3.5 px-4 text-right">Other Exp. (₹)</th>
                <th className="py-3.5 px-4 text-right">AMC EMI (₹)</th>
                <th className="py-3.5 px-4 text-right">Staff & Driver (₹)</th>
                <th className="py-3.5 px-4 text-right">Monthly EMI (₹)</th>
                <th className="py-3.5 px-4 text-right bg-rose-50/50 text-rose-800">Total Exp. (₹)</th>
                <th className="py-3.5 px-4 text-right bg-emerald-50/50 text-emerald-800">Gross Revenue (₹)</th>
                <th className="py-3.5 px-4 text-right bg-slate-100/80 text-slate-800">Net Profit / Loss (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTableData.length > 0 ? (
                filteredTableData.map((row, idx) => {
                  const staffAndDriver = row.staff + row.driver;
                  return (
                    <tr 
                      key={row.month} 
                      className={`hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}
                    >
                      {/* S.No. */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-500 text-xs">
                        {idx + 1}
                      </td>

                      {/* Action: Eye Button */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(row)}
                            title="View Month Statement Details"
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-xs cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditMonth(row.month)}
                            title="Edit this month parameters"
                            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center shadow-xs cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>

                      {/* Month */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${row.hasSavedForm ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          {row.month}
                        </span>
                      </td>

                      {/* Fleet */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {row.fleet}
                      </td>

                      {/* Trips */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600">
                        {row.tripsCount}
                      </td>

                      {/* Other Exp */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                        {row.otherExp ? `₹${row.otherExp.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* AMC EMI */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                        {row.amc ? `₹${row.amc.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Staff & Driver */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                        {staffAndDriver ? `₹${staffAndDriver.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Monthly EMI */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-red-600">
                        {row.emi ? `₹${row.emi.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Total Exp */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700 bg-rose-50/30 whitespace-nowrap">
                        ₹{row.totalExp.toLocaleString('en-IN')}
                      </td>

                      {/* Gross Revenue */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30 whitespace-nowrap">
                        ₹{row.revenue.toLocaleString('en-IN')}
                      </td>

                      {/* Net Profit / Loss */}
                      <td className="py-3.5 px-4 text-right font-mono font-black whitespace-nowrap bg-slate-50/50">
                        <span className={`px-2.5 py-1 rounded-md text-xs inline-block ${
                          row.totalExp === 0 && row.revenue === 0
                            ? 'text-slate-400 bg-slate-100'
                            : row.isLoss 
                              ? 'text-red-700 bg-red-100/70' 
                              : 'text-emerald-700 bg-emerald-100/70'
                        }`}>
                          {row.totalExp > 0 || row.revenue > 0 
                            ? `${row.isLoss ? '-' : '+'}₹${Math.abs(row.profitLoss).toLocaleString('en-IN')}` 
                            : '₹0'}
                        </span>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No monthly records found. Click <strong>"Add Month Expense"</strong> to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          1. FORM MODAL (Popup when clicking "Add / Edit Month Expense")
      ══════════════════════════════════════════════════════════════════ */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calculator size={20} />
                <h3 className="font-bold text-base tracking-wide">
                  Monthly Expense Entry Form
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {/* Month Picker inside Modal */}
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/30 text-white">
                  <Calendar size={14} />
                  <input 
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                  />
                </div>

                <button 
                  onClick={() => setIsFormModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4.5 flex-1 custom-sidebar-scroll">
              
              {/* Fleet Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Fleet Count (Trucks)
                </label>
                <input 
                  type="text"
                  value={formData.fleetCount}
                  onChange={(e) => handleInputChange('fleetCount', e.target.value)}
                  placeholder="20"
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                />
              </div>

              {/* Other Expenses Breakdown */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Other Expenses (Breakdown)
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">Add custom heads</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {modalOtherExpensesVal > 0 && (
                      <span className="text-xs font-black text-rose-600 font-mono bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                        Total: ₹{modalOtherExpensesVal.toLocaleString('en-IN')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleAddOtherExpenseRow}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Head</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {(formData.otherExpensesItems || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateOtherExpenseRow(idx, 'name', e.target.value)}
                        placeholder="Expense Name (e.g. Tyres)"
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-red-500 outline-none"
                      />
                      <input 
                        type="text"
                        value={item.amount}
                        onChange={(e) => handleUpdateOtherExpenseRow(idx, 'amount', e.target.value)}
                        onBlur={() => handleBlurOtherExpenseRow(idx)}
                        placeholder="Amount (₹)"
                        className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-red-500 outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOtherExpenseRow(idx)}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 2: AMC EMI & Office Rent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    AMC EMI / Truck (₹)
                  </label>
                  <input 
                    type="text"
                    value={formData.amcEmiPerTruck}
                    onChange={(e) => handleInputChange('amcEmiPerTruck', e.target.value)}
                    onBlur={() => handleBlurFormat('amcEmiPerTruck')}
                    placeholder="e.g. 5,066"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Office Rent (₹)
                  </label>
                  <input 
                    type="text"
                    value={formData.officeRent}
                    onChange={(e) => handleInputChange('officeRent', e.target.value)}
                    onBlur={() => handleBlurFormat('officeRent')}
                    placeholder="e.g. 5,000"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Staff Salary & Driver Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Staff Salary (₹)
                  </label>
                  <input 
                    type="text"
                    value={formData.staffSalary}
                    onChange={(e) => handleInputChange('staffSalary', e.target.value)}
                    onBlur={() => handleBlurFormat('staffSalary')}
                    placeholder="e.g. 30,000"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Driver Salary / Truck (₹)
                  </label>
                  <input 
                    type="text"
                    value={formData.driverSalaryPerTruck}
                    onChange={(e) => handleInputChange('driverSalaryPerTruck', e.target.value)}
                    onBlur={() => handleBlurFormat('driverSalaryPerTruck')}
                    placeholder="e.g. 15,000"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Monthly EMI */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  Monthly EMI (Total ₹)
                </label>
                <input 
                  type="text"
                  value={formData.monthlyEmi}
                  onChange={(e) => handleInputChange('monthlyEmi', e.target.value)}
                  onBlur={() => handleBlurFormat('monthlyEmi')}
                  placeholder="Enter EMI amount or formula (e.g. 98,776 + 42,645)"
                  className="w-full px-3.5 py-2.5 bg-red-50/30 border border-red-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-red-500 outline-none"
                />
              </div>

              {/* Row 5: Revenue */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Monthly Revenue (Freight Amount)</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Auto Fetched</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-800">
                    DB: ₹{currentMonthFreight.toLocaleString('en-IN')} ({currentMonthTrips.length} Trips)
                  </span>
                </div>
                <input 
                  type="text"
                  value={
                    formData.manualRevenue !== '' 
                      ? formData.manualRevenue 
                      : (currentMonthFreight > 0 ? Number(currentMonthFreight).toLocaleString('en-IN') : '')
                  }
                  onChange={(e) => handleInputChange('manualRevenue', e.target.value)}
                  placeholder={currentMonthFreight > 0 ? `Auto: ₹${currentMonthFreight.toLocaleString('en-IN')}` : 'Enter Revenue (₹)'}
                  className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 rounded-xl text-sm font-bold text-emerald-900 focus:bg-white focus:border-emerald-500 outline-none font-mono"
                />
              </div>

              {/* Modal Footer / Save */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={15} />
                  <span>{isSaved ? 'Saved!' : `Save for ${selectedMonth}`}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          2. EYE MODAL: VIEW FULL STATEMENT DETAILS POPUP
      ══════════════════════════════════════════════════════════════════ */}
      {viewDetailModal.isOpen && viewDetailModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl sm:max-w-3xl w-full overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base tracking-wide uppercase">
                  Statement Summary
                </h3>
                <p className="text-xs text-red-100 font-medium">
                  Month: {viewDetailModal.month} • {viewDetailModal.data.fleet} Trucks Fleet
                </p>
              </div>

              <button 
                onClick={() => setViewDetailModal({ isOpen: false, month: null, data: null })}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Statement Line Items */}
            <div className="divide-y divide-slate-100 text-sm max-h-[70vh] overflow-y-auto">
              
              <div className="px-6 py-3.5 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-600 font-medium text-xs sm:text-sm">Trips / Dispatches</span>
                <span className="font-mono font-bold text-blue-600">{viewDetailModal.data.tripsCount} Recorded</span>
              </div>

              <div className="px-6 py-3.5 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-600 font-medium text-xs sm:text-sm">Other Expenses</span>
                <span className="font-mono font-bold text-slate-900">₹{viewDetailModal.data.otherExp.toLocaleString('en-IN')}</span>
              </div>

              <div className="px-6 py-3.5 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-600 font-medium text-xs sm:text-sm">AMC EMI</span>
                <span className="font-mono font-bold text-slate-900">₹{viewDetailModal.data.amc.toLocaleString('en-IN')}</span>
              </div>

              <div className="px-6 py-3.5 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-600 font-medium text-xs sm:text-sm">Office Rent</span>
                <span className="font-mono font-bold text-slate-900">₹{viewDetailModal.data.rent.toLocaleString('en-IN')}</span>
              </div>

              <div className="px-6 py-3.5 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-600 font-medium text-xs sm:text-sm">Staff Salary</span>
                <span className="font-mono font-bold text-slate-900">₹{viewDetailModal.data.staff.toLocaleString('en-IN')}</span>
              </div>

              <div className="px-6 py-3.5 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-600 font-medium text-xs sm:text-sm">Driver Salary</span>
                <span className="font-mono font-bold text-slate-900">₹{viewDetailModal.data.driver.toLocaleString('en-IN')}</span>
              </div>

              <div className="px-6 py-3.5 flex justify-between items-center hover:bg-slate-50/50 bg-red-50/20">
                <span className="text-red-700 font-semibold text-xs sm:text-sm">Monthly Fleet EMI</span>
                <span className="font-mono font-bold text-red-600">₹{viewDetailModal.data.emi.toLocaleString('en-IN')}</span>
              </div>

              {/* Total Expenses */}
              <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-t-2 border-slate-200">
                <span className="text-slate-900 font-black text-xs uppercase tracking-wide">Total Expenses</span>
                <span className="font-mono font-black text-base text-red-600">
                  ₹{viewDetailModal.data.totalExp.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Gross Revenue */}
              <div className="px-6 py-4 flex justify-between items-center bg-emerald-50/50 border-t border-emerald-100">
                <span className="text-emerald-900 font-black text-xs uppercase tracking-wide">Gross Revenue</span>
                <span className="font-mono font-black text-base text-emerald-600">
                  ₹{viewDetailModal.data.revenue.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Net Profit / Loss */}
              <div className={`p-6 border-t ${
                viewDetailModal.data.isLoss 
                  ? 'bg-rose-50 border-red-200' 
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-black tracking-wider uppercase flex items-center gap-1.5 ${
                      viewDetailModal.data.isLoss ? 'text-red-700' : 'text-emerald-700'
                    }`}>
                      {viewDetailModal.data.isLoss ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      {viewDetailModal.data.isLoss ? 'Net Fleet Loss' : 'Net Fleet Profit'}
                    </span>
                  </div>

                  <div className={`text-2xl font-black font-mono ${
                    viewDetailModal.data.isLoss ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    {viewDetailModal.data.isLoss ? '-' : '+'}₹{Math.abs(viewDetailModal.data.profitLoss).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const m = viewDetailModal.month;
                  setViewDetailModal({ isOpen: false, month: null, data: null });
                  handleOpenEditMonth(m);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 size={13} />
                <span>Edit Parameters</span>
              </button>
              <button
                type="button"
                onClick={() => setViewDetailModal({ isOpen: false, month: null, data: null })}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
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
