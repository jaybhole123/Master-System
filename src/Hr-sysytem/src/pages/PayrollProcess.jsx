import React, { useState, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PayrollProcess() {
  const [employees] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [processedPayroll, setProcessedPayroll] = useState([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const activeEmployees = employees.filter(emp => !emp.status || emp.status.toLowerCase() === 'active');

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSalaries(), fetchSettings(), fetchProcessed()]).finally(() => setLoading(false));
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
            absentDeduction: Number(s.leave_deduction) || 0,
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
  
  const fetchProcessed = async () => {
    try {
      const processedRes = await supabase.from('processed_payroll').select('*');
      if (processedRes.error) throw processedRes.error;
      
      if (processedRes.data) {
        setProcessedPayroll(processedRes.data);
      }
    } catch (err) {
      console.error('Error fetching processed payroll data:', err);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    
    try {
      const currentMonthYear = 'July 2026';
      
      const results = activeEmployees.map(emp => {
        const sal = salaries[emp.id] || { 
          basic: 0, hra: 0, allowances: 0, profTax: 0, otherDeductions: 0, paymentStatus: 'Pending', bankAccount: '', pfApplicable: true, esicApplicable: false, absentDeduction: 0, salaryDate: '', salaryMonth: ''
        };

        const basic = Number(sal.basic) || 0;
        const hra = Number(sal.hra) || 0;
        const allowances = Number(sal.allowances) || 0;
        const gross = basic + hra + allowances;

        const pfDeduction = sal.pfApplicable ? (basic * (settings.pf / 100)) : 0;
        const esicDeduction = sal.esicApplicable ? (gross * (settings.esic / 100)) : 0;
        const empProfTax = Number(sal.profTax) || 0;
        const absentDeduct = Number(sal.absentDeduction) || 0;
        const empOtherDeductions = Number(sal.otherDeductions) || 0;

        const totalDeductions = pfDeduction + esicDeduction + empProfTax + absentDeduct + empOtherDeductions;
        const net = gross - totalDeductions;

        const targetMonth = sal.salaryMonth || currentMonthYear;

        return {
          employee_id: emp.id,
          employee_name: emp.name || '',
          month_year: targetMonth,
          basic,
          hra,
          allowances,
          gross,
          pf_deduction: pfDeduction,
          esic_deduction: esicDeduction,
          ptax: empProfTax,
          absent_deduction: absentDeduct,
          other_deductions: empOtherDeductions,
          deductions: totalDeductions,
          net: net > 0 ? net : 0,
          payment_status: sal.paymentStatus || 'Pending',
          bank_account: sal.bankAccount || '',
          salary_date: sal.salaryDate || ''
        };
      });

      const { error } = await supabase.from('processed_payroll').upsert(results, { onConflict: 'employee_id,month_year' });
      if (error) throw error;
      
      setProcessedPayroll(results);
      toast.success(`Auto Payroll Processed Successfully for ${currentMonthYear}!`);
    } catch (err) {
      console.error('Error processing payroll:', err);
      toast.error('Failed to process payroll. Did you run the SQL query?');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Payroll Process</h1>
        <p className="page-subtitle">Run auto payroll for the current month.</p>
      </div>

      <div className="card fade-in">
        <h3 style={{ marginBottom: '16px' }}>Auto Payroll Processing</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Clicking the button below will automatically fetch salary structures and calculate gross salary, taxes, PF, and net salary for all active employees for the current month.
        </p>
        
        <button 
          className="btn-primary" 
          onClick={handleProcess} 
          disabled={processing || loading}
          style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', fontSize: '1.1rem', width: '100%', maxWidth: '400px' }}
        >
          {processing ? <Loader size={20} className="spin" /> : null}
          {processing ? 'Processing Payroll...' : 'Run Auto Payroll'}
        </button>

        {processedPayroll.filter(p => p.month_year === 'July 2026').length > 0 && (
          <div style={{ marginTop: '32px', backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Payroll Processed for July 2026
            </h4>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Successfully fetched from Database: <strong>{processedPayroll.filter(p => p.month_year === 'July 2026').length}</strong> employees processed for this month. You can verify this in the Payslip and Bank Transfer pages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
