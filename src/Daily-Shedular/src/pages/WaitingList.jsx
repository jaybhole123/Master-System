import React, { useState, useEffect } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import { format, differenceInHours } from 'date-fns';
import { Check, Calendar, Search, AlertOctagon, Clock, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

const WaitingList = () => {
  const { tasks, markTaskDone, rescheduleTask, staffList, generateTimeSlots, settings, formatTime12h, fetchTasks } = useScheduler();
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' });
  const timeSlots = generateTimeSlots();

  useEffect(() => {
    fetchTasks();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');

  const overdueTasks = tasks.filter(t => {
    if (t.status !== 'Overdue') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (t.description || '').toLowerCase().includes(q) ||
             (t.createdBy || '').toLowerCase().includes(q) ||
             (t.remark || '').toLowerCase().includes(q);
    }
    return true;
  });

  const highlightText = (text) => {
    if (!searchQuery || !text) return text;
    const parts = text.toString().split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? <mark key={index} style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0 2px', borderRadius: '2px', fontWeight: 'bold' }}>{part}</mark> : part
    );
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    rescheduleTask(rescheduleModal.taskId, rescheduleModal.newDate, rescheduleModal.newStartTime, rescheduleModal.newEndTime);
    setRescheduleModal({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' });
  };

  const handleStartTimeChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    
    // Auto calculate end time based on settings
    const [hours, minutes] = val.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hours, 10));
    timeDate.setMinutes(parseInt(minutes, 10));
    
    const interval = settings?.intervalMinutes || 60;
    const end = new Date(timeDate.getTime() + interval * 60000);
    
    const endHours = String(end.getHours()).padStart(2, '0');
    const endMinutes = String(end.getMinutes()).padStart(2, '0');
    
    setRescheduleModal(prev => ({ ...prev, newStartTime: val, newEndTime: `${endHours}:${endMinutes}` }));
  };

  return (
    <div className="daily-scheduler-container px-2 sm:px-4 py-3 w-full max-w-full space-y-4">
      {/* ═══════════════════════════════════════════════════════════
          COMPACT SINGLE-LINE EXECUTIVE BRAND HEADER
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-800 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-md relative overflow-hidden flex items-center justify-between gap-4 border border-red-500/30 flex-wrap">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-3 min-w-0 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-extrabold uppercase tracking-widest text-red-100 shadow-2xs shrink-0">
            <AlertOctagon className="h-3 w-3 text-amber-300 shrink-0" />
            <span>Overdue Queue</span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
            Waiting List & Overdue Tasks
          </h1>
          <span className="text-red-200/60 hidden md:inline">•</span>
          <p className="text-red-100/90 text-xs font-medium truncate hidden md:inline">
            Action items that missed original schedule requiring immediate resolution or rescheduling.
          </p>
        </div>

        {/* Overdue Count Badge */}
        <div className="relative z-10 flex items-center bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 gap-2 text-white">
          <Clock size={14} className="text-amber-300" />
          <span className="text-xs font-bold whitespace-nowrap">
            Pending Overdue: <strong className="text-amber-200 font-mono text-sm">{overdueTasks.length}</strong>
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DATA TABLE CONTAINER & CONTROLS
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-3">
        {/* Search & Action Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 min-w-[280px] sm:min-w-[340px] focus-within:bg-white focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Search by description, remark, created by..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 w-full outline-none font-medium"
            />
          </div>

          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" />
            <span>Showing: <strong>{overdueTasks.length} Overdue Records</strong></span>
          </div>
        </div>

        {/* Overdue Table */}
        <div className="p-2 sm:p-3 overflow-x-auto">
          <div className="table-container animate-fade-in w-full" style={{ maxHeight: '640px', overflowY: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '1100px' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '60px', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'center' }}>S.NO</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '400px', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'left', paddingLeft: '1rem' }}>TASK DETAILS</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '220px', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'left', paddingLeft: '0.75rem' }}>ORIGINAL SCHEDULE</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '180px', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'center' }}>OVERDUE DURATION</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '220px', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {overdueTasks.length > 0 ? (
                  overdueTasks.map((task, idx) => {
                    const overdueHours = Math.max(0, differenceInHours(new Date(), new Date(`${task.date}T${task.endTime || '23:59'}`)));
                    return (
                      <tr key={task.id} className="hover:bg-red-50/40 transition-colors">
                        <td style={{ textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                          {idx + 1}
                        </td>
                        <td style={{ paddingLeft: '1rem' }}>
                          <div className="font-bold text-slate-800 text-sm">{highlightText(task.description || 'No description')}</div>
                          {task.remark && (
                            <div className="text-xs text-slate-500 mt-1 italic">
                              Remark: {highlightText(task.remark)}
                            </div>
                          )}
                          {task.createdBy && (
                            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                              Created By: {task.createdBy}
                            </div>
                          )}
                        </td>
                        <td style={{ paddingLeft: '0.75rem' }}>
                          <div className="font-semibold text-slate-700 text-xs">
                            {format(new Date(task.date), 'dd MMM yyyy')}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {formatTime12h ? formatTime12h(task.startTime) : task.startTime} - {formatTime12h ? formatTime12h(task.endTime) : task.endTime}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs font-mono">
                            <Clock size={12} className="text-rose-500" />
                            {overdueHours} hrs overdue
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => markTaskDone(task.id)} 
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                              title="Mark Done"
                            >
                              <Check size={14} />
                              <span>Done</span>
                            </button>
                            <button 
                              onClick={() => setRescheduleModal({ 
                                isOpen: true, 
                                taskId: task.id, 
                                newDate: new Date().toISOString().split('T')[0], 
                                newStartTime: task.startTime, 
                                newEndTime: task.endTime 
                              })} 
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-2xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                              title="Reschedule"
                            >
                              <Calendar size={14} />
                              <span>Reschedule</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-14 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-2">
                        <Check size={24} />
                      </div>
                      <div className="text-sm font-bold text-slate-700">All Caught Up!</div>
                      <div className="text-xs text-slate-400 mt-0.5">No overdue tasks in the waiting list right now.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleRescheduleSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '420px' }} className="animate-fade-in shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-800">Reschedule Overdue Task</h3>
            </div>
            
            <div className="input-group mb-3">
              <label className="input-label text-xs font-bold text-slate-600 uppercase tracking-wider">New Date *</label>
              <input required type="date" value={rescheduleModal.newDate} onChange={e => setRescheduleModal(prev => ({ ...prev, newDate: e.target.value }))} className="input-field" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label text-xs font-bold text-slate-600 uppercase tracking-wider">Start Time *</label>
                <select required value={rescheduleModal.newStartTime} onChange={handleStartTimeChange} className="input-field">
                  <option value="">Select Time Slot</option>
                  {timeSlots.map(t => <option key={t} value={t}>{formatTime12h ? formatTime12h(t) : t}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label text-xs font-bold text-slate-600 uppercase tracking-wider">End Time *</label>
                <input required type="time" value={rescheduleModal.newEndTime} onChange={e => setRescheduleModal(prev => ({ ...prev, newEndTime: e.target.value }))} className="input-field" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setRescheduleModal({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' })} className="btn btn-outline text-xs font-bold">Cancel</button>
              <button type="submit" className="btn btn-primary text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">Save Reschedule</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WaitingList;
