import React, { useState } from 'react';
import useDataStore from '../../store/dataStore';
import { Search } from 'lucide-react';

const CalendarReminder = () => {
  const { documents } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = (documents || []).filter(item => {
      const searchStr = searchTerm.toLowerCase();
      return (item.pName || '').toLowerCase().includes(searchStr) ||
             (item.documentName || '').toLowerCase().includes(searchStr) ||
             (item.companyName || '').toLowerCase().includes(searchStr) ||
             (item.documentType || '').toLowerCase().includes(searchStr);
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100 gap-3">
         <div>
           <h1 className="text-xl font-bold text-gray-800">Calendar Reminder</h1>
           <p className="text-sm text-gray-500">Premium reminders fetched from Documents</p>
         </div>
         <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2.5 w-full sm:w-64 shadow-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-auto max-h-[calc(100vh-250px)]">
            <table className="w-full text-center border-collapse">
              <thead className="sticky top-0 bg-gray-50 shadow-sm z-10">
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                  <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Serial No</th>
                  <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Name</th>
                  <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Policy No</th>
                  <th className="px-4 py-3 whitespace-nowrap bg-gray-50">TYPE</th>
                  <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Company</th>
                  <th className="px-4 py-3 whitespace-nowrap bg-gray-50">First Premium Date</th>
                  <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Due Date of Last Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length > 0 ? (
                  filteredData.map((doc, idx) => (
                    <tr key={doc.id || idx} className="hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{doc.sn || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{doc.pName || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-blue-600">{doc.documentName || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{doc.documentType || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{doc.companyName || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{doc.firstPremiumDate || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-red-600">{doc.dueDateOfLastPremium || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-gray-500 text-center text-sm">No records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default CalendarReminder;
