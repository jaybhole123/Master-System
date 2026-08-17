import React, { useEffect, useState, useMemo } from 'react';
import { Loader, Search, RefreshCw, FileText } from 'lucide-react';
import useHeaderStore from '../../store/headerStore';
import useDataStore, { DocumentItem } from '../../store/dataStore';
import { fetchDocumentsFromGoogleSheets } from '../../utils/googleSheetsService';
import { toast } from 'react-hot-toast';

const InsuranceMasterData = () => {
  const { setTitle } = useHeaderStore();
  const { documents, setDocuments } = useDataStore();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTitle('Insurance Master Data');
    if (documents.length === 0) {
      loadData();
    }
  }, [setTitle]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchDocumentsFromGoogleSheets();
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data from Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    } catch (e) {
      return dateString;
    }
  };

  const groupedData = useMemo(() => {
    const filtered = documents.filter(doc => {
      const term = searchTerm.toLowerCase();
      return (
        (doc.pName || '').toLowerCase().includes(term) ||
        (doc.companyName || '').toLowerCase().includes(term) ||
        (doc.documentName || '').toLowerCase().includes(term) || // Policy No
        (doc.documentType || '').toLowerCase().includes(term)
      );
    });

    return filtered.reduce((acc, doc) => {
      const groupName = doc.pName ? doc.pName.trim().toUpperCase() : "UNASSIGNED";
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(doc);
      return acc;
    }, {} as Record<string, DocumentItem[]>);
  }, [documents, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl shadow-input">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Insurance Master Data</h1>
          <p className="text-gray-500 text-sm mt-1">
            Overview of policies grouped by Policy Holder
          </p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search Name, Policy No, Company..."
              className="pl-10 pr-4 py-2.5 w-full shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50 min-w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {loading && documents.length === 0 ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader className="h-8 w-8 text-red-600 animate-spin" />
            <p className="text-gray-600 font-medium">Loading Master Data...</p>
          </div>
        </div>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="bg-white rounded-xl shadow-input p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-gray-50 p-4 rounded-full mb-4">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Data Found</h3>
          <p className="text-gray-500 max-w-sm">
            We couldn't find any insurance records matching your search.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupName, items]) => (
              <div key={groupName} className="bg-white rounded-lg shadow overflow-x-auto border border-gray-300">
                <table className="w-full min-w-max text-left border-collapse table-auto text-xs">
                  <thead>
                    {/* Main Heading Row */}
                    <tr>
                      <th
                        colSpan={15}
                        className="bg-blue-100 text-blue-900 text-center py-2 px-3 text-lg tracking-wide border-b border-gray-300 font-black uppercase"
                      >
                        {groupName}
                      </th>
                    </tr>
                    {/* Columns Row */}
                    <tr className="bg-orange-200 text-orange-950 font-bold border-b border-gray-300 uppercase leading-tight text-center">
                      <th className="border-r border-gray-300 px-2 py-2 w-12">S.No.</th>
                      <th className="border-r border-gray-300 px-3 py-2 whitespace-nowrap">Policy No</th>
                      <th className="border-r border-gray-300 px-3 py-2">Company</th>
                      <th className="border-r border-gray-300 px-3 py-2">Type</th>
                      <th className="border-r border-gray-300 px-3 py-2 whitespace-nowrap">Sum Assured</th>
                      <th className="border-r border-gray-300 px-3 py-2">Premium</th>
                      <th className="border-r border-gray-300 px-2 py-2 whitespace-nowrap">Premium<br/>Paying<br/>Term</th>
                      <th className="border-r border-gray-300 px-2 py-2 whitespace-nowrap">Policy<br/>Term</th>
                      <th className="border-r border-gray-300 px-3 py-2 whitespace-nowrap">First<br/>Premium Date</th>
                      <th className="border-r border-gray-300 px-3 py-2 whitespace-nowrap">Due Date of<br/>Last Premium</th>
                      <th className="border-r border-gray-300 px-3 py-2 whitespace-nowrap">MATURITY<br/>DATE</th>
                      <th className="border-r border-gray-300 px-3 py-2 whitespace-nowrap">Coverage<br/>Till</th>
                      <th className="border-r border-gray-300 px-3 py-2 min-w-[120px]">Remarks</th>
                      <th className="border-r border-gray-300 px-3 py-2">BANK</th>
                      <th className="px-3 py-2">AUTO</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-center">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                        <td className="border-r border-gray-200 px-2 py-1.5 font-semibold text-gray-700">{idx + 1}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 font-mono text-gray-800 font-bold whitespace-nowrap">{item.documentName || '-'}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 text-gray-700 font-medium">{item.companyName || '-'}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 text-gray-600">{item.documentType || '-'}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 text-gray-800 font-semibold whitespace-nowrap">{item.sumAssured || '-'}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 text-gray-800 font-semibold whitespace-nowrap">{item.premium || '-'}</td>
                        <td className="border-r border-gray-200 px-2 py-1.5 text-gray-700">{item.premiumPayingTerm || '-'}</td>
                        <td className="border-r border-gray-200 px-2 py-1.5 text-gray-700">{item.policyTerm || '-'}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 font-mono text-gray-600 whitespace-nowrap">{formatDate(item.firstPremiumDate)}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 font-mono text-gray-600 whitespace-nowrap">{formatDate(item.dueDateOfLastPremium)}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 font-mono text-gray-600 whitespace-nowrap">{formatDate(item.maturityDate) || formatDate(item.renewalDate)}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 text-gray-700">{item.coverageTill ? (/^\d+$/.test(item.coverageTill.toString().trim()) ? `${item.coverageTill} Years` : new Date(item.coverageTill).toLocaleDateString('en-GB').replace(/\//g, '.')) : '-'}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 text-gray-600 text-left max-w-xs truncate" title={item.docRemarks}>{item.docRemarks || '-'}</td>
                        <td className="border-r border-gray-200 px-3 py-1.5 text-gray-700">-</td>
                        <td className="px-3 py-1.5 font-bold text-gray-700">{item.autoDebited || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InsuranceMasterData;
