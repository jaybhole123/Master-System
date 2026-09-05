import React, { useState, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';
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
    const selectedEmployeeDetails = employees.find(emp => emp.id === empId);

    if(salaries[empId]) {
      setFormData({
        basic: salaries[empId].basic || (selectedEmployeeDetails?.baseSalary || 0),
        hra: salaries[empId].hra || 0,
        allowances: salaries[empId].allowances || 0,
        profTax: salaries[empId].profTax || 0,
        otherDeductions: salaries[empId].otherDeductions || 0,
        paymentStatus: salaries[empId].paymentStatus || 'Pending',
        bankAccount: salaries[empId].bankAccount || selectedEmployeeDetails?.accountNo || '',
        pfApplicable: salaries[empId].pfApplicable === true,
        esicApplicable: salaries[empId].esicApplicable === true,
        totalDays: salaries[empId].totalDays || 0,
        presentDays: salaries[empId].presentDays || 0,
        absent: salaries[empId].absent || 0,
        leaves: salaries[empId].leaves || 0,
        leaveDeduction: salaries[empId].leaveDeduction || 0,
        monthAdvance: salaries[empId].monthAdvance || 0,
        monthRecovery: salaries[empId].monthRecovery || 0,
        prevAdvanceDeduction: salaries[empId].prevAdvanceDeduction || 0,
        salaryDate: salaries[empId].salaryDate || '',
        salaryMonth: salaries[empId].salaryMonth || ''
      });
    } else {
      setFormData({ 
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
        leaveDeduction: 0,
        monthAdvance: 0,
        monthRecovery: 0,
        prevAdvanceDeduction: 0,
        salaryDate: '',
        salaryMonth: ''
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updatedData = { ...formData };

    if (type === 'checkbox') {
      updatedData[name] = checked;
    } else if (name === 'paymentStatus' || name === 'bankAccount' || name === 'salaryDate' || name === 'salaryMonth') {
      updatedData[name] = value;
      
      // Month dropdown sets Total Days
      if (name === 'salaryMonth' && value) {
        let year = 2026;
        if (updatedData.salaryDate) {
          const d = new Date(updatedData.salaryDate);
          if (!isNaN(d.getTime())) year = d.getFullYear();
        }
        const daysInMonth = getDaysForMonthName(value, year);
        updatedData.totalDays = daysInMonth;
        updatedData.presentDays = daysInMonth;
        updatedData.absent = 0;
        updatedData.leaves = 0;
      }
    } else {
      updatedData[name] = value === '' ? '' : Number(value);
    }

    // Auto-calculate absent days and leave deduction
    if (['totalDays', 'presentDays', 'absent', 'leaves', 'basic', 'salaryDate', 'salaryMonth'].includes(name)) {
      const tDays = Number(updatedData.totalDays) || 0;
      const baseSal = Number(updatedData.basic) || 0;
      
      if (tDays > 0) {
        if (name === 'absent' || name === 'leaves') {
          // User manually entered absent or leaves. Deduct from present days.
          const absVal = Number(updatedData.absent) || 0;
          const levVal = Number(updatedData.leaves) || 0;
          updatedData.presentDays = Math.max(0, tDays - absVal - levVal);
        } else {
          // User changed totalDays, presentDays, basic, etc. Recalculate absent days based on presentDays & leaves.
          let pDays = Number(updatedData.presentDays) || 0;
          if (pDays > tDays) {
            pDays = tDays;
            updatedData.presentDays = tDays;
          }
          if (pDays >= 0 && pDays <= tDays) {
            const nonPresent = tDays - pDays;
            const levVal = Number(updatedData.leaves) || 0;
            updatedData.absent = Math.max(0, nonPresent - levVal);
          }
        }
        
        // Deduction ONLY applies to Absent Days (Leaves do not cause salary deduction)
        const absentDays = Number(updatedData.absent) || 0;
        const perDaySalary = baseSal / tDays;
        updatedData.leaveDeduction = Math.round(perDaySalary * absentDays);
      }
    }

    setFormData(updatedData);
  };

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
  const isAlreadyEntered = selectedEmp && formData.salaryMonth && salaries[selectedEmp] && salaries[selectedEmp].salaryMonth === formData.salaryMonth;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Salary Structure</h1>
        <p className="page-subtitle">Define base salary and allowances for employees.</p>
      </div>

      <div className="card fade-in">
        <h3 style={{ marginBottom: '24px', fontSize: '1.25rem', color: '#1e293b' }}>Salary Structure Form</h3>
        
        {/* SECTION 1: Employee Details */}
        {isAlreadyEntered && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#047857', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.95rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✓</span> Salary structure for {formData.salaryMonth} has already been saved for this employee.
          </div>
        )}
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Employee Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label>Employee Name</label>
              <select value={selectedEmp} onChange={handleSelectChange}>
                <option value="">-- Select Employee --</option>
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Department</label>
              <input type="text" value={selectedEmp ? (selectedEmpData.department || 'N/A') : 'Select an employee'} disabled style={{ opacity: 0.7 }} />
            </div>
            <div className="form-group">
              <label>Designation</label>
              <div style={{ display: 'flex', alignItems: 'center', height: '42px', padding: '0 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-main)', opacity: 0.8 }}>
                {selectedEmp ? <span style={getDesignationStyle(selectedEmpData.designation)}>{selectedEmpData.designation || 'N/A'}</span> : <span style={{ color: 'var(--text-secondary)' }}>Select an employee</span>}
              </div>
            </div>
            <div className="form-group">
              <label>Salary Date</label>
              <input type="date" name="salaryDate" value={formData.salaryDate} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Month</label>
              <select name="salaryMonth" value={getMonthName(formData.salaryMonth)} onChange={handleChange} disabled={!selectedEmp}>
                <option value="">-- Select Month --</option>
                {MONTH_LIST.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Attendance & Leaves */}
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Attendance & Leaves</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label>Total No. Of Days</label>
              <input type="number" name="totalDays" value={formData.totalDays === 0 && formData.totalDays !== '' ? '' : formData.totalDays} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Present Days</label>
              <input type="number" name="presentDays" value={formData.presentDays === 0 && formData.presentDays !== '' ? '' : formData.presentDays} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Absent Days</label>
              <input type="number" name="absent" value={formData.absent === 0 && formData.absent !== '' ? '' : formData.absent} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Leaves</label>
              <input type="number" name="leaves" value={formData.leaves === 0 && formData.leaves !== '' ? '' : formData.leaves} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Leave Deduction (₹)</label>
              <input type="number" name="leaveDeduction" value={formData.leaveDeduction === 0 && formData.leaveDeduction !== '' ? '' : formData.leaveDeduction} onChange={handleChange} disabled={!selectedEmp} />
            </div>
          </div>
        </div>

        {/* SECTION 3: Earnings */}
        <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', border: '1px solid #dcfce7', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '1rem', borderBottom: '2px solid #bbf7d0', paddingBottom: '8px' }}>Earnings & Allowances</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label>Basic Salary (₹)</label>
              <input type="number" name="basic" value={formData.basic === 0 && formData.basic !== '' ? '' : formData.basic} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>HRA (₹)</label>
              <input type="number" name="hra" value={formData.hra === 0 && formData.hra !== '' ? '' : formData.hra} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Allowances (₹)</label>
              <input type="number" name="allowances" value={formData.allowances === 0 && formData.allowances !== '' ? '' : formData.allowances} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Gross Salary (₹)</label>
              <input type="number" value={grossSalary.toFixed(2)} disabled style={{ opacity: 0.9, backgroundColor: '#dcfce7', fontWeight: 600, color: '#166534', borderColor: '#86efac' }} />
            </div>
          </div>
        </div>

        {/* SECTION 4: Advances & Recoveries */}
        <div style={{ backgroundColor: '#fffbeb', padding: '20px', borderRadius: '8px', border: '1px solid #fef3c7', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#92400e', fontSize: '1rem', borderBottom: '2px solid #fde68a', paddingBottom: '8px' }}>Advances & Recoveries</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label>Month Advance (₹)</label>
              <input type="number" name="monthAdvance" value={formData.monthAdvance === 0 && formData.monthAdvance !== '' ? '' : formData.monthAdvance} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Month Recovery (₹)</label>
              <input type="number" name="monthRecovery" value={formData.monthRecovery === 0 && formData.monthRecovery !== '' ? '' : formData.monthRecovery} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Prev Advance Deduction (₹)</label>
              <input type="number" name="prevAdvanceDeduction" value={formData.prevAdvanceDeduction === 0 && formData.prevAdvanceDeduction !== '' ? '' : formData.prevAdvanceDeduction} onChange={handleChange} disabled={!selectedEmp} />
            </div>
          </div>
        </div>

        {/* SECTION 5: Deductions */}
        <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#991b1b', fontSize: '1rem', borderBottom: '2px solid #fecaca', paddingBottom: '8px' }}>Statutory & Other Deductions</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>PF Option</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: selectedEmp ? 'pointer' : 'not-allowed', userSelect: 'none', backgroundColor: formData.pfApplicable ? '#dbeafe' : '#fee2e2', padding: '10px 16px', borderRadius: '6px', border: '1px solid #bfdbfe', width: '100%', transition: 'all 0.3s', margin: 0 }}>
                <input type="checkbox" name="pfApplicable" checked={formData.pfApplicable} onChange={handleChange} disabled={!selectedEmp} style={{ width: '16px', height: '16px', margin: 0 }} />
                <span style={{ fontWeight: 600, color: formData.pfApplicable ? '#1e40af' : '#991b1b', fontSize: '0.85rem' }}>
                  {formData.pfApplicable ? 'Deduct PF' : 'No PF'}
                </span>
              </label>
            </div>
            <div className="form-group">
              <label>ESIC Option</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: selectedEmp ? 'pointer' : 'not-allowed', userSelect: 'none', backgroundColor: formData.esicApplicable ? '#d1fae5' : '#fee2e2', padding: '10px 16px', borderRadius: '6px', border: '1px solid #a7f3d0', width: '100%', transition: 'all 0.3s', margin: 0 }}>
                <input type="checkbox" name="esicApplicable" checked={formData.esicApplicable} onChange={handleChange} disabled={!selectedEmp} style={{ width: '16px', height: '16px', margin: 0 }} />
                <span style={{ fontWeight: 600, color: formData.esicApplicable ? '#065f46' : '#991b1b', fontSize: '0.85rem' }}>
                  {formData.esicApplicable ? 'Deduct ESIC' : 'No ESIC'}
                </span>
              </label>
            </div>
            <div className="form-group">
              <label>PF (₹)</label>
              <input type="number" value={pfAmount.toFixed(2)} disabled style={{ opacity: 0.7 }} />
            </div>
            <div className="form-group">
              <label>ESIC (₹)</label>
              <input type="number" value={esicAmount.toFixed(2)} disabled style={{ opacity: 0.7 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label>Prof. Tax (₹)</label>
              <input type="number" name="profTax" value={formData.profTax === 0 && formData.profTax !== '' ? '' : formData.profTax} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Other Deduct. (₹)</label>
              <input type="number" name="otherDeductions" value={formData.otherDeductions === 0 && formData.otherDeductions !== '' ? '' : formData.otherDeductions} onChange={handleChange} disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Total Deduct. (₹)</label>
              <input type="number" value={totalDeductions.toFixed(2)} disabled style={{ opacity: 0.9, backgroundColor: '#fecaca', fontWeight: 600, color: '#991b1b', borderColor: '#fca5a5' }} />
            </div>
          </div>
        </div>

        {/* SECTION 6: Payment Details & Net Salary */}
        <div style={{ backgroundColor: '#f0f9ff', padding: '24px', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0369a1', fontSize: '1rem', borderBottom: '2px solid #bae6fd', paddingBottom: '8px' }}>Final Salary & Payment Info</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'end' }}>
            <div className="form-group">
              <label>Payment Status</label>
              <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} disabled={!selectedEmp}>
                <option value="Pending">Pending</option>
                <option value="Processed">Processed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            <div className="form-group">
              <label>Bank A/c No.</label>
              <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange} placeholder="Enter Account No." disabled={!selectedEmp} />
            </div>
            <div className="form-group">
              <label>Net Payable Salary (₹)</label>
              <input type="number" value={netSalary.toFixed(2)} disabled style={{ opacity: 1, backgroundColor: '#3b82f6', fontWeight: 800, color: 'white', borderColor: '#2563eb', fontSize: '1.1rem', padding: '12px' }} />
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '20px', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button className="btn-primary" onClick={handleSaveStructure} disabled={!selectedEmp || savingStructure} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem', borderRadius: '8px' }}>
            {savingStructure ? <Loader size={18} className="spin" /> : null}
            Save Salary Structure
          </button>
        </div>
      </div>
    </div>
  );
}
