import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  Search, Plus, Calendar as CalendarIcon, X, Check, Edit, Trash2, Users, 
  Clock, CheckCircle2, AlertCircle, AlertTriangle, FileText, FileSpreadsheet, 
  Phone, MessageSquare, LayoutDashboard, Building2, TrendingUp, ShieldCheck, 
  DollarSign, Wallet, Banknote, RefreshCw, ArrowRight, Filter, ExternalLink, 
  Sparkles, Shield, ChevronRight, GitFork
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import supabase from '../../SupabaseClient';
import toast from 'react-hot-toast';
import { sendRentPaymentConfirmation } from '../../services/whatsappService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthlyTracker = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState(() => new Date().toLocaleString('default', { month: 'long' }));
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingId, setReceivingId] = useState(null);
  const [receivingRecord, setReceivingRecord] = useState(null);
  const [tenantContactInput, setTenantContactInput] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mockData, setMockData] = useState([]);
  const [rentMasterData, setRentMasterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrackerData = async () => {
    try {
      setRefreshing(true);
      const [trackerRes, masterRes] = await Promise.all([
        supabase.from('rent_monthly_tracker').select('*').order('id', { ascending: false }),
        supabase.from('rent_master').select('*')
      ]);

      if (trackerRes.error) throw trackerRes.error;
      if (masterRes.error) throw masterRes.error;

      const masterList = (masterRes.data || []).map(item => ({
        id: item.id,
        propertyName: item.property_name,
        tenantName: item.tenant_name,
        tenantContact: item.tenant_contact || '',
        monthlyRent: item.monthly_rent,
        rentDueDateStart: item.rent_due_date_start,
        rentDueDateEnd: item.rent_due_date_end,
        paymentMode: item.payment_mode,
        bankDetails: item.bank_details
      }));
      setRentMasterData(masterList);

      setMockData((trackerRes.data || []).map(item => {
        const master = masterList.find(m => 
          (item.rent_master_id && m.id === item.rent_master_id) || 
          (item.property && m.propertyName?.toLowerCase() === item.property?.toLowerCase()) ||
          (item.tenant && m.tenantName?.toLowerCase() === item.tenant?.toLowerCase())
        );

        return {
          id: item.id,
          rentMasterId: item.rent_master_id || master?.id || null,
          tenantContact: master?.tenantContact || item.tenant_contact || '',
          month: item.month,
          property: item.property || '',
          tenant: item.tenant || '',
          rent: item.rent || 0,
          dueDateStart: item.due_date_start || '',
          dueDateEnd: item.due_date_end || '',
          receivedDate: item.received_date || '',
          paymentMode: item.payment_mode || 'Cash',
          bankDetails: item.bank_details || '',
          status: item.status || 'Pending',
          remarks: item.remarks || ''
        };
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load tracker data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, []);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  const [formData, setFormData] = useState({
    month: currentMonth,
    property: '',
    tenant: '',
    rent: '',
    dueDateStart: '',
    dueDateEnd: '',
    receivedDate: '',
    paymentMode: 'Cash',
    bankDetails: '',
    remarks: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    const calculateDate = (dayString, targetMonth) => {
      if (!dayString) return '';
      const day = parseInt(dayString);
      if (isNaN(day)) return '';
      const monthIndex = MONTH_NAMES.indexOf(targetMonth);
      if (monthIndex === -1) return '';
      const year = new Date().getFullYear();
      const d = new Date(year, monthIndex, day);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    if (name === 'property') {
      const selectedProperty = rentMasterData.find(p => p.propertyName === value);
      if (selectedProperty) {
        setFormData(prev => ({
          ...prev,
          property: value,
          tenant: selectedProperty.tenantName || '',
          rent: selectedProperty.monthlyRent || '',
          dueDateStart: calculateDate(selectedProperty.rentDueDateStart, prev.month),
          dueDateEnd: calculateDate(selectedProperty.rentDueDateEnd, prev.month),
          paymentMode: selectedProperty.paymentMode || 'Cash',
          bankDetails: selectedProperty.bankDetails || ''
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === 'month') {
      const selectedProperty = rentMasterData.find(p => p.propertyName === formData.property);
      if (selectedProperty) {
        setFormData(prev => ({
          ...prev,
          month: value,
          dueDateStart: calculateDate(selectedProperty.rentDueDateStart, value),
          dueDateEnd: calculateDate(selectedProperty.rentDueDateEnd, value)
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedProperty = rentMasterData.find(p => p.propertyName === formData.property);
      const payload = {
        rent_master_id: selectedProperty ? selectedProperty.id : null,
        month: formData.month,
        property: formData.property,
        tenant: formData.tenant,
        rent: formData.rent ? Number(formData.rent) : 0,
        due_date_start: formData.dueDateStart || null,
        due_date_end: formData.dueDateEnd || null,
        received_date: formData.receivedDate || null,
        payment_mode: formData.paymentMode,
        bank_details: formData.bankDetails,
        remarks: formData.remarks,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('rent_monthly_tracker')
          .update(payload)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Tracker record updated');
      } else {
        payload.status = 'Pending';
        const { error } = await supabase
          .from('rent_monthly_tracker')
          .insert([payload]);
        
        if (error) throw error;
        toast.success('Tracker record added');
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        month: currentMonth, property: '', tenant: '', rent: '', dueDateStart: '', dueDateEnd: '', receivedDate: '', paymentMode: 'Cash', bankDetails: '', remarks: ''
      });
      fetchTrackerData();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
    }
  };

  const openReceiveModal = (target) => {
    const record = typeof target === 'object' ? target : mockData.find(item => item.id === target);
    if (!record) return;

    setReceivingId(record.id);
    setReceivingRecord(record);
    setReceiveDate(new Date().toISOString().split('T')[0]);

    const master = rentMasterData.find(m => 
      (record.rentMasterId && m.id === record.rentMasterId) || 
      (record.property && m.propertyName?.toLowerCase() === record.property?.toLowerCase()) ||
      (record.tenant && m.tenantName?.toLowerCase() === record.tenant?.toLowerCase())
    );
    const contact = record.tenantContact || master?.tenantContact || '';
    setTenantContactInput(contact);
    setSendWhatsApp(true);
    setIsReceiveModalOpen(true);
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    if (!receivingId) return;
    try {
      setIsSubmittingReceive(true);
      const { error } = await supabase
        .from('rent_monthly_tracker')
        .update({ status: 'Received', received_date: receiveDate, updated_at: new Date().toISOString() })
        .eq('id', receivingId);
      
      if (error) throw error;

      // Update tenant_contact in rent_master if contact changed/entered
      const targetPhone = tenantContactInput?.trim();
      const matchedMaster = rentMasterData.find(m => 
        (receivingRecord?.rentMasterId && m.id === receivingRecord.rentMasterId) ||
        (receivingRecord?.property && m.propertyName?.toLowerCase() === receivingRecord.property?.toLowerCase())
      );
      if (targetPhone && matchedMaster && matchedMaster.tenantContact !== targetPhone) {
        await supabase
          .from('rent_master')
          .update({ tenant_contact: targetPhone })
          .eq('id', matchedMaster.id);
      }

      // Send WhatsApp confirmation
      if (sendWhatsApp) {
        if (!targetPhone) {
          toast.success('Marked as received (No WhatsApp contact number provided)');
        } else {
          const toastId = toast.loading(`Sending WhatsApp receipt to ${targetPhone}...`);
          const sent = await sendRentPaymentConfirmation({
            phone: targetPhone,
            name: receivingRecord?.tenant || 'Tenant',
            propertyAndMonth: `${receivingRecord?.property || 'Property'} - ${receivingRecord?.month || ''}`,
            amount: receivingRecord?.rent ? `₹${Number(receivingRecord.rent).toLocaleString('en-IN')}` : 'Rent'
          });
          toast.dismiss(toastId);

          if (sent) {
            toast.success(`Marked received & WhatsApp receipt sent to ${targetPhone}!`);
          } else {
            toast.error(`Marked received, but WhatsApp delivery failed to ${targetPhone}`);
          }
        }
      } else {
        toast.success('Marked as received');
      }

      setIsReceiveModalOpen(false);
      setReceivingId(null);
      setReceivingRecord(null);
      fetchTrackerData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  const handleSendWhatsAppDirect = async (record) => {
    const contact = record.tenantContact || rentMasterData.find(m => 
      (record.rentMasterId && m.id === record.rentMasterId) ||
      (record.property && m.propertyName?.toLowerCase() === record.property?.toLowerCase())
    )?.tenantContact;

    if (!contact) {
      toast.error(`No contact number found for ${record.tenant}. Please update in Rent Master or edit record.`);
      return;
    }

    const toastId = toast.loading(`Sending WhatsApp confirmation to ${contact}...`);
    try {
      const sent = await sendRentPaymentConfirmation({
        phone: contact,
        name: record.tenant || 'Tenant',
        propertyAndMonth: `${record.property} - ${record.month}`,
        amount: record.rent ? `₹${Number(record.rent).toLocaleString('en-IN')}` : 'Rent'
      });
      toast.dismiss(toastId);
      if (sent) {
        toast.success(`WhatsApp receipt sent to ${record.tenant} (${contact})`);
      } else {
        toast.error(`Failed to send WhatsApp message to ${contact}`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error('WhatsApp direct error:', err);
      toast.error('Failed to send WhatsApp message');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        const { error } = await supabase.from('rent_monthly_tracker').delete().eq('id', id);
        if (error) throw error;
        toast.success('Record deleted');
        fetchTrackerData();
      } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Failed to delete record');
      }
    }
  };

  const handleUpdate = (id) => {
    const record = mockData.find(item => item.id === id);
    if (record) {
      setFormData({
        month: record.month || currentMonth,
        property: record.property || '',
        tenant: record.tenant || '',
        rent: record.rent || '',
        dueDateStart: record.dueDateStart || '',
        dueDateEnd: record.dueDateEnd || '',
        receivedDate: record.receivedDate || '',
        paymentMode: record.paymentMode || 'Cash',
        bankDetails: record.bankDetails || '',
        remarks: record.remarks || ''
      });
      setEditingId(id);
      setIsModalOpen(true);
    }
  };

  const getRecordStatus = (record) => {
    if (record.status === 'Done' || record.status === 'Received') {
      if (record.receivedDate && record.dueDateEnd && 
          record.receivedDate <= record.dueDateEnd) {
        return 'On Time';
      }
      return 'Received';
    }
    const today = new Date().toISOString().split('T')[0];
    if (record.dueDateEnd && today > record.dueDateEnd) return 'Delay';
    return 'Pending';
  };

  const getDelayDays = (record) => {
    if (!record.dueDateEnd) return 0;
    const endDate = new Date(record.dueDateEnd);
    const checkDate = (record.status === 'Done' || record.status === 'Received') && record.receivedDate 
      ? new Date(record.receivedDate) 
      : new Date();
    const diff = Math.floor((checkDate - endDate) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Base month data before search and status filter
  const monthData = useMemo(() => {
    return filterMonth ? mockData.filter(item => item.month === filterMonth) : mockData;
  }, [mockData, filterMonth]);

  // Filtered data by search & status
  const filteredData = useMemo(() => {
    return monthData.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        item.property?.toLowerCase().includes(q) || 
        item.tenant?.toLowerCase().includes(q) ||
        (item.tenantContact && String(item.tenantContact).includes(q)) ||
        (item.paymentMode && item.paymentMode.toLowerCase().includes(q)) ||
        (item.bankDetails && item.bankDetails.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const s = getRecordStatus(item);
      if (statusFilter === 'PENDING') {
        return s === 'Pending';
      }
      if (statusFilter === 'RECEIVED') {
        return s === 'Received' || s === 'On Time';
      }
      if (statusFilter === 'DELAY') {
        return s === 'Delay';
      }

      return true;
    });
  }, [monthData, searchQuery, statusFilter]);

  // High-level statistics for Month (computed from monthData)
  const stats = useMemo(() => {
    let pendingCount = 0;
    let onTimeCount = 0;
    let receivedCount = 0;
    let delayCount = 0;

    let totalRent = 0;
    let collectedRent = 0;
    let pendingRent = 0;
    let delayRent = 0;

    monthData.forEach(r => {
      const s = getRecordStatus(r);
      const rent = Number(r.rent) || 0;
      totalRent += rent;

      if (s === 'Pending') {
        pendingCount++;
        pendingRent += rent;
      } else if (s === 'On Time') {
        onTimeCount++;
        receivedCount++;
        collectedRent += rent;
      } else if (s === 'Received') {
        receivedCount++;
        collectedRent += rent;
      } else if (s === 'Delay') {
        delayCount++;
        delayRent += rent;
        pendingRent += rent;
      }
    });

    const total = monthData.length;
    const totalPendingWithDelay = pendingCount + delayCount;
    const collectionRate = totalRent > 0 ? Math.round((collectedRent / totalRent) * 100) : 0;
    const onTimeRate = receivedCount > 0 ? Math.round((onTimeCount / receivedCount) * 100) : 0;

    return { 
      total, 
      totalRent,
      collectedRent,
      pendingRent,
      delayRent,
      done: receivedCount, 
      pendingOnly: pendingCount,
      delay: delayCount, 
      onTime: onTimeCount,
      totalPendingWithDelay,
      collectionRate,
      onTimeRate
    };
  }, [monthData]);

  const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '-';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${monthNames[parseInt(month, 10) - 1]}-${year}`;
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38);
    doc.text("JAI BHOLE GROUP - MONTHLY RENT TRACKER", 14, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Cycle Month: ${filterMonth || 'All Months'} | Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 25);
    
    autoTable(doc, {
      startY: 32,
      head: [['S.No.', 'Month', 'Property', 'Tenant & Contact', 'Rent (₹)', 'Due Range', 'Delay', 'Bank & Mode', 'Status', 'Remarks', 'Received Date']],
      body: filteredData.map((record, index) => [
        index + 1,
        record.month,
        record.property,
        `${record.tenant}${record.tenantContact ? `\nPh: ${record.tenantContact}` : ''}`,
        `₹${Number(record.rent || 0).toLocaleString('en-IN')}`,
        `${formatDate(record.dueDateStart)} to ${formatDate(record.dueDateEnd)}`,
        getDelayDays(record) > 0 ? `${getDelayDays(record)} days` : '-',
        `${record.paymentMode}${record.bankDetails ? `\n${record.bankDetails}` : ''}`,
        getRecordStatus(record) === 'On Time' ? 'On Time' : (getRecordStatus(record) === 'Received' ? 'Received' : (getRecordStatus(record) === 'Delay' ? 'Delayed' : 'Pending')),
        record.remarks || '-',
        formatDate(record.receivedDate)
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38],
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 8.5,
        textColor: 50,
        valign: 'middle'
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] 
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        4: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'center', textColor: [220, 38, 38] },
        8: { halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 8) {
          const status = data.cell.raw;
          if (status === 'Received' || status === 'On Time') data.cell.styles.textColor = [22, 163, 74];
          else if (status === 'Delayed') data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [234, 88, 12];
        }
      }
    });
    
    doc.save(`monthly_rent_tracker_${filterMonth || 'all'}.pdf`);
  };

  const handleDownloadExcel = () => {
    const exportData = filteredData.map((record, index) => ({
      'S.No.': index + 1,
      Month: record.month,
      Property: record.property,
      Tenant: record.tenant,
      'Contact Number': record.tenantContact || '-',
      'Rent (₹)': record.rent,
      'Due Range': `${formatDate(record.dueDateStart)} to ${formatDate(record.dueDateEnd)}`,
      'Delay (Days)': getDelayDays(record) > 0 ? getDelayDays(record) : 0,
      'Payment Mode': record.paymentMode,
      'Bank Details': record.bankDetails || '-',
      Status: getRecordStatus(record),
      Remarks: record.remarks || '-',
      'Received Date': formatDate(record.receivedDate)
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MonthlyTracker");
    XLSX.writeFile(workbook, `monthly_rent_tracker_${filterMonth || 'all'}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="w-full px-3 sm:px-6 py-2 space-y-5 animate-in fade-in duration-300">
        
        {/* ═══════════ HEADER BANNER & QUICK ACTIONS ═══════════ */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-[11px] font-bold text-red-600 mb-2 uppercase tracking-wider shadow-2xs">
              <CalendarIcon className="h-3.5 w-3.5 text-red-500" />
              <span>Rental Receipts & Recovery Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Monthly Rent Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-time monthly rent collection tracking, grace periods, delay alerts, and instant WhatsApp receipts
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/dashboard/rent-tracker/system-flow"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <GitFork className="h-3.5 w-3.5 text-red-600 transform rotate-90" />
              <span>System Flow</span>
            </Link>

            <Link
              to="/dashboard/rent-tracker/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-600" />
              <span>Analytics</span>
            </Link>

            <Link
              to="/dashboard/rent-tracker/master"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <Building2 className="h-3.5 w-3.5 text-slate-600" />
              <span>Rent Master</span>
            </Link>

            <button 
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
              title="Download PDF"
            >
              <FileText className="h-3.5 w-3.5 text-red-600" />
              <span>PDF</span>
            </button>

            <button 
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
              title="Download Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({
                  month: filterMonth || currentMonth, property: '', tenant: '', rent: '', dueDateStart: '', dueDateEnd: '', receivedDate: '', paymentMode: 'Cash', bankDetails: '', remarks: ''
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Record</span>
            </button>

            <button
              onClick={fetchTrackerData}
              disabled={refreshing}
              className="p-2 bg-white text-slate-600 hover:text-red-600 rounded-xl border border-slate-200 shadow-2xs transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ═══════════ TOP 6 KPI METRICS - SINGLE LINE ═══════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
          
          {/* 1. TOTAL TENANTS TRACKED */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Total Units">
                Total Units
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-blue-50 text-blue-600">
                <Building2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-blue-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {stats.total} Units
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5 font-bold truncate">
              {filterMonth || 'All Cycles'}
            </div>
          </div>

          {/* 2. PROJECTED MONTHLY RENT */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Projected Rent">
                Monthly Target
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              ₹ {stats.totalRent.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
              Total Expected Rent
            </div>
          </div>

          {/* 3. COLLECTED RENT */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Rent Received">
                Rent Received
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-teal-50 text-teal-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-teal-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              ₹ {stats.collectedRent.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-teal-600 mt-0.5 font-bold truncate">
              {stats.collectionRate}% ({stats.done} Paid)
            </div>
          </div>

          {/* 4. PENDING RENT */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Pending Rent">
                Pending Rent
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-amber-50 text-amber-600">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              ₹ {stats.pendingRent.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5 font-bold truncate">
              {stats.totalPendingWithDelay} Pending Tenants
            </div>
          </div>

          {/* 5. DELAYED / OVERDUE */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Overdue Rent">
                Overdue / Delay
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-rose-50 text-rose-600">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-rose-600 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              ₹ {stats.delayRent.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-rose-600 mt-0.5 font-bold truncate">
              {stats.delay} Delayed Tenants
            </div>
          </div>

          {/* 6. ON-TIME RATE */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="On-Time Rate">
                On-Time Rate
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-violet-50 text-violet-600">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-violet-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {stats.onTimeRate}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
              {stats.onTime} Paid On Time
            </div>
          </div>

        </div>

        {/* ═══════════ SEARCH & FILTER CONTROLS BAR ═══════════ */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left: Month selector + Status Filter Tabs */}
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Month Dropdown */}
            <div className="flex items-center bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs transition-colors">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400 mr-2" />
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-2">Cycle:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                <option value="">All Months</option>
                {MONTH_NAMES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl gap-1">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                Pending ({stats.pendingOnly})
              </button>
              <button
                onClick={() => setStatusFilter('RECEIVED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'RECEIVED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                Received ({stats.done})
              </button>
              <button
                onClick={() => setStatusFilter('DELAY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'DELAY'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-rose-700'
                }`}
              >
                Overdue ({stats.delay})
              </button>
            </div>
          </div>

          {/* Right: Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search property, tenant, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

        </div>

        {/* ═══════════ DESKTOP TABLE VIEW ═══════════ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3">Month</th>
                  <th className="py-3 px-3">Property Name</th>
                  <th className="py-3 px-3">Tenant & Contact</th>
                  <th className="py-3 px-3 text-right">Monthly Rent</th>
                  <th className="py-3 px-3 text-center">Delay / Overdue</th>
                  <th className="py-3 px-3">Mode & Bank</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Remarks</th>
                  <th className="py-3 px-3">Received Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CalendarIcon className="h-8 w-8 text-slate-300" />
                        <p className="font-semibold text-slate-600">No rent tracker records found</p>
                        <p className="text-[11px] text-slate-400">Try selecting another month or adjust search filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, index) => {
                    const status = getRecordStatus(record);
                    const delayDays = getDelayDays(record);
                    const isReceived = status === 'Done' || status === 'Received' || status === 'On Time';

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Index */}
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>

                        {/* Month */}
                        <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {record.month}
                          </span>
                        </td>

                        {/* Property */}
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span className="truncate max-w-[200px]" title={record.property}>{record.property}</span>
                          </div>
                        </td>

                        {/* Tenant & Contact */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{record.tenant}</div>
                          {record.tenantContact ? (
                            <a 
                              href={`https://wa.me/91${record.tenantContact.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                              title="Click to WhatsApp chat"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{record.tenantContact}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">No phone</span>
                          )}
                        </td>

                        {/* Monthly Rent */}
                        <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹ {Number(record.rent || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Delay Days */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {delayDays > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200/60">
                              {delayDays} days late
                            </span>
                          ) : (status === 'On Time' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              On Time
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          ))}
                        </td>

                        {/* Payment Mode & Bank */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold w-max ${
                              record.paymentMode?.toLowerCase() === 'cash' 
                                ? 'bg-amber-50 text-amber-700' 
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {record.paymentMode || 'Cash'}
                            </span>
                            {record.bankDetails && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={record.bankDetails}>
                                {record.bankDetails}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            status === 'On Time' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : status === 'Received'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                              : status === 'Delay'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              status === 'On Time' || status === 'Received' ? 'bg-emerald-500' : (status === 'Delay' ? 'bg-rose-500' : 'bg-amber-500')
                            }`}></span>
                            <span>{status}</span>
                          </span>
                        </td>

                        {/* Remarks */}
                        <td className="py-3 px-3 text-slate-500 text-[11px] truncate max-w-[130px]" title={record.remarks || ''}>
                          {record.remarks || '-'}
                        </td>

                        {/* Received Date */}
                        <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap font-medium">
                          {record.receivedDate ? (
                            <span className="text-emerald-700 font-semibold">{formatDate(record.receivedDate)}</span>
                          ) : '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isReceived ? (
                              <button 
                                onClick={() => openReceiveModal(record)} 
                                title="Confirm Payment & WhatsApp Receipt" 
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors shadow-2xs"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleSendWhatsAppDirect(record)} 
                                title="Resend WhatsApp Receipt" 
                                className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition-colors shadow-2xs"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleUpdate(record.id)} 
                              title="Edit Record" 
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors shadow-2xs"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(record.id)} 
                              title="Delete Record" 
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors shadow-2xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer info */}
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing <b className="text-slate-800">{filteredData.length}</b> of <b className="text-slate-800">{monthData.length}</b> records for {filterMonth || 'All Months'}</span>
            <span className="font-semibold text-slate-700">Total Filtered Rent: <b className="text-slate-900 font-black">₹{filteredData.reduce((s, r) => s + (Number(r.rent) || 0), 0).toLocaleString('en-IN')}</b></span>
          </div>
        </div>

        {/* ═══════════ MOBILE CARDS VIEW ═══════════ */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
              No tracker records found
            </div>
          ) : (
            filteredData.map((record) => {
              const status = getRecordStatus(record);
              const delayDays = getDelayDays(record);
              const isReceived = status === 'Done' || status === 'Received' || status === 'On Time';

              return (
                <div key={record.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-red-500" />
                        <h3 className="font-extrabold text-slate-900 text-base">{record.property}</h3>
                      </div>
                      <p className="text-slate-600 text-xs font-semibold mt-0.5">{record.tenant}</p>
                      {record.tenantContact && (
                        <a 
                          href={`https://wa.me/91${record.tenantContact.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-0.5"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{record.tenantContact}</span>
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-red-50 text-red-700 text-sm font-black px-2.5 py-1 rounded-xl">
                        ₹{Number(record.rent || 0).toLocaleString('en-IN')}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isReceived ? 'bg-emerald-50 text-emerald-700' : (status === 'Delay' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700')
                      }`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Due Range</span>
                      <span className="font-semibold text-slate-700">
                        {record.dueDateStart && record.dueDateEnd ? `${formatDate(record.dueDateStart)} - ${formatDate(record.dueDateEnd)}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Received Date</span>
                      <span className="font-semibold text-slate-700">{formatDate(record.receivedDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Mode & Bank</span>
                      <span className="font-semibold text-slate-700">{record.paymentMode} {record.bankDetails ? `(${record.bankDetails})` : ''}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Delay</span>
                      {delayDays > 0 ? (
                        <span className="text-rose-600 font-extrabold">{delayDays} days late</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-1.5 pt-2.5 border-t border-slate-100">
                    {!isReceived ? (
                      <button 
                        onClick={() => openReceiveModal(record)} 
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5" /> Receive & WhatsApp
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSendWhatsAppDirect(record)} 
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl font-bold text-xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Receipt
                      </button>
                    )}
                    <button 
                      onClick={() => handleUpdate(record.id)} 
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-xl"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(record.id)} 
                      className="p-1.5 bg-rose-50 text-rose-600 rounded-xl"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ═══════════ RECEIVE PAYMENT CONFIRMATION MODAL ═══════════ */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                Confirm Rent Payment
              </h2>
              <button 
                onClick={() => {
                  setIsReceiveModalOpen(false);
                  setReceivingId(null);
                  setReceivingRecord(null);
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleReceiveSubmit} className="space-y-4">
                {/* Record Info Summary Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Tenant:</span>
                    <span className="font-extrabold text-slate-800 text-sm">{receivingRecord?.tenant || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Property & Month:</span>
                    <span className="font-bold text-slate-700">{receivingRecord?.property} ({receivingRecord?.month})</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Rent Received:</span>
                    <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg text-sm">
                      ₹{Number(receivingRecord?.rent || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wide">
                    Payment Received Date *
                  </label>
                  <input 
                    type="date" 
                    value={receiveDate} 
                    onChange={(e) => setReceiveDate(e.target.value)} 
                    required 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wide flex items-center justify-between">
                    <span>Tenant Contact No. (WhatsApp)</span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g. 9876543210</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="tel" 
                      value={tenantContactInput} 
                      onChange={(e) => setTenantContactInput(e.target.value)} 
                      placeholder="Enter Tenant WhatsApp Number" 
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-mono" 
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                    <input 
                      type="checkbox" 
                      checked={sendWhatsApp} 
                      onChange={(e) => setSendWhatsApp(e.target.checked)} 
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      Send Instant WhatsApp Payment Receipt
                    </span>
                  </label>
                </div>
                
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsReceiveModalOpen(false);
                      setReceivingId(null);
                      setReceivingRecord(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingReceive}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isSubmittingReceive ? 'Processing...' : (sendWhatsApp ? 'Confirm & Send Receipt' : 'Confirm Received')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ ADD / EDIT TRACKER RECORD MODAL ═══════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-red-600" />
                {editingId ? 'Edit Monthly Tracker Record' : 'Add Monthly Tracker Record'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                  setFormData({
                    month: currentMonth, property: '', tenant: '', rent: '', dueDateStart: '', dueDateEnd: '', paymentMode: 'Cash', bankDetails: '', remarks: ''
                  });
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Month *</label>
                    <select name="month" value={formData.month} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="">Select Month</option>
                      {MONTH_NAMES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Property Name *</label>
                    <select name="property" value={formData.property} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="">Select Property</option>
                      {rentMasterData.map(p => (
                        <option key={p.id} value={p.propertyName}>{p.propertyName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Tenant Name *</label>
                    <input type="text" name="tenant" value={formData.tenant} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Rent Amount (₹) *</label>
                    <input type="number" name="rent" value={formData.rent} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Rent Due Date (Start)</label>
                    <input type="date" name="dueDateStart" value={formData.dueDateStart} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Rent Due Date (End)</label>
                    <input type="date" name="dueDateEnd" value={formData.dueDateEnd} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Received Date</label>
                    <input type="date" name="receivedDate" value={formData.receivedDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Payment Mode</label>
                    <select name="paymentMode" value={formData.paymentMode} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Bank Name & Details</label>
                    <input type="text" name="bankDetails" value={formData.bankDetails} onChange={handleInputChange} placeholder="e.g. HDFC - A/C 9876..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1 lg:col-span-3">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Remarks</label>
                    <input type="text" name="remarks" value={formData.remarks} onChange={handleInputChange} placeholder="Add any notes..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                </div>
                
                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs"
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

export default MonthlyTracker;
