import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// Default Preset calculation for Monthly EMI: (98,776 + 42,645) * 20 = 28,28,420
const DEFAULT_MONTHLY_EMI = '28,28,420';

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
    monthlyEmi: DEFAULT_MONTHLY_EMI,
    manualRevenue: ''
  });

  // State to store saved monthly records
  const [savedRecordsMap, setSavedRecordsMap] = useState({});

  // Dynamic Options for Form Fields (fetched from DB monthly_truck_maintenance)
  const [dbOptions, setDbOptions] = useState({
    amcEmiPerTruck: [],
    officeRent: [],
    staffSalary: [],
    driverSalaryPerTruck: []
  });
  const [openDropdownField, setOpenDropdownField] = useState(null);
  const [newOptionInputs, setNewOptionInputs] = useState({});
  const dropdownContainerRef = useRef(null);

  // Close dropdown on outside click anywhere on screen
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target)) {
        setOpenDropdownField(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load trucks, trips and fetch from monthly_truck_maintenance Supabase table
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [trucksRes, reportsRes, monthlyRes] = await Promise.all([
          supabase.from('trucks').select('id'),
          supabase.from('truck_reports').select('*').order('date', { ascending: false }),
          supabase.from('monthly_truck_maintenance').select('*').order('month', { ascending: false })
        ]);

        if (isMounted) {
          if (trucksRes.data) setRegisteredTrucksCount(trucksRes.data.length);
          if (reportsRes.data) setTripsData(reportsRes.data);

          const dbRecords = {};
          const amcSet = new Set();
          const rentSet = new Set();
          const staffSet = new Set();
          const driverSet = new Set();

          if (monthlyRes.data && Array.isArray(monthlyRes.data)) {
            monthlyRes.data.forEach((row) => {
              if (row.month) {
                dbRecords[row.month] = {
                  fleetCount: String(row.fleet_count || 20),
                  otherExpensesItems: Array.isArray(row.other_expenses_items) ? row.other_expenses_items : [],
                  amcEmiPerTruck: row.amc_emi_per_truck ? formatWithCommas(row.amc_emi_per_truck) : '',
                  officeRent: row.office_rent ? formatWithCommas(row.office_rent) : '',
                  staffSalary: row.staff_salary ? formatWithCommas(row.staff_salary) : '',
                  driverSalaryPerTruck: row.driver_salary_per_truck ? formatWithCommas(row.driver_salary_per_truck) : '',
                  monthlyEmi: row.monthly_emi_formula || (row.monthly_emi_total ? formatWithCommas(row.monthly_emi_total) : DEFAULT_MONTHLY_EMI),
                  manualRevenue: row.manual_revenue !== null && row.manual_revenue !== undefined ? String(row.manual_revenue) : ''
                };
              }
              if (row.amc_emi_per_truck) amcSet.add(formatWithCommas(row.amc_emi_per_truck));
              if (row.office_rent) rentSet.add(formatWithCommas(row.office_rent));
              if (row.staff_salary) staffSet.add(formatWithCommas(row.staff_salary));
              if (row.driver_salary_per_truck) driverSet.add(formatWithCommas(row.driver_salary_per_truck));
            });
          }

          setSavedRecordsMap(dbRecords);

          setDbOptions({
            amcEmiPerTruck: Array.from(amcSet).filter(Boolean),
            officeRent: Array.from(rentSet).filter(Boolean),
            staffSalary: Array.from(staffSet).filter(Boolean),
            driverSalaryPerTruck: Array.from(driverSet).filter(Boolean)
          });
        }
      } catch (err) {
        console.error('Error fetching data from monthly_truck_maintenance:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Handler to add a new custom option into a field's dropdown list
  const handleAddNewOption = (field) => {
    const rawVal = newOptionInputs[field];
    if (!rawVal || !String(rawVal).trim()) return;
    const formattedVal = formatWithCommas(rawVal.trim());

    setDbOptions(prev => {
      const existing = prev[field] || [];
      if (!existing.includes(formattedVal)) {
        const updated = [...existing, formattedVal];
        const customStorage = JSON.parse(localStorage.getItem('truck_expense_custom_options') || '{}');
        customStorage[field] = [...(customStorage[field] || []), formattedVal];
        localStorage.setItem('truck_expense_custom_options', JSON.stringify(customStorage));
        return { ...prev, [field]: updated };
      }
      return prev;
    });

    handleInputChange(field, formattedVal);
    setNewOptionInputs(prev => ({ ...prev, [field]: '' }));
    setOpenDropdownField(null);
  };

  // Format with Indian commas
  const formatWithCommas = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const str = String(val).trim();
    if (!str) return '';
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
      monthlyEmi: DEFAULT_MONTHLY_EMI,
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
      // If formula, evaluate and format result
      if (/[+\-*/()]/.test(String(val))) {
        const calculated = parseAmount(val);
        return { ...prev, [field]: formatWithCommas(calculated) };
      }
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

  // Save Form Handler (Persist directly to monthly_truck_maintenance Supabase Table)
  const handleSaveForm = async (e) => {
    if (e) e.preventDefault();
    if (!selectedMonth) return;

    const payload = {
      month: selectedMonth,
      fleet_count: modalFleetCount,
      other_expenses_items: formData.otherExpensesItems || [],
      other_expenses_total: modalOtherExpensesVal,
      amc_emi_per_truck: parseAmount(formData.amcEmiPerTruck),
      amc_emi_total: modalAmcTotal,
      office_rent: modalOfficeRent,
      staff_salary: modalStaffSalary,
      driver_salary_per_truck: parseAmount(formData.driverSalaryPerTruck),
      driver_salary_total: modalDriverSalaryTotal,
      monthly_emi_formula: formData.monthlyEmi || '',
      monthly_emi_total: modalEmiTotal,
      manual_revenue: formData.manualRevenue !== '' ? parseAmount(formData.manualRevenue) : null,
      gross_revenue: modalRevenue,
      trips_count: tripsData.filter(t => (t.date || t.trip_date || t.created_at || '').startsWith(selectedMonth)).length,
      total_expenses: modalTotalExpenses,
      net_profit_loss: modalProfitLoss,
      is_loss: modalProfitLoss < 0,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('monthly_truck_maintenance')
        .upsert(payload, { onConflict: 'month' });

      if (error) {
        console.error('Error saving to monthly_truck_maintenance:', error);
      }
    } catch (err) {
      console.error('Exception saving to monthly_truck_maintenance:', err);
    }

    setSavedRecordsMap(prev => ({ ...prev, [selectedMonth]: { ...formData } }));

    // Dynamically update dropdown lists with the newly saved values
    setDbOptions(prev => ({
      amcEmiPerTruck: Array.from(new Set([...prev.amcEmiPerTruck, formData.amcEmiPerTruck].filter(Boolean))),
      officeRent: Array.from(new Set([...prev.officeRent, formData.officeRent].filter(Boolean))),
      staffSalary: Array.from(new Set([...prev.staffSalary, formData.staffSalary].filter(Boolean))),
      driverSalaryPerTruck: Array.from(new Set([...prev.driverSalaryPerTruck, formData.driverSalaryPerTruck].filter(Boolean)))
    }));

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

  // Top KPI aggregates across filtered records
  const kpiStats = useMemo(() => {
    const totalFleet = filteredTableData.length > 0 ? Math.max(...filteredTableData.map(r => r.fleet || 0)) : 0;
    const totalTrips = filteredTableData.reduce((acc, r) => acc + (r.tripsCount || 0), 0);
    const totalRevenue = filteredTableData.reduce((acc, r) => acc + (r.revenue || 0), 0);
    const totalExpenses = filteredTableData.reduce((acc, r) => acc + (r.totalExp || 0), 0);
    const netProfitLoss = totalRevenue - totalExpenses;
    return { totalFleet, totalTrips, totalRevenue, totalExpenses, netProfitLoss };
  }, [filteredTableData]);

  return (
    <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 lg:p-7 font-sans antialiased text-slate-800 space-y-6">
      
      {/* ══════════ TOP HEADER & STATS BAR ══════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-500/25 shrink-0">
            <Truck size={28} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Monthly Truck Maintenance
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">
                Fleet P&L
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Month-wise Fleet Expenses, Auto Trip Freight Revenue & Net Profit/Loss Statement
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Add / Edit Form Button */}
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:opacity-95 text-white px-4.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-red-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>Add Month Expense</span>
          </button>

          {/* Export Full Table */}
          <button
            onClick={handleExportFullExcel}
            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:shadow-xs active:scale-95 cursor-pointer"
          >
            <Download size={15} className="stroke-[2.5]" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ══════════ METRIC KPI CARDS ══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Card 1: Total Trips */}
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Trips (Recorded)</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5">
            {kpiStats.totalTrips.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Across {filteredTableData.length} active month cycles
          </div>
        </div>

        {/* Card 2: Gross Revenue */}
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Gross Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-0.5">
            ₹{kpiStats.totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Calculated from auto trip freight
          </div>
        </div>

        {/* Card 3: Total Expenses */}
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Total Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={14} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700 font-mono mt-0.5">
            ₹{kpiStats.totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            EMI, AMC, Salaries & Overheads
          </div>
        </div>

        {/* Card 4: Net P&L */}
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Net Profit / Loss</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${kpiStats.netProfitLoss >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <DollarSign size={14} />
            </div>
          </div>
          <div className={`text-lg sm:text-xl font-black font-mono mt-0.5 ${kpiStats.netProfitLoss >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {kpiStats.netProfitLoss >= 0 ? '+' : ''}₹{kpiStats.netProfitLoss.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Overall cumulative balance
          </div>
        </div>
      </div>

      {/* Main Content: Data Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {/* Table Topbar: Search, Calendar Month Picker & Stats */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Month (e.g. 2026-11)..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            {/* Calendar Month Picker */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hover:border-slate-300 transition-colors">
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
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-3 py-1.5 rounded-xl border border-red-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
              Total Records: <strong className="text-slate-900">{filteredTableData.length} Months</strong>
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-sidebar-scroll">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-black text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-3 text-center w-12 whitespace-nowrap">S.No.</th>
                <th className="py-3.5 px-3 text-center w-20 whitespace-nowrap">Action</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Month</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Fleet</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Trips</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Other Exp. (₹)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">AMC EMI (₹)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Staff & Driver (₹)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Monthly EMI (₹)</th>
                <th className="py-3.5 px-4 text-right bg-rose-50/70 text-rose-800 whitespace-nowrap">Total Exp. (₹)</th>
                <th className="py-3.5 px-4 text-right bg-emerald-50/70 text-emerald-800 whitespace-nowrap">Gross Revenue (₹)</th>
                <th className="py-3.5 px-4 text-right bg-slate-100/90 text-slate-800 whitespace-nowrap">Net Profit / Loss (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTableData.length > 0 ? (
                filteredTableData.map((row, idx) => {
                  const staffAndDriver = row.staff + row.driver;
                  return (
                    <tr 
                      key={row.month} 
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* S.No. */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 text-xs whitespace-nowrap">
                        {idx + 1}
                      </td>

                      {/* Action: Eye Button */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(row)}
                            title="View Month Statement Details"
                            className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-2xs border border-emerald-200/60 cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditMonth(row.month)}
                            title="Edit this month parameters"
                            className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center shadow-2xs border border-slate-200 cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>
                      </td>

                      {/* Month */}
                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${row.hasSavedForm ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-300'}`}></span>
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 whitespace-nowrap">
                            {row.month}
                          </span>
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            ({formatDisplayMonth(row.month)})
                          </span>
                        </div>
                      </td>

                      {/* Fleet */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200 whitespace-nowrap">
                          {row.fleet}
                        </span>
                      </td>

                      {/* Trips */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200 whitespace-nowrap">
                          {row.tripsCount}
                        </span>
                      </td>

                      {/* Other Exp */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                        {row.otherExp ? `₹${row.otherExp.toLocaleString('en-IN')}` : <span className="text-slate-300">—</span>}
                      </td>

                      {/* AMC EMI */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                        {row.amc ? `₹${row.amc.toLocaleString('en-IN')}` : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Staff & Driver */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                        {staffAndDriver ? `₹${staffAndDriver.toLocaleString('en-IN')}` : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Monthly EMI */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        {row.emi ? `₹${row.emi.toLocaleString('en-IN')}` : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Total Exp */}
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-700 bg-rose-50/30 whitespace-nowrap">
                        ₹{row.totalExp.toLocaleString('en-IN')}
                      </td>

                      {/* Gross Revenue */}
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 bg-emerald-50/30 whitespace-nowrap">
                        ₹{row.revenue.toLocaleString('en-IN')}
                      </td>

                      {/* Net Profit / Loss */}
                      <td className="py-3 px-4 text-right font-mono font-black whitespace-nowrap bg-slate-50/50">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-2xs border whitespace-nowrap ${
                          row.totalExp === 0 && row.revenue === 0
                            ? 'text-slate-400 bg-slate-100 border-slate-200'
                            : row.isLoss 
                              ? 'text-rose-700 bg-rose-50 border-rose-200' 
                              : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        }`}>
                          {row.totalExp > 0 || row.revenue > 0 ? (
                            <>
                              {row.isLoss ? <ArrowDownRight size={13} className="text-rose-600" /> : <ArrowUpRight size={13} className="text-emerald-600" />}
                              <span>{row.isLoss ? '-' : '+'}₹{Math.abs(row.profitLoss).toLocaleString('en-IN')}</span>
                            </>
                          ) : (
                            '₹0'
                          )}
                        </span>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No monthly records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click "Add Month Expense" to create a new monthly statement.</p>
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

              {/* Row 2 & 3: Database Dropdowns Container */}
              <div ref={dropdownContainerRef} className="space-y-4.5">
                {/* Row 2: AMC EMI & Office Rent with DB Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* AMC EMI / Truck */}
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      AMC EMI / Truck (₹)
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={formData.amcEmiPerTruck}
                        onChange={(e) => handleInputChange('amcEmiPerTruck', e.target.value)}
                        onFocus={() => setOpenDropdownField('amcEmiPerTruck')}
                        onBlur={() => handleBlurFormat('amcEmiPerTruck')}
                        placeholder="e.g. 5,066"
                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 outline-none"
                      />
                      {openDropdownField === 'amcEmiPerTruck' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Select from Database:</div>
                          <div className="max-h-36 overflow-y-auto space-y-1 custom-sidebar-scroll">
                            {(dbOptions.amcEmiPerTruck || []).map((opt, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  handleInputChange('amcEmiPerTruck', opt);
                                  setOpenDropdownField(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                ₹{opt}
                              </button>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                            <input 
                              type="text"
                              placeholder="New amount (₹)..."
                              value={newOptionInputs['amcEmiPerTruck'] || ''}
                              onChange={(e) => setNewOptionInputs(prev => ({ ...prev, amcEmiPerTruck: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewOption('amcEmiPerTruck'); } }}
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-red-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddNewOption('amcEmiPerTruck')}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                            >
                              +Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Office Rent */}
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Office Rent (₹)
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={formData.officeRent}
                        onChange={(e) => handleInputChange('officeRent', e.target.value)}
                        onFocus={() => setOpenDropdownField('officeRent')}
                        onBlur={() => handleBlurFormat('officeRent')}
                        placeholder="e.g. 5,000"
                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 outline-none"
                      />
                      {openDropdownField === 'officeRent' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Select from Database:</div>
                          <div className="max-h-36 overflow-y-auto space-y-1 custom-sidebar-scroll">
                            {(dbOptions.officeRent || []).map((opt, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  handleInputChange('officeRent', opt);
                                  setOpenDropdownField(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                ₹{opt}
                              </button>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                            <input 
                              type="text"
                              placeholder="New amount (₹)..."
                              value={newOptionInputs['officeRent'] || ''}
                              onChange={(e) => setNewOptionInputs(prev => ({ ...prev, officeRent: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewOption('officeRent'); } }}
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-red-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddNewOption('officeRent')}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                            >
                              +Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Staff Salary & Driver Salary with DB Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Staff Salary */}
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Staff Salary (₹)
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={formData.staffSalary}
                        onChange={(e) => handleInputChange('staffSalary', e.target.value)}
                        onFocus={() => setOpenDropdownField('staffSalary')}
                        onBlur={() => handleBlurFormat('staffSalary')}
                        placeholder="e.g. 30,000"
                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 outline-none"
                      />
                      {openDropdownField === 'staffSalary' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Select from Database:</div>
                          <div className="max-h-36 overflow-y-auto space-y-1 custom-sidebar-scroll">
                            {(dbOptions.staffSalary || []).map((opt, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  handleInputChange('staffSalary', opt);
                                  setOpenDropdownField(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                ₹{opt}
                              </button>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                            <input 
                              type="text"
                              placeholder="New amount (₹)..."
                              value={newOptionInputs['staffSalary'] || ''}
                              onChange={(e) => setNewOptionInputs(prev => ({ ...prev, staffSalary: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewOption('staffSalary'); } }}
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-red-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddNewOption('staffSalary')}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                            >
                              +Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Driver Salary / Truck */}
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Driver Salary / Truck (₹)
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={formData.driverSalaryPerTruck}
                        onChange={(e) => handleInputChange('driverSalaryPerTruck', e.target.value)}
                        onFocus={() => setOpenDropdownField('driverSalaryPerTruck')}
                        onBlur={() => handleBlurFormat('driverSalaryPerTruck')}
                        placeholder="e.g. 15,000"
                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-red-500 outline-none"
                      />
                      {openDropdownField === 'driverSalaryPerTruck' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Select from Database:</div>
                          <div className="max-h-36 overflow-y-auto space-y-1 custom-sidebar-scroll">
                            {(dbOptions.driverSalaryPerTruck || []).map((opt, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  handleInputChange('driverSalaryPerTruck', opt);
                                  setOpenDropdownField(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                ₹{opt}
                              </button>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                            <input 
                              type="text"
                              placeholder="New amount (₹)..."
                              value={newOptionInputs['driverSalaryPerTruck'] || ''}
                              onChange={(e) => setNewOptionInputs(prev => ({ ...prev, driverSalaryPerTruck: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewOption('driverSalaryPerTruck'); } }}
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-red-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddNewOption('driverSalaryPerTruck')}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                            >
                              +Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: Monthly EMI */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="text-xs font-bold text-red-600 uppercase tracking-wider">
                    Monthly EMI (Total ₹)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                    Calculation: <span className="text-red-700 font-mono font-bold">(₹98,776 + ₹42,645) × 20 = ₹28,28,420</span>
                  </span>
                </div>
                <input 
                  type="text"
                  value={formData.monthlyEmi}
                  onChange={(e) => handleInputChange('monthlyEmi', e.target.value)}
                  onBlur={() => handleBlurFormat('monthlyEmi')}
                  placeholder="Enter EMI amount or formula (e.g. 98,776 + 42,645)"
                  className="w-full px-3.5 py-2.5 bg-red-50/30 border border-red-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-red-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Formula applied: (₹98,776 + ₹42,645) = ₹1,41,421 per unit × 20 Trucks = ₹28,28,420 total EMI.
                </p>
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
