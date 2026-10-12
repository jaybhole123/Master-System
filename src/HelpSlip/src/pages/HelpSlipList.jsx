import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  Edit3, 
  Trash2, 
  User, 
  Building2, 
  Phone, 
  Calendar, 
  Sparkles, 
  RefreshCw, 
  X, 
  CornerDownRight, 
  HelpCircle,
  Lightbulb,
  Check,
  ChevronDown
} from 'lucide-react';
import supabase from '../../../SupabaseClient';
import { sendHelpSlipReplyNotification } from '../../../services/whatsappService';

const HelpSlipList = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'replied'
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const userRole = (localStorage.getItem("role") || "").toLowerCase();
  const loggedInUserName = (localStorage.getItem("user-name") || localStorage.getItem("username") || localStorage.getItem("user_name") || "").trim();
  const isSuperAdmin = userRole === "superadmin";
  const isAdmin = userRole === "admin" || isSuperAdmin;

  const fetchHelpSlips = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('help_slips')
        .select('*')
        .order('created_at', { ascending: false });

      // If role is NOT superadmin, filter help slips matching the logged-in username
      if (!isSuperAdmin && loggedInUserName) {
        query = query.ilike('name', loggedInUserName);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching help slips:', err);
      toast.error('Failed to load help slips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHelpSlips();
  }, []);

  const formatDateTime = (isoString) => {
    if (!isoString) return { date: '-', time: '-' };
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) return { date: isoString, time: '' };
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return {
      date: `${day} ${month} ${year}`,
      time: `${hours}:${minutes} ${ampm}`
    };
  };

  const handleSaveReply = async (id) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      setIsSubmittingReply(true);
      const { error } = await supabase
        .from('help_slips')
        .update({ admin_reply: replyText.trim() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Reply saved & WhatsApp notification dispatched!');

      // Send WhatsApp Notification to user
      const targetRecord = records.find(r => r.id === id);
      if (targetRecord) {
        sendHelpSlipReplyNotification({
          recipientPhone: targetRecord.number,
          recipientName: targetRecord.name,
          challenge: targetRecord.challenge,
          adminReply: replyText.trim()
        });
      }

      fetchHelpSlips();
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      console.error('Error saving reply:', err);
      toast.error('Failed to save reply: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    try {
      const { error } = await supabase
        .from('help_slips')
        .update({ admin_reply: null })
        .eq('id', id);

      if (error) throw error;

      toast.success('Reply deleted successfully!');
      fetchHelpSlips();
      if (replyingTo === id) {
        setReplyingTo(null);
        setReplyText('');
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      toast.error('Failed to delete reply: ' + (err.message || 'Error'));
    }
  };

  // Unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set();
    records.forEach(r => {
      if (r.department?.trim()) set.add(r.department.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const hasReply = Boolean(record.admin_reply?.trim());

      // Status Filter
      if (statusFilter === 'pending' && hasReply) return false;
      if (statusFilter === 'replied' && !hasReply) return false;

      // Department Filter
      if (departmentFilter !== 'all' && record.department?.trim().toLowerCase() !== departmentFilter.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = record.name?.toLowerCase().includes(q);
        const matchesPhone = record.number?.toString().toLowerCase().includes(q);
        const matchesDept = record.department?.toLowerCase().includes(q);
        const matchesChallenge = record.challenge?.toLowerCase().includes(q);
        const matchesSol1 = record.solution1?.toLowerCase().includes(q);
        const matchesSol2 = record.solution2?.toLowerCase().includes(q);
        const matchesSol3 = record.solution3?.toLowerCase().includes(q);
        const matchesReply = record.admin_reply?.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesDept || matchesChallenge || matchesSol1 || matchesSol2 || matchesSol3 || matchesReply;
      }

      return true;
    });
  }, [records, statusFilter, departmentFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const pending = records.filter(r => !r.admin_reply?.trim()).length;
    const replied = records.filter(r => Boolean(r.admin_reply?.trim())).length;
    const depts = new Set(records.map(r => r.department?.trim()).filter(Boolean)).size;
    return { total, pending, replied, depts };
  }, [records]);

  // Render Admin Reply & Interaction
  const renderReplySection = (record) => {
    const adminReply = record.admin_reply;

    if (isAdmin && replyingTo === record.id) {
      return (
        <div className="mt-3.5 bg-white rounded-xl p-3.5 border border-red-200 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-600 flex items-center gap-1.5 uppercase tracking-wide">
              <CornerDownRight className="h-3.5 w-3.5" />
              Write Admin Reply
            </span>
            <span className="text-[11px] text-slate-400">Notifies user on WhatsApp</span>
          </div>
          <textarea
            className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none bg-slate-50/50"
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your official resolution or instructions here..."
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2.5">
            <button 
              type="button"
              onClick={() => { setReplyingTo(null); setReplyText(''); }} 
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="button"
              disabled={isSubmittingReply}
              onClick={() => handleSaveReply(record.id)} 
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-red-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmittingReply ? 'Sending...' : 'Save & Send Reply'}
            </button>
          </div>
        </div>
      );
    }

    if (adminReply) {
      return (
        <div className="mt-3 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-xl p-3.5 border border-emerald-200/80 shadow-xs relative group">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-800 tracking-wide uppercase">Admin Reply</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100/80 text-emerald-700">
                <Check className="h-2.5 w-2.5" /> Delivered
              </span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button 
                  type="button"
                  onClick={() => { setReplyingTo(record.id); setReplyText(adminReply); }} 
                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/60 rounded transition-colors"
                  title="Edit Reply"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteReply(record.id)} 
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete Reply"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{adminReply}</p>
        </div>
      );
    }

    if (isAdmin) {
      return (
        <div className="mt-3">
          <button 
            type="button"
            onClick={() => { setReplyingTo(record.id); setReplyText(''); }} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg border border-red-200/60 transition-colors shadow-2xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Reply to Challenge
          </button>
        </div>
      );
    }

    return (
      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
        <Clock className="h-3.5 w-3.5 text-amber-600 animate-spin-slow" />
        <span>Awaiting Admin Reply</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* KPI Stats Cards (Compact Height) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 animate-in fade-in duration-300">
        <div 
          onClick={() => { setStatusFilter('all'); setDepartmentFilter('all'); setSearchQuery(''); }}
          className={`bg-white rounded-xl py-2.5 px-3.5 sm:py-3 sm:px-4 border transition-all cursor-pointer hover:shadow-md ${statusFilter === 'all' && departmentFilter === 'all' && !searchQuery ? 'border-red-500 ring-2 ring-red-500/10 shadow-xs' : 'border-slate-200/80 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Requests</span>
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
              <HelpCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">All submitted tickets</p>
        </div>

        <div 
          onClick={() => setStatusFilter('pending')}
          className={`bg-white rounded-xl py-2.5 px-3.5 sm:py-3 sm:px-4 border transition-all cursor-pointer hover:shadow-md ${statusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-xs' : 'border-slate-200/80 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Reply</span>
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 leading-tight">{stats.pending}</div>
          <p className="text-[11px] text-amber-600/80 mt-0.5 truncate">Awaiting resolution</p>
        </div>

        <div 
          onClick={() => setStatusFilter('replied')}
          className={`bg-white rounded-xl py-2.5 px-3.5 sm:py-3 sm:px-4 border transition-all cursor-pointer hover:shadow-md ${statusFilter === 'replied' ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-xs' : 'border-slate-200/80 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Resolved / Replied</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 leading-tight">{stats.replied}</div>
          <p className="text-[11px] text-emerald-600/80 mt-0.5 truncate">Replies dispatched</p>
        </div>

        <div className="bg-white rounded-xl py-2.5 px-3.5 sm:py-3 sm:px-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Departments</span>
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">{stats.depts}</div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">Active teams engaged</p>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by name, challenge, department, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          
          {/* Status Segmented Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All ({records.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('replied')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${statusFilter === 'replied' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Replied ({stats.replied})
            </button>
          </div>

          {/* Department Select */}
          {departmentOptions.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchHelpSlips}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-red-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="inline-flex p-3 rounded-2xl bg-red-50 text-red-600 mb-3 animate-pulse">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Loading Help Slips...</h3>
          <p className="text-xs text-slate-500 mt-1">Fetching latest employee support queries</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="inline-flex p-4 rounded-2xl bg-slate-50 text-slate-400 mb-3">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Help Slips Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all'
              ? 'No tickets match your active filter criteria. Try clearing search or reset filters.'
              : 'There are currently no help slip requests logged in the system.'}
          </p>
          {(searchQuery || statusFilter !== 'all' || departmentFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDepartmentFilter('all'); }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Table Header Bar */}
          <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Showing <strong className="text-slate-800">{filteredRecords.length}</strong> support requests</span>
            <span className="text-[11px] font-normal text-slate-400">Sorted by newest submission</span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-3.5 px-5 w-16 text-center">S.No.</th>
                  <th className="py-3.5 px-5 w-40 whitespace-nowrap">Date & Time</th>
                  <th className="py-3.5 px-5 w-60">Raised By</th>
                  <th className="py-3.5 px-5 w-32 text-center">Status</th>
                  <th className="py-3.5 px-5 min-w-[340px]">Challenge & Admin Resolution</th>
                  <th className="py-3.5 px-5 min-w-[280px]">Proposed Solutions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record, index) => {
                  const dt = formatDateTime(record.created_at || record.timestamp);
                  const hasReply = Boolean(record.admin_reply?.trim());
                  
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors align-top group">
                      
                      {/* S.No. */}
                      <td className="py-4 px-5 text-center text-xs font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <Calendar className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span>{dt.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{dt.time}</span>
                        </div>
                      </td>

                      {/* Raised By */}
                      <td className="py-4 px-5">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {record.name ? record.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 leading-snug">{record.name}</div>
                            {record.number && (
                              <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 text-emerald-600" />
                                <span>{record.number}</span>
                              </div>
                            )}
                            {record.department && (
                              <div className="mt-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                  <Building2 className="h-2.5 w-2.5 text-slate-500" />
                                  {record.department}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 text-center">
                        {hasReply ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Replied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Challenge & Reply */}
                      <td className="py-4 px-5">
                        {/* Challenge Box */}
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            <HelpCircle className="h-3.5 w-3.5 text-red-500" />
                            Challenge Reported
                          </div>
                          <p className="text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                            {record.challenge}
                          </p>
                        </div>

                        {/* Admin Reply Section */}
                        {renderReplySection(record)}
                      </td>

                      {/* Solutions Column */}
                      <td className="py-4 px-5">
                        <div className="space-y-2">
                          
                          {/* Solution 1 (Best) */}
                          <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-200/80">
                            <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                              <Sparkles className="h-3 w-3 text-emerald-600" />
                              Best Solution (Option 1)
                            </div>
                            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                              {record.solution1 || '-'}
                            </p>
                          </div>

                          {/* Solution 2 */}
                          {record.solution2 && (
                            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                <Lightbulb className="h-3 w-3 text-amber-500" />
                                Solution Option 2
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {record.solution2}
                              </p>
                            </div>
                          )}

                          {/* Solution 3 */}
                          {record.solution3 && (
                            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                <Lightbulb className="h-3 w-3 text-blue-500" />
                                Solution Option 3
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {record.solution3}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {filteredRecords.map((record, index) => {
              const dt = formatDateTime(record.created_at || record.timestamp);
              const hasReply = Boolean(record.admin_reply?.trim());

              return (
                <div key={record.id} className="p-4 sm:p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                  
                  {/* Top Header: Employee & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-800 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {record.name ? record.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base leading-tight">{record.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1 font-mono">
                          {record.number && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-emerald-600" />
                              {record.number}
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-slate-600 font-sans">{record.department || 'General'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {hasReply ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Replied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Submission Meta Date */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="h-3.5 w-3.5 text-red-500" /> {dt.date}
                    </span>
                    <span>at</span>
                    <span className="font-mono text-slate-600">{dt.time}</span>
                  </div>

                  {/* Challenge */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-red-500" /> Challenge
                    </div>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                      {record.challenge}
                    </p>
                  </div>

                  {/* Proposed Solutions */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Suggested Solutions</div>
                    
                    <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200">
                      <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Best Solution (1)
                      </div>
                      <p className="text-xs text-emerald-950 font-medium">{record.solution1 || '-'}</p>
                    </div>

                    {record.solution2 && (
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-xs text-slate-700">
                        <span className="font-bold text-slate-500 text-[10px] uppercase block mb-0.5">Solution Option 2</span>
                        {record.solution2}
                      </div>
                    )}

                    {record.solution3 && (
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-xs text-slate-700">
                        <span className="font-bold text-slate-500 text-[10px] uppercase block mb-0.5">Solution Option 3</span>
                        {record.solution3}
                      </div>
                    )}
                  </div>

                  {/* Reply Section */}
                  <div className="pt-2 border-t border-slate-100">
                    {renderReplySection(record)}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              Total: <span className="font-bold text-slate-800">{filteredRecords.length}</span> tickets displayed
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Replied: {stats.replied}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Pending: {stats.pending}</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default HelpSlipList;
