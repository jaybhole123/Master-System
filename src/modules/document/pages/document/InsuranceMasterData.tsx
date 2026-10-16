import React, { useEffect, useState, useMemo } from 'react';
import { Loader, Search, RefreshCw, FileText, Shield, Users, Building2, Coins, ChevronDown } from 'lucide-react';
import useHeaderStore from '../../store/headerStore';
import useDataStore, { DocumentItem } from '../../store/dataStore';
import { fetchDocumentsFromGoogleSheets } from '../../utils/googleSheetsService';
import { toast } from 'react-hot-toast';

const InsuranceMasterData = () => {
  const { setTitle } = useHeaderStore();
  const { documents, setDocuments } = useDataStore();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHolder, setSelectedHolder] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState('All');

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
      toast.success('Master data refreshed successfully');
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

  // Distinct Filter Lists
  const holdersList = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.pName && d.pName.trim()) set.add(d.pName.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [documents]);

  const companiesList = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.companyName && d.companyName.trim()) set.add(d.companyName.trim());
    });
    return Array.from(set).sort();
  }, [documents]);

  // Overall Statistics for KPI cards
  const stats = useMemo(() => {
    const totalPolicies = documents.length;
    const uniquePersons = holdersList.length;
    const uniqueCompanies = companiesList.length;
    return { totalPolicies, uniquePersons, uniqueCompanies };
  }, [documents, holdersList, companiesList]);

  const groupedData = useMemo(() => {
    const filtered = documents.filter((doc) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (doc.pName || '').toLowerCase().includes(term) ||
        (doc.companyName || '').toLowerCase().includes(term) ||
        (doc.documentName || '').toLowerCase().includes(term) ||
        (doc.documentType || '').toLowerCase().includes(term);

      const groupName = doc.pName ? doc.pName.trim().toUpperCase() : 'UNASSIGNED';
      const matchesHolder = selectedHolder === 'All' || groupName === selectedHolder;
      const matchesCompany = selectedCompany === 'All' || doc.companyName === selectedCompany;

      return matchesSearch && matchesHolder && matchesCompany;
    });

    return filtered.reduce((acc, doc) => {
      const groupName = doc.pName ? doc.pName.trim().toUpperCase() : 'UNASSIGNED';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(doc);
      return acc;
    }, {} as Record<string, DocumentItem[]>);
  }, [documents, searchTerm, selectedHolder, selectedCompany]);

  return (
    <div className="space-y-3">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-50 text-red-600 rounded-xl">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Insurance Master Data</h1>
            <p className="text-gray-500 text-xs">
              Centralized policy register grouped by Policy Holder
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center w-full sm:w-auto gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search Name, Policy No, Company..."
              className="pl-9 pr-3 py-2 w-full text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50/70 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Holder Filter */}
          <div className="relative">
            <select
              value={selectedHolder}
              onChange={(e) => setSelectedHolder(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-700 cursor-pointer hover:bg-gray-100 transition-all max-w-[150px] truncate"
            >
              <option value="All">All Holders ({holdersList.length})</option>
              {holdersList.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div className="relative hidden md:block">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-700 cursor-pointer hover:bg-gray-100 transition-all max-w-[140px] truncate"
            >
              <option value="All">All Companies</option>
              {companiesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm shadow-red-200 disabled:opacity-50"
            title="Sync Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Total Policies Card */}
        <div className="px-3.5 py-2.5 rounded-xl border bg-gradient-to-br from-red-600 to-red-700 text-white shadow-sm shadow-red-100 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block text-red-100">
                Total Policies
              </span>
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none">
                {stats.totalPolicies}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm text-white">
              <Shield size={16} />
            </div>
          </div>
          <div className="text-[10px] mt-1.5 font-medium text-red-100 truncate">
            All registered policies in master
          </div>
        </div>

        {/* Policy Holders Card */}
        <div className="px-3.5 py-2.5 rounded-xl border bg-white border-gray-100 shadow-sm hover:border-red-100 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                Policy Holders
              </span>
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none text-gray-800">
                {stats.uniquePersons}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <Users size={16} />
            </div>
          </div>
          <div className="text-[10px] mt-1.5 font-medium text-gray-400 truncate">
            Unique insured persons
          </div>
        </div>

        {/* Companies Card */}
        <div className="px-3.5 py-2.5 rounded-xl border bg-white border-gray-100 shadow-sm hover:border-red-100 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-500">
                Insurance Providers
              </span>
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 leading-none text-gray-800">
                {stats.uniqueCompanies}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-[10px] mt-1.5 font-medium text-gray-400 truncate">
            Different insurance providers
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && documents.length === 0 ? (
        <div className="flex justify-center items-center min-h-[350px] bg-white rounded-2xl border border-gray-100">
          <div className="flex flex-col items-center gap-3">
            <Loader className="h-8 w-8 text-red-600 animate-spin" />
            <p className="text-gray-600 text-sm font-medium">Loading Insurance Master Data...</p>
          </div>
        </div>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-red-50 p-3.5 rounded-2xl mb-3 text-red-600">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">No Records Found</h3>
          <p className="text-gray-500 text-xs max-w-sm">
            We couldn't find any insurance records matching your search or filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupName, items]) => (
              <div
                key={groupName}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Group Header Banner */}
                <div className="bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2.5 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                    <h2 className="text-sm sm:text-base font-bold tracking-wide uppercase">
                      {groupName}
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? 'Policy' : 'Policies'}
                  </span>
                </div>

                {/* Group Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                        <th className="px-2.5 py-2 w-12 text-left bg-gray-50/90 align-top">S.No.</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Policy No</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Company</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Type</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Sum Assured</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Premium</th>
                        <th className="px-2.5 py-2 text-left bg-gray-50/90 align-top">PPT</th>
                        <th className="px-2.5 py-2 text-left bg-gray-50/90 align-top">Term</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">1st Premium Date</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Last Due Date</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Maturity Date</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Coverage Till</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 min-w-[140px] align-top">Remarks</th>
                        <th className="px-3 py-2 text-left bg-gray-50/90 align-top">Auto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-red-50/30 transition-colors">
                          <td className="px-2.5 py-2 font-medium text-gray-500 align-top text-left">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-blue-600 whitespace-nowrap align-top text-left">
                            {item.documentName || '-'}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800 align-top text-left">{item.companyName || '-'}</td>
                          <td className="px-3 py-2 text-gray-600 align-top text-left">{item.documentType || '-'}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap align-top text-left">
                            {item.sumAssured || '-'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-emerald-700 whitespace-nowrap align-top text-left">
                            {item.premium || '-'}
                          </td>
                          <td className="px-2.5 py-2 text-gray-600 align-top text-left">{item.premiumPayingTerm || '-'}</td>
                          <td className="px-2.5 py-2 text-gray-600 align-top text-left">{item.policyTerm || '-'}</td>
                          <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap align-top text-left">
                            {formatDate(item.firstPremiumDate)}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap align-top text-left">
                            {formatDate(item.dueDateOfLastPremium)}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap align-top text-left">
                            {formatDate(item.maturityDate) || formatDate(item.renewalDate)}
                          </td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap align-top text-left">
                            {item.coverageTill
                              ? /^\d+$/.test(item.coverageTill.toString().trim())
                                ? `${item.coverageTill} Years`
                                : new Date(item.coverageTill).toLocaleDateString('en-GB').replace(/\//g, '.')
                              : '-'}
                          </td>
                          <td
                            className="px-3 py-2 text-gray-500 text-left max-w-xs truncate align-top"
                            title={item.docRemarks}
                          >
                            {item.docRemarks || '-'}
                          </td>
                          <td className="px-3 py-2 align-top text-left">
                            {item.autoDebited ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 inline-block">
                                {item.autoDebited}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default InsuranceMasterData;
