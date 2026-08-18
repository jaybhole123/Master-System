import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import supabase from '../../../SupabaseClient';
import { formatDate, formatDateForInput, getTodayDate, formatCurrency, isDateInRange } from '../utils/helpers';
import SearchableSelect from '../../../components/SearchableSelect';

const DEFAULT_USERS = [
  { id: 'admin', name: 'Admin User', password: 'admin123', role: 'ADMIN' },
  { id: 'user', name: 'Employee 1', password: 'user123', role: 'USER' },
  { id: 'user2', name: 'Employee 2', password: 'user123', role: 'USER' }
];

export default function Ledger() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user } = useAuthStore();
  const [credits, setCredits] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const fetchCredits = async () => {
    try {
      const { data: creditsData } = await supabase.from('petty_cash_addcash_credits').select('*');
      if (creditsData) setCredits(creditsData);
    } catch (e) {}
  };

  const fetchExpenses = async () => {
    try {
      const { data: expensesData } = await supabase.from('petty_cash_expenses').select('*');
      if (expensesData) setExpenses(expensesData);
    } catch (e) {}
  };

  useEffect(() => {
    fetchCredits();
    fetchExpenses();
  }, []);

  const [selectedDateStr, setSelectedDateStr] = useState(getTodayDate());
  const dateInputRef = useRef(null);

  const [filters, setFilters] = useState({
    personName: '',
    transactionType: '',
    remarks: '',
    searchQuery: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedDateStr]);

  const uniquePersonNames = useMemo(() => {
    const namesSet = new Set();
    credits.forEach(c => {
      const name = c.person_name || c.personName;
      if (name) namesSet.add(name);
    });
    expenses.forEach(e => {
      const name = e.person_name || e.personName;
      if (name) namesSet.add(name);
    });
    DEFAULT_USERS.forEach(u => namesSet.add(u.name));
    return Array.from(namesSet);
  }, [credits, expenses]);

  const ledgerData = useMemo(() => {
    const entries = [];
    credits.forEach(c => {
      entries.push({
        id: c.id,
        referenceId: c.sn || c.id,
        personName: c.person_name || c.personName || '',
        type: 'CREDIT',
        amount: parseFloat(c.amount || 0),
        date: c.date,
        remarks: c.remarks || ''
      });
    });

    expenses.filter(e => !e.status || String(e.status).toUpperCase() === 'APPROVED').forEach(e => {
      entries.push({
        id: e.id,
        referenceId: e.sn || e.id,
        personName: e.person_name || e.personName || '',
        groupHead: e.group_head || e.groupHead || '',
        type: 'EXPENSE',
        amount: parseFloat(e.amount || 0),
        date: e.date,
        remarks: e.remarks || ''
      });
    });

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    return entries.map(entry => {
      if (entry.type === 'CREDIT') {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.amount;
      }
      return {
        ...entry,
        balance: runningBalance
      };
    });
  }, [credits, expenses]);

  const uniqueRemarks = useMemo(() => {
    const remarksSet = new Set();
    ledgerData.forEach(entry => {
      if (entry.remarks && entry.remarks.trim()) {
        remarksSet.add(entry.remarks.trim().toUpperCase());
      }
    });
    return Array.from(remarksSet).sort();
  }, [ledgerData]);

  const filteredLedger = useMemo(() => {
    return ledgerData.filter(entry => {
      // Apply date filter
      if (entry.date !== selectedDateStr) {
        return false;
      }

      // Apply person filter (case-insensitive)
      if (filters.personName && entry.personName && entry.personName.toLowerCase() !== filters.personName.toLowerCase()) {
        return false;
      }

      // Apply transaction type filter
      if (filters.transactionType && entry.type !== filters.transactionType) {
        return false;
      }

      // Apply remarks filter
      if (filters.remarks && (!entry.remarks || entry.remarks.trim().toUpperCase() !== filters.remarks.toUpperCase())) {
        return false;
      }

      // Apply search query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const match = (
          (entry.personName && entry.personName.toLowerCase().includes(q)) ||
          (entry.date && entry.date.includes(q)) ||
          (entry.type && entry.type.toLowerCase().includes(q)) ||
          (entry.amount && String(entry.amount).toLowerCase().includes(q)) ||
          (entry.referenceId && String(entry.referenceId).toLowerCase().includes(q)) ||
          (entry.remarks && entry.remarks.toLowerCase().includes(q))
        );
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [ledgerData, filters, selectedDateStr]);

  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);
  const paginatedLedger = filteredLedger.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate statistics
  const statistics = useMemo(() => {
    const filtered = filteredLedger;
    const totalDebit = filtered
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalCredit = filtered
      .filter(e => e.type === 'EXPENSE')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
      entries: filtered.length
    };
  }, [filteredLedger]);

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Person Name', 'Type', 'Amount', 'Balance After', 'Description'];
    const rows = filteredLedger.map(entry => [
      formatDate(entry.date),
      entry.personName,
      entry.type,
      entry.amount,
      entry.balance !== undefined ? entry.balance : entry.balanceAfter, // Fallback dynamically
      `Ref: ${entry.referenceId}`
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petty-cash-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header */}
      {/* Header Filters — single row */}
      {/* Header with Filters */}
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full pb-2 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row w-full gap-2 items-center">
          
          {/* Search + Export Row (Mobile grouping) */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search ref ID, person, amount..."
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
            {/* Mobile Export Button */}
            <button
               onClick={handleDownloadCSV}
               className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
            >
              <Download size={16} />
            </button>
          </div>

          {/* Filters */}
          <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:flex grid-cols-2 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[4] items-center`}>
            {/* Day Navigation Control */}
            <div className="col-span-2 lg:flex-1 w-full lg:min-w-[270px] flex-shrink-0">
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
                    className="hover:bg-gray-100 active:bg-gray-200 px-2 py-0.5 rounded transition text-[11px] md:text-xs font-semibold text-indigo-700 bg-indigo-50/50 flex-shrink-0"
                  >
                    Today
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
                  <span className="font-semibold text-gray-800 whitespace-nowrap flex-shrink-0">{formatSelectedDateDisplay(selectedDateStr)}</span>
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
             <div className="w-full">
                <SearchableSelect
                  value={filters.personName}
                  onChange={(val) => setFilters({ ...filters, personName: val })}
                  className="w-full"
                  options={[
                    { value: '', label: 'All Persons' },
                    ...uniquePersonNames.map(name => ({ value: name, label: name }))
                  ]}
                />
             </div>
             <div className="w-full">
               <SearchableSelect
                 value={filters.transactionType}
                 onChange={(val) => setFilters({ ...filters, transactionType: val })}
                 className="w-full"
                 options={[
                   { value: '', label: 'All Types' },
                   { value: 'CREDIT', label: 'Credit' },
                   { value: 'EXPENSE', label: 'Expense' }
                 ]}
               />
             </div>
             <div className="w-full">
                <SearchableSelect
                  value={filters.remarks}
                  onChange={(val) => setFilters({ ...filters, remarks: val })}
                  className="w-full"
                  options={[
                    { value: '', label: 'All Remarks' },
                    ...uniqueRemarks.map(remark => ({ value: remark, label: remark }))
                  ]}
                />
             </div>
          </div>
        </div>

        {/* Desktop Export Button */}
        <button
           onClick={handleDownloadCSV}
           className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0"
        >
          <Download size={16} /> Export
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 md:p-6 border border-green-200 shadow-sm flex flex-col justify-center">
          <p className="text-gray-600 text-[10px] md:text-sm font-bold uppercase tracking-wider">Total Credits</p>
          <p className="text-lg md:text-2xl font-black text-green-700 mt-1">
            {formatCurrency(statistics.totalDebit)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 md:p-6 border border-red-200 shadow-sm flex flex-col justify-center">
          <p className="text-gray-600 text-[10px] md:text-sm font-bold uppercase tracking-wider">Total Expenses</p>
          <p className="text-lg md:text-2xl font-black text-red-700 mt-1">
            {formatCurrency(statistics.totalCredit)}
          </p>
        </div>
        <div className={`rounded-lg p-4 md:p-6 border shadow-sm flex flex-col justify-center bg-gradient-to-br ${
          statistics.balance >= 0 
            ? 'from-blue-50 to-blue-100 border-blue-200' 
            : 'from-orange-50 to-orange-100 border-orange-200'
        }`}>
          <p className="text-gray-600 text-[10px] md:text-sm font-bold uppercase tracking-wider">Net Balance</p>
          <p className={`text-lg md:text-2xl font-black mt-1 ${
            statistics.balance >= 0 ? 'text-blue-700' : 'text-orange-700'
          }`}>
            {formatCurrency(statistics.balance)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 md:p-6 border border-purple-200 shadow-sm flex flex-col justify-center">
          <p className="text-gray-600 text-[10px] md:text-sm font-bold uppercase tracking-wider">Total Entries</p>
          <p className="text-lg md:text-2xl font-black text-purple-700 mt-1">
            {statistics.entries}
          </p>
        </div>
      </div>

      {/* Ledger List Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">
        
        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {paginatedLedger.map((entry) => (
            <div key={entry.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-1.5 relative flex flex-col gap-1 transition-all">
              <div className="flex justify-between items-center bg-gray-50 -mx-1.5 -mt-1.5 px-1.5 py-1 border-b border-gray-100 rounded-t-lg mb-0">
                <span className="text-[8px] text-gray-500 font-medium font-mono leading-none">{((currentPage - 1) * itemsPerPage) + filteredLedger.indexOf(entry) + 1}</span>
                <span className={`px-1 py-[1px] rounded text-[7px] font-medium tracking-widest uppercase leading-none ${
                  entry.type === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {entry.type === 'CREDIT' ? 'RECEIVED' : 'PAID'}
                </span>
              </div>

              <h3 className="font-medium text-gray-900 text-[11px] uppercase tracking-tight leading-tight mt-[2px]">
                {entry.personName}
              </h3>

              <div className="grid grid-cols-2 gap-y-1 gap-x-2 mt-0">
                <div>
                  <p className="text-[8px] text-gray-400 font-medium mb-0 uppercase tracking-wider leading-none">Date</p>
                  <p className="font-normal text-gray-800 flex items-center gap-1 mt-[2px] leading-none">
                    <Calendar size={9} className="text-sky-500" />
                    <span className="text-[9px]">{formatDate(entry.date)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-gray-400 font-medium mb-0 uppercase tracking-wider leading-none">Amount</p>
                  <p className={`font-medium text-[11px] tracking-tight leading-none mt-[2px] ${entry.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.type === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                  </p>
                </div>
                <div className="col-span-2 bg-gray-50/50 border border-gray-100 rounded p-1 flex justify-between items-center mt-0">
                  <p className="text-[8px] text-gray-400 font-medium uppercase tracking-wider leading-none">Running Balance</p>
                  <p className={`font-medium text-[12px] tracking-tight leading-none ${
                    (entry.balance !== undefined ? entry.balance : entry.balanceAfter) >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {formatCurrency(entry.balance !== undefined ? entry.balance : entry.balanceAfter)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {filteredLedger.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">
              No ledger entries found.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-310px)] flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="bg-red-600 border-b-2 border-red-700 p-2 text-center shadow-sm sticky top-0 z-20">
            <h1 className="text-white font-bold text-lg md:text-2xl tracking-wider uppercase">JAI BHOLE GROUPS OF COMPANIES</h1>
          </div>
          <div className="bg-red-50 p-2 text-center border-b-2 border-red-200 sticky top-[48px] z-20">
             <h2 className="text-red-800 font-bold text-md md:text-xl tracking-wide uppercase" style={{ fontFamily: 'serif' }}>PETTY CASH REGISTER</h2>
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
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">REMARKS</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">PAID TO</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-red-900 uppercase border border-red-200">APPROVED BY</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLedger.map((entry, idx) => {
                let remarks = entry.remarks || '';
                let approvedBy = entry.groupHead || '-';
                
                if (entry.type === 'CREDIT') {
                   const credit = credits.find(c => c.id === entry.id || c.sn === entry.referenceId);
                   if (credit && credit.remarks) remarks = credit.remarks;
                   approvedBy = '-';
                } else {
                   const expense = expenses.find(e => e.id === entry.id || e.sn === entry.referenceId);
                   if (expense) {
                     if (expense.remarks) remarks = expense.remarks;
                     if (expense.group_head || expense.groupHead) approvedBy = expense.group_head || expense.groupHead;
                   }
                }

                const sNo = ((currentPage - 1) * itemsPerPage) + idx + 1;
                const isOpening = entry.type === 'CREDIT' && sNo === 1;
                const particulars = isOpening ? 'OPENING BALANCE' : 'CASH';

                return (
                  <tr key={entry.id} className="bg-white hover:bg-red-50/50 border-b border-gray-200">
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-200 font-medium">{sNo}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-200 whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td className={`px-2 py-1.5 text-center text-xs border border-gray-200 font-bold ${isOpening || entry.type === 'CREDIT' ? 'bg-red-50 text-red-800' : 'text-gray-800'}`}>
                      {particulars}
                    </td>
                    <td className={`px-2 py-1.5 text-right text-xs border border-gray-200 font-medium ${entry.type === 'CREDIT' ? 'bg-red-50/40 text-red-700 font-bold' : ''}`}>
                      {entry.type === 'CREDIT' ? formatCurrency(entry.amount) : ''}
                    </td>
                    <td className={`px-2 py-1.5 text-right text-xs border border-gray-300 font-medium ${entry.type === 'DEBIT' || entry.type === 'EXPENSE' ? 'text-red-600' : ''}`}>
                      {entry.type === 'DEBIT' || entry.type === 'EXPENSE' ? formatCurrency(entry.amount) : ''}
                    </td>
                    <td className={`px-2 py-1.5 text-right text-xs border border-gray-300 font-bold ${
                      (entry.balance !== undefined ? entry.balance : entry.balanceAfter) >= 0 ? 'text-blue-700' : 'text-red-600'
                    }`}>
                      {formatCurrency(entry.balance !== undefined ? entry.balance : entry.balanceAfter)}
                    </td>
                    <td className="px-2 py-1.5 text-left text-xs border border-gray-300 uppercase">{remarks || '-'}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 uppercase">{entry.personName}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 uppercase">{approvedBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredLedger.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No entries found.
            </div>
          )}
        </div>

        {/* Footer & Pagination Controls */}
        <div className="px-2 md:px-4 py-2 md:py-3 border-t border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4 rounded-b-lg pb-2 md:pb-3">
          <div className="flex w-full lg:w-auto justify-between items-center gap-2">
            <div className="text-[10px] md:text-sm text-gray-600 flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <span className="hidden md:inline">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-1 flex-shrink-0 md:px-1.5 py-1 focus:outline-none focus:border-sky-500 bg-white font-medium text-[10px] md:text-sm shadow-sm"
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={300}>300</option>
                <option value={400}>400</option>
              </select>
              <span className="hidden md:inline text-[10px] md:text-sm text-gray-500 whitespace-nowrap ml-1 font-medium">
                entries
              </span>
              <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap ml-1 font-medium">
                {filteredLedger.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredLedger.length)} of {filteredLedger.length}
              </span>
            </div>

            <div className="flex gap-1.5 md:gap-2 justify-end items-center flex-shrink-0 text-gray-700">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition shadow-sm flex items-center justify-center text-indigo-600"
                title="Previous Page"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <div className="flex items-center text-[10px] md:text-sm font-medium whitespace-nowrap">
                Pg {currentPage}/{totalPages || 1}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition shadow-sm flex items-center justify-center text-indigo-600"
                title="Next Page"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
