import React, { useState, useEffect, useRef } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Payslip() {
  const payslipRef = useRef(null);
  const [employees, , empLoading] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState('');

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
        console.error('Error fetching payslip data:', err);
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

  const payrollData = records.find(r => r.id === selectedEmp) || {
    bankAccount: '-',
    breakdown: {
      sal: { basic: 0, hra: 0, allowances: 0 },
      pfDeduction: 0,
      esicDeduction: 0,
      ptax: 0,
      empOtherDeductions: 0
    },
    gross: 0,
    deductions: 0,
    net: 0
  };
  const empDetails = employees.find(e => e.id === selectedEmp) || {
    name: '---',
    id: '---',
    designation: '---',
    department: '---'
  };

  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;
    try {
      const canvas = await html2canvas(payslipRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Add margins (15mm on each side)
      const margin = 15;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add box shadow effect by drawing a light gray rectangle behind
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin + 2, margin + 2, imgWidth, imgHeight, 'F');
      
      // Draw border
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, margin, imgWidth, imgHeight);
      
      // Add the image
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`Payslip_${empDetails.name}_July2026.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
    }
  };

  if (isDataLoading) {
    return (
      <div className="fade-in" style={{ padding: '24px' }}>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <h1 className="page-title">Payslip Generation</h1>
          <p className="page-subtitle">View, download, and email employee payslips.</p>
        </div>
        <div className="card fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Loader className="spin" size={32} color="var(--primary-color)" />
          <span style={{ marginLeft: '12px', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Loading payslip data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Payslip Generation</h1>
        <p className="page-subtitle">View, download, and email employee payslips.</p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="form-group" style={{ maxWidth: '300px' }}>
          <label>Select Employee</label>
          <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}>
            <option value="">-- Select --</option>
            {records.map(r => <option key={r.id} value={r.id}>{r.id} - {r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '24px' }} ref={payslipRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Jai Bhole</h2>
            <p style={{ color: 'var(--text-secondary)' }}>N.K Agrawal and sons tower Sankar Nagar , Raipur</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ color: 'var(--primary-color)' }}>PAYSLIP</h2>
            <p style={{ fontWeight: 500 }}>July 2026</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div>
            <p><strong>Employee Name:</strong> {empDetails.name}</p>
            <p><strong>Employee ID:</strong> {empDetails.id}</p>
            <p><strong>Designation:</strong> {empDetails.designation}</p>
          </div>
          <div>
            <p><strong>Bank Account:</strong> {payrollData.bankAccount || '-'}</p>
            <p><strong>Department:</strong> {empDetails.department}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Earnings</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Basic</span><span>₹ {payrollData.breakdown.sal.basic}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>HRA</span><span>₹ {payrollData.breakdown.sal.hra}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Allowances</span><span>₹ {payrollData.breakdown.sal.allowances}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontWeight: 700 }}><span>Total Earnings</span><span>₹ {payrollData.gross.toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
          </div>
          <div>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Deductions</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>PF</span><span>₹ {payrollData.breakdown.pfDeduction.toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>ESIC</span><span>₹ {(payrollData.breakdown.esicDeduction || 0).toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Professional Tax</span><span>₹ {payrollData.breakdown.ptax}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Other Deductions</span><span>₹ {payrollData.breakdown.empOtherDeductions}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontWeight: 700 }}><span>Total Deductions</span><span>₹ {payrollData.deductions.toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
          </div>
        </div>

        <div style={{ marginTop: '32px', backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 500 }}>Net Pay</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>₹ {payrollData.net.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
        <button className="btn-primary" disabled={!selectedEmp} onClick={handleDownloadPDF}>Download PDF</button>
      </div>
    </div>
  );
}
