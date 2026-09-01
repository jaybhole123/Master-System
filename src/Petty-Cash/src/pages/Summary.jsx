import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import supabase from '../../../SupabaseClient';
import { isDateInRange, getTodayDate, formatDateForInput } from '../utils/helpers';
import { Download, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchableSelect from '../../../components/SearchableSelect';

const DEFAULT_USERS = [
  { id: 'admin', name: 'Admin User', password: 'admin123', role: 'ADMIN' },
  { id: 'user', name: 'Employee 1', password: 'user123', role: 'USER' },
  { id: 'user2', name: 'Employee 2', password: 'user123', role: 'USER' }
];

export default function Summary() {
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
  });

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

  const dailySummary = useMemo(() => {
    const ledgerData = [];
    credits.forEach(c => {
      ledgerData.push({
        id: c.id,
        personName: c.person_name || c.personName || '',
        type: 'CREDIT',
        amount: parseFloat(c.amount || 0),
        date: c.date
      });
    });
    expenses.filter(e => !e.status || String(e.status).toUpperCase() === 'APPROVED').forEach(e => {
      ledgerData.push({
        id: e.id,
        personName: e.person_name || e.personName || '',
        type: 'EXPENSE',
        amount: parseFloat(e.amount || 0),
        date: e.date
      });
    });
    // Apply filters first
    const filtered = ledgerData.filter(entry => {
      if (filters.personName && entry.personName && entry.personName.toLowerCase() !== filters.personName.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Sort ascending
    const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const summaryMap = new Map();
    
    sorted.forEach(entry => {
      const d = new Date(entry.date);
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const mapKey = entry.date;

      if (!summaryMap.has(mapKey)) {
        summaryMap.set(mapKey, { displayDate: dateStr, dateObj: d, received: 0, expense: 0 });
      }
      
      const dayData = summaryMap.get(mapKey);
      if (entry.type === 'CREDIT') {
        dayData.received += entry.amount;
      } else {
        dayData.expense += entry.amount;
      }
    });

    const sortedKeys = Array.from(summaryMap.keys()).sort();
    const result = [];
    let runningBalance = 0;

    for (const key of sortedKeys) {
      const dayData = summaryMap.get(key);
      const opening = runningBalance;
      const closing = opening + dayData.received - dayData.expense;
      
      result.push({
        dateKey: key,
        date: dayData.displayDate,
        openingBalance: opening,
        received: dayData.received,
        expense: dayData.expense,
        closingBalance: closing
      });
      
      runningBalance = closing;
    }
    
    return selectedDateStr ? result.filter(day => day.dateKey === selectedDateStr) : result;
  }, [credits, expenses, filters, user, selectedDateStr]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(16);
    doc.text('JAI BHOLE GROUPS OF COMPANIES', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('PETTY CASH REGISTER SUMMARY', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    
    // Create rows
    const rows = [];
    dailySummary.forEach(day => {
      rows.push([{ content: day.date, styles: { fontStyle: 'bold' } }, { content: formatNum(day.openingBalance), styles: { fontStyle: 'bold' } }, '', '', '']);
      if (day.received > 0) {
        rows.push(['', '', { content: formatNum(day.received), styles: { fontStyle: 'bold', textColor: [0, 150, 0] } }, '', '']);
        rows.push(['', { content: formatNum(day.openingBalance + day.received), styles: { fontStyle: 'bold', textColor: [0, 0, 200] } }, '', '', '']);
      }
      if (day.expense > 0) {
        rows.push(['', '', '', { content: formatNum(day.expense), styles: { fontStyle: 'bold', textColor: [200, 0, 0] } }, { content: formatNum(day.closingBalance), styles: { fontStyle: 'bold', textColor: [0, 0, 200] } }]);
      }
      rows.push([{ content: '', colSpan: 5, styles: { fillColor: [240, 240, 240], minCellHeight: 3 } }]);
    });

    autoTable(doc, {
      startY: 30,
      head: [['DATE', 'Opening Balance', 'Total Received', 'Total Expense', 'Closing Balance']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' }
      },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    doc.save(`petty-cash-summary-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const formatNum = (num) => {
    return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-4 flex flex-col h-full min-h-0 bg-slate-50/50">
      
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full pb-2 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row w-full gap-2 items-center">
            {/* Day Navigation Control */}
            <div className="w-full lg:w-[320px] flex-shrink-0">
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
             <div className="w-full lg:w-56">
               {user?.role === 'ADMIN' ? (
                 <SearchableSelect
                   value={filters.personName}
                   onChange={(val) => setFilters({ ...filters, personName: val })}
                   className="w-full"
                   options={[
                     { value: '', label: 'All Persons' },
                     ...DEFAULT_USERS.map(u => ({ value: u.name, label: u.name }))
                   ]}
                 />
               ) : (
                 <div className="w-full border border-gray-200 bg-gray-50 rounded-lg lg:rounded px-2 py-1.5 text-[11px] md:text-sm text-gray-600 font-medium text-center h-[32px] md:h-[38px] flex items-center justify-center">
                   {user?.name}
                 </div>
               )}
             </div>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button
             onClick={handleDownloadPDF}
             className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 h-[32px] md:h-[38px] rounded-lg font-semibold flex items-center justify-center gap-2 transition shadow-sm flex-1 lg:flex-none"
          >
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 min-h-0 overflow-hidden flex flex-col relative mt-2">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="min-w-[850px] w-full">
            {/* Table Headers (Sticky) */}
            <div className="bg-red-600 border-b-2 border-red-700 p-2 text-center shadow-sm sticky top-0 z-30">
              <h1 className="text-white font-bold text-lg md:text-2xl tracking-wider uppercase">
                JAI BHOLE GROUPS OF COMPANIES
              </h1>
            </div>
            <div className="bg-red-50 p-2 text-center border-b-2 border-red-200 sticky top-[48px] z-30 shadow-sm">
              <h2 className="text-red-800 font-bold text-md md:text-xl tracking-wide uppercase" style={{ fontFamily: 'serif' }}>
                PETTY CASH REGISTER SUMMARY
              </h2>
            </div>
            
            <table className="w-full border-collapse border border-red-200">
              <thead className="bg-red-100 border-b border-red-200 sticky top-[90px] z-20 shadow-sm">
                <tr>
                  <th className="border border-red-200 px-2 py-2 text-center font-bold text-red-900 w-32 uppercase text-xs">DATE</th>
                  <th className="border border-red-200 px-2 py-2 text-center font-bold text-red-900 w-44 uppercase text-xs">Opening Balance</th>
                  <th className="border border-red-200 px-2 py-2 text-center font-bold text-red-900 w-44 uppercase text-xs">Total Received</th>
                  <th className="border border-red-200 px-2 py-2 text-center font-bold text-red-900 w-44 uppercase text-xs">Total Expense</th>
                  <th className="border border-red-200 px-2 py-2 text-center font-bold text-red-900 w-44 uppercase text-xs">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {dailySummary.length > 0 ? dailySummary.map((day, idx) => (
                  <React.Fragment key={idx}>
                    {/* Row 1: Date & Opening Balance */}
                    <tr className="bg-white hover:bg-red-50/50 transition-colors">
                      <td className="border border-gray-300 px-2 py-1.5 font-bold text-gray-800 text-center text-xs">{day.date}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-gray-800 text-xs">{formatNum(day.openingBalance)}</td>
                      <td className="border border-gray-300 px-2 py-1.5"></td>
                      <td className="border border-gray-300 px-2 py-1.5"></td>
                      <td className="border border-gray-300 px-2 py-1.5"></td>
                    </tr>
                    
                    {/* Received and Subtotal rows */}
                    {day.received > 0 && (
                      <>
                        <tr className="bg-white hover:bg-blue-50 transition-colors">
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-green-600 text-xs bg-blue-50/30">{formatNum(day.received)}</td>
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                        </tr>
                        <tr className="bg-white hover:bg-blue-50 transition-colors">
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-blue-700 text-xs bg-blue-50/50">{formatNum(day.openingBalance + day.received)}</td>
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          {day.expense === 0 ? (
                            <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-blue-700 text-xs">{formatNum(day.openingBalance + day.received)}</td>
                          ) : (
                            <td className="border border-gray-300 px-2 py-1.5"></td>
                          )}
                        </tr>
                      </>
                    )}

                    {/* Expense and Closing Balance row */}
                    {day.expense > 0 && (
                      <tr className="bg-white hover:bg-blue-50 transition-colors">
                        <td className="border border-gray-300 px-2 py-1.5"></td>
                        <td className="border border-gray-300 px-2 py-1.5"></td>
                        <td className="border border-gray-300 px-2 py-1.5"></td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-red-600 text-xs">{formatNum(day.expense)}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-blue-700 text-xs">{formatNum(day.closingBalance)}</td>
                      </tr>
                    )}
                    
                    {/* Visual Separator matching Ledger style */}
                    <tr className="bg-gray-100 h-2 border-y border-gray-300">
                      <td colSpan="5" className="border border-gray-300"></td>
                    </tr>
                  </React.Fragment>
                )) : (
                  <tr>
                    <td colSpan="5" className="text-center py-16 text-gray-500 border border-gray-300">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                          <Calendar size={32} className="text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-600">No summary data available for the selected filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
