import React, { useState, useRef, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload, X, Eye, Check, XCircle, Plus, Search, ChevronLeft, ChevronRight, Calendar, Filter, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import supabase from '../../../SupabaseClient';
import SearchableSelect from '../../../components/SearchableSelect';
import {
  generateId,
  generateSerialNumber,
  formatDate,
  formatCurrency,
  fileToBase64,
  getTodayDate,
  createLedgerEntry,
  calculateBalance,
  getTotalBalance
} from '../utils/helpers';

export default function Expenses() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const [credits, setCredits] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const fetchCreditsAndExpenses = async () => {
    try {
      const { data: creditsData } = await supabase.from('petty_cash_addcash_credits').select('*');
      if (creditsData) setCredits(creditsData);
    } catch (e) {}

    try {
      const { data: expensesData } = await supabase.from('petty_cash_expenses').select('*');
      if (expensesData) setExpenses(expensesData);
    } catch (e) {}
  };

  const [groupHeads, setGroupHeads] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);

  useEffect(() => {
    fetchCreditsAndExpenses();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: ghData } = await supabase
      .from('petty_cash_setting')
      .select('id, group_head')
      .not('group_head', 'is', null);
    if (ghData) setGroupHeads(ghData);

    const { data: pmData } = await supabase
      .from('petty_cash_setting')
      .select('id, payment_mode')
      .not('payment_mode', 'is', null);
    if (pmData) setPaymentModes(pmData);
  };

  const [formData, setFormData] = useState({
    personName: '',
    date: '',
    amount: '',
    paymentMode: '',
    groupHead: '',
    remarks: '',
    particulars: '',
    received: '',
    balance: ''
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [statusFilter, setStatusFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState('');
  const [addModalValue, setAddModalValue] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    personName: '',
    mode: '',
    groupHead: '',
    searchQuery: ''
  });

  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    setVisibleCount(50);
  }, [filters, activeTab, statusFilter]);

  useEffect(() => {
    if (formData.received !== '' || formData.amount !== '') {
      const rec = parseFloat(formData.received) || 0;
      const pd = parseFloat(formData.amount) || 0;
      const bal = rec - pd;
      setFormData(prev => {
        if (prev.balance !== bal.toString()) {
          return { ...prev, balance: bal.toString() };
        }
        return prev;
      });
    }
  }, [formData.received, formData.amount]);

  const DEFAULT_USERS = [
    { id: 'admin', name: 'Admin User', password: 'admin123', role: 'ADMIN' },
    { id: 'user', name: 'Employee 1', password: 'user123', role: 'USER' },
    { id: 'user2', name: 'Employee 2', password: 'user123', role: 'USER' }
  ];

  // Get all users for dropdown
  const userList = DEFAULT_USERS.map(u => u.name);

  // Calculate total global balance instead of person-specific
  const selectedPersonBalance = useMemo(() => {
    return getTotalBalance(credits, expenses.filter(e => e.status === 'APPROVED'));
  }, [credits, expenses]);

  const pendingExpenses = expenses.filter(e => e.status === 'PENDING');
  const approvedExpenses = expenses.filter(e => e.status === 'APPROVED');
  const rejectedExpenses = expenses.filter(e => e.status === 'REJECTED');

  const displayExpenses = useMemo(() => {
    if (activeTab === 'pending') {
      return pendingExpenses;
    }
    // History tab
    const historyExpenses = [...approvedExpenses, ...rejectedExpenses];
    if (statusFilter) {
      return historyExpenses.filter(e => e.status === statusFilter);
    }
    return historyExpenses;
  }, [activeTab, statusFilter, pendingExpenses, approvedExpenses, rejectedExpenses]);

  const filteredExpenses = displayExpenses.filter(expense => {
    if (filters.fromDate && expense.date < filters.fromDate) return false;
    if (filters.toDate && expense.date > filters.toDate) return false;
    if (filters.personName && (expense.person_name || expense.personName) !== filters.personName) return false;
    if (filters.mode && (expense.payment_mode || expense.paymentMode) !== filters.mode) return false;
    if (filters.groupHead && (expense.group_head || expense.groupHead) !== filters.groupHead) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match = (
        (expense.sn && String(expense.sn).toLowerCase().includes(q)) ||
        ((expense.person_name || expense.personName) && (expense.person_name || expense.personName).toLowerCase().includes(q)) ||
        (expense.date && expense.date.includes(q)) ||
        (expense.amount && String(expense.amount).toLowerCase().includes(q)) ||
        ((expense.payment_mode || expense.paymentMode) && (expense.payment_mode || expense.paymentMode).toLowerCase().includes(q)) ||
        ((expense.group_head || expense.groupHead) && (expense.group_head || expense.groupHead).toLowerCase().includes(q)) ||
        (expense.remarks && expense.remarks.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    return true;
  });

  const sortedExpenses = filteredExpenses.slice().reverse();
  const displayedExpenses = sortedExpenses.slice(0, visibleCount);

  const pageTotalAmount = displayedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalAmount = sortedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (visibleCount < sortedExpenses.length) {
        setVisibleCount(prev => prev + 50);
      }
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setImage(base64);
      setImagePreview(base64);
    } catch (error) {
      toast.error('Error reading image');
    }
  };

  const handleDropdownChange = async (e, fieldName) => {
    const value = e.target.value;
    
    if (value === 'ADD_NEW_HEAD') {
      setAddModalType('head');
      setAddModalValue('');
      setShowAddModal(true);
    } else if (value === 'ADD_NEW_MODE') {
      setAddModalType('mode');
      setAddModalValue('');
      setShowAddModal(true);
    } else {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
    }
  };

  const handleAddNewSubmit = async (e) => {
    e.preventDefault();
    if (!addModalValue || addModalValue.trim() === '') {
      setShowAddModal(false);
      setFormData(prev => ({ ...prev, [addModalType === 'head' ? 'groupHead' : 'paymentMode']: '' }));
      return;
    }
    const trimmedValue = addModalValue.trim();
    try {
      const field = addModalType === 'head' ? 'group_head' : 'payment_mode';
      const { data, error } = await supabase
        .from('petty_cash_setting')
        .insert([{ [field]: trimmedValue }])
        .select();
      
      if (error) throw error;
      if (data && data.length > 0) {
        if (addModalType === 'head') {
          setGroupHeads(prev => [...prev, data[0]]);
          setFormData(prev => ({ ...prev, groupHead: trimmedValue }));
          toast.success("New Head added!");
        } else {
          setPaymentModes(prev => [...prev, data[0]]);
          setFormData(prev => ({ ...prev, paymentMode: trimmedValue }));
          toast.success("New Payment Mode added!");
        }
      }
    } catch (err) {
      toast.error(`Error adding new ${addModalType === 'head' ? 'group head' : 'payment mode'}`);
      setFormData(prev => ({ ...prev, [addModalType === 'head' ? 'groupHead' : 'paymentMode']: '' }));
    }
    setShowAddModal(false);
  };

  const handleAddNewCancel = () => {
    setShowAddModal(false);
    setFormData(prev => ({ ...prev, [addModalType === 'head' ? 'groupHead' : 'paymentMode']: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.personName.trim()) {
      toast.error('Please select person name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter valid expense amount');
      return;
    }

    // Balance validation
    const currentReceived = parseFloat(formData.received) || 0;
    const currentPaid = parseFloat(formData.amount) || 0;
    const totalAvailable = selectedPersonBalance + currentReceived;

    if (currentPaid > totalAvailable) {
      toast.error(
        `Insufficient Balance! Available: ${formatCurrency(totalAvailable)}`
      );
      return;
    }

    try {
      setLoading(true);

      if (editingExpenseId) {
        const updateData = {
          person_name: formData.personName,
          particulars: formData.particulars,
          date: formData.date,
          received: parseFloat(formData.received) || 0,
          amount: parseFloat(formData.amount) || 0,
          balance: parseFloat(formData.balance) || 0,
          payment_mode: formData.paymentMode,
          group_head: formData.groupHead,
          remarks: formData.remarks,
          receipt_url: image || ''
        };
        await supabase.from('petty_cash_expenses').update(updateData).eq('id', editingExpenseId);
        await fetchCreditsAndExpenses();
        toast.success('Expense updated successfully!');
      } else {
        const newExpense = {
          id: generateId(),
          sn: generateSerialNumber(),
          personName: formData.personName,
          particulars: formData.particulars || '',
          date: formData.date,
          received: parseFloat(formData.received) || 0,
          amount: parseFloat(formData.amount) || 0,
          balance: parseFloat(formData.balance) || 0,
          paymentMode: formData.paymentMode,
          groupHead: formData.groupHead,
          image: image || '',
          remarks: formData.remarks,
          status: 'PENDING',
          timestamp: new Date().toISOString()
        };

        try {
          await supabase.from('petty_cash_expenses').insert([{
            sn: newExpense.sn,
            person_name: newExpense.personName,
            particulars: newExpense.particulars,
            date: newExpense.date,
            received: newExpense.received,
            amount: newExpense.amount,
            balance: newExpense.balance,
            payment_mode: newExpense.paymentMode,
            group_head: newExpense.groupHead,
            remarks: newExpense.remarks,
            receipt_url: newExpense.image,
            status: 'PENDING'
          }]);
        } catch (e) {
          console.error('Supabase expense insert error:', e);
        }

        await fetchCreditsAndExpenses();
        toast.success(`Expense of ${formatCurrency(formData.amount)} submitted for approval!`);
      }

      // Reset form
      setFormData({
        personName: '',
        date: '',
        amount: '',
        paymentMode: '',
        groupHead: '',
        remarks: '',
        particulars: '',
        received: '',
        balance: ''
      });
      setImage(null);
      setImagePreview('');
      setEditingExpenseId(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setShowFormModal(false);
      setLoading(false);

    } catch (error) {
      console.error(error);
      toast.error('Error submitting expense');
      setLoading(false);
    }
  };

  const handleApproveExpense = async (expense) => {
    try {
      // Update status in Supabase
      await supabase.from('petty_cash_expenses').update({ status: 'APPROVED' }).eq('id', expense.id);

      // Update local state
      setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, status: 'APPROVED' } : e));

      toast.success(`Expense approved!`);
    } catch (error) {
      console.error(error);
      toast.error('Error approving expense');
    }
  };

  const handleRejectExpense = async (expense) => {
    try {
      await supabase.from('petty_cash_expenses').update({ status: 'REJECTED' }).eq('id', expense.id);

      setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, status: 'REJECTED' } : e));
      toast.success(`Expense rejected!`);
    } catch (error) {
      console.error(error);
      toast.error('Error rejecting expense');
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await supabase.from('petty_cash_expenses').delete().eq('id', expense.id);
      setExpenses(prev => prev.filter(e => e.id !== expense.id));
      toast.success('Expense deleted successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Error deleting expense');
    }
  };

  const handleRevertToPending = async (expense) => {
    try {
      await supabase.from('petty_cash_expenses').update({ status: 'PENDING' }).eq('id', expense.id);
      setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, status: 'PENDING' } : e));
      toast.success('Expense moved back to pending!');
    } catch (error) {
      console.error(error);
      toast.error('Error updating status');
    }
  };

  const handleEditExpense = (expense) => {
    setFormData({
      personName: expense.person_name || expense.personName || '',
      date: expense.date || '',
      amount: expense.amount || '',
      paymentMode: expense.payment_mode || expense.paymentMode || '',
      groupHead: expense.group_head || expense.groupHead || '',
      remarks: expense.remarks || '',
      particulars: expense.particulars || '',
      received: expense.received || '',
      balance: expense.balance || ''
    });
    setEditingExpenseId(expense.id);
    setImagePreview(expense.receipt_url || expense.image || '');
    setImage(expense.receipt_url || expense.image || '');
    setShowFormModal(true);
  };

  const handleImageView = (imageBase64) => {
    setSelectedImage(imageBase64);
    setShowImageModal(true);
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header Row: Tabs + Filters + Add Button */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3 w-full pb-2 border-b border-gray-100">
        
        {/* Tabs Row */}
        <div className="flex gap-2 w-full lg:w-auto flex-shrink-0 border-b lg:border-none border-gray-100 pb-2 lg:pb-0 mb-1 lg:mb-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-1.5 px-3 font-bold transition text-[11px] md:text-sm rounded-md whitespace-nowrap ${activeTab === 'pending'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            Pending ({pendingExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 px-3 font-bold transition text-[11px] md:text-sm rounded-md whitespace-nowrap ${activeTab === 'history'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            History ({approvedExpenses.length + rejectedExpenses.length})
          </button>
        </div>

        {/* Filters and Search Container */}
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center flex-1">
          
          {/* Search + Add + Filter Button Row (Mobile grouping) */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search all fields..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
              />
            </div>
            {/* Mobile Filter Button */}
            <button
               onClick={() => setShowMobileFilters(!showMobileFilters)}
               className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={14} />
            </button>
            {/* Mobile Add Button */}
            <button
               onClick={() => setShowFormModal(true)}
               className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Filters */}
          <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:flex grid-cols-2 md:grid-cols-4 lg:flex-row lg:flex-wrap gap-2 w-full lg:w-auto lg:flex-[5] items-center`}>
            <input
              type="text"
              placeholder="From Date"
              onFocus={(e) => (e.target.type = 'date')}
              onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full lg:min-w-[110px] lg:flex-1 bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
            />
            <input
              type="text"
              placeholder="To Date"
              onFocus={(e) => (e.target.type = 'date')}
              onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full lg:min-w-[110px] lg:flex-1 bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
            />
            <SearchableSelect
              value={filters.personName}
              onChange={(val) => setFilters({ ...filters, personName: val })}
              className="w-full lg:min-w-[130px] lg:flex-1"
              options={[
                { value: '', label: 'All Persons' },
                ...Array.from(new Set(expenses.map(e => e.person_name || e.personName))).filter(Boolean).map(person => ({ value: person, label: person }))
              ]}
            />
            <SearchableSelect
              value={filters.mode}
              onChange={(val) => setFilters({ ...filters, mode: val })}
              className="w-full lg:min-w-[120px] lg:flex-1"
              options={[
                { value: '', label: 'All Modes' },
                ...Array.from(new Set(paymentModes.map(pm => pm.payment_mode))).map(mode => ({ value: mode, label: mode }))
              ]}
            />
            <SearchableSelect
              value={filters.groupHead}
              onChange={(val) => setFilters({ ...filters, groupHead: val })}
              className="w-full lg:min-w-[130px] lg:flex-1"
              options={[
                { value: '', label: 'All Groups' },
                ...Array.from(new Set(groupHeads.map(gh => gh.group_head))).map(gh => ({ value: gh, label: gh }))
              ]}
            />
            {activeTab === 'history' && (
              <SearchableSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                className="w-full lg:min-w-[130px] lg:flex-1"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' }
                ]}
              />
            )}
          </div>
        </div>

        {/* Desktop Add Button */}
        <button
           onClick={() => setShowFormModal(true)}
           className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 whitespace-nowrap"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Form Section Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 md:p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] md:max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">{editingExpenseId ? 'Edit Expense' : 'Expense Entry Form'}</h2>
                <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wider">Jai Bhole Groups</p>
              </div>
              <button type="button" onClick={() => {
                setShowFormModal(false);
                setEditingExpenseId(null);
                setFormData({ personName: '', date: '', amount: '', paymentMode: '', groupHead: '', remarks: '', particulars: '', received: '', balance: '' });
                setImage(null);
                setImagePreview('');
              }} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors rounded-full p-1.5">
                <X size={18} />
              </button>
            </div>
            <div className="p-3 md:p-5 overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4">
                  {/* DATE */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Date *</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[13px] bg-white transition-shadow" required />
                  </div>

                  {/* PARTICULARS */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Particulars</label>
                    <input type="text" value={formData.particulars || ''} onChange={(e) => setFormData({ ...formData, particulars: e.target.value })} placeholder="Enter particulars" className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[13px] bg-white transition-shadow" />
                  </div>

                  {/* PAID */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Paid (₹) *</label>
                    <input type="number" step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[13px] bg-white transition-shadow" required />
                    {formData.personName && (
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        Available Balance: <span className={
                          (selectedPersonBalance + (parseFloat(formData.received) || 0)) >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
                        }>{formatCurrency(selectedPersonBalance + (parseFloat(formData.received) || 0))}</span>
                      </p>
                    )}
                  </div>

                  {/* BALANCE */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Balance (₹)</label>
                    <input type="text" value={formData.balance || ''} readOnly placeholder="Auto calculated" className="w-full border border-slate-200 bg-slate-50 text-slate-500 font-medium rounded-md px-2.5 py-1.5 focus:outline-none text-[13px] cursor-not-allowed" />
                  </div>

                  {/* PAID TO */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Paid To *</label>
                    <input type="text" value={formData.personName || ''} onChange={(e) => setFormData({ ...formData, personName: e.target.value })} placeholder="Enter person name" className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[13px] bg-white transition-shadow" required />
                  </div>

                  {/* APPROVED BY */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Approved By *</label>
                    <select value={formData.groupHead} onChange={(e) => handleDropdownChange(e, 'groupHead')} className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[13px] bg-white transition-shadow" required>
                      <option value="">Select Head</option>
                      {groupHeads.map((gh) => (
                        <option key={gh.id} value={gh.group_head}>{gh.group_head}</option>
                      ))}
                      <option value="ADD_NEW_HEAD" className="font-bold text-indigo-600">+ Add New Head...</option>
                    </select>
                  </div>

                  {/* PAYMENT MODE */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Payment Mode *</label>
                    <select value={formData.paymentMode} onChange={(e) => handleDropdownChange(e, 'paymentMode')} className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[13px] bg-white transition-shadow" required>
                      <option value="">Select Mode</option>
                      {paymentModes.map((pm) => (
                        <option key={pm.id} value={pm.payment_mode}>{pm.payment_mode}</option>
                      ))}
                      <option value="ADD_NEW_MODE" className="font-bold text-indigo-600">+ Add New Mode...</option>
                    </select>
                  </div>
                </div>

                {/* REMARKS */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Remarks</label>
                  <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Add any remarks..." rows="2" className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[13px] transition-shadow resize-none" />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                    Upload Receipt (Optional)
                  </label>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 rounded-lg p-3 md:p-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center cursor-pointer group"
                    >
                      <div className="bg-indigo-100/50 text-indigo-600 p-2 rounded-full mb-1 group-hover:scale-110 transition-transform">
                        <Upload size={16} />
                      </div>
                      <span className="text-[13px] font-medium text-slate-700">
                        Click to upload receipt
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 2MB</span>
                    </button>

                    {imagePreview && (
                      <div className="mt-2.5">
                        <div className="relative inline-block group">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-lg border border-slate-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImage(null);
                              setImagePreview('');
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-white text-rose-500 rounded-full p-1 shadow-md hover:bg-rose-50 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X size={12} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-70 transition-all shadow-sm shadow-indigo-200 text-sm flex justify-center items-center gap-2"
                  >
                    {loading ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {editingExpenseId ? 'Updating...' : 'Submitting...'}</>
                    ) : (editingExpenseId ? 'Update Expense' : 'Submit Expense')}
                  </button>
                  <button
                    type="reset"
                    className="px-5 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-start gap-1.5 bg-indigo-50/50 p-2 rounded-md border border-indigo-100">
                  <div className="mt-[2px] text-indigo-500 text-[10px]">ℹ️</div>
                  <p className="text-[11px] text-indigo-800 leading-snug font-medium">
                    Expense requests require approval by the group head before they are finalized.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Expenses List Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">

        {/* Mobile View: Cards */}
        <div onScroll={handleScroll} className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {displayedExpenses.map((expense, idx) => (
            <div key={expense.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-1.5 relative flex flex-col gap-1 transition-all">
              {/* Top Row: Info */}
              <div className="flex justify-between items-center mb-0">
                <div className="flex items-center gap-1.5">
                  <div>
                    <span className="text-[8px] font-medium text-gray-400 uppercase tracking-widest block leading-none mb-0.5"># {idx + 1}</span>
                    <h3 className="font-medium text-gray-900 text-[11px] uppercase tracking-tight leading-none mt-[2px]">
                      {expense.person_name || expense.personName}
                    </h3>
                    <span className="text-[7px] font-medium text-indigo-500 uppercase tracking-wider bg-indigo-50/50 px-1 rounded mt-0.5 inline-block">{expense.group_head || expense.groupHead}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-[1px]">
                  <span className="font-medium text-rose-600 text-[12px] tracking-tight leading-none">{formatCurrency(expense.amount)}</span>
                  <div className="flex gap-1" >
                    {activeTab === 'history' && (
                      <span className={`px-1 py-[1px] rounded text-[7px] font-medium tracking-widest uppercase leading-none ${expense.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {expense.status}
                      </span>
                    )}
                    <span className="bg-sky-100/80 text-sky-700 px-1 py-[1px] rounded text-[7px] font-medium tracking-widest uppercase leading-none">
                      {expense.payment_mode || expense.paymentMode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remarks and Date */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded p-1.5 border border-slate-100">
                <div className="flex items-center gap-1 mb-0.5 border-b border-slate-200/60 pb-0.5">
                   <Calendar size={9} className="text-indigo-400" />
                   <span className="text-[9px] font-medium text-slate-700 tracking-tight leading-none mt-[1px]">{formatDate(expense.date)}</span>
                   <span className="text-[8px] text-slate-400 font-medium ml-auto tracking-wider leading-none mt-[1px]">REF: {expense.sn}</span>
                </div>
                <div>
                  <p className="text-[8px] text-indigo-500 font-medium mb-0 uppercase tracking-wider leading-none">Remarks</p>
                  <p className="text-slate-700 text-[10px] leading-snug font-normal mt-[1px]">{expense.remarks || 'No remarks provided.'}</p>
                </div>
              </div>

              {/* Actions & Image */}
              <div className="flex flex-col gap-1">
                {activeTab === 'pending' && (
                  <div className="flex flex-col gap-1.5 mt-0">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleApproveExpense(expense)}
                        className="bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white hover:from-emerald-600 hover:to-emerald-500 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 shadow-sm shadow-emerald-200 transition-all"
                      >
                        <Check size={11} strokeWidth={2.5} /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectExpense(expense)}
                        className="bg-rose-50 text-rose-600 hover:bg-rose-100 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all"
                      >
                        <XCircle size={11} strokeWidth={2} /> Reject
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => handleEditExpense(expense)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all">
                        <Edit2 size={11} /> Edit
                      </button>
                      <button onClick={() => handleDeleteExpense(expense)} className="bg-red-50 text-red-600 hover:bg-red-100 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all">
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                )}
                
                {activeTab === 'history' && (
                  <div className="grid grid-cols-3 gap-1.5 mt-0">
                    <button onClick={() => handleRevertToPending(expense)} className="bg-orange-50 text-orange-600 hover:bg-orange-100 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all">
                      <RotateCcw size={11} /> Pending
                    </button>
                    <button onClick={() => handleEditExpense(expense)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all">
                      <Edit2 size={11} /> Edit
                    </button>
                    <button onClick={() => handleDeleteExpense(expense)} className="bg-red-50 text-red-600 hover:bg-red-100 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                )}

                {expense.image && (
                  <button onClick={() => handleImageView(expense.image)} className="text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 py-1 rounded text-[9px] font-medium flex items-center justify-center gap-1 transition-colors w-full">
                    <Eye size={10} strokeWidth={2} /> View Attached Receipt
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredExpenses.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">
              No entries found.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div onScroll={handleScroll} className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="bg-red-600 border-b-2 border-red-700 p-2 text-center shadow-sm sticky top-0 z-20">
            <h1 className="text-white font-bold text-lg md:text-2xl tracking-wider uppercase">JAI BHOLE GROUPS OF COMPANIES</h1>
          </div>
          <div className="bg-red-50 p-2 text-center border-b-2 border-red-200 sticky top-[48px] z-20">
             <h2 className="text-red-800 font-bold text-md md:text-xl tracking-wide uppercase" style={{ fontFamily: 'serif' }}>PETTY CASH REGISTER (EXPENSES)</h2>
          </div>
          <table className="w-full min-w-[900px] relative border-collapse border border-red-200">
            <thead className="bg-red-100 border-b border-red-200 sticky top-[90px] z-10 shadow-sm">
              <tr>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200 w-10">S.NO</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200 w-24">DATE</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">PARTICULARS</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">RECEIVED</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">PAID</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">BALANCE</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">PAID TO</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">APPROVED BY</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">REMARKS</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">ACTION / STATUS</th>
              </tr>
            </thead>
            <tbody>
              {displayedExpenses.map((expense, idx) => {
                const sNo = idx + 1;
                const particulars = expense.particulars || 'CASH';

                return (
                  <tr key={expense.id} className="bg-white hover:bg-red-50/50 border-b border-gray-200">
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-200 font-medium">{sNo}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-200 whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 font-bold text-gray-800">{particulars}</td>
                    <td className="px-2 py-1.5 text-right text-xs border border-gray-300 font-medium">{expense.received ? formatCurrency(expense.received) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-xs border border-gray-300 font-bold text-red-600 bg-red-50">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs border border-gray-300 font-medium text-blue-700">{expense.balance ? formatCurrency(expense.balance) : '-'}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 uppercase">{expense.person_name || expense.personName}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 uppercase">{expense.group_head || expense.groupHead || '-'}</td>
                    <td className="px-2 py-1.5 text-left text-xs border border-gray-300 truncate max-w-[150px] uppercase">{expense.remarks || '-'}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300">
                      {activeTab === 'pending' ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleApproveExpense(expense)}
                              className="text-green-600 hover:text-green-800 flex items-center gap-1 font-medium"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleRejectExpense(expense)}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1 font-medium"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleEditExpense(expense)} title="Edit" className="text-blue-500 hover:text-blue-700"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteExpense(expense)} title="Delete" className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 items-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${expense.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {expense.status}
                          </span>
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => handleRevertToPending(expense)} title="Revert to Pending" className="text-orange-500 hover:text-orange-700"><RotateCcw size={14} /></button>
                            <button onClick={() => handleEditExpense(expense)} title="Edit" className="text-blue-500 hover:text-blue-700"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteExpense(expense)} title="Delete" className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredExpenses.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No entries found.
            </div>
          )}
        </div>

        {/* Footer & Totals */}
        <div className="px-2 md:px-4 py-2 border-t border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4 rounded-b-lg pb-2 md:pb-3">

          {/* Mobile Totals Row */}
          {displayedExpenses.length > 0 && (
            <div className="flex w-full lg:w-auto justify-between lg:hidden items-center text-xs border-b border-gray-200 pb-2 mb-1 px-1">
              <div className="flex flex-col"><span className="text-gray-500 text-[9px] uppercase font-medium tracking-wider mb-0.5">Loaded Total</span> <span className="font-medium text-rose-600 text-[13px]">{formatCurrency(pageTotalAmount)}</span></div>
              <div className="flex flex-col text-right"><span className="text-gray-500 text-[9px] uppercase font-medium tracking-wider mb-0.5">Total Filtered</span> <span className="font-medium text-gray-900 text-[13px]">{formatCurrency(totalAmount)}</span></div>
            </div>
          )}

          {/* Desktop Totals (Hidden on Mobile) */}
          {displayedExpenses.length > 0 && (
            <div className="hidden lg:flex items-center justify-end w-full gap-6 text-sm">
              <div><span className="text-gray-600">Loaded Total:</span> <span className="font-semibold text-rose-600 ml-1">{formatCurrency(pageTotalAmount)}</span></div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div><span className="text-gray-500 text-xs mr-1">Filtered Total:</span> <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span></div>
            </div>
          )}
          
          {displayedExpenses.length > 0 && (
            <div className="text-[10px] md:text-sm text-gray-500 w-full lg:w-auto text-center lg:text-left mt-1 lg:mt-0 font-medium">
              Showing {displayedExpenses.length} of {sortedExpenses.length}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Image Preview</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <img src={selectedImage} alt="Expense" className="w-full rounded" />
          </div>
        </div>
      )}
      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-[60] p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-bold text-slate-800">
                {addModalType === 'head' ? 'Add New Approved By' : 'Add New Payment Mode'}
              </h2>
              <button type="button" onClick={handleAddNewCancel} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors rounded-full p-1.5">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddNewSubmit} className="p-5">
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  {addModalType === 'head' ? 'Approved By Name' : 'Payment Mode Name'} *
                </label>
                <input
                  type="text"
                  value={addModalValue}
                  onChange={(e) => setAddModalValue(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[13px] transition-shadow"
                  placeholder={`Enter ${addModalType === 'head' ? 'head name' : 'payment mode'}...`}
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleAddNewCancel}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-sm text-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
