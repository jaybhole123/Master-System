import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, Plus, Calendar as CalendarIcon, X, Check, Edit, Trash2, Users, Clock, CheckCircle2, AlertCircle, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import supabase from '../../SupabaseClient';
import toast from 'react-hot-toast';
const MonthlyTracker = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState(() => new Date().toLocaleString('default', { month: 'long' }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mockData, setMockData] = useState([]);
  const [rentMasterData, setRentMasterData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrackerData = async () => {
    try {
      setLoading(true);
      const [trackerRes, masterRes] = await Promise.all([
        supabase.from('rent_monthly_tracker').select('*').order('id', { ascending: false }),
        supabase.from('rent_master').select('*')
      ]);

      if (trackerRes.error) throw trackerRes.error;
      if (masterRes.error) throw masterRes.error;

      setRentMasterData(masterRes.data.map(item => ({
        id: item.id,
        propertyName: item.property_name,
        tenantName: item.tenant_name,
        monthlyRent: item.monthly_rent,
        rentDueDateStart: item.rent_due_date_start,
        rentDueDateEnd: item.rent_due_date_end,
        paymentMode: item.payment_mode,
        bankDetails: item.bank_details
      })));

      setMockData(trackerRes.data.map(item => ({
        id: item.id,
        rentMasterId: item.rent_master_id,
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
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load tracker data');
    } finally {
      setLoading(false);
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

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const calculateDate = (dayString, targetMonth) => {
      if (!dayString) return '';
      const day = parseInt(dayString);
      if (isNaN(day)) return '';
      const monthIndex = monthNames.indexOf(targetMonth);
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

  const handleReceive = async (id) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('rent_monthly_tracker')
        .update({ status: 'Received', received_date: today, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Marked as received');
      fetchTrackerData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
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

  const filteredData = React.useMemo(() => {
    return mockData.filter(item => {
      const matchesSearch = item.property?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.tenant?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMonth = filterMonth ? item.month === filterMonth : true;
      return matchesSearch && matchesMonth;
    });
  }, [mockData, searchQuery, filterMonth]);

  const stats = React.useMemo(() => {
    let pending = 0, onTime = 0, done = 0, delay = 0;
    filteredData.forEach(r => {
      const s = getRecordStatus(r);
      if (s === 'Pending') pending++;
      else if (s === 'On Time') onTime++;
      else if (s === 'Received') done++;
      else if (s === 'Delay') delay++;
    });
    return { total: filteredData.length, pending: pending + delay, onTime, done: done + onTime, delay };
  }, [filteredData]);

  const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '-';
    // Ensure dateString is yyyy-mm-dd
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${monthNames[parseInt(month, 10) - 1]}-${year}`;
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Add title styling
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38); // Red color
    doc.text("Monthly Tracker Report", 14, 20);
    
    // Add subtitle / date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 27);
    
    autoTable(doc, {
      startY: 35,
      head: [['S.No.', 'Month', 'Property', 'Tenant', 'Rent (Rs)', 'Due Range', 'Received Date', 'Delay', 'Bank & Mode', 'Status', 'Remarks']],
      body: filteredData.map((record, index) => [
        index + 1,
        record.month,
        record.property,
        record.tenant,
        record.rent,
        `${formatDate(record.dueDateStart)} to ${formatDate(record.dueDateEnd)}`,
        formatDate(record.receivedDate),
        getDelayDays(record) > 0 ? `${getDelayDays(record)} days` : '-',
        `${record.paymentMode}${record.bankDetails ? `\n${record.bankDetails}` : ''}`,
        getRecordStatus(record) === 'On Time' || getRecordStatus(record) === 'Received' ? 'Received' : 'Pending',
        record.remarks || '-'
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38], // Red header
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
        4: { halign: 'right' },
        7: { halign: 'center', textColor: [220, 38, 38] }, // Red text for delay
        9: { halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 9) {
          // Color code the status text
          const status = data.cell.raw;
          if (status === 'Received') data.cell.styles.textColor = [22, 163, 74]; // Green
          else if (status === 'Pending') data.cell.styles.textColor = [234, 88, 12]; // Orange
        }
      }
    });
    
    doc.save("monthly_tracker.pdf");
  };

  const handleDownloadExcel = () => {
    const exportData = filteredData.map((record, index) => ({
      'S.No.': index + 1,
      Month: record.month,
      Property: record.property,
      Tenant: record.tenant,
      Rent: record.rent,
      'Due Range': `${formatDate(record.dueDateStart)} to ${formatDate(record.dueDateEnd)}`,
      'Received Date': formatDate(record.receivedDate),
      'Payment Mode': record.paymentMode,
      Status: getRecordStatus(record) === 'On Time' || getRecordStatus(record) === 'Received' ? 'Received' : 'Pending',
      Remarks: record.remarks
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tracker");
    XLSX.writeFile(workbook, "monthly_tracker.xlsx");
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Total Tenant</span>
            </div>
            <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <span className="text-2xl font-bold text-slate-800">{stats.pending}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Received</span>
            </div>
            <span className="text-2xl font-bold text-slate-800">{stats.done}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              Monthly Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Track monthly rent payments and status</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full md:w-auto">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white w-full sm:w-auto"
            >
              <option value="">All Months</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
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
                  month: currentMonth, property: '', tenant: '', rent: '', dueDateStart: '', dueDateEnd: '', paymentMode: 'Cash', bankDetails: '', remarks: ''
                });
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm shadow-red-600/20 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add Tracker
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">S.No.</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rent</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Range</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Received Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Delay Days</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payment Mode</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Bank Name & Details</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="px-6 py-8 text-center text-sm text-slate-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium text-center">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{record.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{record.property}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{record.tenant}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">₹{record.rent}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {record.dueDateStart && record.dueDateEnd ? `${formatDate(record.dueDateStart)} to ${formatDate(record.dueDateEnd)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatDate(record.receivedDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getDelayDays(record) > 0 
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{getDelayDays(record)} days</span>
                        : (getRecordStatus(record) === 'On Time' || getRecordStatus(record) === 'Received')
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">On Time</span>
                          : <span className="text-slate-400">-</span>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{record.paymentMode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{record.bankDetails || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        getRecordStatus(record) === 'On Time' || getRecordStatus(record) === 'Received' ? 'bg-green-100 text-green-800' : 
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {getRecordStatus(record) === 'On Time' || getRecordStatus(record) === 'Received' ? 'Received' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{record.remarks}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {record.status !== 'Done' && record.status !== 'Received' && (
                          <button onClick={() => handleReceive(record.id)} title="Mark as Received" className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors">
                            <Check className="h-4 w-4" />
                          </button>
                        )}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
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
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Month</label>
                    <select name="month" value={formData.month} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="">Select Month</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Property Name</label>
                    <select name="property" value={formData.property} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                      <option value="">Select Property</option>
                      {rentMasterData.map(p => (
                        <option key={p.id} value={p.propertyName}>{p.propertyName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Tenant Name</label>
                    <input type="text" name="tenant" value={formData.tenant} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Rent Amount (₹)</label>
                    <input type="number" name="rent" value={formData.rent} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Rent Due Date (Start)</label>
                    <input type="date" name="dueDateStart" value={formData.dueDateStart} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Rent Due Date (End)</label>
                    <input type="date" name="dueDateEnd" value={formData.dueDateEnd} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white" />
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
                    <label className="text-xs font-semibold text-slate-600 uppercase">Remarks</label>
                    <input type="text" name="remarks" value={formData.remarks} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
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
                    className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-600/20"
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
