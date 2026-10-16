import React, { useState, useEffect, useDeferredValue, useMemo } from 'react';
import { Plus, Search, Calendar, Loader, RefreshCw, Edit, Trash2, Bell, Building2, User, CheckCircle2, Filter, Eye, X, Shield } from 'lucide-react';
import useHeaderStore from '../../store/headerStore';
import AddReminderCalendar from './AddReminderCalendar';
import { submitToGoogleSheets } from '../../utils/googleSheetsService';

interface ReminderItem {
  id: string;
  month: string;
  date: string;
  policyHolder: string;
  reminder: string;
  company: string;
  policy: string;
  policyNo: string;
  rowIndex: number;
}

const ReminderCalendar = () => {
  const { setTitle } = useHeaderStore();
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const deferredSearch = useDeferredValue(searchTerm);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReminderItem | null>(null);
  const [viewItem, setViewItem] = useState<ReminderItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRemindersFromGoogleSheets = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      
      const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";
      if (!GOOGLE_SCRIPT_URL) throw new Error("Google Script URL is not defined");

      const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=Reminder Calender&_t=${Date.now()}`);
      const json = await res.json();

      if (!json.success) throw new Error(json.error || "Failed to fetch reminders");

      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return dateString;
          return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
        } catch (e) {
          return dateString;
        }
      };

      const reminderList: ReminderItem[] = (json.data || [])
        .slice(1) // skip header
        .map((row: any[], index: number) => {
          if (!row || row.length < 2) return null;
          
          return {
            id: `rem-${index}`,
            rowIndex: index + 2,
            month: (row[0] || '').toString().trim(),
            date: formatDate((row[1] || '').toString().trim()),
            policyHolder: (row[2] || '').toString().trim(),
            reminder: (row[3] || '').toString().trim(),
            company: (row[4] || '').toString().trim(),
            policy: (row[5] || '').toString().trim(),
            policyNo: (row[6] || '').toString().trim()
          };
        })
        .filter((item: ReminderItem | null): item is ReminderItem => item !== null && (item.policyHolder !== '' || item.company !== ''));
        
      setReminders(reminderList);
    } catch (error) {
      console.error('Fetch Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTitle('Reminder Calendar');
    fetchRemindersFromGoogleSheets();
  }, [setTitle]);

  const handleDelete = async (item: ReminderItem) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
      setLoading(true);
      await submitToGoogleSheets({
        action: "update",
        sheetName: "Reminder Calender",
        rowIndex: item.rowIndex,
        data: ["", "", "", "", "", "", ""]
      });
      fetchRemindersFromGoogleSheets();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRemindersFromGoogleSheets();
  };

  const handleAddSuccess = () => {
    fetchRemindersFromGoogleSheets();
  };

  // Unique lists for filters
  const monthsList = useMemo(() => {
    const monthsSet = new Set<string>();
    reminders.forEach((r) => {
      if (r.month) monthsSet.add(r.month);
    });
    return Array.from(monthsSet);
  }, [reminders]);

  const companiesList = useMemo(() => {
    const compSet = new Set<string>();
    reminders.forEach((r) => {
      if (r.company) compSet.add(r.company);
    });
    return Array.from(compSet);
  }, [reminders]);

  // KPI Metrics Calculation
  const stats = useMemo(() => {
    const total = reminders.length;
    const uniquePersons = new Set(reminders.map((r) => r.policyHolder).filter(Boolean)).size;
    const uniqueCompanies = new Set(reminders.map((r) => r.company).filter(Boolean)).size;

    return {
      total,
      uniquePersons,
      uniqueCompanies,
      activeMonths: monthsList.length,
    };
  }, [reminders, monthsList]);

  const filteredData = useMemo(() => {
    return reminders.filter(item => {
      const searchLower = deferredSearch.toLowerCase();
      const matchesSearch = String(item.policyHolder || '').toLowerCase().includes(searchLower) ||
        String(item.company || '').toLowerCase().includes(searchLower) ||
        String(item.policyNo || '').toLowerCase().includes(searchLower) ||
        String(item.month || '').toLowerCase().includes(searchLower) ||
        String(item.reminder || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (selectedMonth !== 'All' && item.month.toLowerCase() !== selectedMonth.toLowerCase()) {
        return false;
      }

      if (selectedCompany !== 'All' && item.company.toLowerCase() !== selectedCompany.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [reminders, deferredSearch, selectedMonth, selectedCompany]);

  if (loading && reminders.length === 0) {
    return (
      <div className="flex justify-center items-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 text-red-600 animate-spin" />
          <p className="text-gray-600 text-sm font-medium">Loading reminders from Google Sheets...</p>
        </div>
      </div>
    );
  }

  if (error && reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 max-w-md text-center">
          <div className="text-red-700 font-bold mb-1">Error Loading Data</div>
          <p className="text-gray-600 text-xs mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header and Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Calendar Reminders</h1>
              <p className="text-gray-500 text-xs">
                Policy renewal and premium alerts synced from Google Sheets
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center w-full sm:w-auto gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search holder, company, policy..."
                className="pl-9 pr-3 py-2 w-full text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50/70 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Month Filter */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-700 cursor-pointer hover:bg-gray-100 transition-all"
              >
                <option value="All">All Months</option>
                {monthsList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div className="relative hidden md:block">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-700 cursor-pointer hover:bg-gray-100 transition-all max-w-[130px] truncate"
              >
                <option value="All">All Companies</option>
                {companiesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 hover:text-gray-800 transition-colors shadow-sm flex items-center justify-center disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-red-600' : ''}`} />
            </button>

            {/* Add New Button */}
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Add Reminder</span>
            </button>
          </div>
        </div>

        {/* Compact System Red KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Total Reminders Card */}
          <div
            onClick={() => { setSelectedMonth('All'); setSelectedCompany('All'); }}
            className={`cursor-pointer px-3.5 py-2.5 rounded-xl transition-all border ${
              selectedMonth === 'All' && selectedCompany === 'All'
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/20 border-red-600 ring-2 ring-red-500/20"
                : "bg-white hover:border-red-200 text-gray-800 border-gray-100 shadow-sm hover:shadow"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedMonth === 'All' && selectedCompany === 'All' ? "text-red-100" : "text-gray-500"}`}>
                  Total Reminders
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none">{stats.total}</div>
              </div>
              <div className={`p-2 rounded-lg ${selectedMonth === 'All' && selectedCompany === 'All' ? "bg-white/20 text-white" : "bg-red-50 text-red-600"}`}>
                <Bell size={16} />
              </div>
            </div>
            <div className={`text-[10px] mt-1.5 font-medium truncate ${selectedMonth === 'All' && selectedCompany === 'All' ? "text-red-100" : "text-gray-400"}`}>
              All active reminders
            </div>
          </div>

          {/* Policy Holders Card */}
          <div className="px-3.5 py-2.5 rounded-xl border bg-white border-gray-100 shadow-sm hover:border-red-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                  Policy Holders
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none text-gray-800">{stats.uniquePersons}</div>
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <User size={16} />
              </div>
            </div>
            <div className="text-[10px] mt-1.5 font-medium text-gray-400 truncate">
              Unique insured persons
            </div>
          </div>

          {/* Companies Card */}
          <div className="px-3.5 py-2.5 rounded-xl border bg-white border-gray-100 shadow-sm hover:border-red-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                  Insurance Providers
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none text-gray-800">{stats.uniqueCompanies}</div>
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <Building2 size={16} />
              </div>
            </div>
            <div className="text-[10px] mt-1.5 font-medium text-gray-400 truncate">
              Different insurance companies
            </div>
          </div>

          {/* Active Months Card */}
          <div className="px-3.5 py-2.5 rounded-xl border bg-white border-gray-100 shadow-sm hover:border-red-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                  Reminder Months
                </span>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none text-gray-800">{stats.activeMonths}</div>
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <Calendar size={16} />
              </div>
            </div>
            <div className="text-[10px] mt-1.5 font-medium text-gray-400 truncate">
              Months scheduled in year
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-230px)]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-sm shadow-sm">
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider whitespace-nowrap">
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50 w-12">S.No</th>
                  <th className="px-2 py-2.5 text-center align-top bg-gray-50 w-12">View</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Month</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Date</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Policy Holder</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Reminder</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Company</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Policy</th>
                  <th className="px-3 py-2.5 text-left align-top bg-gray-50">Policy No</th>
                  <th className="px-3 py-2.5 text-center align-top bg-gray-50 sticky right-0 z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] min-w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-gray-500 text-xs align-top text-left">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2.5 text-center align-top">
                      <button
                        onClick={() => setViewItem(item)}
                        className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors shadow-sm inline-flex items-center justify-center"
                        title="View Reminder Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-gray-800 text-xs align-top text-left">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{item.month}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap font-medium text-xs align-top text-left">{item.date}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900 text-xs align-top text-left">{item.policyHolder}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-red-600 align-top text-left">{item.reminder}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 align-top text-left">{item.company}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 align-top text-left">{item.policy}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-600 align-top text-left">{item.policyNo}</td>
                    <td className="px-3 py-2.5 text-center align-top sticky right-0 z-10 bg-white group-hover:bg-gray-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && !loading && (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-700">No reminders found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>


        {/* Mobile Cards */}
        <div className="md:hidden flex flex-col gap-4">
          {filteredData.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-input space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-start">
                  <div className="h-10 w-10 flex items-center justify-center bg-red-50 text-red-600 rounded-lg shrink-0 mt-0.5">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.policyHolder}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{item.company} - {item.policy}</p>
                    <p className="text-xs text-red-600 font-bold mt-1">Policy No: {item.policyNo}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                       <span className="bg-gray-100 px-2 py-1 rounded">Month: {item.month}</span>
                       <span className="bg-gray-100 px-2 py-1 rounded">Date: {item.date}</span>
                    </div>
                  </div>
                </div>
                 <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setViewItem(item)}
                      className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setIsAddModalOpen(true);
                      }}
                      className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Reminder Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50/80 via-white to-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-md shadow-red-600/20">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                    {viewItem.policyHolder || "Reminder Details"}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Calendar Policy Reminder</p>
                </div>
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Highlights */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50/60 p-3 rounded-xl border border-red-100">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Reminder Status</span>
                  <span className="text-sm font-extrabold text-red-700 mt-1 block">
                    {viewItem.reminder || "No status"}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Due Date / Month</span>
                  <span className="text-sm font-extrabold text-gray-900 mt-1 block">
                    {viewItem.date ? `${viewItem.date} (${viewItem.month})` : viewItem.month || "-"}
                  </span>
                </div>
              </div>

              {/* Policy Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Policy Holder</span>
                  <b className="text-xs font-bold text-gray-900 mt-0.5 block">{viewItem.policyHolder || "-"}</b>
                </div>
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Insurance Company</span>
                  <b className="text-xs font-bold text-gray-900 mt-0.5 block">{viewItem.company || "-"}</b>
                </div>
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Policy Type</span>
                  <b className="text-xs font-bold text-gray-900 mt-0.5 block">{viewItem.policy || "-"}</b>
                </div>
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Policy Number</span>
                  <b className="text-xs font-mono font-bold text-blue-600 mt-0.5 block">{viewItem.policyNo || "-"}</b>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => {
                  const item = viewItem;
                  setViewItem(null);
                  setEditingItem(item);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors"
              >
                <Edit size={13} />
                <span>Edit Reminder</span>
              </button>
              <button
                onClick={() => setViewItem(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AddReminderCalendar
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={handleAddSuccess}
        editItem={editingItem}
      />
    </>
  );
};

export default ReminderCalendar;
