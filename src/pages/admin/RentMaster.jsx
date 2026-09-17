import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, Plus, Building2, X, Edit, Trash2, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import supabase from '../../SupabaseClient';
import toast from 'react-hot-toast';

const RentMaster = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [mockData, setMockData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRentMasterData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rent_master')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      // Map snake_case to camelCase
      const mappedData = data.map(item => ({
        id: item.id,
        propertyName: item.property_name || '',
        tenantName: item.tenant_name || '',
        tenantContact: item.tenant_contact || '',
        ownerName: item.owner_name || '',
        monthlyRent: item.monthly_rent || '',
        securityDeposit: item.security_deposit || '',
        agreementStart: item.agreement_start || '',
        agreementEnd: item.agreement_end || '',
        rentDueDateStart: item.rent_due_date_start || '',
        rentDueDateEnd: item.rent_due_date_end || '',
        paymentMode: item.payment_mode || 'Cash',
        bankDetails: item.bank_details || '',
        electricity: item.electricity || 'Exclude',
        maintenance: item.maintenance || 'Exclude',
        remarks: item.remarks || '',
        document: item.document || ''
      }));
      setMockData(mappedData);
    } catch (error) {
      console.error('Error fetching rent master data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentMasterData();
  }, []);

  const [formData, setFormData] = useState({
    propertyName: '',
    tenantName: '',
    tenantContact: '',
    ownerName: '',
    monthlyRent: '',
    securityDeposit: '',
    agreementStart: '',
    agreementEnd: '',
    rentDueDateStart: '',
    rentDueDateEnd: '',
    paymentMode: 'Cash',
    bankDetails: '',
    electricity: 'Exclude',
    maintenance: 'Exclude',
    remarks: '',
    document: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        property_name: formData.propertyName,
        tenant_name: formData.tenantName,
        tenant_contact: formData.tenantContact,
        owner_name: formData.ownerName,
        monthly_rent: formData.monthlyRent ? Number(formData.monthlyRent) : 0,
        security_deposit: formData.securityDeposit ? Number(formData.securityDeposit) : 0,
        agreement_start: formData.agreementStart || null,
        agreement_end: formData.agreementEnd || null,
        rent_due_date_start: formData.rentDueDateStart,
        rent_due_date_end: formData.rentDueDateEnd,
        payment_mode: formData.paymentMode,
        bank_details: formData.bankDetails,
        electricity: formData.electricity,
        maintenance: formData.maintenance,
        remarks: formData.remarks,
        document: formData.document,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('rent_master')
          .update(payload)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Record updated successfully');
      } else {
        const { error } = await supabase
          .from('rent_master')
          .insert([payload]);
        
        if (error) throw error;
        toast.success('Record added successfully');
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        propertyName: '', tenantName: '', tenantContact: '', ownerName: '', monthlyRent: '', securityDeposit: '', agreementStart: '', agreementEnd: '', rentDueDateStart: '', rentDueDateEnd: '', paymentMode: 'Cash', bankDetails: '', electricity: 'Exclude', maintenance: 'Exclude', remarks: '', document: ''
      });
      fetchRentMasterData();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this property record?')) {
      try {
        const { error } = await supabase.from('rent_master').delete().eq('id', id);
        if (error) throw error;
        toast.success('Record deleted successfully');
        fetchRentMasterData();
      } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Failed to delete record');
      }
    }
  };
  const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '-';
    // Ensure dateString is yyyy-mm-dd
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    return `${month}-${day}-${year}`;
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Add title styling
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38); // Red color
    doc.text("Rent Master Report", 14, 20);
    
    // Add subtitle / date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 27);
    
    autoTable(doc, {
      startY: 35,
      head: [['Property', 'Tenant', 'Contact', 'Rent (Rs)', 'Deposit (Rs)', 'Agreement', 'Due Range', 'Mode & Bank', 'Remarks']],
      body: mockData.map(record => [
        record.propertyName,
        record.tenantName,
        record.tenantContact,
        record.monthlyRent,
        record.securityDeposit,
        `${formatDate(record.agreementStart)} to\n${formatDate(record.agreementEnd)}`,
        `${record.rentDueDateStart} to ${record.rentDueDateEnd} of each month`,
        `${record.paymentMode}${record.bankDetails ? `\n${record.bankDetails}` : ''}`,
        record.remarks || '-'
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38], // Red header
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 8,
        textColor: 50,
        valign: 'middle'
      },
      alternateRowStyles: { 
        fillColor: [250, 250, 250] 
      },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });
    
    doc.save("rent_master.pdf");
  };

  const handleDownloadExcel = () => {
    const exportData = mockData.map(record => ({
      'Property Name': record.propertyName,
      'Tenant Name': record.tenantName,
      'Tenant Contact': record.tenantContact,
      'Owner/Landlord Name': record.ownerName,
      'Monthly Rent': record.monthlyRent,
      'Security Deposit': record.securityDeposit,
      'Agreement Start': formatDate(record.agreementStart),
      'Agreement End': formatDate(record.agreementEnd),
      'Rent Due Range': `${record.rentDueDateStart} to ${record.rentDueDateEnd} of each month`,
      'Payment Mode': record.paymentMode,
      Electricity: record.electricity,
      Maintenance: record.maintenance,
      Remarks: record.remarks
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RentMaster");
    XLSX.writeFile(workbook, "rent_master.xlsx");
  };

  const handleUpdate = (id) => {
    const record = mockData.find(item => item.id === id);
    if (record) {
      setFormData({
        propertyName: record.propertyName || '',
        tenantName: record.tenantName || '',
        tenantContact: record.tenantContact || '',
        ownerName: record.ownerName || '',
        monthlyRent: record.monthlyRent || '',
        securityDeposit: record.securityDeposit || '',
        agreementStart: record.agreementStart || '',
        agreementEnd: record.agreementEnd || '',
        rentDueDateStart: record.rentDueDateStart || '',
        rentDueDateEnd: record.rentDueDateEnd || '',
        paymentMode: record.paymentMode || 'Cash',
        bankDetails: record.bankDetails || '',
        electricity: record.electricity || 'Exclude',
        maintenance: record.maintenance || 'Exclude',
        remarks: record.remarks || '',
        document: record.document || ''
      });
      setEditingId(id);
      setIsModalOpen(true);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pt-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              Rent Master
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage master details of all properties and tenants</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 w-full sm:w-64 transition-all"
              />
            </div>
            
            <button 
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium shrink-0"
              title="Download PDF"
            >
              <FileText className="h-4 w-4 text-red-500" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button 
              onClick={handleDownloadExcel}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium shrink-0"
              title="Download Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({
                  propertyName: '', tenantName: '', tenantContact: '', ownerName: '', monthlyRent: '', securityDeposit: '', agreementStart: '', agreementEnd: '', rentDueDateStart: '', rentDueDateEnd: '', paymentMode: 'Cash', bankDetails: '', electricity: 'Exclude', maintenance: 'Exclude', remarks: '', document: ''
                });
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm shadow-red-600/20 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add Record
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">S.No.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Property Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tenant Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tenant Contact No.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Owner/Landlord Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Monthly Rent</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Security Deposit</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Agreement Start</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Agreement End</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Rent Due Range</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payment Mode</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Bank Name & Details</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Electricity</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Maintenance</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Document</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mockData.length === 0 ? (
                  <tr>
                    <td colSpan="17" className="px-4 py-8 text-center text-sm text-slate-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  mockData.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{index + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{record.propertyName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{record.tenantName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{record.tenantContact}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{record.ownerName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">₹{record.monthlyRent}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">₹{record.securityDeposit}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{formatDate(record.agreementStart)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{formatDate(record.agreementEnd)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                      {record.rentDueDateStart && record.rentDueDateEnd ? `${record.rentDueDateStart} to ${record.rentDueDateEnd} of each month` : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{record.paymentMode}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{record.bankDetails || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{record.electricity}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{record.maintenance}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{record.remarks}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer">{record.document || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleUpdate(record.id)} title="Update" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(record.id)} title="Delete" className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-red-600" />
                {editingId ? 'Edit Rent Master Record' : 'Add Rent Master Record'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                  setFormData({
                    propertyName: '', tenantName: '', tenantContact: '', ownerName: '', monthlyRent: '', securityDeposit: '', agreementStart: '', agreementEnd: '', rentDueDateStart: '', rentDueDateEnd: '', paymentMode: 'Cash', bankDetails: '', electricity: 'Exclude', maintenance: 'Exclude', remarks: '', document: ''
                  });
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Property Name</label>
                    <input type="text" name="propertyName" value={formData.propertyName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Tenant Name</label>
                    <input type="text" name="tenantName" value={formData.tenantName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Tenant Contact No.</label>
                    <input type="text" name="tenantContact" value={formData.tenantContact} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Owner/Landlord Name</label>
                    <input type="text" name="ownerName" value={formData.ownerName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Monthly Rent (₹)</label>
                    <input type="number" name="monthlyRent" value={formData.monthlyRent} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Security Deposit (₹)</label>
                    <input type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Agreement Start</label>
                    <input type="date" name="agreementStart" value={formData.agreementStart} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Agreement End</label>
                    <input type="date" name="agreementEnd" value={formData.agreementEnd} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Rent Due Date (Start)</label>
                    <select name="rentDueDateStart" value={formData.rentDueDateStart} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="">Select Start Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                        const suffix = ["th", "st", "nd", "rd"];
                        const v = day % 100;
                        const ord = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
                        return <option key={day} value={`${day}${ord}`}>{`${day}${ord} of month`}</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Rent Due Date (End)</label>
                    <select name="rentDueDateEnd" value={formData.rentDueDateEnd} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="">Select End Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                        const suffix = ["th", "st", "nd", "rd"];
                        const v = day % 100;
                        const ord = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
                        return <option key={day} value={`${day}${ord}`}>{`${day}${ord} of month`}</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Payment Mode</label>
                    <select name="paymentMode" value={formData.paymentMode} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Bank Name & Details</label>
                    <input type="text" name="bankDetails" value={formData.bankDetails} onChange={handleInputChange} placeholder="e.g. SBI - A/C 1234567890" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Electricity</label>
                    <select name="electricity" value={formData.electricity} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="Exclude">Exclude</option>
                      <option value="Include">Include</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Maintenance</label>
                    <select name="maintenance" value={formData.maintenance} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="Exclude">Exclude</option>
                      <option value="Include">Include</option>
                    </select>
                  </div>
                  <div className="space-y-1 lg:col-span-3">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Remarks</label>
                    <input type="text" name="remarks" value={formData.remarks} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1 lg:col-span-3">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Upload Document</label>
                    <input type="file" name="document" onChange={(e) => setFormData(prev => ({ ...prev, document: e.target.files[0] ? e.target.files[0].name : '' }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white" />
                  </div>
                </div>
                
                <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm shadow-red-600/20"
                  >
                    {editingId ? 'Update Record' : 'Save Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RentMaster;
