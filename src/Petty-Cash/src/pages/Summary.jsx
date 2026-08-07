import React, { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import supabase from '../../../SupabaseClient';
import { isDateInRange } from '../utils/helpers';
import { Download, Calendar, FileText } from 'lucide-react';
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
  });

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
      if (filters.dateFrom || filters.dateTo) {
        if (!isDateInRange(entry.date, filters.dateFrom, filters.dateTo)) {
          return false;
        }
      }
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
      const mapKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
        date: dayData.displayDate,
        openingBalance: opening,
        received: dayData.received,
        expense: dayData.expense,
        closingBalance: closing
      });
      
      runningBalance = closing;
    }
    
    return result;
  }, [credits, expenses, filters, user]);

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Opening Balance', 'Total Received', 'Total Expense', 'Closing Balance'];
    const rows = [];
    
    dailySummary.forEach(day => {
      rows.push([day.date, day.openingBalance, '', '', '']);
      if (day.received > 0) {
        rows.push(['', '', day.received, '', '']);
        rows.push(['', day.openingBalance + day.received, '', '', '']);
      }
      if (day.expense > 0) {
        rows.push(['', '', '', day.expense, day.closingBalance]);
      }
      rows.push(['', '', '', '', '']); // empty row
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petty-cash-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

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
             <div className="relative w-full lg:w-44">
               <input
                 type="text"
                 placeholder="From Date"
                 onFocus={(e) => (e.target.type = 'date')}
                 onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                 value={filters.dateFrom}
                 onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                 className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px] transition-all"
               />
             </div>
             <div className="relative w-full lg:w-44">
               <input
                 type="text"
                 placeholder="To Date"
                 onFocus={(e) => (e.target.type = 'date')}
                 onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                 value={filters.dateTo}
                 onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                 className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px] transition-all"
               />
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
             onClick={handleDownloadCSV}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[32px] md:h-[38px] rounded-lg font-semibold flex items-center justify-center gap-2 transition shadow-sm flex-1 lg:flex-none"
          >
            <Download size={16} /> CSV
          </button>
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
        <div className="overflow-x-auto overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                  <th className="border border-red-200 px-2 py-2 w-16"></th>
                  <th className="border border-red-200 px-2 py-2 w-16"></th>
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
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                        </tr>
                        <tr className="bg-white hover:bg-blue-50 transition-colors">
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-blue-700 text-xs bg-blue-50/50">{formatNum(day.openingBalance + day.received)}</td>
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          <td className="border border-gray-300 px-2 py-1.5"></td>
                          {day.expense === 0 ? (
                            <>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-blue-700 text-xs">{formatNum(day.openingBalance + day.received)}</td>
                              <td className="border border-gray-300 px-2 py-1.5"></td>
                              <td className="border border-gray-300 px-2 py-1.5"></td>
                            </>
                          ) : (
                            <>
                              <td className="border border-gray-300 px-2 py-1.5"></td>
                              <td className="border border-gray-300 px-2 py-1.5"></td>
                              <td className="border border-gray-300 px-2 py-1.5"></td>
                            </>
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
                        <td className="border border-gray-300 px-2 py-1.5"></td>
                        <td className="border border-gray-300 px-2 py-1.5"></td>
                      </tr>
                    )}
                    
                    {/* Visual Separator matching Ledger style */}
                    <tr className="bg-gray-100 h-2 border-y border-gray-300">
                      <td colSpan="7" className="border border-gray-300"></td>
                    </tr>
                  </React.Fragment>
                )) : (
                  <tr>
                    <td colSpan="7" className="text-center py-16 text-gray-500 border border-gray-300">
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
