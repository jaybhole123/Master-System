import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import SearchableSelect from '../../../components/SearchableSelect';
import toast from 'react-hot-toast';
import { Upload, X, Eye, Plus, Filter, Search, ChevronLeft, ChevronRight, Calendar, MapPin, Briefcase, FileText, Check, File, FileDown, Navigation, Edit2, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import supabase from '../../../SupabaseClient';

import {
  generateId,
  generateSerialNumber,
  formatDate,
  formatDateForInput,
  formatCurrency,
  fileToBase64,
  getTodayDate,
  createLedgerEntry,
  calculateBalance
} from '../utils/helpers';

export default function AddCase() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const [credits, setCredits] = useState([]);
  const [expenses, setExpenses] = useState([]); // Needed for calculateBalance
  // Payment Modes State
  const [paymentModes, setPaymentModes] = useState([]);
  const [loadingPaymentModes, setLoadingPaymentModes] = useState(true);

  const [formData, setFormData] = useState({
    personName: '',
    date: '',
    amount: '',
    paymentMode: '',
    remarks: '',
    particulars: '',
    paid: '',
    balance: '',
    approvedBy: ''
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCreditId, setEditingCreditId] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayDate());
  const dateInputRef = useRef(null);

  const [filters, setFilters] = useState({
    personName: '',
    mode: '',
    searchQuery: ''
  });

  const [visibleCount, setVisibleCount] = useState(50);

  const handlePrevDay = () => {
    if (!selectedDateStr) return;
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    setSelectedDateStr(formatDateForInput(date));
  };

  const handleNextDay = () => {
    if (!selectedDateStr) return;
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    setSelectedDateStr(formatDateForInput(date));
  };

  const handleToday = () => {
    setSelectedDateStr(getTodayDate());
  };

  const formatSelectedDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleOpenAddModal = () => {
    setFormData({
      personName: '',
      date: selectedDateStr,
      amount: '',
      paymentMode: '',
      remarks: '',
      particulars: 'CASH',
      paid: '',
      balance: '',
      approvedBy: ''
    });
    setEditingCreditId(null);
    setImage(null);
    setImagePreview('');
    setShowFormModal(true);
  };

  const fetchCredits = async () => {
    try {
      const { data: creditsData } = await supabase.from('petty_cash_addcash_credits').select('*');
      if (creditsData) setCredits(creditsData);
    } catch (err) {}
  };

  // Fetch payment modes from petty_cash_setting
  const fetchPaymentModes = async () => {
    setLoadingPaymentModes(true);
    const { data, error } = await supabase
      .from('petty_cash_setting')
      .select('id, payment_mode')
      .not('payment_mode', 'is', null);
    if (error) {
      toast.error('Failed to load payment modes');
    } else {
      setPaymentModes(data || []);
    }
    setLoadingPaymentModes(false);
  };

  useEffect(() => {
    fetchCredits();
    fetchPaymentModes();
  }, []);

  useEffect(() => {
    setVisibleCount(50);
  }, [filters, selectedDateStr]);

  const filteredCredits = credits.filter(credit => {
    const personName = credit.person_name || credit.personName;
    const paymentMode = credit.payment_mode || credit.paymentMode;

    if (selectedDateStr && credit.date !== selectedDateStr) return false;
    if (filters.personName && personName !== filters.personName) return false;
    if (filters.mode && paymentMode !== filters.mode) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match = (
        (credit.sn && String(credit.sn).toLowerCase().includes(q)) ||
        (personName && personName.toLowerCase().includes(q)) ||
        (credit.date && credit.date.includes(q)) ||
        (credit.amount && String(credit.amount).toLowerCase().includes(q)) ||
        (paymentMode && paymentMode.toLowerCase().includes(q)) ||
        (credit.remarks && credit.remarks.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    return true;
  });

  const sortedCredits = filteredCredits.slice().reverse();
  const displayedCredits = sortedCredits.slice(0, visibleCount);

  const pageTotalAmount = displayedCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalAmount = sortedCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (visibleCount < sortedCredits.length) {
        setVisibleCount(prev => prev + 50);
      }
    }
  };

  const handleDeleteCredit = async (credit) => {
    if (!window.confirm('Are you sure you want to delete this credit?')) return;
    try {
      await supabase.from('petty_cash_addcash_credits').delete().eq('id', credit.id);
      setCredits(prev => prev.filter(c => c.id !== credit.id));
      toast.success('Credit deleted successfully!');
    } catch (error) {
      toast.error('Error deleting credit');
    }
  };

  const handleEditCredit = (credit) => {
    setFormData({
      personName: credit.person_name || credit.personName || '',
      date: credit.date || '',
      amount: credit.amount || '',
      paymentMode: credit.payment_mode || credit.paymentMode || '',
      remarks: credit.remarks || '',
      particulars: credit.particulars || 'CASH',
      paid: '',
      balance: '',
      approvedBy: ''
    });
    setEditingCreditId(credit.id);
    setImagePreview(credit.receipt_url || credit.image || '');
    setImage(credit.receipt_url || credit.image || '');
    setShowFormModal(true);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.personName.trim()) {
      toast.error('Please enter person name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter valid credit amount');
      return;
    }

    try {
      setLoading(true);

      if (editingCreditId) {
        const updateData = {
          person_name: formData.personName,
          date: formData.date,
          amount: parseFloat(formData.amount),
          payment_mode: formData.paymentMode,
          particulars: formData.particulars || 'CASH',
          receipt_url: image || '',
          remarks: formData.remarks
        };
        await supabase.from('petty_cash_addcash_credits').update(updateData).eq('id', editingCreditId);
        await fetchCredits();
        toast.success('Credit updated successfully!');
      } else {
        const newCredit = {
          sn: generateSerialNumber(),
          person_name: formData.personName,
          date: formData.date,
          amount: parseFloat(formData.amount),
          payment_mode: formData.paymentMode,
          particulars: formData.particulars || 'CASH',
          receipt_url: image || '',
          remarks: formData.remarks,
          status: 'APPROVED'
        };

        // Save credit to Supabase
        const { data: insertedCreditData, error: creditError } = await supabase
          .from('petty_cash_addcash_credits')
          .insert([newCredit])
          .select()
          .single();
          
        if (creditError) {
          console.error('Supabase credit insert error:', creditError);
        }

        // Fetch expenses on demand for balance calculation
        let currentExpenses = [];
        try {
          const { data: expensesData } = await supabase.from('petty_cash_expenses').select('*').eq('status', 'APPROVED');
          if (expensesData) currentExpenses = expensesData;
        } catch (err) {}

        // Calculate new balance
        const newBalance = calculateBalance(
          formData.personName,
          [...credits, { ...newCredit, personName: newCredit.person_name }], // optimistic
          currentExpenses
        );

        // Create ledger entry
        const ledgerEntry = {
          ref_id: insertedCreditData ? insertedCreditData.id : generateId(),
          person_name: formData.personName,
          type: 'CREDIT',
          amount: parseFloat(formData.amount),
          date: formData.date,
          reference: newCredit.sn,
          balance: newBalance
        };

        // Save to Supabase ledger if available
        try {
          await supabase.from('ledger').insert([ledgerEntry]);
        } catch(e) {}

        await fetchCredits();
        toast.success(`Credit of ${formatCurrency(formData.amount)} added successfully!`);
      }

      // Reset form
      setFormData({
        personName: '',
        date: '',
        amount: '',
        paymentMode: '',
        remarks: '',
        particulars: '',
        paid: '',
        balance: '',
        approvedBy: ''
      });
      setImage(null);
      setImagePreview('');
      setEditingCreditId(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setShowFormModal(false);
      setLoading(false);

    } catch (error) {
      console.error(error);
      toast.error('Error adding credit');
      setLoading(false);
    }
  };

  const handleImageView = (imageBase64) => {
    setSelectedImage(imageBase64);
    setShowImageModal(true);
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full">
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">

          {/* Search + Add Filter Button Row (Mobile grouping) */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search all fields..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
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
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Filters */}
          <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:flex grid-cols-2 md:grid-cols-4 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[4] items-center`}>
            {/* Day Navigation Control */}
            <div className="col-span-2 lg:flex-1 w-full lg:min-w-[320px] flex-shrink-0">
              <div className="flex items-center justify-between bg-white border border-gray-300 rounded-lg lg:rounded p-1 text-gray-700 h-[32px] md:h-[38px] relative w-full shadow-sm overflow-hidden">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 hover:bg-gray-100 active:bg-gray-200 rounded border border-gray-200 transition text-gray-600 flex-shrink-0"
                    title="Previous Day"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className={`px-2 py-0.5 rounded transition text-[11px] md:text-xs font-semibold flex-shrink-0 ${selectedDateStr === getTodayDate() ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDateStr('')}
                    className={`px-2 py-0.5 rounded transition text-[11px] md:text-xs font-semibold flex-shrink-0 ${!selectedDateStr ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={handleNextDay}
                    className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 hover:bg-gray-100 active:bg-gray-200 rounded border border-gray-200 transition text-gray-600 flex-shrink-0"
                    title="Next Day"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="h-5 w-px bg-gray-200 mx-1 flex-shrink-0"></div>
                <button
                  type="button"
                  onClick={() => {
                    if (dateInputRef.current) {
                      if (typeof dateInputRef.current.showPicker === 'function') {
                        dateInputRef.current.showPicker();
                      } else {
                        dateInputRef.current.click();
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 rounded transition text-xs md:text-sm font-semibold text-gray-700 cursor-pointer flex-shrink-0"
                >
                  <Calendar size={14} className="text-indigo-600 flex-shrink-0" />
                  <span className="font-semibold text-gray-800 whitespace-nowrap flex-shrink-0">{selectedDateStr ? formatSelectedDateDisplay(selectedDateStr) : 'All Dates'}</span>
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                />
              </div>
            </div>
             <SearchableSelect
               value={filters.personName}
               onChange={(val) => setFilters({ ...filters, personName: val })}
               className="w-full"
               options={[
                 { value: '', label: 'All Persons' },
                 ...Array.from(new Set(credits.map(c => c.person_name || c.personName))).map(person => ({ value: person, label: person }))
               ]}
             />
             <SearchableSelect
               value={filters.mode}
               onChange={(val) => setFilters({ ...filters, mode: val })}
               className="w-full"
               options={[
                 { value: '', label: 'All Modes' },
                 ...paymentModes.map(pm => ({ value: pm.payment_mode, label: pm.payment_mode }))
               ]}
             />
          </div>
        </div>

        {/* Desktop Add Button */}
        <button
          onClick={handleOpenAddModal}
          className="hidden lg:flex bg-red-600 hover:bg-red-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 mt-2 lg:mt-0"
        >
          <Plus size={16} /> Add Cash
        </button>
      </div>

      {/* Form Section Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-2 md:p-4 border-b-2 border-red-700 flex justify-between items-center bg-red-600 flex-shrink-0">
              <h2 className="text-base md:text-xl font-bold text-white uppercase tracking-wider">{editingCreditId ? 'EDIT CREDIT' : 'JAI BHOLE GROUPS - CREDIT ENTRY FORM'}</h2>
              <button type="button" onClick={() => {
                setShowFormModal(false);
                setEditingCreditId(null);
                setFormData({ personName: '', date: '', amount: '', paymentMode: '', remarks: '', particulars: '', paid: '', balance: '', approvedBy: '' });
                setImage(null);
                setImagePreview('');
              }} className="text-red-100 hover:text-white transition-colors bg-red-800 rounded-full p-1 shadow-sm">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="p-3 md:p-5 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-2 md:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                  {/* DATE */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-bold text-gray-700 mb-0.5 md:mb-2 uppercase">DATE *</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]" required />
                  </div>

                  {/* PARTICULARS */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-bold text-gray-700 mb-0.5 md:mb-2 uppercase">PARTICULARS *</label>
                    <input type="text" value={formData.particulars} onChange={(e) => setFormData({ ...formData, particulars: e.target.value })} placeholder="e.g. CASH" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]" required />
                  </div>

                  {/* RECEIVED */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-bold text-gray-700 mb-0.5 md:mb-2 uppercase">RECEIVED (₹) *</label>
                    <input 
                      type="text" 
                      value={formData.amount !== '' && formData.amount != null ? formData.amount.toString().split('.').map((p, i) => i === 0 ? (p ? new Intl.NumberFormat('en-IN').format(p) : '0') : p).join('.') : ''} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/,/g, '');
                        if (/^\d*\.?\d*$/.test(val)) {
                          setFormData({ ...formData, amount: val });
                        }
                      }} 
                      placeholder="0.00" 
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]" 
                      required 
                    />
                  </div>



                  {/* RECEIVED FROM */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-bold text-gray-700 mb-0.5 md:mb-2 uppercase">RECEIVED FROM *</label>
                    <input type="text" value={formData.personName} onChange={(e) => setFormData({ ...formData, personName: e.target.value })} placeholder="Enter person name" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]" required />
                  </div>



                  {/* PAYMENT MODE */}
                  <div>
                      <label className="block text-[11px] md:text-sm font-bold text-gray-700 mb-0.5 md:mb-2 uppercase">PAYMENT MODE *</label>
                      <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]">
                        <option value="">Select Mode</option>
                        {paymentModes.map(pm => (
                          <option key={pm.id} value={pm.payment_mode}>{pm.payment_mode}</option>
                        ))}
                      </select>
                  </div>
                </div>

                {/* REMARKS */}
                <div>
                  <label className="block text-[11px] md:text-sm font-bold text-gray-700 mb-0.5 md:mb-2 uppercase">REMARKS</label>
                  <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Add any remarks..." rows="2" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base" />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-2">
                    Upload Image (Optional)
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
                      className="w-full border border-dashed border-gray-300 rounded-lg p-2 md:p-4 hover:border-sky-400 hover:bg-sky-50 transition flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="text-gray-400 mb-0.5 md:mb-2 w-5 h-5 md:w-7 md:h-7" />
                      <span className="text-[11px] md:text-sm font-medium text-gray-700">
                        Click to upload
                      </span>
                    </button>

                    {imagePreview && (
                      <div className="mt-2 md:mt-4">
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-20 w-20 md:h-40 md:w-40 object-cover rounded border border-gray-200"
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
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 md:p-1 hover:bg-red-600"
                          >
                            <X size={12} className="md:w-4 md:h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-2 md:gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-1.5 px-4 md:py-2 md:px-6 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition text-[12px] md:text-base"
                  >
                    {loading ? (editingCreditId ? 'Updating...' : 'Adding Credit...') : (editingCreditId ? 'Update Credit' : 'Add Credit')}
                  </button>
                  <button
                    type="reset"
                    className="px-4 py-1.5 md:px-6 md:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-[12px] md:text-base"
                  >
                    Reset
                  </button>
                </div>

                <p className="text-[10px] md:text-xs text-gray-500 bg-blue-50 p-2 md:p-3 rounded border border-blue-200">
                  ℹ️ Credits are auto-approved and will be reflected in the ledger immediately.
                </p>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* List Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">
        {/* Mobile View: Cards */}
        <div onScroll={handleScroll} className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {displayedCredits.map((credit, idx) => (
            <div key={credit.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-1.5 relative flex flex-col gap-1 transition-all">
              {/* Top Row: SN and Badge */}
              <div className="flex justify-between items-center mb-0">
                <div className="flex items-center gap-1.5">
                  <div>
                    <span className="text-[8px] font-medium text-gray-400 uppercase tracking-widest block leading-none mb-0.5"># {idx + 1}</span>
                    <h3 className="font-medium text-gray-900 text-[11px] uppercase tracking-tight leading-none mt-[2px]">
                      {credit.person_name || credit.personName}
                    </h3>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-[1px]">
                  <span className="font-medium text-emerald-600 text-[12px] tracking-tight leading-none">{formatCurrency(credit.amount)}</span>
                  <div className="bg-sky-100/80 text-sky-700 px-1 py-[1px] rounded text-[7px] font-medium tracking-widest uppercase mt-[2px] leading-none">
                    {credit.payment_mode || credit.paymentMode}
                  </div>
                </div>
              </div>

              {/* Remarks Box */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded p-1.5 border border-slate-100">
                <div className="flex items-center gap-1 mb-0.5 border-b border-slate-200/60 pb-0.5">
                  <Calendar size={9} className="text-indigo-400" />
                  <span className="text-[9px] font-medium text-slate-700 tracking-tight leading-none mt-[1px]">{formatDate(credit.date)}</span>
                  <span className="text-[8px] text-slate-400 font-medium ml-auto tracking-wider leading-none mt-[1px]">REF: {credit.sn}</span>
                </div>
                <div>
                  <p className="text-[8px] text-indigo-500 font-medium mb-0 uppercase tracking-wider leading-none">Remarks</p>
                  <p className="text-slate-700 text-[10px] leading-snug font-normal mt-[1px]">{credit.remarks || 'No remarks provided.'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-0">
                <button onClick={() => handleEditCredit(credit)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all">
                  <Edit2 size={11} /> Edit
                </button>
                <button onClick={() => handleDeleteCredit(credit)} className="bg-red-50 text-red-600 hover:bg-red-100 py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all">
                  <Trash2 size={11} /> Delete
                </button>
              </div>

              {/* View Image Action */}
              {credit.image && (
                <div className="mt-0 flex justify-end">
                  <button onClick={() => handleImageView(credit.image)} className="text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 py-1 rounded text-[9px] font-medium flex items-center gap-1.5 transition-colors w-full justify-center">
                    <Eye size={10} strokeWidth={2} /> View Attached Receipt
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredCredits.length === 0 && (
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
             <h2 className="text-red-800 font-bold text-md md:text-xl tracking-wide uppercase" style={{ fontFamily: 'serif' }}>PETTY CASH REGISTER (CREDITS)</h2>
          </div>
          <table className="w-full min-w-[900px] relative border-collapse border border-red-200">
            <thead className="bg-red-100 border-b border-red-200 sticky top-[90px] z-10 shadow-sm">
              <tr>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200 w-10">S.NO</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200 w-24">DATE</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">PARTICULARS</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">RECEIVED (₹)</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">RECEIVED FROM</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">PAYMENT MODE</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">REMARKS</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {displayedCredits.map((credit, idx) => {
                const sNo = idx + 1;
                const particulars = credit.particulars || 'CASH';

                return (
                  <tr key={credit.id} className="bg-white hover:bg-red-50/50 border-b border-gray-200">
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-200 font-medium">{sNo}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-200 whitespace-nowrap">{formatDate(credit.date)}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-200 font-bold text-red-800 bg-red-50/50">
                      {particulars}
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs border border-gray-200 font-bold bg-red-50/30 text-red-700">
                      {formatCurrency(credit.amount)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 uppercase">{credit.person_name || credit.personName}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 uppercase">{credit.payment_mode || credit.paymentMode}</td>
                    <td className="px-2 py-1.5 text-left text-xs border border-gray-300 truncate max-w-[150px] uppercase">{credit.remarks || '-'}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditCredit(credit)} title="Edit" className="text-blue-500 hover:text-blue-700"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteCredit(credit)} title="Delete" className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCredits.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No entries found.
            </div>
          )}
        </div>

        {/* Footer & Totals */}
        <div className="px-2 md:px-4 py-2 border-t border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4 rounded-b-lg pb-2 md:pb-3">

          {/* Mobile Totals Row */}
          {displayedCredits.length > 0 && (
            <div className="flex w-full lg:w-auto justify-between lg:hidden items-center text-xs border-b border-gray-200 pb-2 mb-1 px-1">
              <div className="flex flex-col"><span className="text-gray-500 text-[9px] uppercase font-medium tracking-wider mb-0.5">Loaded Total</span> <span className="font-medium text-emerald-600 text-[13px]">{formatCurrency(pageTotalAmount)}</span></div>
              <div className="flex flex-col text-right"><span className="text-gray-500 text-[9px] uppercase font-medium tracking-wider mb-0.5">Total Filtered</span> <span className="font-medium text-gray-900 text-[13px]">{formatCurrency(totalAmount)}</span></div>
            </div>
          )}

          {/* Desktop Totals (Hidden on Mobile) */}
          {displayedCredits.length > 0 && (
            <div className="hidden lg:flex items-center justify-end w-full gap-6 text-sm">
              <div><span className="text-gray-600">Loaded Total:</span> <span className="font-semibold text-emerald-600 ml-1">{formatCurrency(pageTotalAmount)}</span></div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div><span className="text-gray-500 text-xs mr-1">Filtered Total:</span> <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span></div>
            </div>
          )}
          
          {displayedCredits.length > 0 && (
            <div className="text-[10px] md:text-sm text-gray-500 w-full lg:w-auto text-center lg:text-left mt-1 lg:mt-0 font-medium">
              Showing {displayedCredits.length} of {sortedCredits.length}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
            <img src={selectedImage} alt="Credit" className="w-full rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
