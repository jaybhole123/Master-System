import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/layout/AdminLayout';
import supabase from '../../SupabaseClient';
import { sendRentPaymentReminder } from '../../services/whatsappService';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical,
  Edit2,
  Trash2,
  Download,
  Banknote,
  Calendar as CalendarIcon,
  X,
  FileText,
  Printer,
  FileSpreadsheet,
  Check,
  History
} from 'lucide-react';

const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const RentManagement = () => {
  const currentMonth = months[new Date().getMonth()];

  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('LIVE');
  const [activeActionId, setActiveActionId] = useState(null);
  const [formData, setFormData] = useState({
    place: '',
    name: '',
    phone: '',
    date: '',
    due_date: '',
    method: 'CASH',
    month: currentMonth,
    document: null,
    owner_name: '',
    monthly_rent: '',
    security_deposit: '',
    agreement_start: '',
    agreement_end: '',
    rent_due_date: '',
    payment_mode: 'CASH',
    last_rent_received: '',
    payment_status: '',
    rent_revision_date: '',
    electricity: '',
    maintenance: '',
    remarks: '',
    broker_number: ''
  });
  
  // Initialize data from Supabase
  const [rentData, setRentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('rent_records')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching records:', error);
    } else {
      // Map document_url to document for UI compatibility
      const formattedData = (data || []).map(record => ({
        ...record,
        document: record.document_url
      }));
      setRentData(formattedData);

      // --- AUTOMATIC REMINDER LOGIC ---
      const today = new Date().toISOString().split('T')[0];
      const pendingReminders = formattedData.filter(record => 
        record.status === 'Pending' && 
        record.due_date === today && 
        !record.reminder_sent
      );

      if (pendingReminders.length > 0) {
        for (const record of pendingReminders) {
          console.log(`Attempting to send auto-reminder to ${record.name} for ${record.due_date}`);
          const sent = await sendRentPaymentReminder({
            phone: record.phone,
            name: record.name,
            propertyAndMonth: `${record.place} - ${record.month}`,
            dueDate: record.due_date,
            message: ''
          });

          if (sent) {
            await supabase.from('rent_records').update({ reminder_sent: true }).eq('id', record.id);
          }
        }
      }
      // --------------------------------
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredData = rentData.filter(item => 
    (selectedMonth === 'ALL' || item.month === selectedMonth) && 
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     item.place.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (activeTab === 'HISTORY' ? item.status === 'Done' : item.status !== 'Done')
  );

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    
    const payload = {
      place: formData.place,
      name: formData.name,
      phone: formData.phone,
      date: formData.date,
      due_date: formData.due_date,
      method: formData.method,
      month: formData.month,
      document_url: formData.document,
      owner_name: formData.owner_name,
      monthly_rent: formData.monthly_rent || null,
      security_deposit: formData.security_deposit || null,
      agreement_start: formData.agreement_start || null,
      agreement_end: formData.agreement_end || null,
      rent_due_date: formData.rent_due_date || null,
      payment_mode: formData.payment_mode,
      last_rent_received: formData.last_rent_received || null,
      payment_status: formData.payment_status,
      rent_revision_date: formData.rent_revision_date || null,
      electricity: formData.electricity || null,
      maintenance: formData.maintenance || null,
      remarks: formData.remarks,
      broker_number: formData.broker_number
    };

    if (editingId) {
      const { error } = await supabase
        .from('rent_records')
        .update(payload)
        .eq('id', editingId);
        
      if (!error) {
        fetchRecords();
      } else {
        console.error("Error updating record:", error);
      }
    } else {
      const { error } = await supabase
        .from('rent_records')
        .insert([payload]);
        
      if (!error) {
        fetchRecords();
      } else {
        console.error("Error saving record:", error);
      }
    }
    
    setEditingId(null);
    setFormData({ place: '', name: '', phone: '', date: '', due_date: '', method: 'CASH', month: selectedMonth === 'ALL' ? currentMonth : selectedMonth, document: null, owner_name: '', monthly_rent: '', security_deposit: '', agreement_start: '', agreement_end: '', rent_due_date: '', payment_mode: 'CASH', last_rent_received: '', payment_status: '', rent_revision_date: '', electricity: '', maintenance: '', remarks: '', broker_number: '' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, document: reader.result });
      };
      reader.readAsDataURL(file);
    } else {
      setFormData({ ...formData, document: null });
    }
  };

  const handleEditClick = (record) => {
    setEditingId(record.id);
    setFormData({
      place: record.place,
      name: record.name,
      phone: record.phone,
      date: record.date,
      due_date: record.due_date || '',
      method: record.method,
      month: record.month,
      document: record.document || null,
      owner_name: record.owner_name || '',
      monthly_rent: record.monthly_rent || '',
      security_deposit: record.security_deposit || '',
      agreement_start: record.agreement_start || '',
      agreement_end: record.agreement_end || '',
      rent_due_date: record.rent_due_date || '',
      payment_mode: record.payment_mode || 'CASH',
      last_rent_received: record.last_rent_received || '',
      payment_status: record.payment_status || '',
      rent_revision_date: record.rent_revision_date || '',
      electricity: record.electricity || '',
      maintenance: record.maintenance || '',
      remarks: record.remarks || '',
      broker_number: record.broker_number || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      const { error } = await supabase.from('rent_records').delete().eq('id', id);
      if (!error) {
        fetchRecords();
      } else {
        console.error("Error deleting record:", error);
      }
    }
  };

  const handleMarkAsDone = async (id) => {
    const { error } = await supabase.from('rent_records').update({ status: 'Done' }).eq('id', id);
    if (!error) {
      fetchRecords();
    } else {
      console.error("Error updating status:", error);
    }
  };

  const exportToExcel = () => {
    const headers = ['Place', 'Name', 'Phone No.', 'Date', 'Due Date', 'Payment Method', 'Month'];
    const dataRows = filteredData.map(row => [
      row.place, 
      row.name, 
      row.phone, 
      row.date, 
      row.due_date,
      row.method, 
      row.month
    ]);
    const worksheetData = [headers, ...dataRows];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rent Records");

    XLSX.writeFile(workbook, `rent_records_${selectedMonth}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Rent Records - ${selectedMonth}`, 14, 15);
    
    const tableColumn = ["Place", "Name", "Phone No.", "Date", "Due Date", "Payment Method", "Month", "Status"];
    const tableRows = [];

    filteredData.forEach(record => {
      const recordData = [
        record.place,
        record.name,
        record.phone,
        record.date,
        record.due_date || 'N/A',
        record.method,
        record.month,
        record.status === 'Done' ? 'Done' : 'Pending'
      ];
      tableRows.push(recordData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(`rent_records_${selectedMonth}.pdf`);
    setShowExportMenu(false);
  };

  return (
    <AdminLayout>
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-10 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              Rent Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage monthly property rentals and payments</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by name or place..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 w-full sm:w-64 transition-all"
              />
            </div>
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ place: '', name: '', phone: '', date: '', due_date: '', method: 'CASH', month: selectedMonth === 'ALL' ? currentMonth : selectedMonth, document: null, owner_name: '', monthly_rent: '', security_deposit: '', agreement_start: '', agreement_end: '', rent_due_date: '', payment_mode: 'CASH', last_rent_received: '', payment_status: '', rent_revision_date: '', electricity: '', maintenance: '', remarks: '', broker_number: '' });
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm shadow-red-600/20"
            >
              <Plus className="h-4 w-4" />
              Add Record
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <CalendarIcon className="h-4 w-4 text-slate-500" />
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL MONTHS</option>
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('LIVE')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'LIVE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Pending
                  </button>
                  <button 
                    onClick={() => setActiveTab('HISTORY')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'HISTORY' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <History className="h-3.5 w-3.5" /> History
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <Filter className="h-4 w-4" />
                  Filter
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                  
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                      <button 
                        onClick={exportToPDF}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4 text-red-500" />
                        Export as PDF
                      </button>
                      <button 
                        onClick={exportToExcel}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        Export to Excel
                      </button>
                      <button 
                        onClick={() => { setShowExportMenu(false); window.print(); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4 text-slate-600" />
                        Print Document
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-4">
              {filteredData.length > 0 ? (
                filteredData.map((record) => (
                  <div key={record.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{record.place}</h3>
                        <p className="text-slate-600 font-medium">{record.name}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        record.status === 'Done' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}>
                        {record.status === 'Done' ? 'Done' : 'Pending'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-0.5">Phone No.</p>
                        <p className="font-mono text-slate-700">{record.phone}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-0.5">Date</p>
                        <p className="text-slate-700 font-medium">{record.date}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-0.5">Due Date</p>
                        <p className="text-slate-700 font-medium">{record.due_date || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-0.5">Method</p>
                        <p className="text-slate-700 font-medium">{record.method || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-0.5">Document</p>
                        {record.document ? (
                          <a href={record.document} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium">
                            <FileText className="h-3.5 w-3.5" /> View
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No doc</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2 flex items-center justify-end gap-2">
                      {record.status !== 'Done' && (
                        <button 
                          onClick={() => handleMarkAsDone(record.id)}
                          className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-green-200/50"
                        >
                          <Check className="h-3.5 w-3.5" /> Done
                        </button>
                      )}
                      <button 
                        onClick={() => handleEditClick(record)}
                        className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-blue-200/50"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteRecord(record.id)}
                        className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-red-200/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center bg-white rounded-xl shadow-sm border border-slate-200">
                  <Banknote className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium text-slate-600">No rent records found</p>
                  <p className="text-sm text-slate-400">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </div>

            {/* Desktop Table Container */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto pb-32">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Place</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Owner Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Phone No.</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Monthly Rent</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Sec. Deposit</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Agrmnt. Start</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Agrmnt. End</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Due Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payment Method</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Last Received</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Pay Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Rev. Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Electricity</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Maintenance</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Broker No.</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Document</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredData.length > 0 ? (
                      filteredData.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">{record.place}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700">{record.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700">{record.owner_name || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-600 font-mono text-sm">{record.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 font-medium">{record.monthly_rent ? `₹${record.monthly_rent}` : '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 font-medium">{record.security_deposit ? `₹${record.security_deposit}` : '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                              {record.date}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm">{record.agreement_start || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm">{record.agreement_end || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-200/50 text-xs font-medium">
                              {record.due_date || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.method ? (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                record.method === 'CASH' ? 'bg-green-100 text-green-800' :
                                record.method === 'ONLINE' ? 'bg-blue-100 text-blue-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {record.method}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm">{record.last_rent_received || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm">{record.payment_status || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm">{record.rent_revision_date || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm font-medium">{record.electricity ? `₹${record.electricity}` : '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm font-medium">{record.maintenance ? `₹${record.maintenance}` : '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm max-w-[150px] truncate" title={record.remarks}>{record.remarks || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 text-sm">{record.broker_number || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.document ? (
                              <a href={record.document} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium">
                                <FileText className="h-3.5 w-3.5" />
                                View
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No doc</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              record.status === 'Done' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-orange-100 text-orange-800 border border-orange-200'
                            }`}>
                              {record.status === 'Done' ? 'Done' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                            <button 
                              onClick={() => setActiveActionId(activeActionId === record.id ? null : record.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeActionId === record.id && (
                              <div className="absolute right-8 top-12 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20">
                                {record.status !== 'Done' && (
                                  <button 
                                    onClick={() => { handleMarkAsDone(record.id); setActiveActionId(null); }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Check className="h-4 w-4 text-green-600" /> Done
                                  </button>
                                )}
                                <button 
                                  onClick={() => { handleEditClick(record); setActiveActionId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Edit2 className="h-4 w-4 text-blue-600" /> Edit
                                </button>
                                <button 
                                  onClick={() => { handleDeleteRecord(record.id); setActiveActionId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Banknote className="h-12 w-12 mb-4 text-slate-300" />
                            <p className="text-lg font-medium text-slate-600">No rent records found</p>
                            <p className="text-sm">Try adjusting your search or filter criteria.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination placeholder */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-medium">{filteredData.length}</span> results
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50">Previous</button>
                  <button className="px-3 py-1 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50">Next</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Rent Record' : 'Add Rent Record'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Month</label>
                  <select 
                    required
                    value={formData.month}
                    onChange={(e) => setFormData({...formData, month: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Due Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Place</label>
                <input 
                  type="text" 
                  placeholder="e.g. ORANGE 803"
                  required
                  value={formData.place}
                  onChange={(e) => setFormData({...formData, place: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Phone No.</label>
                  <input 
                    type="text" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Payment Method</label>
                  <select 
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="CASH">CASH</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="ADV.">ADV.</option>
                  </select>
                </div>
              </div>

              {/* New Additional Fields */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <h4 className="text-sm font-bold text-slate-800 mb-4">Additional Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Owner/Landlord Name</label>
                    <input type="text" value={formData.owner_name} onChange={(e) => setFormData({...formData, owner_name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Monthly Rent</label>
                    <input type="number" value={formData.monthly_rent} onChange={(e) => setFormData({...formData, monthly_rent: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Security Deposit</label>
                    <input type="number" value={formData.security_deposit} onChange={(e) => setFormData({...formData, security_deposit: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Agreement Start</label>
                    <input type="date" value={formData.agreement_start} onChange={(e) => setFormData({...formData, agreement_start: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Agreement End</label>
                    <input type="date" value={formData.agreement_end} onChange={(e) => setFormData({...formData, agreement_end: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Rent Due Date</label>
                    <input type="date" value={formData.rent_due_date} onChange={(e) => setFormData({...formData, rent_due_date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Payment Mode</label>
                    <input type="text" value={formData.payment_mode} onChange={(e) => setFormData({...formData, payment_mode: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Last Rent Received</label>
                    <input type="date" value={formData.last_rent_received} onChange={(e) => setFormData({...formData, last_rent_received: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Payment Status</label>
                    <input type="text" value={formData.payment_status} onChange={(e) => setFormData({...formData, payment_status: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Rent Revision Date</label>
                    <input type="date" value={formData.rent_revision_date} onChange={(e) => setFormData({...formData, rent_revision_date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Electricity</label>
                    <input type="number" value={formData.electricity} onChange={(e) => setFormData({...formData, electricity: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Maintenance</label>
                    <input type="number" value={formData.maintenance} onChange={(e) => setFormData({...formData, maintenance: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Remarks</label>
                    <input type="text" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Broker Number</label>
                    <input type="text" value={formData.broker_number} onChange={(e) => setFormData({...formData, broker_number: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Upload Document (PDF/Image)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
                {formData.document && (
                  <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    Document attached
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-600/20"
                >
                  {editingId ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RentManagement;
