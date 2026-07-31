import React, { useState, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function NetSalary() {
  const [employees, , empLoading] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('Sheet');

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
              pfApplicable: s.pf_applicable !== false,
              esicApplicable: s.esic_applicable !== false
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
        console.error('Error fetching net salary data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const records = employees.map(emp => {
    const sal = salaries[emp.id] || { basic: 0, hra: 0, allowances: 0, profTax: 0, otherDeductions: 0, paymentStatus: 'Pending', bankAccount: '', pfApplicable: true, esicApplicable: true };
    const gross = sal.basic + sal.hra + sal.allowances;
    
    // Deductions
    const pfDeduction = sal.pfApplicable ? (sal.basic * (settings.pf / 100)) : 0;
    const esicDeduction = sal.esicApplicable ? (gross * (settings.esic / 100)) : 0;
    const ptax = sal.profTax || 0;
    const otherDeduct = sal.otherDeductions || 0;
    const totalDeductions = pfDeduction + esicDeduction + ptax + otherDeduct;
    
    const net = gross - totalDeductions;

    return {
      id: emp.id,
      name: emp.name,
      gross,
      deductions: totalDeductions,
      net: net > 0 ? net : 0,
      paymentStatus: sal.paymentStatus || 'Pending',
      bankAccount: sal.bankAccount || emp.accountNo || '',
      breakdown: {
        sal,
        pfDeduction,
        esicDeduction,
        ptax,
        empOtherDeductions: otherDeduct
      }
    };
  });

  // Calculations
  const totalGross = records.reduce((acc, curr) => acc + curr.gross, 0);
  const totalNet = records.reduce((acc, curr) => acc + curr.net, 0);
  const totalPF = records.reduce((acc, curr) => acc + curr.breakdown.pfDeduction, 0);
  const totalESIC = records.reduce((acc, curr) => acc + curr.breakdown.esicDeduction, 0);
  const totalPTax = records.reduce((acc, curr) => acc + curr.breakdown.ptax, 0);
  const totalOtherDeduct = records.reduce((acc, curr) => acc + curr.breakdown.empOtherDeductions, 0);
  const totalDeductions = records.reduce((acc, curr) => acc + curr.deductions, 0);
  const totalBasic = records.reduce((acc, curr) => acc + curr.breakdown.sal.basic, 0);
  const totalHra = records.reduce((acc, curr) => acc + curr.breakdown.sal.hra, 0);
  const totalAllowances = records.reduce((acc, curr) => acc + (curr.breakdown.sal.allowances || 0), 0);

  const chartData = records.map(rec => ({
    name: rec.name,
    NetSalary: rec.net
  }));

  const thStyle = {
    border: '1px solid var(--border-color)',
    padding: '12px 10px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 500,
    textTransform: 'none',
    letterSpacing: 'normal',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--bg-main)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  };

  const tdStyle = {
    border: '1px solid var(--border-color)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap'
  };

  const tdNumStyle = {
    ...tdStyle,
    textAlign: 'right',
    fontFamily: 'monospace',
    fontSize: '0.95rem',
    fontWeight: 400
  };

  if (isDataLoading) {
    return (
      <div className="fade-in" style={{ padding: '24px' }}>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <h1 className="page-title">Salary & Payroll Dashboard</h1>
          <p className="page-subtitle">View Excel-style Salary Sheet and Payroll Summary Dashboard.</p>
        </div>
        <div className="card fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Loader className="spin" size={32} color="var(--primary-color)" />
          <span style={{ marginLeft: '12px', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Loading salary data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Salary & Payroll Dashboard</h1>
          <p className="page-subtitle">View Excel-style Salary Sheet and Payroll Summary Dashboard.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('Sheet')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Sheet' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Sheet' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          Salary Sheet
        </button>
        <button
          onClick={() => setActiveTab('Dashboard')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Dashboard' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Dashboard' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          Dashboard
        </button>
      </div>

      {activeTab === 'Sheet' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          {/* Header of Excel Sheet */}
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', textAlign: 'center', padding: '16px', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
            SALARY SHEET
          </div>
          
          <div style={{ display: 'flex', gap: '32px', padding: '16px 24px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Month</span>
              <div style={{ padding: '6px 16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', borderRadius: '6px', fontWeight: 600 }}>July 2026</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>PF % (Employee)</span>
              <div style={{ padding: '6px 16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', borderRadius: '6px', fontWeight: 600 }}>12%</div>
            </div>
          </div>

          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)', paddingBottom: '12px' }}>
            <table style={{ minWidth: '1500px', borderCollapse: 'collapse', margin: '0' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px -2px rgba(0,0,0,0.1)' }}>
                <tr>
                  <th style={{...thStyle, width: '60px'}}>Sr. No.</th>
                  <th style={thStyle}>Employee Name</th>
                  <th style={thStyle}>Designation</th>
                  <th style={thStyle}>Basic Salary (₹)</th>
                  <th style={thStyle}>HRA (₹)</th>
                  <th style={thStyle}>Allowances (₹)</th>
                  <th style={{...thStyle, backgroundColor: '#f8fafc'}}>Gross Salary (₹)</th>
                  <th style={thStyle}>PF (₹)</th>
                  <th style={thStyle}>ESIC (₹)</th>
                  <th style={thStyle}>Prof. Tax (₹)</th>
                  <th style={thStyle}>Other Deduct. (₹)</th>
                  <th style={{...thStyle, backgroundColor: '#f8fafc'}}>Total Deduct. (₹)</th>
                  <th style={{...thStyle, backgroundColor: '#ecfdf5'}}>Net Salary (₹)</th>
                  <th style={thStyle}>Payment Status</th>
                  <th style={thStyle}>Bank A/c No.</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map((rec, idx) => {
                    const emp = employees.find(e => e.id === rec.id) || {};
                    const allowances = rec.breakdown.sal.allowances || 0;
                    const otherDeduct = rec.breakdown.empOtherDeductions || 0;

                    return (
                      <tr key={rec.id} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)' }}>
                        <td style={{...tdStyle, textAlign: 'center', color: 'var(--text-secondary)'}}>{idx + 1}</td>
                        <td style={{...tdStyle, fontWeight: 500, color: 'var(--text-primary)'}}>{rec.name}</td>
                        <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{emp.designation || '-'}</td>
                        <td style={tdNumStyle}>{rec.breakdown.sal.basic.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={tdNumStyle}>{rec.breakdown.sal.hra.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={tdNumStyle}>{allowances.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={{...tdNumStyle, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'rgba(0,0,0,0.02)'}}>{rec.gross.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.pfDeduction.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.esicDeduction.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.ptax.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={{...tdNumStyle, color: 'var(--danger)'}}>{otherDeduct.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={{...tdNumStyle, color: 'var(--danger)', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.05)'}}>{rec.deductions.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={{...tdNumStyle, color: 'var(--success)', fontWeight: 600, fontSize: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)'}}>{rec.net.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                        <td style={{...tdStyle, textAlign: 'center'}}>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: rec.paymentStatus === 'Processed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: rec.paymentStatus === 'Processed' ? 'var(--success)' : '#d97706', fontWeight: 500 }}>{rec.paymentStatus}</span>
                        </td>
                        <td style={{...tdStyle, textAlign: 'center', fontFamily: 'monospace', letterSpacing: '1px'}}>{rec.bankAccount || '-'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="15" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No employees found to display salary data.</td></tr>
                )}
                {records.length > 0 && (
                  <tr style={{ backgroundColor: 'var(--bg-main)' }}>
                    <td colSpan="3" style={{ border: '1px solid var(--border-color)', padding: '16px', textAlign: 'right', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>TOTAL</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>₹ {totalBasic.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>₹ {totalHra.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>₹ {totalAllowances.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'rgba(0,0,0,0.02)'}}>₹ {totalGross.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalPF.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalESIC.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalPTax.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalOtherDeduct.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)'}}>₹ {totalDeductions.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 700, color: 'var(--success)', fontSize: '1.05rem', backgroundColor: 'rgba(16, 185, 129, 0.05)'}}>₹ {totalNet.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                    <td style={{ border: '1px solid var(--border-color)' }}></td>
                    <td style={{ border: '1px solid var(--border-color)' }}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Dashboard' && (
        <div className="fade-in">
          {/* Dashboard Header */}
          <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '16px 24px', fontWeight: 700, fontSize: '1.25rem', borderRadius: '12px 12px 0 0', letterSpacing: '0.5px' }}>
            DASHBOARD — Payroll Summary
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 24px', border: '1px solid var(--border-color)', borderTop: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '24px', borderRadius: '0 0 12px 12px' }}>
            Auto-updates from 'Salary Sheet'
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Employees</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 800, fontSize: '2rem' }}>{records.length}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Gross Payroll</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--primary-color)', fontWeight: 800, fontSize: '2rem' }}>₹ {totalGross.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Net Payroll</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--success)', fontWeight: 800, fontSize: '2rem' }}>₹ {totalNet.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Employee-wise Net Salary Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'fit-content' }}>
              <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '12px 16px', fontWeight: 700, letterSpacing: '0.5px' }}>Employee-wise Net Salary</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: 'white', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #334155', textTransform: 'none', color: 'white' }}>Employee</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #334155', textTransform: 'none', color: 'white' }}>Net Salary (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, idx) => (
                    <tr key={rec.id} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-main)' : 'var(--bg-card)' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 500 }}>{rec.name}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--success)' }}>{rec.net.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows */}
                  {[...Array(Math.max(0, 10 - records.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`} style={{ backgroundColor: (records.length + idx) % 2 === 0 ? 'var(--bg-main)' : 'var(--bg-card)' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'transparent' }}>-</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'transparent' }}>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chart */}
            <div className="card">
              <h3 style={{ marginBottom: '24px', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Net Salary by Employee</h3>
              {records.length > 0 ? (
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-secondary)' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} />
                      <Tooltip 
                        formatter={(value) => `₹ ${value.toLocaleString()}`} 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--primary-color)', fontWeight: 700 }}
                      />
                      <Bar dataKey="NetSalary" fill="#3b82f6" barSize={24} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No data to display chart.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
