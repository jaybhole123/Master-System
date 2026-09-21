import React, { useState, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTH_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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

export default function PayrollProcess() {
  const [employees] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [processedPayroll, setProcessedPayroll] = useState([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(MONTH_LIST[new Date().getMonth()]);
  
  const activeEmployees = employees.filter(emp => !emp.status || emp.status.toLowerCase() === 'active');

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSalaries(), fetchSettings()]).finally(() => setLoading(false));
  }, []);

  const fetchSalaries = async () => {
    try {
      const salariesRes = await supabase.from('salary_structures').select('*');
      if (salariesRes.error) throw salariesRes.error;
      
      const salMap = {};
      if (salariesRes.data) {
        salariesRes.data.forEach(s => {
          salMap[s.employee_id] = {
            basic: Number(s.basic) || 0,
            hra: Number(s.hra) || 0,
            allowances: Number(s.allowances) || 0,
            profTax: Number(s.prof_tax) || 0,
            otherDeductions: Number(s.other_deductions) || 0,
            paymentStatus: s.payment_status || 'Pending',
            bankAccount: s.bank_account || '',
            pfApplicable: s.pf_applicable !== false,
            esicApplicable: s.esic_applicable !== false,
            monthAdvance: Number(s.month_advance) || 0,
            monthRecovery: Number(s.month_recovery) || 0,
            prevAdvanceDeduction: Number(s.prev_advance_deduction) || 0,
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

  const handleProcess = async () => {
    if (!selectedMonth) return toast.error('Please select a month');
    setProcessing(true);
    
    try {
      const year = new Date().getFullYear();
      const monthYearStr = `${selectedMonth} ${year}`;
      const daysInMonth = getDaysForMonthName(selectedMonth, year);
      const monthIndex = MONTH_LIST.indexOf(selectedMonth);
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
      const maxDayToCount = isCurrentMonth ? today.getDate() : daysInMonth;

      // 1. Fetch monthly_attendance for this month for all employees
      const { data: attendanceData, error: attError } = await supabase
        .from('monthly_attendance')
        .select('*')
        .eq('month_year', monthYearStr);

      if (attError) throw attError;

      // Create a map for quick lookup by employee_name
      const attMap = {};
      if (attendanceData) {
        attendanceData.forEach(record => {
          attMap[record.employee_name] = record;
        });
      }

      const processedData = [];

      // 2. Prepare data for salary_structures
      const upsertData = activeEmployees.map(emp => {
        const sal = salaries[emp.id] || { 
          basic: emp.baseSalary || 0, hra: 0, allowances: 0, profTax: 0, otherDeductions: 0, paymentStatus: 'Pending', bankAccount: emp.accountNo || '', pfApplicable: false, esicApplicable: false, monthAdvance: 0, monthRecovery: 0, prevAdvanceDeduction: 0, salaryDate: new Date().toISOString().split('T')[0]
        };

        const empName = emp.name;
        const attRecord = attMap[empName];

        let p = 0, a = 0, l = 0, hd = 0, h = 0;
        
        if (attRecord) {
          for (let i = 1; i <= daysInMonth; i++) {
            const val = attRecord[`day_${i}`];
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
        } else {
          // If no record, default to present days = total days
          p = daysInMonth;
        }

        const presentEquiv = p + h + (hd * 0.5);
        const tDays = daysInMonth;
        
        const basic = Number(sal.basic) || 0;
        let deduction = 0;
        if (tDays > 0) {
           const perDaySalary = basic / tDays;
           deduction = Math.round(perDaySalary * a);
        }

        const gross = basic + Number(sal.hra || 0) + Number(sal.allowances || 0) + Number(sal.monthAdvance || sal.month_advance || 0);
        const pf_deduction = (sal.pfApplicable || sal.pf_applicable) ? (basic * (settings.pf / 100)) : 0;
        const esic_deduction = (sal.esicApplicable || sal.esic_applicable) ? (gross * (settings.esic / 100)) : 0;
        const ptax = Number(sal.profTax || sal.prof_tax) || 0;
        const otherDeductions = Number(sal.otherDeductions || sal.other_deductions) || 0;
        const monthRecov = Number(sal.monthRecovery || sal.month_recovery) || 0;
        const prevAdvDeduct = Number(sal.prevAdvanceDeduction || sal.prev_advance_deduction) || 0;
        
        const totalDeductions = pf_deduction + esic_deduction + ptax + otherDeductions + deduction + monthRecov + prevAdvDeduct;
        const net = gross - totalDeductions;

        processedData.push({
          employee_id: emp.id,
          employee_name: emp.name || '',
          month_year: monthYearStr,
          basic,
          hra: Number(sal.hra) || 0,
          allowances: Number(sal.allowances) || 0,
          gross,
          pf_deduction,
          esic_deduction,
          ptax,
          absent_deduction: deduction,
          other_deductions: otherDeductions,
          deductions: totalDeductions,
          net: net > 0 ? net : 0,
          payment_status: sal.paymentStatus || sal.payment_status || 'Pending',
          bank_account: sal.bankAccount || sal.bank_account || '',
          salary_date: new Date().toISOString().split('T')[0]
        });

        return {
          employee_id: emp.id,
          basic,
          hra: Number(sal.hra) || 0,
          allowances: Number(sal.allowances) || 0,
          prof_tax: ptax,
          other_deductions: otherDeductions,
          payment_status: sal.paymentStatus || sal.payment_status || 'Pending',
          bank_account: sal.bankAccount || sal.bank_account || '',
          pf_applicable: sal.pfApplicable || sal.pf_applicable || false,
          esic_applicable: sal.esicApplicable || sal.esic_applicable || false,
          total_days: tDays,
          present_days: presentEquiv,
          absent: a,
          leaves: l,
          leave_deduction: deduction,
          month_advance: Number(sal.monthAdvance || sal.month_advance) || 0,
          month_recovery: monthRecov,
          prev_advance_deduction: prevAdvDeduct,
          salary_date: new Date().toISOString().split('T')[0],
          salary_month: selectedMonth
        };
      });

      const { error: error1 } = await supabase.from('salary_structures').upsert(upsertData, { onConflict: 'employee_id' });
      if (error1) throw error1;

      const { error: error2 } = await supabase.from('processed_payroll').upsert(processedData, { onConflict: 'employee_id,month_year' });
      if (error2) throw error2;
      
      setProcessedPayroll([{ month_year: monthYearStr, count: upsertData.length }]);
      await fetchSalaries(); // Refresh local salaries data
      
      toast.success(`Auto Payroll Processed Successfully for ${monthYearStr}!`);
    } catch (err) {
      console.error('Error processing payroll:', err);
      toast.error('Failed to process payroll.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Payroll Process</h1>
        <p className="page-subtitle">Run auto payroll for all active employees.</p>
      </div>

      <div className="card fade-in">
        <h3 style={{ marginBottom: '16px' }}>Auto Payroll Processing</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Select a month and click the button below to automatically fetch attendance and calculate gross salary, deductions, and net salary for all active employees. This will update the Net Salary sheet.
        </p>
        
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Select Month</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '10px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', backgroundColor: 'var(--bg-main)', minWidth: '200px' }}
            >
              {MONTH_LIST.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          
          <button 
            className="btn-primary" 
            onClick={handleProcess} 
            disabled={processing || loading}
            style={{ marginTop: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 24px', fontSize: '1rem' }}
          >
            {processing ? <Loader size={18} className="spin" /> : null}
            {processing ? 'Processing Payroll...' : 'Run Auto Payroll'}
          </button>
        </div>

        {processedPayroll.length > 0 && (
          <div style={{ marginTop: '32px', backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Payroll Processed for {processedPayroll[0].month_year}
            </h4>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Successfully processed attendance and salary for <strong>{processedPayroll[0].count}</strong> employees. You can verify the final calculations in the Net Salary and Payslip pages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
