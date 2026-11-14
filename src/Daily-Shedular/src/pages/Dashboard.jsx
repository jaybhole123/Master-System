import React, { useState, useEffect } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import SchedulerTable from '../components/dashboard/SchedulerTable';
import TeamOverview from '../components/dashboard/TeamOverview';
import TaskModal from '../components/dashboard/TaskModal';
import TaskStatusChart from '../components/dashboard/TaskStatusChart';
import { format, isSameDay, addDays, subDays } from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Search, 
  Sparkles, Users, CheckCircle2, ListChecks, CheckSquare, Clock
} from 'lucide-react';

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { tasks, allTasks, somedayTasks, staffList, markTaskDone, markAllPendingDone, rescheduleTask, scheduleSomedayTask, fetchTasks, fetchSomedayTasks, currentUser } = useScheduler();

  useEffect(() => {
    fetchTasks();
    fetchSomedayTasks();
  }, []);

  const [modalState, setModalState] = useState({ isOpen: false, time: null, task: null });
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' });
  const [scheduleModal, setScheduleModal] = useState({ isOpen: false, taskId: null, date: '', startTime: '', endTime: '' });

  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');

  const overdueTasks = tasks.filter(t => t.status === 'Overdue');
  const todaysTasks = tasks.filter(t => t.date === format(currentDate, 'yyyy-MM-dd')).filter(t => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (t.description || '').toLowerCase().includes(lowerQuery) ||
           (t.remark || '').toLowerCase().includes(lowerQuery) ||
           (t.createdBy || '').toLowerCase().includes(lowerQuery);
  });

  const handleAddTask = (time, task = null) => {
    setModalState({ isOpen: true, time, task });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, time: null, task: null });
  };

  const handleMarkSelectedDone = () => {
    if (selectedTaskIds.length === 0) {
      alert('Please select at least one task to mark as done!');
      return;
    }
    if (window.confirm(`Are you sure you want to mark ${selectedTaskIds.length} selected tasks as done?`)) {
      markAllPendingDone(selectedTaskIds);
      setSelectedTaskIds([]);
    }
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    rescheduleTask(rescheduleModal.taskId, rescheduleModal.newDate, rescheduleModal.newStartTime, rescheduleModal.newEndTime);
    setRescheduleModal({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' });
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    scheduleSomedayTask(scheduleModal.taskId, {
      date: scheduleModal.date, startTime: scheduleModal.startTime, endTime: scheduleModal.endTime
    });
    setScheduleModal({ isOpen: false, taskId: null, date: '', startTime: '', endTime: '' });
  };

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="daily-scheduler-container px-2 sm:px-4 py-3 w-full max-w-full space-y-4">
      {/* ═══════════════════════════════════════════════════════════
          COMPACT SINGLE-LINE EXECUTIVE BRAND HEADER
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-800 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-md relative overflow-hidden flex items-center justify-between gap-4 border border-red-500/30 flex-wrap">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-3 min-w-0 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-extrabold uppercase tracking-widest text-red-100 shadow-2xs shrink-0">
            <Sparkles className="h-3 w-3 text-amber-300 shrink-0" />
            <span>Daily Schedule</span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
            Scheduler Dashboard & Dispatch
          </h1>
          <span className="text-red-200/60 hidden md:inline">•</span>
          <p className="text-red-100/90 text-xs font-medium truncate hidden md:inline">
            Manage daily schedule, hourly task delegation & real-time progress.
          </p>
        </div>

        {/* Date Navigator Pill */}
        <div className="relative z-10 flex items-center bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-1 gap-1 text-white">
          <button 
            onClick={handlePrevDay} 
            className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={handleToday} 
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${isSameDay(currentDate, new Date()) ? 'bg-white text-red-700 shadow-2xs' : 'text-white hover:bg-white/20'}`}
          >
            Today
          </button>
          <button 
            onClick={handleNextDay} 
            className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>
          <div className="h-4 w-px bg-white/25 mx-1"></div>
          <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-white whitespace-nowrap">
            <CalendarIcon size={13} className="text-amber-300" />
            <span>{format(currentDate, 'dd MMM yyyy')}</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          EXECUTIVE 3-COLUMN OVERVIEW METRIC CARDS (FULL WIDTH)
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Card 1: Team Overview */}
        <div className="w-full bg-white rounded-xl sm:rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Team Overview</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {staffList?.length || 1} Members
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-sidebar-scroll pr-1">
            <TeamOverview currentDate={currentDate} />
          </div>
        </div>

        {/* Card 2: Today's Progress Chart */}
        <div className="w-full bg-white rounded-xl sm:rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[230px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Today's Progress</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              {todaysTasks.length} Tasks
            </span>
          </div>
          <div className="flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden">
            <TaskStatusChart tasks={todaysTasks} />
          </div>
        </div>

        {/* Card 3: Selected Tasks & Batch Action */}
        <div className="w-full bg-white rounded-xl sm:rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-purple-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Selected Tasks</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              Action Ready
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center space-y-1">
            <div className="text-5xl font-black text-purple-600 font-mono tracking-tight leading-none">
              {selectedTaskIds.length}
            </div>
            <p className="text-xs font-bold text-slate-500">Tasks currently selected</p>
          </div>
          {selectedTaskIds.length > 0 ? (
            <button
              onClick={handleMarkSelectedDone}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Check size={14} />
              <span>Mark Selected Done ({selectedTaskIds.length})</span>
            </button>
          ) : (
            <div className="text-center text-[11px] text-slate-400 font-medium shrink-0 py-1">
              Select checkboxes in table below to batch complete
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN SCHEDULER DATA TABLE & CONTROLS (EXPANDED FULL WIDTH)
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-3">
        {/* Table Search & Action Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 min-w-[280px] focus-within:bg-white focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search description, remark, staff..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 w-full outline-none font-medium"
              />
            </div>
            {selectedTaskIds.length > 0 && (
              <button 
                onClick={handleMarkSelectedDone} 
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Check size={14} />
                <span>Mark Selected Done ({selectedTaskIds.length})</span>
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" />
            <span>Hourly Schedule: <strong>{todaysTasks.length} Tasks Scheduled</strong></span>
          </div>
        </div>

        {/* Scrollable Scheduler Table */}
        <div className="p-2 sm:p-3 overflow-x-auto">
          <SchedulerTable 
            currentDate={currentDate} 
            onAddTask={handleAddTask} 
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            todaysTasks={todaysTasks}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      <TaskModal 
        isOpen={modalState.isOpen} 
        onClose={handleCloseModal} 
        task={modalState.task} 
        selectedTime={modalState.time}
        selectedDate={currentDate.toISOString().split('T')[0]}
      />

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleRescheduleSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }} className="animate-fade-in">
            <h3 style={{ marginBottom: '1rem', fontWeight: '700' }}>Reschedule Task</h3>
            <div className="input-group">
              <label className="input-label">New Date</label>
              <input required type="date" value={rescheduleModal.newDate} onChange={e => setRescheduleModal(prev => ({ ...prev, newDate: e.target.value }))} className="input-field" />
            </div>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Start Time</label>
                <input required type="time" value={rescheduleModal.newStartTime} onChange={e => setRescheduleModal(prev => ({ ...prev, newStartTime: e.target.value }))} className="input-field" />
              </div>
              <div className="input-group">
                <label className="input-label">End Time</label>
                <input required type="time" value={rescheduleModal.newEndTime} onChange={e => setRescheduleModal(prev => ({ ...prev, newEndTime: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setRescheduleModal({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' })} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Reschedule</button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Someday Task Modal */}
      {scheduleModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleScheduleSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }} className="animate-fade-in">
            <h3 style={{ marginBottom: '1rem', fontWeight: '700' }}>Schedule Task</h3>
            <div className="input-group">
              <label className="input-label">Date *</label>
              <input required type="date" value={scheduleModal.date} onChange={e => setScheduleModal(prev => ({ ...prev, date: e.target.value }))} className="input-field" />
            </div>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Start Time *</label>
                <input required type="time" value={scheduleModal.startTime} onChange={e => setScheduleModal(prev => ({ ...prev, startTime: e.target.value }))} className="input-field" />
              </div>
              <div className="input-group">
                <label className="input-label">End Time *</label>
                <input required type="time" value={scheduleModal.endTime} onChange={e => setScheduleModal(prev => ({ ...prev, endTime: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setScheduleModal({ isOpen: false, taskId: null, date: '', startTime: '', endTime: '' })} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Schedule Now</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
