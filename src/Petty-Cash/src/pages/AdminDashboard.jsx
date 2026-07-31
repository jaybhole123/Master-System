import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Eye, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  formatDate,
  formatCurrency,
  getTotalBalance,
  getPendingCount,
  getTodaysExpenses,
  getTodaysCredits,
  isDateInRange
} from '../utils/helpers';

export default function AdminDashboard() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [credits, setCredits] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: creditsData } = await supabase.from('petty_cash_addcash_credits').select('*');
        if (creditsData) setCredits(creditsData);
      } catch (e) {}

      try {
        const { data: expensesData } = await supabase.from('petty_cash_expenses').select('*');
        if (expensesData) setExpenses(expensesData);
      } catch (e) {}
    };
    fetchData();
  }, []);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    personName: '',
    groupHead: '',
    paymentMode: '',
    searchQuery: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  // Calculate statistics
  const totalCredit = credits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalExpense = expenses
    .filter(e => e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const availableBalance = totalCredit - totalExpense;
  const pendingApprovals = getPendingCount(expenses);
  const todaysExpense = getTodaysExpenses(expenses);
  const todaysCredit = getTodaysCredits(credits);
  const totalTransactions = credits.length + expenses.length;

  const filteredTransactions = useMemo(() => {
    // First, compute chronological running balance for all approved transactions
    const all = [
      ...credits.map(c => ({ id: c.id, date: c.date, type: 'CREDIT', amount: parseFloat(c.amount || 0) })),
      ...expenses.filter(e => e.status === 'APPROVED').map(e => ({ id: e.id, date: e.date, type: 'EXPENSE', amount: parseFloat(e.amount || 0) }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let currentBalance = 0;
    const balanceMap = {};
    all.forEach(t => {
      currentBalance += t.type === 'CREDIT' ? t.amount : -t.amount;
      balanceMap[t.id] = currentBalance;
    });

    const transactions = [];

    // Add credits
    credits.forEach(c => {
      const pName = c.person_name || c.personName || '';
      const pMode = c.payment_mode || c.paymentMode || '';
      const pImg = c.receipt_url || c.image || '';

      if (!filters.dateFrom || !filters.dateTo || 
          isDateInRange(c.date, filters.dateFrom, filters.dateTo)) {
        if (!filters.personName || pName.toLowerCase().includes(filters.personName.toLowerCase())) {
          if (!filters.paymentMode || pMode === filters.paymentMode) {
            transactions.push({
              id: c.id,
              sn: c.sn,
              personName: pName,
              date: c.date,
              amount: parseFloat(c.amount || 0),
              mode: pMode,
              type: 'CREDIT',
              groupHead: 'N/A',
              status: 'APPROVED',
              image: pImg,
              remarks: c.remarks || '',
              balance: balanceMap[c.id]
            });
          }
        }
      }
    });

    // Add expenses
    expenses.forEach(e => {
      const pName = e.person_name || e.personName || '';
      const pMode = e.payment_mode || e.paymentMode || '';
      const pGroup = e.group_head || e.groupHead || '';
      const pImg = e.receipt_url || e.image || '';

      if (!filters.dateFrom || !filters.dateTo || 
          isDateInRange(e.date, filters.dateFrom, filters.dateTo)) {
        if (!filters.personName || pName.toLowerCase().includes(filters.personName.toLowerCase())) {
          if (!filters.groupHead || pGroup === filters.groupHead) {
            if (!filters.paymentMode || pMode === filters.paymentMode) {
              if (e.status === 'APPROVED') {
                transactions.push({
                  id: e.id,
                  sn: e.sn,
                  personName: pName,
                  date: e.date,
                  amount: -parseFloat(e.amount || 0),
                  mode: pMode,
                  type: 'EXPENSE',
                  groupHead: pGroup,
                  status: e.status,
                  image: pImg,
                  remarks: e.remarks || '',
                  balance: balanceMap[e.id]
                });
              }
            }
          }
        }
      }
    });

    // Apply Search Query
    const filtered = transactions.filter(t => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          (t.personName && t.personName.toLowerCase().includes(q)) ||
          (t.remarks && t.remarks.toLowerCase().includes(q)) ||
          (t.amount && String(t.amount).toLowerCase().includes(q)) ||
          (t.mode && t.mode.toLowerCase().includes(q)) ||
          (t.groupHead && t.groupHead.toLowerCase().includes(q)) ||
          (t.sn && String(t.sn).toLowerCase().includes(q))
        );
      }
      return true;
    });

    // Sort by date descending
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filters, credits, expenses]);

  // Paginated Transactions
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const handleDownloadCSV = () => {
    const headers = ['SN', 'Date', 'Person', 'Type', 'Amount', 'Mode', 'Group', 'Remarks'];
    const rows = filteredTransactions.map((t, idx) => [
      idx + 1,
      formatDate(t.date),
      t.personName,
      t.type,
      Math.abs(t.amount),
      t.mode,
      t.groupHead,
      t.remarks || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Chart data - Expense by Group Head
  const expenseByGroupHead = useMemo(() => {
    const groupData = {};
    expenses
      .filter(e => e.status === 'APPROVED')
      .forEach(e => {
        if (!groupData[e.groupHead]) {
          groupData[e.groupHead] = 0;
        }
        groupData[e.groupHead] += parseFloat(e.amount);
      });
    return groupData;
  }, [expenses]);

  const handleImageView = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full md:h-auto overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                placeholder="Search details..."
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
              <TrendingUp size={16} className="rotate-90" />
            </button>
          </div>

          {/* Filters */}
          <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:flex grid-cols-2 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[4] items-center`}>
             <input
               type="text"
               placeholder="From Date"
               onFocus={(e) => (e.target.type = 'date')}
               onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
               value={filters.dateFrom}
               onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
             <input
               type="text"
               placeholder="To Date"
               onFocus={(e) => (e.target.type = 'date')}
               onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
               value={filters.dateTo}
               onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
             <input
               type="text"
               value={filters.personName}
               onChange={(e) => setFilters({ ...filters, personName: e.target.value })}
               placeholder="Search person..."
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
             <select
               value={filters.groupHead}
               onChange={(e) => setFilters({ ...filters, groupHead: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             >
               <option value="">All Groups</option>
               <option value="IT">IT</option>
               <option value="HR">HR</option>
               <option value="Finance">Finance</option>
               <option value="Operations">Operations</option>
               <option value="Marketing">Marketing</option>
             </select>
             <select
               value={filters.paymentMode}
               onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             >
               <option value="">All Modes</option>
               <option value="Cash">Cash</option>
               <option value="Cheque">Cheque</option>
               <option value="Bank Transfer">Bank Transfer</option>
               <option value="Online">Online</option>
             </select>
          </div>
        </div>

        {/* Desktop Export Button */}
        <button
           onClick={handleDownloadCSV}
           className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0"
        >
          <TrendingUp size={16} className="rotate-90" /> Export CSV
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Credit */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Credit</p>
              <p className="text-2xl font-bold text-green-700 mt-2">
                {formatCurrency(totalCredit)}
              </p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Expense</p>
              <p className="text-2xl font-bold text-red-700 mt-2">
                {formatCurrency(totalExpense)}
              </p>
            </div>
            <TrendingDown className="text-red-600" size={32} />
          </div>
        </div>

        {/* Available Balance */}
        <div className={`rounded-lg p-6 border bg-gradient-to-br ${
          availableBalance >= 0 
            ? 'from-blue-50 to-blue-100 border-blue-200' 
            : 'from-orange-50 to-orange-100 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Available Balance</p>
              <p className={`text-2xl font-bold mt-2 ${
                availableBalance >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}>
                {formatCurrency(availableBalance)}
              </p>
            </div>
            {availableBalance < 0 && <AlertCircle className="text-orange-600" size={32} />}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Approvals</p>
              <p className="text-2xl font-bold text-purple-700 mt-2">
                {pendingApprovals}
              </p>
            </div>
            <AlertCircle className="text-purple-600" size={32} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense by Group Head */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense by Group Head</h3>
          <div className="space-y-2">
            {Object.entries(expenseByGroupHead).length > 0 ? (
              Object.entries(expenseByGroupHead).map(([group, amount]) => {
                const maxAmount = Math.max(...Object.values(expenseByGroupHead));
                const percentage = (amount / maxAmount) * 100;
                return (
                  <div key={group}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{group}</span>
                      <span className="text-gray-900 font-semibold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">No expense data</p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">Total Credits</span>
              <span className="font-semibold text-green-600">{credits.length}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">Total Expenses</span>
              <span className="font-semibold text-red-600">{expenses.length}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">Approved Expenses</span>
              <span className="font-semibold">{expenses.filter(e => e.status === 'APPROVED').length}</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-gray-700">Pending Expenses</span>
              <span className="font-semibold text-orange-600">{pendingApprovals}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Report */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col mt-4">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Transaction Details Report</h3>
          <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
            Showing {paginatedTransactions.length} of {filteredTransactions.length}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[450px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="bg-blue-600 border-b-2 border-blue-700 p-2 text-center shadow-sm sticky top-0 z-20">
            <h1 className="text-white font-bold text-lg md:text-2xl tracking-wider uppercase">JAI BHOLE GROUPS OF COMPANIES</h1>
          </div>
          <div className="bg-blue-50 p-2 text-center border-b-2 border-blue-200 sticky top-[48px] z-20">
             <h2 className="text-blue-800 font-bold text-md md:text-xl tracking-wide uppercase" style={{ fontFamily: 'serif' }}>PETTY CASH REGISTER (TRANSACTIONS)</h2>
          </div>
          <table className="w-full min-w-[900px] relative border-collapse border border-blue-300">
            <thead className="bg-blue-100 border-b border-blue-300 sticky top-[90px] z-10 shadow-sm">
              <tr>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300 w-10">S.NO</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300 w-24">DATE</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300">PARTICULARS</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300">RECEIVED</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300">PAID</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300">BALANCE</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300">PAID TO</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300">APPROVED BY</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-blue-900 uppercase border border-blue-300">REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((t, idx) => {
                const sNo = ((currentPage - 1) * itemsPerPage) + idx + 1;
                const particulars = 'CASH';

                return (
                  <tr key={t.id || idx} className="bg-white hover:bg-blue-50 border-b border-gray-300">
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 font-medium">{sNo}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 font-bold text-gray-800">
                      {particulars}
                    </td>
                    <td className={`px-2 py-1.5 text-right text-xs border border-gray-300 font-medium ${t.type === 'CREDIT' ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}>
                      {t.type === 'CREDIT' ? formatCurrency(Math.abs(t.amount)) : ''}
                    </td>
                    <td className={`px-2 py-1.5 text-right text-xs border border-gray-300 font-medium ${t.type === 'EXPENSE' ? 'text-red-600 font-bold' : ''}`}>
                      {t.type === 'EXPENSE' ? formatCurrency(Math.abs(t.amount)) : ''}
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs border border-gray-300 font-bold text-blue-700">{formatCurrency(t.balance)}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 uppercase">{t.personName}</td>
                    <td className="px-2 py-1.5 text-center text-xs border border-gray-300 uppercase">{t.type === 'CREDIT' ? '-' : (t.groupHead || '-')}</td>
                    <td className="px-2 py-1.5 text-left text-xs border border-gray-300 truncate max-w-[150px] uppercase">{t.remarks || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-2 p-2 bg-slate-50/50 pb-2">
          {paginatedTransactions.map((t, idx) => (
            <div key={t.id || idx} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-1.5 relative flex flex-col gap-1 transition-all">
              <div className="flex justify-between items-start mb-0">
                <div>
                  <span className="text-[8px] font-medium text-gray-400 uppercase tracking-widest block leading-none"># {((currentPage - 1) * itemsPerPage) + idx + 1}</span>
                  <p className="font-medium text-gray-900 text-[11px] uppercase tracking-tight leading-tight mt-[2px]">{t.personName}</p>
                </div>
                <span className={`px-1 py-[1px] rounded text-[7px] font-medium uppercase tracking-widest ${
                  t.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {t.type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <div>
                  <p className="text-[8px] font-medium text-gray-400 uppercase leading-none">Date</p>
                  <p className="text-[10px] font-normal text-gray-700 flex items-center gap-1 mt-[2px]">
                    {formatDate(t.date)}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-medium text-gray-400 uppercase text-right leading-none">Amount</p>
                  <p className={`text-[12px] font-medium text-right tracking-tight leading-none mt-[2px] ${
                    t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                  </p>
                </div>
                <div className="col-span-2 flex justify-between items-center bg-gray-50 p-1 rounded border border-gray-100 mt-0">
                  <p className="text-[8px] font-medium text-gray-500 uppercase leading-none">{t.mode} • {t.groupHead || '-'}</p>
                  {t.image && (
                    <button 
                      onClick={() => handleImageView(t.image)}
                      className="text-indigo-600 text-[9px] font-medium flex items-center gap-1 bg-indigo-50/80 px-1.5 py-[2px] rounded transition-colors hover:bg-indigo-100"
                    >
                      <Eye size={10} /> Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center text-gray-500 italic">
            No transactions found matching your criteria.
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-2 md:p-3 border-t border-gray-100 bg-gray-50 flex flex-col items-center justify-between gap-2 lg:flex-row rounded-b-lg pb-2 md:pb-3">
          <div className="flex w-full lg:w-auto justify-between items-center text-[10px] md:text-sm gap-2">
            <div className="text-gray-600 flex items-center flex-shrink-0">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-300 rounded-md px-1 py-1 text-[10px] md:text-xs focus:outline-none focus:border-indigo-500 shadow-sm font-medium"
              >
                {[10, 15, 20, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
              <span className="text-[10px] md:text-[11px] font-medium text-gray-500 ml-1.5 whitespace-nowrap">
                entries
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-700">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 hover:bg-gray-50 transition shadow-sm text-indigo-600"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <div className="text-[10px] md:text-[10px] font-medium min-w-[50px] text-center text-gray-500">
                Pg {currentPage}/{totalPages || 1}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 hover:bg-gray-50 transition shadow-sm text-indigo-600"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
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
            <img src={selectedImage} alt="Transaction" className="w-full rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
