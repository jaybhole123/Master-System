import React, { useState, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';

export default function BankTransfer() {
  const [employees, , empLoading] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [loading, setLoading] = useState(true);

  const isDataLoading = loading || empLoading;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salariesRes, settingsRes] = await Promise.all([
          supabase.from('salary_structures').select('*'),
          supabase.from('payroll_settings').select('*').limit(1).single()
        ]);

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
              pfApplicable: s.pf_applicable !== false
            };
          });
        }
        setSalaries(salMap);

        if (settingsRes.data) {
          setSettings({
            pf: settingsRes.data.pf_percentage || 12,
            ptax: settingsRes.data.ptax_amount || 200,
            esic: 0.75
          });
        }
      } catch (err) {
        console.error('Error fetching bank transfer data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const records = employees.map(emp => {
    const sal = salaries[emp.id] || { basic: 0, hra: 0, allowances: 0, profTax: 0, otherDeductions: 0, paymentStatus: 'Pending', bankAccount: '', pfApplicable: true };
    const gross = sal.basic + sal.hra + sal.allowances;
    
    // Deductions
    const pfDeduction = sal.pfApplicable ? (sal.basic * (settings.pf / 100)) : 0;
    const ptax = sal.profTax || 0;
    const otherDeduct = sal.otherDeductions || 0;
    const totalDeductions = pfDeduction + ptax + otherDeduct;
    
    const net = gross - totalDeductions;

    return {
      id: emp.id,
      name: emp.name,
      net: net > 0 ? net : 0,
      bankAccount: sal.bankAccount || emp.accountNo || '',
      paymentStatus: sal.paymentStatus || 'Pending'
    };
  });

  if (isDataLoading) {
    return (
      <div className="fade-in" style={{ padding: '24px' }}>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <h1 className="page-title">Bank Transfer</h1>
          <p className="page-subtitle">Generate CSV/Excel reports for bank salary uploads.</p>
        </div>
        <div className="card fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Loader className="spin" size={32} color="var(--primary-color)" />
          <span style={{ marginLeft: '12px', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Loading bank data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Bank Transfer</h1>
        <p className="page-subtitle">Generate CSV/Excel reports for bank salary uploads.</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.25rem' }}>Bank Advice Report - July 2026</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Beneficiary Name</th>
                <th>Account Number</th>
                <th>Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? records.map(rec => (
                <tr key={rec.id}>
                  <td style={{ fontWeight: 500 }}>{rec.name}</td>
                  <td style={{ letterSpacing: '1px', fontFamily: 'monospace' }}>{rec.bankAccount || 'Not Provided'}</td>
                  <td style={{ fontWeight: 700 }}>₹ {rec.net.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                  <td>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: rec.paymentStatus === 'Processed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: rec.paymentStatus === 'Processed' ? 'var(--success)' : '#d97706' }}>
                      {rec.paymentStatus === 'Processed' ? 'Transferred' : 'Pending'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" style={{textAlign: 'center', padding: '24px', color: 'var(--text-secondary)'}}>No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
