import React, { useState, useEffect } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import { format, isSameDay, parse } from 'date-fns';
import TaskStatusChart from '../components/dashboard/TaskStatusChart';
import { 
  Paperclip, Image as ImageIcon, PlayCircle, ShieldCheck, Download, Search, 
  ChevronLeft, ChevronRight, Calendar, CheckCircle2, AlertCircle, XCircle, 
  Clock, Sparkles, Filter, RotateCcw, User, Check
} from 'lucide-react';
import jsPDF from 'jspdf';

const Reports = () => {
  const { allTasks: tasks, staffList, formatTime12h, settings, currentUser, fetchTasks } = useScheduler();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);

  const handlePrevDay = () => {
    const current = startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : new Date();
    current.setDate(current.getDate() - 1);
    const dateStr = format(current, 'yyyy-MM-dd');
    setStartDate(dateStr);
    setEndDate(dateStr);
  };

  const handleNextDay = () => {
    const current = startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : new Date();
    current.setDate(current.getDate() + 1);
    const dateStr = format(current, 'yyyy-MM-dd');
    setStartDate(dateStr);
    setEndDate(dateStr);
  };

  const handleToday = () => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    setStartDate(dateStr);
    setEndDate(dateStr);
  };

  const getDisplayDate = () => {
    if (startDate && startDate === endDate) {
      return format(parse(startDate, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy');
    }
    if (startDate && endDate) {
      return 'Date Range';
    }
    if (startDate) return 'From ' + format(parse(startDate, 'yyyy-MM-dd', new Date()), 'dd MMM');
    if (endDate) return 'Up to ' + format(parse(endDate, 'yyyy-MM-dd', new Date()), 'dd MMM');
    return 'All Time';
  };

  useEffect(() => {
    setVisibleCount(50);
  }, [startDate, endDate, statusFilter, staffFilter, searchQuery]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const localRole = (localStorage.getItem('role') || '').toLowerCase().trim();
  const currentRole = (currentUser?.role || '').toLowerCase().trim();
  const isSuperadmin = localRole === 'superadmin' || currentRole === 'superadmin' ||
    staffList.some(u => String(u.id) === String(currentUser?.id) && (u.role || '').toLowerCase().trim() === 'superadmin');
  
  const isDateInRange = (dateString) => {
    if (!dateString) return false;
    const taskDateObj = new Date(dateString);
    if (isNaN(taskDateObj.getTime())) return false;
    
    const taskDateStr = format(taskDateObj, 'yyyy-MM-dd');

    let isValid = true;
    if (startDate && taskDateStr < startDate) isValid = false;
    if (endDate && taskDateStr > endDate) isValid = false;
    
    return isValid;
  };

  const getFilteredTasks = () => {
    return tasks.filter(t => {
      // Date filter
      if (!isDateInRange(t.date)) return false;

      // Role filter
      if (!currentUser || isSuperadmin) return true;

      // Regular users see only their own
      const cId = String(currentUser.id);
      const cName = String(currentUser.name || '').toLowerCase().trim();
      const tAssigned = String(t.assignedStaff);
      const tCreated = String(t.createdBy || '').toLowerCase().trim();

      if (tAssigned !== cId && 
          tCreated !== cId && 
          tCreated !== cName) {
        return false;
      }
      return true;
    });
  };

  // Get unique staff names for dropdown
  const uniqueStaff = [...new Set(getFilteredTasks().map(t => t.createdBy).filter(Boolean))].sort();

  const getTableTasks = () => {
    let result = getFilteredTasks();
    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }
    if (staffFilter !== 'All') {
      result = result.filter(t => t.createdBy === staffFilter);
    }
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.description || '').toLowerCase().includes(lowerQuery) ||
        (t.remark || '').toLowerCase().includes(lowerQuery) ||
        (t.createdBy || '').toLowerCase().includes(lowerQuery)
      );
    }
    return result;
  };

  const getStatsTasks = () => {
    let result = getFilteredTasks();
    if (staffFilter !== 'All') {
      result = result.filter(t => t.createdBy === staffFilter);
    }
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.description || '').toLowerCase().includes(lowerQuery) ||
        (t.remark || '').toLowerCase().includes(lowerQuery) ||
        (t.createdBy || '').toLowerCase().includes(lowerQuery)
      );
    }
    return result;
  };

  const filteredTasks = getFilteredTasks();
  const tableTasks = getTableTasks();
  const statsTasks = getStatsTasks();
  
  const totalTasks = statsTasks.length;
  const completedTasks = statsTasks.filter(t => t.status === 'Completed').length;
  const notDoneTasks = statsTasks.filter(t => t.status === 'Not Done').length;
  const overdueTasks = statsTasks.filter(t => t.status === 'Overdue').length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Detailed Task History Report', 14, 22);
    
    const tableColumn = ["S.NO", "Date", "Time", "Task Details", "Submitted By", "Remarks", "Status", "Completed At"];
    const tableRows = [];

    tableTasks.slice().reverse().forEach((task, index) => {
      const timeDate = parse(task.startTime, 'HH:mm', new Date());
      const endTimeDate = new Date(timeDate.getTime() + (settings?.intervalMinutes || 60) * 60000);
      
      const taskData = [
        index + 1,
        format(new Date(task.date), 'dd MMM yyyy'),
        `${formatTime12h(task.startTime)} - ${format(endTimeDate, 'hh:mm a')}`,
        task.description || 'No description',
        task.createdBy || 'Admin',
        task.remark || task.adminRemark || '-',
        task.status,
        task.actualDoneDate ? format(new Date(task.actualDoneDate), 'hh:mm a') : '-'
      ];
      tableRows.push(taskData);
    });

    import('jspdf-autotable').then(({ default: autoTable }) => {
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], halign: 'center' },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 24, halign: 'center' },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 'auto' },
          6: { cellWidth: 20, halign: 'center' },
          7: { cellWidth: 25, halign: 'center' }
        }
      });
      
      doc.save(`Task_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    });
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const textStr = String(text);
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = textStr.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} style={{ backgroundColor: '#fef08a', color: 'inherit', padding: '0 2px', borderRadius: '2px' }}>{part}</mark> : part
    );
  };

  return (
    <div className="daily-scheduler-container p-3 sm:p-5 w-full max-w-full space-y-6">
      {/* ═══════════════════════════════════════════════════════════
          COMPACT SINGLE-LINE EXECUTIVE BRAND HEADER
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-800 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-md relative overflow-hidden flex items-center justify-between gap-4 border border-red-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-3 min-w-0 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-extrabold uppercase tracking-widest text-red-100 shadow-2xs shrink-0">
            <Sparkles className="h-3 w-3 text-amber-300 shrink-0" />
            <span>Audit</span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
            Task History & Reports Analytics
          </h1>
          <span className="text-red-200/60 hidden md:inline">•</span>
          <p className="text-red-100/90 text-xs font-medium truncate hidden md:inline">
            Monitor daily employee submissions & administrative approvals.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
          <button 
            onClick={exportToPDF}
            className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 font-bold rounded-xl shadow-sm hover:shadow transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Download PDF Report"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          METRICS KPI CARDS + STATUS BREAKDOWN CHART
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Left Side: 3 Compact KPI Cards */}
        <div className="flex flex-col gap-2.5 justify-between">
          {/* Card 1: Total Tasks */}
          <div className="flex-1 bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tasks Generated</span>
              <div className="text-xl sm:text-2xl font-black text-blue-600 font-mono tracking-tight">{totalTasks}</div>
              <span className="text-[10px] font-medium text-slate-400">Filtered timeframe tasks</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Clock size={19} />
            </div>
          </div>

          {/* Card 2: Overall Completion Rate */}
          <div className="flex-1 bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Completion Rate</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono tracking-tight">{completionRate}%</div>
              <span className="text-[10px] font-semibold text-emerald-700">
                {completedTasks} of {totalTasks} Completed
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <CheckCircle2 size={19} />
            </div>
          </div>

          {/* Card 3: Tasks Not Done */}
          <div className="flex-1 bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tasks Not Done / Rejected</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono tracking-tight">{notDoneTasks}</div>
              <span className="text-[10px] font-medium text-slate-400">Overdue: {overdueTasks}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
              <XCircle size={19} />
            </div>
          </div>
        </div>

        {/* Right Side: Chart Card - Exact 100% Equal Height */}
        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between h-full">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1 shrink-0">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Task Status Breakdown</h3>
              <p className="text-[10px] font-medium text-slate-400">Distribution of current tasks status in the selected period</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {getDisplayDate()}
            </span>
          </div>
          <div className="flex-1 w-full min-h-[170px]">
            <TaskStatusChart tasks={statsTasks} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DATA TABLE CONTAINER WITH MODERN FILTERS
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-3">
        {/* Filter Toolbar Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-black text-slate-800 tracking-tight">Detailed Task History</h3>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
              <p className="text-xs font-medium text-slate-400 hidden sm:inline">Showing all task logs with attachments and verification audit</p>
            </div>
            <span className="text-xs font-black px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full whitespace-nowrap">
              {tableTasks.length} Total Records
            </span>
          </div>

          {/* Filter Controls Row */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 flex-1 min-w-[240px] focus-within:bg-white focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search description, remark, staff..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 w-full outline-none font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                  <XCircle size={14} />
                </button>
              )}
            </div>

            {/* Quick Day Navigator */}
            <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-xl p-1 gap-1">
              <button 
                onClick={handlePrevDay} 
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={handleToday} 
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${startDate && startDate === endDate && startDate === format(new Date(), 'yyyy-MM-dd') ? 'bg-white text-red-600 shadow-2xs' : 'text-red-600 hover:bg-white'}`}
              >
                Today
              </button>
              <button 
                onClick={handleNextDay} 
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${!startDate && !endDate ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:bg-white'}`}
                title="Show All Dates"
              >
                All
              </button>
              <div className="h-4 w-px bg-slate-200 mx-1"></div>
              <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-700 whitespace-nowrap">
                <Calendar size={13} className="text-red-500" />
                <span>{getDisplayDate()}</span>
              </div>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5">
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer" 
                title="Start Date"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer" 
                title="End Date"
              />
            </div>

            {/* Status Filter */}
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              className="px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Not Done">Not Done</option>
              <option value="Overdue">Overdue</option>
            </select>

            {/* Staff Filter */}
            {isSuperadmin && (
              <select 
                value={staffFilter} 
                onChange={e => setStaffFilter(e.target.value)} 
                className="px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
              >
                <option value="All">All Staff</option>
                {uniqueStaff.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}

            {/* Clear Filters */}
            {(startDate || endDate || statusFilter !== 'All' || staffFilter !== 'All' || searchQuery) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('All'); setStaffFilter('All'); setSearchQuery(''); }}
                className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══════════ MODERN SCROLLABLE DATA TABLE ═══════════ */}
        <div 
          className="overflow-x-auto overflow-y-auto max-h-[68vh] custom-sidebar-scroll"
          onScroll={(e) => {
            const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
            if (scrollHeight - scrollTop <= clientHeight + 50) {
              if (visibleCount < tableTasks.length) {
                setVisibleCount(prev => prev + 50);
              }
            }
          }}
        >
          <table className="w-full text-left border-collapse min-w-[1750px]">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200">
              <tr className="text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-[70px]">S.No</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-[130px]">Date</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-[190px]">Time</th>
                <th className="py-3.5 px-5 text-left min-w-[500px]">Task Details</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap w-[200px]">Submitted By</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-[180px]">Attachments</th>
                <th className="py-3.5 px-5 text-left min-w-[280px]">Remarks</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-[140px]">Status</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-[140px]">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {tableTasks.length > 0 ? (
                tableTasks.slice().reverse().slice(0, visibleCount).map((task, index) => {
                  const timeDate = parse(task.startTime, 'HH:mm', new Date());
                  const endTimeDate = new Date(timeDate.getTime() + (settings?.intervalMinutes || 60) * 60000);
                  
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* S.No */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 border border-slate-200/80">
                          {format(new Date(task.date), 'dd MMM yyyy')}
                        </span>
                      </td>

                      {/* Time Slot */}
                      <td className="py-3.5 px-4 text-center text-xs font-mono font-bold text-slate-600 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-blue-50/70 text-blue-800 rounded-lg border border-blue-100">
                          {formatTime12h(task.startTime)} - {format(endTimeDate, 'hh:mm a')}
                        </span>
                      </td>

                      {/* Task Details */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-800 leading-relaxed break-words min-w-[320px]">
                          {highlightText(task.description || 'No description', searchQuery)}
                        </div>
                      </td>

                      {/* Submitted By */}
                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/70">
                          <User size={12} className="text-slate-400" />
                          <span>{highlightText(task.createdBy || 'Admin', searchQuery)}</span>
                        </span>
                      </td>

                      {/* Attachments */}
                      <td className="py-3.5 px-4 text-center">
                        {task.attachments && task.attachments.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center max-w-[160px] mx-auto">
                            {task.attachments.map((att, idx) => {
                              if (att.type?.startsWith('image/')) {
                                return (
                                  <a 
                                    key={idx} 
                                    href={att.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-all max-w-full"
                                  >
                                    <ImageIcon size={13} className="shrink-0" />
                                    <span className="truncate">{att.name || 'View Image'}</span>
                                  </a>
                                );
                              } else if (att.type?.startsWith('audio/')) {
                                return (
                                  <div key={idx} className="w-full">
                                    <audio src={att.url} controls className="h-7 w-full max-w-[150px]" />
                                  </div>
                                );
                              } else {
                                return (
                                  <a 
                                    key={idx} 
                                    href={att.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all max-w-full"
                                  >
                                    <Paperclip size={12} className="shrink-0" />
                                    <span className="truncate">{att.name || 'File'}</span>
                                  </a>
                                );
                              }
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-5 text-left">
                        <div className="text-xs text-slate-600 space-y-1 min-w-[200px]">
                          {task.remark && (
                            <div className="italic text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              "{highlightText(task.remark, searchQuery)}"
                            </div>
                          )}
                          {task.adminRemark && (
                            <div className="text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                              <span className="font-bold uppercase tracking-wider text-[10px] block">Admin Feedback:</span>
                              "{highlightText(task.adminRemark, searchQuery)}"
                            </div>
                          )}
                          {!task.remark && !task.adminRemark && <span className="text-slate-300">—</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {task.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check size={12} strokeWidth={3} /> Completed
                          </span>
                        ) : task.status === 'Not Done' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                            <XCircle size={12} /> Not Done
                          </span>
                        ) : task.status === 'Overdue' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                            <AlertCircle size={12} /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>

                      {/* Completed At */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-emerald-700">
                          {task.actualDoneDate ? format(new Date(task.actualDoneDate), 'hh:mm a') : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <Clock className="h-9 w-9 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No task records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search query or date range filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
