import React, { useState, useEffect, useRef } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader, Download, Eye, Printer, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

import jbtLogo from '../assets/jbt.logo.jfif';
import jbeLogo from '../assets/jbe-logo.jfif';

const FIRM_DETAILS = {
  'M/s Jai Bhole Traders': {
    name: 'M/s Jai Bhole Traders',
    logo: jbtLogo,
    gstin: '22AWGPA9068C1ZW',
    textColor: '#2c3e60',
    address: 'N.K. Agrawal & Sons Tower, 2nd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 78736 50000, 91091 61146, E-mail : biswanath23@gmail.com, jaibholetraderacc@gmail.com'
  },
  'Jai Bhole Enterprises': {
    name: 'Jai Bhole Enterprises',
    logo: jbeLogo,
    gstin: '22AHAPA5408K1ZW',
    textColor: '#ee5945',
    address: 'N.K. Agrawal & Sons Tower, 3rd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 91654 22000, E-mail : amarnath.agrawal22@gmail.com, GSTIN : 22AHAPA5408K1ZW'
  },
  'ASAK COAL PRIVATE LIMITED': {
    name: 'ASAK COAL PRIVATE LIMITED',
    logo: null,
    gstin: '22AAXCA2906K1ZH',
    textColor: '#834333',
    address: 'N.K. Agrawal & Sons Tower, 1st Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 91654 22000, E-mail : asakcoal@gmail.com, CIN No. : U51909CT2022PTC013419, GSTIN : 22AAXCA2906K1ZH'
  },
  'Jai Bhole Logistics': {
    name: 'Jai Bhole Logistics',
    logo: jbeLogo,
    gstin: '22AANHA7052H1ZH',
    textColor: '#ff6b52',
    address: 'N.K. Agrawal & Sons Tower, 3rd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo.: 91654 22000, E-mail : amarnath.agrawal22@gmail.com'
  }
};

export default function Payslip() {
  const payslipRef = useRef(null);
  const modalPayslipRef = useRef(null);
  const [employees, , empLoading] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [companyName, setCompanyName] = useState('M/s Jai Bhole Traders');
  const [payslipMonth, setPayslipMonth] = useState('July 2026');
  const [salaryDate, setSalaryDate] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const isDataLoading = loading || empLoading;

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
            pfApplicable: s.pf_applicable !== false,
            esicApplicable: s.esic_applicable !== false,
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

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSalaries(), fetchSettings()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedEmp && salaries[selectedEmp]) {
      const sal = salaries[selectedEmp];
      if (sal.salaryDate) setSalaryDate(sal.salaryDate);
      else setSalaryDate('');

      if (sal.salaryMonth) setPayslipMonth(sal.salaryMonth);
    }
  }, [selectedEmp, salaries]);

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
    name: selectedEmp ? selectedEmp : '---',
    id: selectedEmp ? selectedEmp : '---',
    designation: '---',
    department: '---'
  };

  const handleOpenPreview = () => {
    if (!selectedEmp) {
      toast.error('Please select an employee first!');
      return;
    }
    setShowPreviewModal(true);
  };

  const handleDownloadPDF = async (targetRef = payslipRef) => {
    if (!selectedEmp) {
      toast.error('Please select an employee first!');
      return;
    }

    const element = targetRef.current;
    if (!element) {
      toast.error('Payslip view not ready');
      return;
    }

    const toastId = toast.loading('Generating Full-Page Payslip PDF...');
    try {
      const origBorder = element.style.border;
      const origBoxShadow = element.style.boxShadow;
      const origWidth = element.style.width;

      // Adjust styles for full-height A4 capture
      element.style.border = 'none';
      element.style.boxShadow = 'none';
      element.style.width = '800px';

      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        windowWidth: 800 
      });

      // Restore original UI styles
      element.style.border = origBorder;
      element.style.boxShadow = origBoxShadow;
      element.style.width = origWidth;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 8; // Light 8mm padding around PDF edges

      const availWidth = pdfWidth - (margin * 2);
      const availHeight = pdfHeight - (margin * 2);

      let imgWidth = availWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > availHeight) {
        imgHeight = availHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      const xPos = (pdfWidth - imgWidth) / 2;
      const yPos = margin;

      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
      pdf.save(`Payslip_${(empDetails.name || 'Employee').replace(/\s+/g, '_')}_${payslipMonth.replace(/\s+/g, '_')}.pdf`);
      
      toast.dismiss(toastId);
      toast.success("Payslip PDF downloaded successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Error generating PDF', err);
      toast.error("Failed to download PDF: " + (err.message || 'Error'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isDataLoading) {
    return (
      <div className="fade-in" style={{ padding: '24px' }}>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <h1 className="page-title">Payslip Generation</h1>
          <p className="page-subtitle">View, download, and email employee payslips with firm letterhead.</p>
        </div>
        <div className="card fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Loader className="spin" size={32} color="var(--primary-color)" />
          <span style={{ marginLeft: '12px', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Loading payslip data...</span>
        </div>
      </div>
    );
  }

  const activeFirm = FIRM_DETAILS[companyName] || FIRM_DETAILS['M/s Jai Bhole Traders'];

  const renderPayslipCard = (refToUse) => (
    <div 
      className="card printable-payslip-card" 
      style={{ 
        maxWidth: '800px', 
        width: '100%',
        minHeight: '1080px', // Exact A4 aspect ratio height to fill full page
        margin: '0 auto', 
        backgroundColor: '#ffffff', 
        padding: '36px 40px', 
        borderRadius: '8px', 
        border: '1px solid #cbd5e1', 
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }} 
      ref={refToUse}
    >
      <div>
        {/* Exact Official Letterhead Header (Single Line Title) */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              {activeFirm.logo && (
                <img 
                  src={activeFirm.logo} 
                  alt={activeFirm.name} 
                  style={{ height: '55px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} 
                />
              )}
              <h1 style={{ 
                fontSize: companyName === 'ASAK COAL PRIVATE LIMITED' ? '1.5rem' : '1.7rem', 
                fontWeight: 800, 
                color: activeFirm.textColor, 
                margin: 0,
                whiteSpace: 'nowrap',
                fontFamily: companyName === 'ASAK COAL PRIVATE LIMITED' ? '"Impact", "Arial Black", sans-serif' : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                letterSpacing: companyName === 'ASAK COAL PRIVATE LIMITED' ? '1px' : '-0.3px'
              }}>
                {activeFirm.name}
              </h1>
            </div>
            <div style={{ textAlign: 'right', paddingLeft: '12px', flexShrink: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                GSTIN: {activeFirm.gstin}
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626', letterSpacing: '1px', marginTop: '2px', whiteSpace: 'nowrap' }}>
                PAYSLIP
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                {payslipMonth}
              </div>
            </div>
          </div>
        </div>

        {/* Employee Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#f8fafc', padding: '20px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
          <div>
            <p style={{ margin: '6px 0', fontSize: '1rem' }}><strong style={{ color: '#475569' }}>Employee Name:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{empDetails.name}</span></p>
            <p style={{ margin: '6px 0', fontSize: '1rem' }}><strong style={{ color: '#475569' }}>Employee ID:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{empDetails.id}</span></p>
            <p style={{ margin: '6px 0', fontSize: '1rem' }}><strong style={{ color: '#475569' }}>Designation:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{empDetails.designation}</span></p>
          </div>
          <div>
            <p style={{ margin: '6px 0', fontSize: '1rem' }}><strong style={{ color: '#475569' }}>Bank Account:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{payrollData.bankAccount || '-'}</span></p>
            <p style={{ margin: '6px 0', fontSize: '1rem' }}><strong style={{ color: '#475569' }}>Department:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{empDetails.department}</span></p>
            <p style={{ margin: '6px 0', fontSize: '1rem' }}><strong style={{ color: '#475569' }}>Salary Date:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{salaryDate || payrollData.breakdown?.sal?.salaryDate || '-'}</span></p>
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '32px' }}>
          {/* Earnings */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', backgroundColor: '#fff' }}>
            <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '18px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Earnings</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#334155' }}><span>Basic</span><span>₹ {payrollData.breakdown.sal.basic}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#334155' }}><span>HRA</span><span>₹ {payrollData.breakdown.sal.hra}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#334155' }}><span>Allowances</span><span>₹ {payrollData.breakdown.sal.allowances}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}><span>Total Earnings</span><span>₹ {payrollData.gross.toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
          </div>

          {/* Deductions */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', backgroundColor: '#fff' }}>
            <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '18px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Deductions</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#334155' }}><span>PF</span><span>₹ {payrollData.breakdown.pfDeduction.toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#334155' }}><span>ESIC</span><span>₹ {(payrollData.breakdown.esicDeduction || 0).toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#334155' }}><span>Professional Tax</span><span>₹ {payrollData.breakdown.ptax}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#334155' }}><span>Other Deductions</span><span>₹ {payrollData.breakdown.empOtherDeductions}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}><span>Total Deductions</span><span>₹ {payrollData.deductions.toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
          </div>
        </div>

        {/* Net Pay Bar */}
        <div style={{ backgroundColor: '#f1f5f9', padding: '20px 24px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #cbd5e1', marginBottom: '40px' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#334155' }}>Net Pay Amount</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626' }}>₹ {payrollData.net.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
        </div>

        {/* Signatures Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', padding: '0 10px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', marginBottom: '8px' }}></div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Employee Signature</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '45px' }}>For {activeFirm.name}</div>
            <div style={{ borderBottom: '1px solid #94a3b8', width: '200px', marginBottom: '8px' }}></div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Authorized Signatory</span>
          </div>
        </div>
      </div>

      {/* Exact Official Letterhead Footer Pinned to Bottom */}
      <div style={{ borderTop: '2px solid #2563eb', paddingTop: '12px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px', letterSpacing: '0.2px' }}>
          {activeFirm.address}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a' }}>
          {activeFirm.footerContact}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ padding: '16px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Payslip Generation</h1>
        <p className="page-subtitle">View, preview, and generate official firm-wise employee payslips.</p>
      </div>

      {/* Control Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'center' }}>
          <div className="form-group">
            <label style={{ fontWeight: 600, marginBottom: '6px', display: 'block' }}>Select Firm / Company</label>
            <select value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="M/s Jai Bhole Traders">M/s Jai Bhole Traders</option>
              <option value="Jai Bhole Enterprises">Jai Bhole Enterprises</option>
              <option value="ASAK COAL PRIVATE LIMITED">ASAK COAL PRIVATE LIMITED</option>
              <option value="Jai Bhole Logistics">Jai Bhole Logistics</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, marginBottom: '6px', display: 'block' }}>Select Employee *</label>
            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Select Employee --</option>
              {records.map(r => <option key={r.id} value={r.id}>{r.id} - {r.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, marginBottom: '6px', display: 'block' }}>Payslip Month & Year</label>
            <input 
              type="text" 
              value={payslipMonth} 
              onChange={(e) => setPayslipMonth(e.target.value)} 
              placeholder="e.g. July 2026"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, marginBottom: '6px', display: 'block' }}>Salary Date</label>
            <input 
              type="date" 
              value={salaryDate} 
              onChange={(e) => setSalaryDate(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto 16px auto', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button 
          type="button"
          onClick={handleOpenPreview}
          style={{ 
            backgroundColor: '#2563eb', 
            color: '#ffffff', 
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Eye size={18} /> Preview Payslip
        </button>
        <button 
          type="button"
          onClick={() => handleDownloadPDF(payslipRef)}
          style={{ 
            backgroundColor: '#dc2626', 
            color: '#ffffff', 
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Download size={18} /> Download PDF
        </button>
      </div>

      {/* Main Payslip Card */}
      {renderPayslipCard(payslipRef)}

      {/* Full Preview Modal */}
      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Payslip Preview - {empDetails.name}
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {activeFirm.name} • {payslipMonth}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={handlePrint}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#475569',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => handleDownloadPDF(modalPayslipRef)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={16} /> Download PDF
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    borderRadius: '8px'
                  }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#f1f5f9' }}>
              {renderPayslipCard(modalPayslipRef)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
