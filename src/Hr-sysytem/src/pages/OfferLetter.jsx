import React, { useState, useRef } from 'react';
import { Printer, Edit, Download, Building2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import jbtLogo from '../assets/jbt.logo.jfif';
import jbeLogo from '../assets/jbe-logo.jfif';

const OfferLetter = () => {
  const [isPreview, setIsPreview] = useState(false);
  const letterRef = useRef(null);
  
  const [formData, setFormData] = useState({
    companyName: 'M/s Jai Bhole Traders',
    date: new Date().toISOString().split('T')[0],
    title: 'Mr.',
    name: '',
    address: '',
    subject: 'Offer of Employment',
    designation: '',
    department: '',
    monthlyGrossSalary: '',
    probationPeriod: '3 Months',
    workingHours: '10:30 AM to 07:30 PM',
    joiningDate: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = letterRef.current;
    if (!element) return;
    
    try {
      const originalWidth = element.style.width;
      const originalHeight = element.style.height;
      
      element.style.width = '800px';
      element.style.height = '1131px';
      element.style.border = 'none';
      
      const canvas = await html2canvas(element, { scale: 2, windowWidth: 800 });
      
      element.style.border = '1px solid #ccc';
      element.style.width = originalWidth;
      element.style.height = originalHeight;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Offer_Letter_${formData.name.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF", error);
      toast.error("Failed to download PDF");
    }
  };

  return (
    <div className="p-6 fade-in">
      <div className="mb-6 no-print page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title text-2xl font-bold text-gray-800">Offer Letter Generator</h1>
          <p className="page-subtitle">Fill in details and generate an official Offer Letter</p>
        </div>
        <button
          onClick={() => setIsPreview(!isPreview)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isPreview ? <Edit size={20} /> : <Printer size={20} />}
          {isPreview ? 'Edit Mode' : 'Print Preview'}
        </button>
      </div>

      {!isPreview ? (
        <div className="card max-w-4xl mx-auto no-print">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Fill Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <select name="companyName" value={formData.companyName} onChange={handleChange} className="w-full border rounded p-2">
                <option value="M/s Jai Bhole Traders">M/s Jai Bhole Traders</option>
                <option value="M/s Jai Bhole Enterprise">M/s Jai Bhole Enterprise</option>
              </select>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select name="title" value={formData.title} onChange={handleChange} className="border rounded p-2" style={{ width: '80px' }}>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                </select>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (CTC/Gross)</label>
              <input type="text" name="monthlyGrossSalary" value={formData.monthlyGrossSalary} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Probation Period</label>
              <input type="text" name="probationPeriod" value={formData.probationPeriod} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
              <input type="text" name="workingHours" value={formData.workingHours} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
              <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-10 rounded-lg shadow-md max-w-4xl mx-auto print-area text-black" style={{ minHeight: '1000px', backgroundColor: 'white' }}>
           <style>
            {`
              @media print {
                @page {
                  size: A4;
                  margin: 0;
                }
                html, body {
                  width: 100%;
                  height: 100%;
                  margin: 0;
                  padding: 0;
                  overflow: hidden;
                }
                body * {
                  visibility: hidden;
                }
                .no-print {
                  display: none !important;
                }
                .print-area, .print-area * {
                  visibility: visible;
                  color: black !important;
                }
                .print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .letter-content {
                  width: 100% !important;
                  max-width: 800px;
                  height: auto !important;
                  min-height: 100vw;
                  padding: 20px !important;
                }
              }
              @media screen and (max-width: 768px) {
                .letter-content {
                  width: 100% !important;
                  height: auto !important;
                  min-height: 1131px;
                  padding: 20px !important;
                  transform-origin: top center;
                  transform: scale(min(1, calc(100vw / 800)));
                  margin-bottom: calc(-1131px * (1 - min(1, calc(100vw / 800))));
                }
                .preview-wrapper {
                  overflow-x: hidden !important;
                  display: flex;
                  justify-content: center;
                }
              }
            `}
          </style>

          <div className="flex justify-end gap-3 mb-4 no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
             <button onClick={() => setIsPreview(false)} className="btn-primary" style={{ backgroundColor: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeft size={16} /> Back
             </button>
             <button onClick={handleDownloadPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} /> Download PDF
             </button>
          </div>

          <div className="preview-wrapper" style={{ width: '100%', overflowX: 'auto', paddingBottom: '20px' }}>
            <div ref={letterRef} className="font-sans text-sm letter-content" style={{ 
              backgroundColor: '#fff', 
              color: '#333', 
              padding: '40px 50px', 
              width: '800px', 
              height: '1131px', // A4 aspect ratio 1:1.414
              border: '1px solid #ccc',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontFamily: '"Times New Roman", Times, serif',
              boxSizing: 'border-box'
            }}>
            
            {/* Header */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {formData.companyName === 'M/s Jai Bhole Traders' ? (
                    <img src={jbtLogo} alt="Jai Bhole Traders Logo" style={{ height: '60px', width: 'auto', borderRadius: '8px' }} />
                  ) : (
                    <img src={jbeLogo} alt="Jai Bhole Enterprise Logo" style={{ height: '60px', width: 'auto', borderRadius: '8px' }} />
                  )}
                  <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#374151' }}>{formData.companyName}</h1>
                </div>
                <div style={{ textAlign: 'right', fontSize: '1rem', fontWeight: 'bold', color: '#4b5563', paddingTop: '5px' }}>
                  GSTIN: 22AWGPA9068C1ZW
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '15px', fontSize: '1rem' }}>
                Date: {formData.date.split('-').reverse().join('/')}
              </div>

              {/* Recipient Details */}
              <div style={{ marginBottom: '15px', fontSize: '1rem', lineHeight: '1.4' }}>
                <p>To,</p>
                <p><strong>{formData.name ? `${formData.title} ${formData.name}` : `${formData.title} ________________`}</strong></p>
                <p>Address: {formData.address || '_________________________________'}</p>
              </div>

              <p style={{ marginBottom: '15px', fontSize: '1rem' }}>Subject: <strong>{formData.subject}</strong></p>

              <p style={{ marginBottom: '10px', fontSize: '1rem' }}>Dear <strong>{formData.name ? `${formData.title} ${formData.name}` : `${formData.title} ________________`}</strong>,</p>

              <p style={{ marginBottom: '15px', fontSize: '1rem', lineHeight: '1.4' }}>
                We are pleased to offer you the position of <strong>{formData.designation.toUpperCase() || '________________'}</strong> at {formData.companyName}.<br />
                Your appointment will be effective from <strong>{formData.date.split('-').reverse().join('/')}</strong> on the following terms and conditions:
              </p>

              <div style={{ marginLeft: '20px', marginBottom: '15px', fontSize: '1rem', lineHeight: '1.5' }}>
                <p>1. Designation: <strong>{formData.designation.toUpperCase()}</strong></p>
                <p>2. Department: {formData.department}</p>
                <p>3. Monthly Salary (CTC/Gross): ₹ {formData.monthlyGrossSalary}</p>
                <p>4. Probation Period: {formData.probationPeriod}</p>
                <p>5. Working Hours: {formData.workingHours}</p>
                <p>6. You are expected to maintain discipline, confidentiality, and comply with all company rules and policies.</p>
                <p>7. Either party may terminate the employment by giving notice as per company policy.</p>
              </div>

              <p style={{ marginBottom: '15px', fontSize: '1rem', lineHeight: '1.4' }}>
                Kindly sign and return a copy of this letter as a token of your acceptance of the above terms and conditions.
              </p>
              
              <p style={{ marginBottom: '15px', fontSize: '1rem', lineHeight: '1.4' }}>
                We welcome you to {formData.companyName} and wish you a successful career with us.
              </p>
            </div>

            {/* Footer / Signatures */}
            <div>
              <div style={{ marginBottom: '20px', fontSize: '1rem', lineHeight: '1.4' }}>
                <p>With Best Regards,</p>
                <p>For {formData.companyName}</p>
                <br /><br />
                <p>Authorized Signatory</p>
                <p><strong>Proprietor</strong></p>
              </div>

              <div style={{ borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                <p style={{ marginBottom: '10px', fontSize: '1rem' }}>Employee Acceptance</p>
                <p style={{ marginBottom: '20px', fontSize: '1rem', lineHeight: '1.4' }}>
                  I, <strong>{formData.name ? `${formData.title} ${formData.name}` : `${formData.title} ________________`}</strong>, hereby accept the above offer and agree to abide by the terms and conditions mentioned in this letter.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '1rem' }}>
                  <p>Employee Signature: __________________</p>
                  <p>JOINING DATE: {formData.joiningDate ? formData.joiningDate.split('-').reverse().join('/') : `_____ / _____ / ${new Date().getFullYear()}`}</p>
                  <p>Name: <strong>{formData.name || '__________________'}</strong></p>
                </div>
              </div>

              {/* Bottom Address */}
              <div style={{ borderTop: '2px solid #ccc', marginTop: '20px', paddingTop: '10px', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
                N.K. Agrawal & Sons Tower, 2nd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferLetter;
