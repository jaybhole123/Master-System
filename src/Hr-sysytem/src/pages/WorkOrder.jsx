import React, { useState, useRef } from 'react';
import { Printer, Edit, Download, ArrowLeft, Columns } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

import jbtLogo from '../../../assets/jbt.png';
import ganeshLogo from '../../../assets/ganesh.jpg';
import signatureImg from '../../../assets/signature.png';
import jblLogo from '../../../assets/jbl.png';

const COMPANY_DETAILS = {
  'M/s Jai Bhole Traders': {
    name: 'M/s Jai Bhole Traders',
    logo: jbtLogo,
    gstin: '22BGWPA5742M1Z2',
    textColor: '#e43b3b',
    address: 'N.K. Agrawal & Sons Tower, 2nd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 78736 50000, 91091 61146, E-mail : biswanath23@gmail.com, jaibholetraderacc@gmail.com'
  },
  'Jai Bhole Enterprises': {
    name: 'Jai Bhole Enterprises',
    logo: ganeshLogo,
    gstin: '22AIXPA7225L1ZU',
    textColor: '#e85d04',
    address: 'N.K. Agrawal & Sons Tower, 3rd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 91654 22000, E-mail : amarnath.agrawal22@gmail.com, GSTIN : 22AIXPA7225L1ZU'
  },
  'ASAK COAL PRIVATE LIMITED': {
    name: 'ASAK COAL PRIVATE LIMITED',
    logo: null,
    gstin: '22AAICA1234A1Z5',
    textColor: '#834333',
    address: 'N.K. Agrawal & Sons Tower, 1st Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 91654 22000, E-mail : asakcoal@gmail.com, CIN No. : U51909CT2022PTC013419, GSTIN : 22AAICA1234A1Z5'
  },
  'Jai Bhole Logistics': {
    name: 'Jai Bhole Logistics',
    logo: jblLogo,
    gstin: '22AANHA7052H1ZH',
    textColor: '#000000',
    address: 'N.K. Agrawal & Sons Tower, 3rd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo.: 91654 22000, E-mail : amarnath.agrawal22@gmail.com'
  }
};

const WorkOrder = () => {
  const letterRef = useRef(null);
  const [isPreview, setIsPreview] = useState(false);
  
  const specKeys = [
    { key: 'commodity', label: 'Name of Commodity' },
    { key: 'mines', label: 'Mines' },
    { key: 'price', label: 'Price' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'shortageTolerance', label: 'Shortage Tolerance' },
    { key: 'doDueDate', label: 'D.O. Due Date' },
    { key: 'doCopy', label: 'D.O. Copy' },
    { key: 'destinationAdd', label: 'Destination Add.' }
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
  
  const [formData, setFormData] = useState({
    companyName: 'Jai Bhole Logistics',
    date: new Date().toISOString().split('T')[0],
    buyerName: 'Maa Durpta Logistics (Aashish Mishra Lifter)',
    buyerAddress: 'Main Road ,Near New Sabji Market\nAmadand (M.P.) , Pasan Dafai. Pasan.',
    buyerDistState: 'Anuppur , Madhya Pradesh - 484444',
    subject: 'Work Order For Transporting of Coal',
    commodity: 'Coal',
    mines: 'SECL Khairaha 3330088465',
    price: 'Raipur -1235.00 Inc All\nBilaspur - 1060.00 Inc All',
    quantity: '1000Mt',
    shortageTolerance: '0.5%',
    doDueDate: '26.10.2026',
    doCopy: 'Vraj Iron And Steel Limited',
    destinationAdd: 'Raipur & Bilaspur (C.G.)',
    terms: '1. TDS will be deducted at source as per IT rules.\n2. Shortage allowed 50.00 Kg Per Truck.( If shortage received more than 50 kg.tolerance limit We will deduct the shortage for the entire quantity as per market price.)\n3. Payment will be released within 20 to 25 days from the date of receipt of invoices.\n4. Invoice will be raised on completion of each DO.',
    signatoryName: 'AMARNATH AGRAWAL',
    signatoryTitle: '9165422000',
    address: COMPANY_DETAILS['Jai Bhole Logistics'].address,
    footerContact: COMPANY_DETAILS['Jai Bhole Logistics'].footerContact,
    signatureDataUrl: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'companyName') {
      const selectedCompany = COMPANY_DETAILS[value];
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        address: selectedCompany?.address || '',
        footerContact: selectedCompany?.footerContact || ''
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
      
      pdf.save(`Work_Order_${formData.buyerName ? formData.buyerName.split(' ')[0] : 'Company'}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF", error);
      toast.error("Failed to download PDF");
    }
  };

  const activeFirm = COMPANY_DETAILS[formData.companyName] || COMPANY_DETAILS['Jai Bhole Logistics'];

  return (
    <div className="p-2 md:p-6 fade-in">
      <div className="mb-6 no-print page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title text-2xl font-bold text-gray-800">Work Order Generator</h1>
          <p className="page-subtitle">Fill in details and generate an official Work Order</p>
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
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Fill Work Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Header Details */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Company Name</label>
              <select name="companyName" value={formData.companyName} onChange={handleChange} className="w-full border rounded p-2">
                {Object.keys(COMPANY_DETAILS).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
              <input type="text" name="signatoryName" value={formData.signatoryName} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Title (Phone No)</label>
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
              <h3 className="text-lg font-semibold mb-3">To Address</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Name</label>
                  <input type="text" name="buyerName" value={formData.buyerName} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">District & State</label>
                  <input type="text" name="buyerDistState" value={formData.buyerDistState} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Address</label>
                  <textarea name="buyerAddress" value={formData.buyerAddress} onChange={handleChange} className="w-full border rounded p-2" rows="2" />
                </div>
              </div>
            </div>

            <div className="col-span-full border-t pt-4 my-2" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="text-lg font-semibold m-0">Order Details</h3>
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
              <div className="form-group mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {visibleSpecs.commodity && (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
                  <input type="text" name="commodity" value={formData.commodity} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                )}
                {visibleSpecs.mines && (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mines</label>
                  <input type="text" name="mines" value={formData.mines} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                )}
                {visibleSpecs.quantity && (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="text" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                )}
                {visibleSpecs.shortageTolerance && (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shortage Tolerance</label>
                  <input type="text" name="shortageTolerance" value={formData.shortageTolerance} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                )}
                {visibleSpecs.doDueDate && (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">D.O. Due Date</label>
                  <input type="text" name="doDueDate" value={formData.doDueDate} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                )}
                {visibleSpecs.doCopy && (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">D.O. Copy</label>
                  <input type="text" name="doCopy" value={formData.doCopy} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                )}
                {visibleSpecs.price && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <textarea name="price" value={formData.price} onChange={handleChange} className="w-full border rounded p-2" rows="2" />
                </div>
                )}
                {visibleSpecs.destinationAdd && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Add.</label>
                  <input type="text" name="destinationAdd" value={formData.destinationAdd} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                )}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea name="terms" value={formData.terms} onChange={handleChange} className="w-full border rounded p-2" rows="5" />
                </div>
              </div>
            </div>

            <div className="col-span-full border-t pt-4 my-2" style={{ gridColumn: '1 / -1' }}>
              <h3 className="text-lg font-semibold mb-3">Footer Location Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} className="w-full border rounded p-2" rows="2" />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Footer Contact</label>
                  <input type="text" name="footerContact" value={formData.footerContact} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="card p-2 md:p-10 rounded-lg shadow-md max-w-4xl mx-auto print-area text-black" style={{ minHeight: '1000px', backgroundColor: 'white' }}>
          
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
              color: '#000', 
              padding: '20px 40px', 
              width: '800px', 
              minHeight: '1131px', // A4 aspect ratio 1:1.414
              border: '1px solid #ccc',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: '"Times New Roman", Times, serif',
              boxSizing: 'border-box'
            }}>
            
            {/* Top Right GSTIN */}
            <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px' }}>
              GSTIN : {activeFirm.gstin}
            </div>

            {/* Document Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '10px' }}>
              {activeFirm.logo && (
                <img src={activeFirm.logo} alt={activeFirm.name} style={{ height: '60px', width: 'auto', borderRadius: '4px', position: 'absolute', left: 0 }} />
              )}
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                margin: 0, 
                color: activeFirm.textColor,
                fontFamily: '"Impact", "Arial Black", sans-serif',
                textAlign: 'center',
                flex: 1
              }}>
                {activeFirm.name}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: '10px' }}>
               <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', textDecoration: 'underline', margin: '0 auto', textAlign: 'center' }}>
                  WORK ORDER
               </h2>
               <div style={{ fontWeight: 'bold', color: activeFirm.textColor, position: 'absolute', right: 0 }}>
                  DT: - {formData.date ? formData.date.split('-').reverse().join('.') : ''}
               </div>
            </div>

            {/* To Address */}
            <div style={{ marginBottom: '8px', lineHeight: '1.3' }}>
              <p>To</p>
              <p>{formData.buyerName}</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{formData.buyerAddress}</p>
              <p>Dist :- {formData.buyerDistState}</p>
            </div>

            {/* Subject */}
            <p style={{ marginBottom: '10px', fontWeight: 'bold', textDecoration: 'underline' }}>
              Subject: - {formData.subject}
            </p>

            <p style={{ marginBottom: '10px' }}>Dear Sir,</p>
            <p style={{ marginBottom: '10px' }}>
              With Reference to telephonic discussion, we are pleased to give you a work order for Transporting Work of coal.
            </p>

            {/* Specifications Grid */}
            <table style={{ width: '90%', margin: '0 auto 10px auto', borderCollapse: 'collapse', lineHeight: '1.4' }}>
              <tbody>
                {visibleSpecs.commodity && (
                <tr>
                  <td style={{ width: '40%' }}>Name of Commodity</td>
                  <td style={{ width: '10%' }}>:-</td>
                  <td>{formData.commodity}</td>
                </tr>
                )}
                {visibleSpecs.mines && (
                <tr>
                  <td style={{ width: '40%' }}>Mines</td>
                  <td style={{ width: '10%' }}>:-</td>
                  <td>{formData.mines}</td>
                </tr>
                )}
                {visibleSpecs.price && (
                <tr>
                  <td style={{ width: '40%', verticalAlign: 'top' }}>Price</td>
                  <td style={{ width: '10%', verticalAlign: 'top' }}>:-</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{formData.price}</td>
                </tr>
                )}
                {visibleSpecs.quantity && (
                <tr>
                  <td style={{ width: '40%' }}>Quantity</td>
                  <td style={{ width: '10%' }}>:-</td>
                  <td>{formData.quantity}</td>
                </tr>
                )}
                {visibleSpecs.shortageTolerance && (
                <tr>
                  <td style={{ width: '40%' }}>Shortage Tolerance</td>
                  <td style={{ width: '10%' }}>:-</td>
                  <td>{formData.shortageTolerance}</td>
                </tr>
                )}
                {visibleSpecs.doDueDate && (
                <tr>
                  <td style={{ width: '40%' }}>D.O.Due Date</td>
                  <td style={{ width: '10%' }}>:-</td>
                  <td>{formData.doDueDate}</td>
                </tr>
                )}
                {visibleSpecs.doCopy && (
                <tr>
                  <td style={{ width: '40%' }}>D.O.Copy</td>
                  <td style={{ width: '10%' }}>:-</td>
                  <td>{formData.doCopy}</td>
                </tr>
                )}
                {visibleSpecs.destinationAdd && (
                <tr>
                  <td style={{ width: '40%' }}>Destination Add.</td>
                  <td style={{ width: '10%' }}>:-</td>
                  <td>{formData.destinationAdd}</td>
                </tr>
                )}
              </tbody>
            </table>

            {/* Terms and Conditions */}
            <h3 style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '5px' }}>Term & Conditions</h3>
            <div style={{ paddingLeft: '20px', marginBottom: '10px', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
               {formData.terms}
            </div>

            {/* Footer / Signature */}
            <div style={{ marginTop: 'auto', lineHeight: '1.4' }}>
              <p style={{ fontWeight: 'bold' }}>For {formData.companyName}</p>
              <div style={{ height: '80px', display: 'flex', alignItems: 'center', marginTop: '5px', marginBottom: '5px' }}>
                 {formData.signatureDataUrl && (
                   <img src={formData.signatureDataUrl} alt="Signature" style={{ height: '100%', objectFit: 'contain' }} />
                 )}
              </div>
              <p style={{ fontWeight: 'bold' }}>{formData.signatoryName}</p>
              <p>{formData.signatoryTitle}</p>

              {/* Bottom Address */}
              <div style={{ borderTop: '2px solid #ccc', marginTop: '10px', paddingTop: '8px', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
                <div>{formData.address}</div>
                <div>{formData.footerContact}</div>
              </div>
            </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrder;
