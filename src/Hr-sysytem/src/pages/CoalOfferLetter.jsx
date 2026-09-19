import React, { useState, useRef } from 'react';
import { Printer, Edit, Download, ArrowLeft, Columns } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import jbtLogo from '../../../assets/jbt.png';
import ganeshLogo from '../../../assets/ganesh.jpg';
import signatureImg from '../../../assets/signature.png';

const COMPANY_DETAILS = {
  'M/s Jai Bhole Traders': {
    name: 'M/s Jai Bhole Traders',
    logo: jbtLogo,
    textColor: '#ee5945',
    address: 'N.K. Agrawal & Sons Tower, 2nd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 78736 50000, 91091 61146, E-mail : biswanath23@gmail.com, jaibholetraderacc@gmail.com'
  },
  'Jai Bhole Enterprises': {
    name: 'Jai Bhole Enterprises',
    logo: ganeshLogo,
    textColor: '#ff6b52',
    address: 'N.K. Agrawal & Sons Tower, 3rd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 91654 22000, E-mail : amarnath.agrawal22@gmail.com, GSTIN : 22AHAPA5408K1ZW'
  },
  'ASAK COAL PRIVATE LIMITED': {
    name: 'ASAK COAL PRIVATE LIMITED',
    logo: null,
    textColor: '#834333',
    address: 'N.K. Agrawal & Sons Tower, 1st Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 91654 22000, E-mail : asakcoal@gmail.com, CIN No. : U51909CT2022PTC013419, GSTIN : 22AAXCA2906K1ZH'
  },
  'Jai Bhole Logistics': {
    name: 'Jai Bhole Logistics',
    logo: ganeshLogo,
    textColor: '#ff6b52',
    address: 'N.K. Agrawal & Sons Tower, 3rd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo.: 91654 22000, E-mail : amarnath.agrawal22@gmail.com'
  }
};

const OfferLetter = () => {
  const [isPreview, setIsPreview] = useState(false);
  const letterRef = useRef(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    buyerName: 'Teerth Steels & Power Pvt Ltd',
    buyerAddress: 'Borai Industrial Growth Centre\nVillage & P.O. Rasmada Distt. Durg (C.G.)',
    buyerGst: '22AAGCT098L1D1',
    subject: 'Offer for supply of Coal',
    commodity: 'Wash Coal',
    billingMode: 'Buyer & Consignee',
    basicPrice: 'INR 7000.00PMT (Gst.18% Extra)',
    transporting: 'F.O.R. Delivery Your Plant',
    quantity: '5000 MT.',
    moisture: '13% (+/-1)',
    fc: '38 Minimum',
    ash: '32 (+/-1)',
    vm: '30 (+/-1)',
    size: '8-50MM (-8MM 15%)',
    noteText: 'Our sources of washed coal is from Asak Washery Korba & Mahavir Coal Washery Toggle Champa',
    companyName: 'M/s Jai Bhole Traders',
    signatoryName: 'Amarnath Agrawal',
    signatoryTitle: 'Director/Authorized Signatory',
    firmAddress: COMPANY_DETAILS['M/s Jai Bhole Traders'].address,
    firmFooterContact: COMPANY_DETAILS['M/s Jai Bhole Traders'].footerContact,
    signatureDataUrl: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'companyName') {
      const selectedCompany = COMPANY_DETAILS[value];
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        firmAddress: selectedCompany?.address || '',
        firmFooterContact: selectedCompany?.footerContact || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSignaturePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({ ...prev, signatureDataUrl: event.target.result }));
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, signatureDataUrl: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const specKeys = [
    { key: 'commodity', label: 'Name of Commodity' },
    { key: 'billingMode', label: 'Billing Mode' },
    { key: 'basicPrice', label: 'Basic Price' },
    { key: 'transporting', label: 'Transporting' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'moisture', label: 'Moisture' },
    { key: 'fc', label: 'Fc (ODB)' },
    { key: 'ash', label: 'Ash (ADB)' },
    { key: 'vm', label: 'VM (ADB)' },
    { key: 'size', label: 'Size' }
  ];

  const [visibleSpecs, setVisibleSpecs] = useState(
    specKeys.reduce((acc, spec) => ({ ...acc, [spec.key]: true }), {})
  );
  
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  const toggleSpec = (key) => {
    setVisibleSpecs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllSpecs = (val) => {
    setVisibleSpecs(specKeys.reduce((acc, spec) => ({ ...acc, [spec.key]: val }), {}));
  };

  const handleDownloadPDF = async () => {
    const element = letterRef.current;
    if (!element) return;
    
    try {
      const originalWidth = element.style.width;
      const originalHeight = element.style.height;
      
      element.style.width = '800px';
      element.style.height = 'auto';
      element.style.minHeight = '1131px';
      element.style.border = 'none';
      
      const canvas = await html2canvas(element, { scale: 2, windowWidth: 800 });
      
      element.style.border = '1px solid #ccc';
      element.style.width = originalWidth;
      element.style.height = originalHeight;
      element.style.minHeight = '1131px';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      let imgWidth = pdfWidth;
      let imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Force fit to 1 page
      if (imgHeight > pdfPageHeight) {
         const ratio = pdfPageHeight / imgHeight;
         imgHeight = pdfPageHeight;
         imgWidth = pdfWidth * ratio;
      }
      
      const xOffset = (pdfWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, 0, imgWidth, imgHeight);
      
      pdf.save(`Offer_Letter_${formData.buyerName ? formData.buyerName.replace(/\s+/g, '_') : 'Company'}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF", error);
      toast.error("Failed to download PDF");
    }
  };

  const activeFirm = COMPANY_DETAILS[formData.companyName] || COMPANY_DETAILS['Asak Coal Private Ltd'] || COMPANY_DETAILS['ASAK COAL PRIVATE LIMITED'];

  return (
    <div className="p-2 md:p-6 fade-in">
      <div className="mb-6 no-print page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title text-2xl font-bold text-gray-800">Coal Supply Offer Letter</h1>
          <p className="page-subtitle">Fill in details and generate an official Offer Letter for Coal Supply</p>
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
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Fill Letter Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Header Details */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Company Name</label>
              <select name="companyName" value={formData.companyName} onChange={handleChange} className="w-full border rounded p-2">
                {Object.keys(COMPANY_DETAILS).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
              <input type="text" name="buyerName" value={formData.buyerName} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Address</label>
              <textarea name="buyerAddress" value={formData.buyerAddress} onChange={handleChange} className="w-full border rounded p-2" rows={3} />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buyer GST No.</label>
              <input type="text" name="buyerGst" value={formData.buyerGst} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full border rounded p-2" />
            </div>

            <div className="col-span-full my-4 border-t pt-4" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="text-lg font-semibold m-0">Coal Specifications (Form Grid)</h3>
                  <div style={{ position: 'relative' }}>
                    <button 
                      type="button"
                      onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                      className="btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
                    >
                      <Columns size={16} /> Columns
                    </button>
                    {showColumnDropdown && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px', zIndex: 10, width: 'max-content', minWidth: '180px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <div style={{ padding: '4px 8px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', marginBottom: '8px', textAlign: 'left' }}>Toggle Columns</div>
                        <div style={{ display: 'flex', gap: '10px', padding: '0 8px 8px 8px', fontSize: '0.875rem', justifyContent: 'flex-start' }}>
                           <button type="button" onClick={() => toggleAllSpecs(true)} style={{ color: '#ef4444', cursor: 'pointer', textAlign: 'left', background: 'none', border: 'none', padding: 0 }}>Select All</button>
                           <button type="button" onClick={() => toggleAllSpecs(false)} style={{ color: '#6b7280', cursor: 'pointer', textAlign: 'left', background: 'none', border: 'none', padding: 0 }}>Deselect All</button>
                        </div>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', textAlign: 'left' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                            <tbody>
                              {specKeys.map(spec => (
                                <tr 
                                  key={spec.key} 
                                  onClick={(e) => {
                                    if (e.target.type !== 'checkbox') {
                                      toggleSpec(spec.key);
                                    }
                                  }} 
                                  style={{ cursor: 'pointer' }}
                                >
                                  <td style={{ width: '30px', padding: '6px 8px', textAlign: 'left', verticalAlign: 'middle', border: 'none' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={visibleSpecs[spec.key]} 
                                      onChange={() => toggleSpec(spec.key)} 
                                      style={{ margin: 0, cursor: 'pointer', accentColor: '#ef4444', display: 'block' }}
                                    />
                                  </td>
                                  <td style={{ padding: '6px 8px', textAlign: 'left', verticalAlign: 'middle', border: 'none' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#000', whiteSpace: 'nowrap', display: 'block', textAlign: 'left' }}>{spec.label}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '15px', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {visibleSpecs.commodity && <><label className="font-medium text-gray-700">Name of Commodity : -</label><input type="text" name="commodity" value={formData.commodity} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.billingMode && <><label className="font-medium text-gray-700">Billing Mode : -</label><input type="text" name="billingMode" value={formData.billingMode} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.basicPrice && <><label className="font-medium text-gray-700">Basic Price : -</label><input type="text" name="basicPrice" value={formData.basicPrice} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.transporting && <><label className="font-medium text-gray-700">Transporting : -</label><input type="text" name="transporting" value={formData.transporting} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.quantity && <><label className="font-medium text-gray-700">Quantity : -</label><input type="text" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.moisture && <><label className="font-medium text-gray-700">Moisture : -</label><input type="text" name="moisture" value={formData.moisture} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.fc && <><label className="font-medium text-gray-700">Fc (ODB) : -</label><input type="text" name="fc" value={formData.fc} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.ash && <><label className="font-medium text-gray-700">Ash (ADB) : -</label><input type="text" name="ash" value={formData.ash} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.vm && <><label className="font-medium text-gray-700">VM (ADB) : -</label><input type="text" name="vm" value={formData.vm} onChange={handleChange} className="w-full border rounded p-2" /></>}
                    {visibleSpecs.size && <><label className="font-medium text-gray-700">Size : -</label><input type="text" name="size" value={formData.size} onChange={handleChange} className="w-full border rounded p-2" /></>}
                </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note Text</label>
              <textarea name="noteText" value={formData.noteText} onChange={handleChange} className="w-full border rounded p-2" rows={2} />
            </div>


            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
              <input type="text" name="signatoryName" value={formData.signatoryName} onChange={handleChange} className="w-full border rounded p-2" />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Title</label>
              <input type="text" name="signatoryTitle" value={formData.signatoryTitle} onChange={handleChange} className="w-full border rounded p-2" />
            </div>

            <div className="form-group col-span-full" style={{ gridColumn: '1 / -1' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature Image (Click here & press Ctrl+V to paste or Click to upload)</label>
              <div 
                onPaste={handleSignaturePaste} 
                className="w-full border-2 border-dashed border-gray-300 rounded p-4 text-center text-gray-500 cursor-pointer hover:bg-gray-50 focus-within:border-blue-500 focus-within:bg-blue-50 relative"
                tabIndex="0"
                style={{ outline: 'none', transition: 'all 0.2s' }}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 5 }} 
                  title="Click to upload or Ctrl+V to paste"
                />
                {formData.signatureDataUrl ? (
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <img src={formData.signatureDataUrl} alt="Pasted Signature" style={{ height: '80px', objectFit: 'contain' }} />
                    <span 
                      className="text-xs text-red-500 cursor-pointer hover:underline" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, signatureDataUrl: '' }));
                        const fileInput = e.target.closest('.form-group').querySelector('input[type="file"]');
                        if (fileInput) fileInput.value = '';
                      }}
                    >
                      Remove
                    </span>
                  </div>
                ) : (
                  "Click here to upload or press Ctrl+V to paste a signature image"
                )}
              </div>
            </div>

            <div className="col-span-full border-t pt-4 my-2" style={{ gridColumn: '1 / -1' }}>
              <h3 className="text-lg font-semibold mb-3">Footer Location Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firm Address</label>
                  <textarea name="firmAddress" value={formData.firmAddress} onChange={handleChange} className="w-full border rounded p-2" rows="2" />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firm Footer Contact</label>
                  <input type="text" name="firmFooterContact" value={formData.firmFooterContact} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
              </div>
            </div>
            
          </div>
        </div>
      ) : (
        <div className="card p-2 md:p-10 rounded-lg shadow-md max-w-4xl mx-auto print-area text-black" style={{ minHeight: '1000px', backgroundColor: 'white' }}>
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
                  width: 800px !important;
                  height: auto !important;
                  min-height: 1131px;
                  padding: 20px !important;
                  transform-origin: top center;
                  transform: scale(min(1, calc((100vw - 40px) / 800)));
                  margin-bottom: calc(-1131px * (1 - min(1, calc((100vw - 40px) / 800))));
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
             <button onClick={() => window.print()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#3b82f6' }}>
                <Printer size={16} /> Print
             </button>
             <button onClick={handleDownloadPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} /> Download PDF
             </button>
          </div>

          <div className="preview-wrapper" style={{ width: '100%', overflowX: 'auto', paddingBottom: '20px' }}>
            <div ref={letterRef} className="font-sans text-sm letter-content" style={{ 
              backgroundColor: '#fff', 
              color: '#000', 
              padding: '40px 60px', 
              width: '800px', 
              minHeight: '1131px', // A4 aspect ratio 1:1.414
              border: '1px solid #ccc',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: '"Times New Roman", Times, serif',
              boxSizing: 'border-box'
            }}>
            
            {/* Document Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '15px' }}>
              {activeFirm.logo && (
                <img src={activeFirm.logo} alt={activeFirm.name} style={{ height: '70px', width: 'auto', borderRadius: '4px' }} />
              )}
              <h1 style={{ 
                fontSize: '2.2rem', 
                fontWeight: 'bold', 
                margin: 0, 
                color: activeFirm.textColor,
                fontFamily: '"Impact", "Arial Black", sans-serif'
              }}>
                {activeFirm.name}
              </h1>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '15px' }}>
              OFFER LETTER
            </h2>

            {/* Date */}
            <div style={{ textAlign: 'right', marginBottom: '15px', fontWeight: 'bold' }}>
              DT : - {formData.date ? formData.date.split('-').reverse().join('/') : ''}
            </div>

            {/* To Address */}
            <div style={{ marginBottom: '15px', lineHeight: '1.5' }}>
              <p>To</p>
              <p>{formData.buyerName}</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{formData.buyerAddress}</p>
              <p>GST NO. {formData.buyerGst}</p>
            </div>

            {/* Subject */}
            <p style={{ marginBottom: '15px', fontWeight: 'bold' }}>
              Subject: - {formData.subject}
            </p>

            <p style={{ marginBottom: '10px' }}>Dear Sir,</p>
            <p style={{ marginBottom: '15px' }}>We would like to offer the terms in connection with supply of Coal to your company.</p>

            {/* Specifications Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px 50px 1fr', gap: '6px 0', marginBottom: '15px', lineHeight: '1.5' }}>
              {visibleSpecs.commodity && <><div>Name of Commodity</div><div>:-</div><div>{formData.commodity}</div></>}
              {visibleSpecs.billingMode && <><div>Billing Mode</div><div>:-</div><div>{formData.billingMode}</div></>}
              {visibleSpecs.basicPrice && <><div>Basic Price</div><div>:-</div><div>{formData.basicPrice}</div></>}
              {visibleSpecs.transporting && <><div>Transporting</div><div>:-</div><div>{formData.transporting}</div></>}
              {visibleSpecs.quantity && <><div>Quantity</div><div>:-</div><div>{formData.quantity}</div></>}
              {visibleSpecs.moisture && <><div>Moisture</div><div>:-</div><div>{formData.moisture}</div></>}
              {visibleSpecs.fc && <><div>Fc (ODB)</div><div>:-</div><div>{formData.fc}</div></>}
              {visibleSpecs.ash && <><div>Ash (ADB)</div><div>:-</div><div>{formData.ash}</div></>}
              {visibleSpecs.vm && <><div>VM (ADB)</div><div>:-</div><div>{formData.vm}</div></>}
              {visibleSpecs.size && <><div>Size</div><div>:-</div><div>{formData.size}</div></>}
            </div>

            {/* Note */}
            {formData.noteText && (
               <p style={{ marginBottom: '15px', fontStyle: 'italic' }}>
                 Note: {formData.noteText}
               </p>
            )}

            {/* Closing */}
            <div style={{ lineHeight: '1.6', marginBottom: '20px' }}>
              <p>We hope you will find our offer competitive.</p>
              <p>We are looking forward to have a long term association with your esteemed organization.</p>
              <p>Please issue Purchase order to start supply of material.</p>
            </div>

            {/* Footer / Signature */}
            <div style={{ marginTop: 'auto', lineHeight: '1.4' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '15px' }}>Thanks & Regards</p>
              <p>For {formData.companyName}</p>
              <div style={{ height: '80px', display: 'flex', alignItems: 'center', marginTop: '5px', marginBottom: '5px' }}>
                 {formData.signatureDataUrl && (
                   <img src={formData.signatureDataUrl} alt="Signature" style={{ height: '100%', objectFit: 'contain' }} />
                 )}
              </div>
              <p>{formData.signatoryName}</p>
              <p>{formData.signatoryTitle}</p>
            </div>

            {/* Bottom Address */}
            <div style={{ borderTop: '2px solid #ccc', marginTop: '20px', paddingTop: '10px', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
              <div>{formData.firmAddress}</div>
              <div>{formData.firmFooterContact}</div>
            </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferLetter;
