import React, { useState, useRef } from 'react';
import { Printer, Edit, Download, ArrowLeft, Columns } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

import jbtLogo from '../../../assets/jbt.png';
import ganeshLogo from '../../../assets/ganesh.jpg';

const COMPANY_DETAILS = {
  'M/s Jai Bhole Traders': {
    name: 'M/s Jai Bhole Traders',
    logo: jbtLogo,
    gstin: '22BGWPA5742M1Z2',
    textColor: '#e43b3b'
  },
  'Jai Bhole Enterprises': {
    name: 'Jai Bhole Enterprises',
    logo: ganeshLogo,
    gstin: '22AIXPA7225L1ZU',
    textColor: '#e85d04'
  },
  'ASAK COAL PRIVATE LIMITED': {
    name: 'ASAK COAL PRIVATE LIMITED',
    logo: null,
    gstin: '22AAICA1234A1Z5',
    textColor: '#834333'
  },
  'Jai Bhole Logistics': {
    name: 'Jai Bhole Logistics',
    logo: ganeshLogo,
    gstin: '22AANHA7052H1ZH',
    textColor: '#e85d04'
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
    signatoryTitle: '9165422000'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfPageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfPageHeight;
      }
      
      pdf.save(`Work_Order_${formData.buyerName ? formData.buyerName.split(' ')[0] : 'Company'}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF", error);
      toast.error("Failed to download PDF");
    }
  };

  const activeFirm = COMPANY_DETAILS[formData.companyName] || COMPANY_DETAILS['Jai Bhole Logistics'];

  return (
    <div className="p-6 fade-in">
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

          </div>
        </div>
      ) : (
        <div className="card p-10 rounded-lg shadow-md max-w-4xl mx-auto print-area text-black" style={{ minHeight: '1000px', backgroundColor: 'white' }}>
          
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
              padding: '30px 40px', 
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '15px' }}>
              {activeFirm.logo && (
                <img src={activeFirm.logo} alt={activeFirm.name} style={{ height: '70px', width: 'auto', borderRadius: '4px', position: 'absolute', left: 0 }} />
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
            <div style={{ marginBottom: '10px', lineHeight: '1.5' }}>
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
            <table style={{ width: '90%', margin: '0 auto 15px auto', borderCollapse: 'collapse', lineHeight: '1.8' }}>
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
            <h3 style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '10px' }}>Term & Conditions</h3>
            <div style={{ paddingLeft: '20px', marginBottom: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
               {formData.terms}
            </div>

            {/* Footer / Signature */}
            <div style={{ marginTop: 'auto', lineHeight: '1.4' }}>
              <p style={{ fontWeight: 'bold' }}>For {formData.companyName}</p>
              <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
                 {/* Reserved space for stamp/signature */}
              </div>
              <p style={{ fontWeight: 'bold' }}>{formData.signatoryName}</p>
              <p>{formData.signatoryTitle}</p>
            </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrder;
