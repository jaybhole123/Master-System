import React, { useState, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader, User, Calendar, Clock, DollarSign, ArrowDownRight, ShieldAlert, CreditCard, CheckCircle2, ChevronRight, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTH_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getMonthName = (val) => {
  if (!val) return '';
  if (MONTH_LIST.includes(val)) return val;
  if (val.includes('-')) {
    const parts = val.split('-');
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) return MONTH_LIST[monthIdx];
  }
  const matched = MONTH_LIST.find(m => val.toLowerCase().includes(m.toLowerCase()));
  if (matched) return matched;
  return val;
};

const getDaysForMonthName = (monthName, year = 2026) => {
  const monthMap = {
    'January': 31,
    'February': (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28,
    'March': 31,
    'April': 30,
    'May': 31,
    'June': 30,
    'July': 31,
    'August': 31,
    'September': 30,
    'October': 31,
    'November': 30,
    'December': 31
  };
  return monthMap[monthName] || 30;
};

const getDesignationStyle = (desg) => {
  if (!desg) return { color: 'var(--text-secondary)' };
  const d = desg.toUpperCase().trim();
  switch (d) {
    case 'HELPING HANDS': return { backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE ENTERPRISE': return { backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'ASAK COAL PVT.LTD.': return { backgroundColor: '#d1fae5', color: '#047857', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE LOGISTICS': return { backgroundColor: '#ede9fe', color: '#6d28d9', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'BOTIVATE': return { backgroundColor: '#ffe4e6', color: '#be123c', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE TRADERS': return { backgroundColor: '#ffedd5', color: '#c2410c', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'ASAK COAL LOGISTICS': return { backgroundColor: '#ccfbf1', color: '#0f766e', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    default: return { backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
  }
};

const getEmployeePhotoUrl = (emp) => {
  if (!emp || !emp.photo) return null;
  return emp.photo.startsWith('image/') ? `data:${emp.photo}` : emp.photo;
};

export default function SalaryStructure() {
  const [employees] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [savingStructure, setSavingStructure] = useState(false);
  
  const activeEmployees = employees.filter(emp => !emp.status || emp.status.toLowerCase() === 'active');

  useEffect(() => {
    Promise.all([fetchSalaries(), fetchSettings()]);
  }, []);

  const fetchSalaries = async () => {
    try {
      const salariesRes = await supabase.from('salary_structures').select('*');
      if (salariesRes.error) throw salariesRes.error;
      
      const salMap = {};
      if (salariesRes.data) {
        salariesRes.data.forEach(s => {
          salMap[s.employee_id] = {
            basic: s.basic || 0,
            hra: s.hra || 0,
            allowances: s.allowances || 0,
            profTax: s.prof_tax || 0,
            otherDeductions: s.other_deductions || 0,
            paymentStatus: s.payment_status || 'Pending',
            bankAccount: s.bank_account || '',
            pfApplicable: s.pf_applicable === true,
            esicApplicable: s.esic_applicable === true,
            totalDays: s.total_days || 0,
            presentDays: s.present_days || 0,
            absent: s.absent || 0,
            leaves: s.leaves || 0,
            leaveDeduction: s.leave_deduction || 0,
            monthAdvance: s.month_advance || 0,
            monthRecovery: s.month_recovery || 0,
            prevAdvanceDeduction: s.prev_advance_deduction || 0,
            salaryDate: s.salary_date || '',
            salaryMonth: s.salary_month || ''
          };
        });
      }
      setSalaries(salMap);
    } catch (err) {
      console.error('Error fetching salaries data:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const settingsRes = await supabase.from('payroll_settings').select('*').limit(1).single();
      if (settingsRes.error) throw settingsRes.error;
      
      if (settingsRes.data) {
        setSettings({
          pf: settingsRes.data.pf_percentage || 12,
          ptax: settingsRes.data.ptax_amount || 200,
          esic: 0.75
        });
      }
    } catch (err) {
      console.error('Error fetching settings data:', err);
    }
  };

  const [selectedEmp, setSelectedEmp] = useState('');
  const [formData, setFormData] = useState({ 
    basic: 0, 
    hra: 0, 
    allowances: 0,
    profTax: 0,
    otherDeductions: 0,
    paymentStatus: 'Pending',
    bankAccount: '',
    pfApplicable: false,
    esicApplicable: false,
    totalDays: 0,
    presentDays: 0,
    halfDays: 0,
    absent: 0,
    leaves: 0,
    leaveDeduction: 0,
    monthAdvance: 0,
    monthRecovery: 0,
    prevAdvanceDeduction: 0,
    salaryDate: '',
    salaryMonth: ''
  });

  const handleSelectChange = (e) => {
    const empId = e.target.value;
    setSelectedEmp(empId);
    const selectedEmployeeDetails = employees.find(emp => String(emp.id) === String(empId));

    if(salaries[empId]) {
      setFormData(prev => ({
        basic: salaries[empId].basic || (selectedEmployeeDetails?.baseSalary || 0),
        hra: salaries[empId].hra || 0,
        allowances: salaries[empId].allowances || 0,
        profTax: salaries[empId].profTax || 0,
        otherDeductions: salaries[empId].otherDeductions || 0,
        paymentStatus: salaries[empId].paymentStatus || 'Pending',
        bankAccount: salaries[empId].bankAccount || selectedEmployeeDetails?.accountNo || '',
        pfApplicable: salaries[empId].pfApplicable === true,
        esicApplicable: salaries[empId].esicApplicable === true,
        totalDays: 0,
        presentDays: 0,
        halfDays: 0,
        absent: 0,
        leaves: 0,
        leaveDeduction: 0,
        monthAdvance: salaries[empId].monthAdvance || 0,
        monthRecovery: salaries[empId].monthRecovery || 0,
        prevAdvanceDeduction: salaries[empId].prevAdvanceDeduction || 0,
        salaryDate: new Date().toISOString().split('T')[0],
        salaryMonth: prev.salaryMonth
      }));
    } else {
      setFormData(prev => ({ 
        basic: selectedEmployeeDetails?.baseSalary || 0, 
        hra: 0, 
        allowances: 0, 
        profTax: 0, 
        otherDeductions: 0, 
        paymentStatus: 'Pending', 
        bankAccount: selectedEmployeeDetails?.accountNo || '', 
        pfApplicable: false,
        esicApplicable: false,
        totalDays: 0,
        presentDays: 0,
        absent: 0,
        leaves: 0,
        halfDays: 0,
        holidays: 0,
        leaveDeduction: 0,
        monthAdvance: 0,
        monthRecovery: 0,
        prevAdvanceDeduction: 0,
        salaryDate: new Date().toISOString().split('T')[0],
        salaryMonth: prev.salaryMonth
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updatedData = { ...formData };

    if (type === 'checkbox') {
      updatedData[name] = checked;
    } else if (name === 'paymentStatus' || name === 'bankAccount' || name === 'salaryDate' || name === 'salaryMonth') {
      updatedData[name] = value;
      
      // Month dropdown sets Total Days and Salary Date
      if (name === 'salaryMonth' && value) {
        let year = 2026;
        if (updatedData.salaryDate) {
          const d = new Date(updatedData.salaryDate);
          if (!isNaN(d.getTime())) year = d.getFullYear();
        } else {
          year = new Date().getFullYear();
        }
        
        const daysInMonth = getDaysForMonthName(value, year);
        updatedData.totalDays = daysInMonth;
        updatedData.presentDays = daysInMonth;
        updatedData.halfDays = 0;
        updatedData.absent = 0;
        updatedData.leaves = 0;
      }
    } else {
      updatedData[name] = value === '' ? '' : Number(value);
    }

    // Auto-calculate absent days and leave deduction
    if (['totalDays', 'presentDays', 'halfDays', 'absent', 'leaves', 'basic', 'salaryDate', 'salaryMonth'].includes(name)) {
      const tDays = Number(updatedData.totalDays) || 0;
      const baseSal = Number(updatedData.basic) || 0;
      
      if (tDays > 0) {
        if (name === 'absent' || name === 'leaves') {
          // User manually entered absent or leaves. Deduct from present days.
          const absVal = Number(updatedData.absent) || 0;
          const levVal = Number(updatedData.leaves) || 0;
          const halfVal = Number(updatedData.halfDays) || 0;
          updatedData.presentDays = Math.max(0, tDays - absVal - levVal - halfVal);
        } else {
          // User changed totalDays, presentDays, halfDays, basic, etc. Recalculate absent days based on presentDays & leaves.
          let pDays = Number(updatedData.presentDays) || 0;
          let hDays = Number(updatedData.halfDays) || 0;
          if (pDays + hDays > tDays) {
            pDays = tDays - hDays;
            updatedData.presentDays = Math.max(0, pDays);
          }
          if (pDays >= 0) {
            // A half day takes up 1 calendar day
            const nonPresent = tDays - pDays - hDays;
            const levVal = Number(updatedData.leaves) || 0;
            updatedData.absent = Math.max(0, nonPresent - levVal);
          }
        }
        
        // Deduction ONLY applies to Absent Days (No deduction for Half Days)
        const absentDays = Number(updatedData.absent) || 0;
        const halfDays = Number(updatedData.halfDays) || 0;
        const perDaySalary = baseSal / tDays;
        updatedData.leaveDeduction = Math.round(perDaySalary * absentDays);
      }
    }

    setFormData(updatedData);
  };

  useEffect(() => {
    async function syncAttendance() {
      if (!selectedEmp || !formData.salaryMonth) return;
      
      let year = 2026;
      if (formData.salaryDate) {
        const d = new Date(formData.salaryDate);
        if (!isNaN(d.getTime())) year = d.getFullYear();
      } else {
        year = new Date().getFullYear();
      }
      const monthYearStr = `${formData.salaryMonth} ${year}`;
      
      try {
        const selectedEmployeeDetails = employees.find(emp => String(emp.id) === String(selectedEmp));
        const empNameToMatch = selectedEmployeeDetails ? selectedEmployeeDetails.name : '';

        const { data, error } = await supabase
          .from('monthly_attendance')
          .select('*')
          .eq('employee_name', empNameToMatch)
          .eq('month_year', monthYearStr)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          let p = 0, a = 0, l = 0, hd = 0, h = 0;
          const daysInMonth = getDaysForMonthName(formData.salaryMonth, year);
          
          const monthIndex = MONTH_LIST.indexOf(formData.salaryMonth);
          const today = new Date();
          const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
          const maxDayToCount = isCurrentMonth ? today.getDate() : daysInMonth;

          for (let i = 1; i <= daysInMonth; i++) {
            const val = data[`day_${i}`];
            const isSunday = new Date(year, monthIndex, i).getDay() === 0;

            if (val === 'P') p++;
            else if (val === 'A') a++;
            else if (val === 'L') l++;
            else if (val === 'HD') hd++;
            else if (val === 'H') h++;
            else if (isSunday && i <= maxDayToCount) {
              p++; // Auto-count Sundays as present if empty
            }
          }
          
          const presentEquiv = p + h; // Count only full days for present
          
          setFormData(prev => {
            const baseSal = Number(prev.basic) || 0;
            const tDays = Number(prev.totalDays) || daysInMonth;
            
            let deduction = 0;
            if (tDays > 0) {
               const perDaySalary = baseSal / tDays;
               deduction = Math.round(perDaySalary * a);
            }
            
            return {
              ...prev,
              totalDays: tDays,
              presentDays: presentEquiv,
              halfDays: hd,
              absent: a,
              leaves: l,
              leaveDeduction: deduction
            };
          });
          toast.success(`Attendance auto-fetched for ${monthYearStr}`);
        } else {
          // If no attendance record is found, default to full present days
          const daysInMonth = getDaysForMonthName(formData.salaryMonth, year);
          setFormData(prev => {
            const tDays = Number(prev.totalDays) || daysInMonth;
            return {
              ...prev,
              totalDays: tDays,
              presentDays: tDays,
              halfDays: 0,
              absent: 0,
              leaves: 0,
              leaveDeduction: 0
            };
          });
        }
      } catch (err) {
        console.error('Error fetching monthly attendance for sync:', err);
      }
    }
    // Only run the sync if it's actually manually triggered or we have complete data
    syncAttendance();
  }, [selectedEmp, formData.salaryMonth, formData.salaryDate]);

  const handleSaveStructure = async () => {
    if(!selectedEmp) return toast.error('Select an employee first.');
    if(!formData.salaryDate) return toast.error('Please select a Salary Date.');
    if(!formData.salaryMonth) return toast.error('Please select a Month.');
    setSavingStructure(true);
    
    try {
      const upsertData = {
        employee_id: selectedEmp,
        basic: Number(formData.basic) || 0,
        hra: Number(formData.hra) || 0,
        allowances: Number(formData.allowances) || 0,
        prof_tax: Number(formData.profTax) || 0,
        other_deductions: Number(formData.otherDeductions) || 0,
        payment_status: formData.paymentStatus,
        bank_account: formData.bankAccount,
        pf_applicable: formData.pfApplicable,
        esic_applicable: formData.esicApplicable,
        total_days: Number(formData.totalDays) || 0,
        present_days: Number(formData.presentDays) || 0,
        half_days: Number(formData.halfDays) || 0,
        absent: Number(formData.absent) || 0,
        leaves: Number(formData.leaves) || 0,
        leave_deduction: Number(formData.leaveDeduction) || 0,
        month_advance: Number(formData.monthAdvance) || 0,
        month_recovery: Number(formData.monthRecovery) || 0,
        prev_advance_deduction: Number(formData.prevAdvanceDeduction) || 0,
        salary_date: formData.salaryDate || null,
        salary_month: formData.salaryMonth || null
      };

      const { error } = await supabase.from('salary_structures').upsert(upsertData, { onConflict: 'employee_id' });
      if (error) throw error;

      setSalaries({
        ...salaries,
        [selectedEmp]: formData
      });
      toast.success('Salary structure saved successfully!');
      
      // Reset form
      setSelectedEmp('');
      setFormData({ 
        basic: 0, 
        hra: 0, 
        allowances: 0,
        profTax: 0,
        otherDeductions: 0,
        paymentStatus: 'Pending',
        bankAccount: '',
        pfApplicable: false,
        esicApplicable: false,
        totalDays: 0,
        presentDays: 0,
        absent: 0,
        leaves: 0,
        halfDays: 0,
        holidays: 0,
        leaveDeduction: 0,
        monthAdvance: 0,
        monthRecovery: 0,
        prevAdvanceDeduction: 0,
        salaryDate: '',
        salaryMonth: ''
      });
    } catch (err) {
      console.error('Error saving structure:', err);
      toast.error('Failed to save structure. Did you run the SQL query?');
    } finally {
      setSavingStructure(false);
    }
  };

  const basicVal = Number(formData.basic) || 0;
  const hraVal = Number(formData.hra) || 0;
  const allowancesVal = Number(formData.allowances) || 0;
  const profTaxVal = Number(formData.profTax) || 0;
  const otherDeductVal = Number(formData.otherDeductions) || 0;
  const leaveDeductVal = Number(formData.leaveDeduction) || 0;
  const monthAdvanceVal = Number(formData.monthAdvance) || 0;
  const monthRecoveryVal = Number(formData.monthRecovery) || 0;
  const prevAdvanceDeductVal = Number(formData.prevAdvanceDeduction) || 0;

  const grossSalary = basicVal + hraVal + allowancesVal + monthAdvanceVal;
  const pfAmount = formData.pfApplicable ? (basicVal * (settings.pf / 100)) : 0;
  const esicAmount = formData.esicApplicable ? (grossSalary * (settings.esic / 100)) : 0;
  const totalDeductions = pfAmount + esicAmount + profTaxVal + otherDeductVal + leaveDeductVal + monthRecoveryVal + prevAdvanceDeductVal;
  const netSalary = selectedEmp ? Math.max(0, grossSalary - totalDeductions) : 0;
  
  const selectedEmpData = employees.find(e => e.id === selectedEmp) || {};
  const selectedEmpPhoto = getEmployeePhotoUrl(selectedEmpData);
  const isAlreadyEntered = selectedEmp && formData.salaryMonth && salaries[selectedEmp] && salaries[selectedEmp].salaryMonth === formData.salaryMonth;

  return (
    <div className="fade-in space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <DollarSign className="text-red-600 w-7 h-7" /> Salary Structure
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Define base salary, attendance variables, allowances, and statutory deductions for employees.
          </p>
        </div>
        {selectedEmp && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700">
              Selected: <strong className="text-slate-900">{selectedEmpData.name || 'Employee'}</strong>
            </span>
          </div>
        )}
      </div>

        {/* Main Structure Form Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-7">

        {/* SECTION 1: Employee Information */}
        <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/70 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <User size={16} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                1. Employee & Period Details
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Step 1 of 5
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Employee Name Selector */}
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Employee Name <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10 transition-all">
                {selectedEmpPhoto ? (
                  <img src={selectedEmpPhoto} alt="Employee" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                    {selectedEmpData.name ? selectedEmpData.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <select 
                  value={selectedEmp} 
                  onChange={handleSelectChange} 
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer py-1"
                >
                  <option value="">-- Select Employee --</option>
                  {activeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Department
              </label>
              <input 
                type="text" 
                value={selectedEmp ? (selectedEmpData.department || 'General') : 'Select an employee'} 
                disabled 
                className="w-full bg-slate-100/90 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200/90 py-2.5 px-3.5 outline-none cursor-not-allowed shadow-2xs" 
              />
            </div>

            {/* Designation / Firm */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Designation / Firm
              </label>
              <div className="w-full h-[42px] flex items-center px-3.5 rounded-xl border border-slate-200/90 bg-slate-100/90 shadow-2xs overflow-hidden">
                {selectedEmp ? (
                  <span style={getDesignationStyle(selectedEmpData.designation)} className="truncate font-semibold text-xs">
                    {selectedEmpData.designation || 'General Staff'}
                  </span>
                ) : (
                  <span className="text-slate-400 text-sm">Select an employee</span>
                )}
              </div>
            </div>

            {/* Salary Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" /> Salary Date
              </label>
              <input 
                type="date" 
                name="salaryDate" 
                value={formData.salaryDate} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                className="w-full bg-white text-slate-800 text-sm font-medium rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 disabled:bg-slate-100 disabled:cursor-not-allowed shadow-2xs transition-all"
              />
            </div>

            {/* Month Selector */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Clock size={13} className="text-slate-400" /> Salary Month
              </label>
              <select 
                name="salaryMonth" 
                value={getMonthName(formData.salaryMonth)} 
                onChange={handleChange} 
                disabled={!selectedEmp}
                className="w-full bg-white text-slate-800 text-sm font-medium rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 disabled:bg-slate-100 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer"
              >
                <option value="">-- Select Month --</option>
                {MONTH_LIST.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Attendance & Leaves */}
        <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/70 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Clock size={16} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                2. Attendance & Leaves Calculation
              </h3>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              Auto-synced
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Days</label>
              <input 
                type="number" 
                name="totalDays" 
                value={formData.totalDays === 0 && formData.totalDays !== '' ? '' : formData.totalDays} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0"
                className="w-full bg-white text-slate-800 text-sm font-bold rounded-xl border border-slate-200 py-2 px-3 text-center outline-none focus:border-purple-500 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Present Days</label>
              <input 
                type="number" 
                name="presentDays" 
                value={formData.presentDays === 0 && formData.presentDays !== '' ? '' : formData.presentDays} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0"
                className="w-full bg-emerald-50/60 text-emerald-800 text-sm font-black rounded-xl border border-emerald-200 py-2 px-3 text-center outline-none focus:border-emerald-500 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-amber-700 uppercase tracking-wider">Half Days</label>
              <input 
                type="number" 
                name="halfDays" 
                value={formData.halfDays === 0 && formData.halfDays !== '' ? '' : formData.halfDays} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0"
                className="w-full bg-amber-50/60 text-amber-800 text-sm font-bold rounded-xl border border-amber-200 py-2 px-3 text-center outline-none focus:border-amber-500 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-rose-700 uppercase tracking-wider">Absent Days</label>
              <input 
                type="number" 
                name="absent" 
                value={formData.absent === 0 && formData.absent !== '' ? '' : formData.absent} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0"
                className="w-full bg-rose-50/60 text-rose-800 text-sm font-bold rounded-xl border border-rose-200 py-2 px-3 text-center outline-none focus:border-rose-500 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Leaves</label>
              <input 
                type="number" 
                name="leaves" 
                value={formData.leaves === 0 && formData.leaves !== '' ? '' : formData.leaves} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0"
                className="w-full bg-blue-50/60 text-blue-800 text-sm font-bold rounded-xl border border-blue-200 py-2 px-3 text-center outline-none focus:border-blue-500 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-red-700 uppercase tracking-wider">Leave Deduct. (₹)</label>
              <input 
                type="number" 
                name="leaveDeduction" 
                value={formData.leaveDeduction === 0 && formData.leaveDeduction !== '' ? '' : formData.leaveDeduction} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0"
                className="w-full bg-red-50/70 text-red-700 text-sm font-black rounded-xl border border-red-200 py-2 px-3 text-center outline-none focus:border-red-500 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Earnings & Allowances */}
        <div className="bg-emerald-50/40 rounded-2xl p-5 sm:p-6 border border-emerald-200/70 transition-all hover:border-emerald-300">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-emerald-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <DollarSign size={16} />
              </div>
              <h3 className="font-bold text-emerald-900 text-sm uppercase tracking-wider">
                3. Earnings & Allowances
              </h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-300">
              Gross Components
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Basic Salary (₹)</label>
              <input 
                type="number" 
                name="basic" 
                value={formData.basic === 0 && formData.basic !== '' ? '' : formData.basic} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0.00"
                className="w-full bg-white text-slate-800 text-sm font-semibold rounded-xl border border-emerald-200 py-2.5 px-3.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">HRA (₹)</label>
              <input 
                type="number" 
                name="hra" 
                value={formData.hra === 0 && formData.hra !== '' ? '' : formData.hra} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0.00"
                className="w-full bg-white text-slate-800 text-sm font-semibold rounded-xl border border-emerald-200 py-2.5 px-3.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Allowances (₹)</label>
              <input 
                type="number" 
                name="allowances" 
                value={formData.allowances === 0 && formData.allowances !== '' ? '' : formData.allowances} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0.00"
                className="w-full bg-white text-slate-800 text-sm font-semibold rounded-xl border border-emerald-200 py-2.5 px-3.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Gross Salary (₹)</label>
              <div className="w-full bg-emerald-100/90 text-emerald-900 font-black text-base rounded-xl border border-emerald-300 py-2 px-3.5 flex items-center justify-between shadow-2xs h-[42px]">
                <span className="text-xs font-bold text-emerald-700">TOTAL</span>
                <span>₹{grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Advances & Recoveries */}
        <div className="bg-amber-50/40 rounded-2xl p-5 sm:p-6 border border-amber-200/70 transition-all hover:border-amber-300">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-amber-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <ArrowDownRight size={16} />
              </div>
              <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wider">
                4. Advances & Recoveries
              </h3>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-300">
              Variable Adjustments
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Month Advance (₹)</label>
              <input 
                type="number" 
                name="monthAdvance" 
                value={formData.monthAdvance === 0 && formData.monthAdvance !== '' ? '' : formData.monthAdvance} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0.00"
                className="w-full bg-white text-slate-800 text-sm font-semibold rounded-xl border border-amber-200 py-2.5 px-3.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Month Recovery (₹)</label>
              <input 
                type="number" 
                name="monthRecovery" 
                value={formData.monthRecovery === 0 && formData.monthRecovery !== '' ? '' : formData.monthRecovery} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0.00"
                className="w-full bg-white text-slate-800 text-sm font-semibold rounded-xl border border-amber-200 py-2.5 px-3.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Prev Advance Deduction (₹)</label>
              <input 
                type="number" 
                name="prevAdvanceDeduction" 
                value={formData.prevAdvanceDeduction === 0 && formData.prevAdvanceDeduction !== '' ? '' : formData.prevAdvanceDeduction} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0.00"
                className="w-full bg-white text-slate-800 text-sm font-semibold rounded-xl border border-amber-200 py-2.5 px-3.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Statutory & Other Deductions */}
        <div className="bg-rose-50/40 rounded-2xl p-5 sm:p-6 border border-rose-200/70 transition-all hover:border-rose-300">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-rose-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                <ShieldAlert size={16} />
              </div>
              <h3 className="font-bold text-rose-900 text-sm uppercase tracking-wider">
                5. Statutory & Other Deductions
              </h3>
            </div>
            <span className="text-[11px] font-bold text-rose-800 bg-rose-100/70 px-2.5 py-1 rounded-lg border border-rose-300">
              Tax & PF/ESIC
            </span>
          </div>

          {/* Direct uniform 5-column or responsive 2-row layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* PF Option */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">PF Option</label>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">12%</span>
              </div>
              <label className={`flex items-center justify-between h-[42px] px-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                formData.pfApplicable 
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-1 ring-blue-400/30' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              } ${!selectedEmp ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input 
                  type="checkbox" 
                  name="pfApplicable" 
                  checked={formData.pfApplicable} 
                  onChange={handleChange} 
                  disabled={!selectedEmp} 
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" 
                />
                <span className="text-xs font-bold truncate">
                  {formData.pfApplicable ? 'PF Applicable' : 'No PF Deduction'}
                </span>
              </label>
            </div>

            {/* ESIC Option */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">ESIC Option</label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">0.75%</span>
              </div>
              <label className={`flex items-center justify-between h-[42px] px-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                formData.esicApplicable 
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 ring-1 ring-emerald-400/30' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              } ${!selectedEmp ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input 
                  type="checkbox" 
                  name="esicApplicable" 
                  checked={formData.esicApplicable} 
                  onChange={handleChange} 
                  disabled={!selectedEmp} 
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                />
                <span className="text-xs font-bold truncate">
                  {formData.esicApplicable ? 'ESIC Applicable' : 'No ESIC Deduction'}
                </span>
              </label>
            </div>

            {/* PF Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">PF Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input 
                  type="number" 
                  value={pfAmount.toFixed(2)} 
                  disabled 
                  placeholder="0.00"
                  className="w-full h-[42px] pl-7 pr-3 bg-slate-100/90 text-slate-800 text-sm font-bold rounded-xl border border-slate-200/90 outline-none cursor-not-allowed shadow-inner" 
                />
              </div>
            </div>

            {/* ESIC Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">ESIC Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input 
                  type="number" 
                  value={esicAmount.toFixed(2)} 
                  disabled 
                  placeholder="0.00"
                  className="w-full h-[42px] pl-7 pr-3 bg-slate-100/90 text-slate-800 text-sm font-bold rounded-xl border border-slate-200/90 outline-none cursor-not-allowed shadow-inner" 
                />
              </div>
            </div>

            {/* Prof Tax */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Prof. Tax (₹)</label>
              <input 
                type="number" 
                name="profTax" 
                value={formData.profTax === 0 && formData.profTax !== '' ? '' : formData.profTax} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="200"
                className="w-full h-[42px] bg-white text-slate-800 text-sm font-semibold rounded-xl border border-slate-200 px-3.5 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>

            {/* Other Deductions */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Other Deductions (₹)</label>
              <input 
                type="number" 
                name="otherDeductions" 
                value={formData.otherDeductions === 0 && formData.otherDeductions !== '' ? '' : formData.otherDeductions} 
                onChange={handleChange} 
                disabled={!selectedEmp} 
                placeholder="0.00"
                className="w-full h-[42px] bg-white text-slate-800 text-sm font-semibold rounded-xl border border-slate-200 px-3.5 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>

            {/* Total Deductions Highlight */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-rose-900 uppercase tracking-wider">Total Deductions (₹)</label>
              <div className="w-full h-[42px] bg-rose-100/90 text-rose-950 font-black text-base rounded-xl border border-rose-300 px-3.5 flex items-center justify-between shadow-2xs">
                <span className="text-xs font-bold text-rose-700">DEDUCT</span>
                <span>₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: Payment Details & Net Payable Summary */}
        <div className="bg-sky-50/50 rounded-2xl p-5 sm:p-6 border border-sky-200/80 transition-all hover:border-sky-300">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-sky-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                <CreditCard size={16} />
              </div>
              <h3 className="font-bold text-sky-950 text-sm uppercase tracking-wider">
                6. Final Payment & Net Payable Salary
              </h3>
            </div>
            <span className="text-[11px] font-bold text-sky-800 bg-sky-100/70 px-2.5 py-1 rounded-lg border border-sky-200">
              Final Payout
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
            {/* Payment Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Status</label>
              <select 
                name="paymentStatus" 
                value={formData.paymentStatus} 
                onChange={handleChange} 
                disabled={!selectedEmp}
                className="w-full bg-white text-slate-800 text-sm font-semibold rounded-xl border border-sky-200 py-2.5 px-3.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-100 cursor-pointer shadow-2xs transition-all"
              >
                <option value="Pending">Pending</option>
                <option value="Processed">Processed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            {/* Bank Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bank Account Number</label>
              <input 
                type="text" 
                name="bankAccount" 
                value={formData.bankAccount} 
                onChange={handleChange} 
                placeholder="Enter Account No." 
                disabled={!selectedEmp} 
                className="w-full bg-white text-slate-800 text-sm font-semibold rounded-xl border border-sky-200 py-2.5 px-3.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-100 shadow-2xs transition-all"
              />
            </div>

            {/* Net Payable Highlight Card (Light Emerald Gradient) */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/80 p-4 rounded-xl border-2 border-emerald-300 shadow-sm flex flex-col justify-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Net Payable Salary</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight mt-0.5">
                ₹{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Gross - Deductions Total</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 font-medium">
            * Ensure all salary & attendance figures are validated before submitting.
          </p>
          <button 
            type="button"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-600/40 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSaveStructure} 
            disabled={!selectedEmp || savingStructure}
          >
            {savingStructure ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Save Salary Structure</span>
          </button>
        </div>

      </div>
    </div>
  );
}
