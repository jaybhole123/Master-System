import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, Plus, Building2, X, Edit, Trash2, FileText, FileSpreadsheet, Clock, CheckCircle2, Check, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import supabase from '../../SupabaseClient';
import toast from 'react-hot-toast';

const RentMaster = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedRecordForHistory, setSelectedRecordForHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [mockData, setMockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documentFiles, setDocumentFiles] = useState([]);
  const documentFilesRef = React.useRef([]);
  const [documentFileNames, setDocumentFileNames] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchRentMasterData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rent_master')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      // Map snake_case to camelCase
      const mappedData = data.map(item => {
        let parsedDoc = [];
        if (item.document) {
          if (Array.isArray(item.document)) {
            parsedDoc = item.document;
          } else if (typeof item.document === 'string' && item.document.trim()) {
            if (item.document.includes('|||')) {
              // New format: ||| separated URLs
              parsedDoc = item.document.split('|||').map(s => s.trim()).filter(Boolean);
            } else if (item.document.trim().startsWith('[')) {
              // Old JSON format
              try {
                parsedDoc = JSON.parse(item.document);
              } catch (e) {
                parsedDoc = [item.document];
              }
            } else {
              // Single URL (no splitting by comma since URLs can contain commas in query params)
              parsedDoc = [item.document];
            }
          }
        }
        return {
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
          document: parsedDoc
        };
      });
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

  const getRecordStatus = (record) => {
    if (record.status === 'Done' || record.status === 'Received') {
      if (record.received_date && record.due_date_start && record.due_date_end && 
          record.received_date >= record.due_date_start && record.received_date <= record.due_date_end) {
        return 'On Time';
      }
      return 'Received';
    }
    const today = new Date().toISOString().split('T')[0];
    if (record.due_date_end && today > record.due_date_end) return 'Delay';
    return 'Pending';
  };

  const getDelayDays = (record) => {
    if (!record.due_date_end) return 0;
    const endDate = new Date(record.due_date_end);
    const checkDate = (record.status === 'Done' || record.status === 'Received') && record.received_date 
      ? new Date(record.received_date) 
      : new Date();
    const diff = Math.floor((checkDate - endDate) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const historyStats = React.useMemo(() => {
    let pending = 0, onTime = 0, done = 0, delay = 0;
    historyData.forEach(r => {
      const s = getRecordStatus(r);
      if (s === 'Pending') pending++;
      else if (s === 'On Time') onTime++;
      else if (s === 'Received') done++;
      else if (s === 'Delay') delay++;
    });
    return { total: historyData.length, pending, onTime, done, delay };
  }, [historyData]);

  const openHistoryModal = async (record) => {
    setSelectedRecordForHistory(record);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('rent_monthly_tracker')
        .select('*')
        .eq('rent_master_id', record.id)
        .order('id', { ascending: false });

      if (error) throw error;
      
      let trackerData = data;
      if (!trackerData || trackerData.length === 0) {
        const { data: nameData, error: nameError } = await supabase
          .from('rent_monthly_tracker')
          .select('*')
          .eq('property', record.propertyName)
          .order('id', { ascending: false });
        
        if (!nameError && nameData) {
           trackerData = nameData;
        }
      }

      setHistoryData(trackerData || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDownloadHistoryPDF = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header Bar
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Add title styling
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text("Rent History Report", 14, 16);
    
    doc.setFontSize(10);
    doc.setTextColor(255, 230, 230);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - 14, 16, { align: 'right' });
    
    // Property info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');
    doc.text(`Property: ${selectedRecordForHistory?.propertyName || ''}`, 14, 38);
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.setFont(undefined, 'normal');
    doc.text(`Tenant: ${selectedRecordForHistory?.tenantName || ''}`, 14, 45);
    
    // Draw stats cards
    const cardY = 52;
    const cardHeight = 18;
    const cardWidth = 52;
    const gap = 4;
    const startX = 14;

    const cards = [
      { title: "Total Months", value: historyStats.total, color: [71, 85, 105], bg: [248, 250, 252] },
      { title: "Pending", value: historyStats.pending, color: [234, 88, 12], bg: [255, 237, 213] },
      { title: "On Time", value: historyStats.onTime, color: [22, 163, 74], bg: [220, 252, 231] },
      { title: "Received", value: historyStats.done, color: [37, 99, 235], bg: [219, 234, 254] },
      { title: "Delay", value: historyStats.delay, color: [220, 38, 38], bg: [254, 226, 226] }
    ];

    cards.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      // Card Background
      doc.setFillColor(...card.bg);
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD');
      
      // Title
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text(card.title, x + 5, cardY + 7);
      
      // Value
      doc.setFontSize(14);
      doc.setTextColor(...card.color);
      doc.setFont(undefined, 'bold');
      doc.text(card.value.toString(), x + 5, cardY + 15);
    });
    
    autoTable(doc, {
      startY: 78,
      head: [['Month', 'Property', 'Tenant', 'Rent (Rs)', 'Due Range', 'Received Date', 'Delay', 'Payment Mode', 'Bank Name & Details']],
      body: historyData.map(record => [
        record.month,
        record.property,
        record.tenant,
        record.rent,
        `${formatDate(record.due_date_start)} to ${formatDate(record.due_date_end)}`,
        formatDate(record.received_date),
        getDelayDays(record) > 0 ? `${getDelayDays(record)} days` : '-',
        record.payment_mode,
        record.bank_details || '-'
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 9,
        textColor: 50,
        valign: 'middle'
      },
      alternateRowStyles: { 
        fillColor: [250, 250, 250] 
      },
      columnStyles: {
        3: { halign: 'right' },
        6: { halign: 'center', textColor: [220, 38, 38] }
      }
    });
    
    doc.save(`Rent_History_${selectedRecordForHistory?.propertyName || 'Report'}.pdf`);
  };

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
    document: []
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      
      // DEBUG: Check both state and ref for files
      console.log('=== SUBMIT DEBUG ===');
      console.log('documentFiles (state):', documentFiles);
      console.log('documentFiles (state) length:', documentFiles ? documentFiles.length : 'null/undefined');
      console.log('documentFilesRef.current:', documentFilesRef.current);
      console.log('documentFilesRef.current length:', documentFilesRef.current ? documentFilesRef.current.length : 'null/undefined');
      
      // Use ref as fallback if state is empty
      const filesToUpload = (documentFiles && documentFiles.length > 0) ? documentFiles : documentFilesRef.current;
      console.log('filesToUpload:', filesToUpload);
      console.log('filesToUpload length:', filesToUpload ? filesToUpload.length : 'null/undefined');
      
      // Start with existing document URLs
      let documentUrls = [];
      if (Array.isArray(formData.document)) {
        documentUrls = [...formData.document];
      } else if (typeof formData.document === 'string' && formData.document.trim()) {
        try {
          const parsed = JSON.parse(formData.document);
          documentUrls = Array.isArray(parsed) ? parsed : [formData.document];
        } catch {
          documentUrls = formData.document.split('|||').filter(Boolean);
        }
      }

      // Upload new files one by one (sequential to avoid filename collision)
      if (filesToUpload && filesToUpload.length > 0) {
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          const fileExt = file.name.split('.').pop();
          // Unique filename: timestamp + index + random string
          const uniqueId = `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 8)}`;
          const fileName = `rent_docs/${uniqueId}.${fileExt}`;
          
          console.log(`Uploading file ${i + 1}/${documentFiles.length}: ${file.name} as ${fileName}`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('task-instructions')
            .upload(fileName, file);
            
          if (uploadError) {
            console.error(`Upload error for ${file.name}:`, uploadError);
            alert(`Upload failed for: ${file.name}\nError: ${uploadError.message}`);
            throw uploadError;
          }
          
          console.log(`Upload success for ${file.name}:`, uploadData);
          
          const { data: publicUrlData } = supabase.storage
            .from('task-instructions')
            .getPublicUrl(fileName);
          
          console.log(`Public URL for ${file.name}:`, publicUrlData.publicUrl);
          documentUrls.push(publicUrlData.publicUrl);
        }
      }

      // Store as ||| separated string (avoids comma issues in URLs)
      const documentString = documentUrls.length > 0 ? documentUrls.join('|||') : '';
      console.log('Final document string to save:', documentString);

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
        document: documentString,
        updated_at: new Date().toISOString()
      };

      console.log('Payload being sent to Supabase:', payload);

      if (editingId) {
        const { data, error } = await supabase
          .from('rent_master')
          .update(payload)
          .eq('id', editingId)
          .select();
        
        if (error) {
          console.error("Supabase Update Error:", error);
          alert('DB Update Error:\n' + JSON.stringify(error, null, 2));
          throw error;
        }
        console.log('Update success:', data);
        toast.success('Record updated successfully');
      } else {
        const { data, error } = await supabase
          .from('rent_master')
          .insert([payload])
          .select();
        
        if (error) {
          console.error("Supabase Insert Error:", error);
          alert('DB Insert Error:\n' + JSON.stringify(error, null, 2));
          throw error;
        }
        console.log('Insert success:', data);
        toast.success('Record added successfully');
      }

      setIsModalOpen(false);
      setEditingId(null);
      setDocumentFiles([]);
      documentFilesRef.current = [];
      setFormData({
        propertyName: '', tenantName: '', tenantContact: '', ownerName: '', monthlyRent: '', securityDeposit: '', agreementStart: '', agreementEnd: '', rentDueDateStart: '', rentDueDateEnd: '', paymentMode: 'Cash', bankDetails: '', electricity: 'Exclude', maintenance: 'Exclude', remarks: '', document: []
      });
      fetchRentMasterData();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error(error.message || 'Failed to save record');
    } finally {
      setIsUploading(false);
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
  const filteredData = mockData.filter(record => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (record.propertyName || '').toLowerCase().includes(q) ||
      (record.tenantName || '').toLowerCase().includes(q) ||
      (record.tenantContact || '').toLowerCase().includes(q) ||
      (record.ownerName || '').toLowerCase().includes(q)
    );
  });

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
      body: filteredData.map(record => [
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
    const exportData = filteredData.map(record => ({
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
        document: record.document || []
      });
      setEditingId(id);
      setDocumentFiles([]);
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
                setDocumentFiles([]);
                setFormData({
                  propertyName: '', tenantName: '', tenantContact: '', ownerName: '', monthlyRent: '', securityDeposit: '', agreementStart: '', agreementEnd: '', rentDueDateStart: '', rentDueDateEnd: '', paymentMode: 'Cash', bankDetails: '', electricity: 'Exclude', maintenance: 'Exclude', remarks: '', document: []
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
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="17" className="px-4 py-8 text-center text-sm text-slate-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={(e) => {
                    if (e.target.closest('button') || e.target.closest('.action-cell')) return;
                    openHistoryModal(record);
                  }}>
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm action-cell">
                      {record.document && record.document.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {record.document.map((docUrl, idx) => (
                            <a key={idx} href={docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-[11px] w-max">
                              <FileText className="h-3.5 w-3.5" />
                              View Doc {record.document.length > 1 ? idx + 1 : ''}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium action-cell">
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
                  setDocumentFiles([]);
                  setFormData({
                    propertyName: '', tenantName: '', tenantContact: '', ownerName: '', monthlyRent: '', securityDeposit: '', agreementStart: '', agreementEnd: '', rentDueDateStart: '', rentDueDateEnd: '', paymentMode: 'Cash', bankDetails: '', electricity: 'Exclude', maintenance: 'Exclude', remarks: '', document: []
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
                    <label className="text-xs font-semibold text-slate-600 uppercase">Upload Documents</label>
                    
                    {formData.document && formData.document.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.document.map((docUrl, idx) => (
                           <div key={idx} className="text-[11px] text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                             <CheckCircle2 className="h-3 w-3" />
                             Doc {idx + 1}
                             <button type="button" onClick={() => {
                               const newDocs = [...formData.document];
                               newDocs.splice(idx, 1);
                               setFormData(prev => ({ ...prev, document: newDocs }));
                             }} className="text-emerald-700 hover:text-red-500 ml-1">
                               <X className="h-3 w-3" />
                             </button>
                           </div>
                        ))}
                      </div>
                    )}
                    
                    {documentFiles && documentFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {documentFiles.map((file, idx) => (
                           <div key={idx} className="text-[11px] text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                             <CheckCircle2 className="h-3 w-3" />
                             <span className="truncate max-w-[120px]">{file.name}</span>
                             <button type="button" onClick={() => {
                               const newFiles = [...documentFiles];
                               newFiles.splice(idx, 1);
                               setDocumentFiles(newFiles);
                             }} className="text-blue-700 hover:text-red-500 ml-1">
                               <X className="h-3 w-3" />
                             </button>
                           </div>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <input 
                        type="file" 
                        multiple 
                        id="document-upload"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" 
                        name="document" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const newFiles = Array.from(e.target.files);
                            console.log('FILES SELECTED:', newFiles.map(f => f.name));
                            setDocumentFiles(prev => {
                              const updated = [...prev, ...newFiles];
                              console.log('documentFiles state updated to:', updated.map(f => f.name));
                              return updated;
                            });
                            documentFilesRef.current = [...documentFilesRef.current, ...newFiles];
                            console.log('documentFilesRef updated to:', documentFilesRef.current.map(f => f.name));
                          }
                          e.target.value = null;
                        }} 
                        className="hidden" 
                      />
                      <label 
                        htmlFor="document-upload"
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-red-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Click to browse and add files</span>
                      </label>
                    </div>
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
                    disabled={isUploading}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm shadow-red-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploading ? <span className="animate-pulse">Uploading...</span> : (editingId ? 'Update Record' : 'Save Record')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-red-600" />
                  Rent History: {selectedRecordForHistory?.propertyName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Tenant: {selectedRecordForHistory?.tenantName}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDownloadHistoryPDF}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                  title="Download PDF"
                >
                  <FileText className="h-4 w-4 text-red-500" />
                  <span>PDF</span>
                </button>
                <button 
                  onClick={() => {
                    setHistoryModalOpen(false);
                    setSelectedRecordForHistory(null);
                    setHistoryData([]);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  No rent history found for this property/tenant.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 shrink-0">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-medium">Total Months</span>
                      </div>
                      <span className="text-xl font-bold text-slate-800">{historyStats.total}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex items-center gap-2 text-orange-500 mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium">Pending</span>
                      </div>
                      <span className="text-xl font-bold text-slate-800">{historyStats.pending}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex items-center gap-2 text-green-500 mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">On Time</span>
                      </div>
                      <span className="text-xl font-bold text-slate-800">{historyStats.onTime}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex items-center gap-2 text-blue-500 mb-1">
                        <Check className="h-4 w-4" />
                        <span className="text-xs font-medium">Received</span>
                      </div>
                      <span className="text-xl font-bold text-slate-800">{historyStats.done}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex items-center gap-2 text-red-500 mb-1">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Delay</span>
                      </div>
                      <span className="text-xl font-bold text-slate-800">{historyStats.delay}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 flex-1">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rent (₹)</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Range</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Received Date</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Delay Days</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Mode</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Name & Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {historyData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-700">{item.month}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{item.property}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{item.tenant}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">₹{item.rent}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {item.due_date_start && item.due_date_end ? `${formatDate(item.due_date_start)} to ${formatDate(item.due_date_end)}` : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{formatDate(item.received_date)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {getDelayDays(item) > 0 
                              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{getDelayDays(item)} days</span>
                              : <span className="text-slate-400">-</span>
                            }
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{item.payment_mode}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{item.bank_details || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RentMaster;
