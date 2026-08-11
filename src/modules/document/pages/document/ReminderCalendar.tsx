import React, { useState, useEffect, useDeferredValue, useMemo } from 'react';
import { Plus, Search, Calendar, Loader, RefreshCw, Edit, Trash2 } from 'lucide-react';
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
  const deferredSearch = useDeferredValue(searchTerm);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReminderItem | null>(null);
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
      // Optional: empty row to "delete" it from Google Sheets
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

  const filteredData = useMemo(() => {
    return reminders.filter(item => {
      const searchLower = deferredSearch.toLowerCase();
      return String(item.policyHolder || '').toLowerCase().includes(searchLower) ||
        String(item.company || '').toLowerCase().includes(searchLower) ||
        String(item.policyNo || '').toLowerCase().includes(searchLower) ||
        String(item.month || '').toLowerCase().includes(searchLower);
    });
  }, [reminders, deferredSearch]);

  if (loading && reminders.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 text-red-600 animate-spin" />
          <p className="text-gray-600">Loading reminders from Google Sheets...</p>
        </div>
      </div>
    );
  }

  if (error && reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-600 font-medium mb-2">Error Loading Data</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl shadow-input">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reminder Calendar</h1>
            <p className="text-gray-500 text-sm mt-1">
              Track your policy reminders from Google Sheets
              {reminders.length > 0 && (
                <span className="ml-2 text-xs text-green-600">
                  ({reminders.length} records)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search policy holder, company..."
                className="pl-10 pr-4 py-2.5 w-full shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add New</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="hidden md:flex flex-col bg-white rounded-xl shadow-input overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider whitespace-nowrap">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Policy Holder</th>
                  <th className="px-3 py-2">Reminder</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Policy</th>
                  <th className="px-3 py-2">Policy No</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-50">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-900">{item.month}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{item.date}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{item.policyHolder}</td>
                    <td className="px-3 py-2 text-red-600">{item.reminder}</td>
                    <td className="px-3 py-2 text-gray-700">{item.company}</td>
                    <td className="px-3 py-2 text-gray-700">{item.policy}</td>
                    <td className="px-3 py-2 font-mono text-xs font-bold text-gray-600">{item.policyNo}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-500">
                <Search className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>No results found</p>
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
                     onClick={() => {
                        setEditingItem(item);
                        setIsAddModalOpen(true);
                     }}
                     className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                   >
                     <Edit size={16} />
                   </button>
                   <button
                     onClick={() => handleDelete(item)}
                     className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
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
