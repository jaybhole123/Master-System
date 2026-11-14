import React, { useState, useEffect } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, Search, Bookmark, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const SomedayTasks = () => {
  const { somedayTasks, scheduleSomedayTask, addSomedayTask, updateSomedayTask, deleteSomedayTask, staffList, categories, currentUser, generateTimeSlots, settings, formatTime12h, fetchSomedayTasks } = useScheduler();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [scheduleModal, setScheduleModal] = useState({ isOpen: false, taskId: null, date: '', startTime: '', endTime: '' });
  const timeSlots = generateTimeSlots();

  useEffect(() => {
    fetchSomedayTasks();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredSomedayTasks = somedayTasks.filter(task => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (task.description || '').toLowerCase().includes(q) ||
             (task.createdBy || '').toLowerCase().includes(q);
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

  const [formData, setFormData] = useState({
    description: '', priority: 'Medium', category: categories[0] || 'Meeting', assignedStaff: currentUser?.id || ''
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    addSomedayTask({ ...formData, createdBy: currentUser?.name || 'Unknown', createdDate: new Date().toISOString().split('T')[0] });
    setIsAddModalOpen(false);
    setFormData({ description: '', priority: 'Medium', category: categories[0], assignedStaff: currentUser?.id || '' });
  };

  const handleEditClick = (task) => {
    setFormData({ 
      description: task.description || '', 
      priority: task.priority || 'Medium', 
      category: task.category || categories[0], 
      assignedStaff: task.assignedStaff || '' 
    });
    setEditingTaskId(task.id);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateSomedayTask(editingTaskId, formData);
    setIsEditModalOpen(false);
    setEditingTaskId(null);
    setFormData({ description: '', priority: 'Medium', category: categories[0], assignedStaff: currentUser?.id || '' });
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    scheduleSomedayTask(scheduleModal.taskId, {
      date: scheduleModal.date, startTime: scheduleModal.startTime, endTime: scheduleModal.endTime
    });
    setScheduleModal({ isOpen: false, taskId: null, date: '', startTime: '', endTime: '' });
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
    
    setScheduleModal(prev => ({ ...prev, startTime: val, endTime: `${endHours}:${endMinutes}` }));
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
            <Bookmark className="h-3 w-3 text-amber-300 shrink-0" />
            <span>Task Backlog</span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
            Someday Tasks & Future Backlog
          </h1>
          <span className="text-red-200/60 hidden md:inline">•</span>
          <p className="text-red-100/90 text-xs font-medium truncate hidden md:inline">
            Keep track of non-urgent tasks and schedule them to live calendar anytime.
          </p>
        </div>

        {/* Action Button & Count */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 gap-2 text-white">
            <Clock size={14} className="text-amber-300" />
            <span className="text-xs font-bold whitespace-nowrap">
              Backlog: <strong className="text-amber-200 font-mono text-sm">{somedayTasks.length}</strong>
            </span>
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 font-bold rounded-xl shadow-sm hover:shadow transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Add Someday Task</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SEARCH & CONTROLS BAR
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 min-w-[280px] sm:min-w-[340px] focus-within:bg-white focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search by description, creator..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 w-full outline-none font-medium"
          />
        </div>

        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <Bookmark size={14} className="text-blue-500" />
          <span>Showing: <strong>{filteredSomedayTasks.length} Backlog Tasks</strong></span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CARDS GRID
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
        {filteredSomedayTasks.length > 0 ? filteredSomedayTasks.map(task => (
          <div 
            key={task.id} 
            className="bg-white rounded-xl sm:rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-3">
                    {highlightText(task.description || 'No description')}
                  </h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => handleEditClick(task)} 
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" 
                    title="Edit"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => deleteSomedayTask(task.id)} 
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 font-medium">
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  <Clock size={11} className="text-slate-400" />
                  Added: {format(new Date(task.createdDate || new Date()), 'dd MMM yyyy')}
                </span>
                {task.createdBy && (
                  <span className="text-[10px] text-slate-500 font-bold truncate max-w-[110px]" title={task.createdBy}>
                    By {task.createdBy}
                  </span>
                )}
              </div>
            </div>

            <button 
              onClick={() => setScheduleModal({ isOpen: true, taskId: task.id, date: new Date().toISOString().split('T')[0], startTime: '', endTime: '' })} 
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <CalendarIcon size={14} />
              <span>Schedule to Calendar</span>
            </button>
          </div>
        )) : (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-2">
              <Bookmark size={24} />
            </div>
            <div className="text-sm font-bold text-slate-700">No Someday Tasks Found</div>
            <div className="text-xs text-slate-400 mt-0.5">Click "Add Someday Task" above to save tasks you want to schedule later.</div>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleAddSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '420px' }} className="animate-fade-in shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-800">Add Backlog Task</h3>
            </div>
            <div className="input-group mb-3">
              <label className="input-label text-xs font-bold text-slate-600 uppercase tracking-wider">Task Description *</label>
              <textarea required value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="input-field" rows="3" placeholder="Enter task details..."></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => { setIsAddModalOpen(false); setFormData({ description: '', priority: 'Medium', category: categories[0], assignedStaff: currentUser?.id || '' }); }} className="btn btn-outline text-xs font-bold">Cancel</button>
              <button type="submit" className="btn btn-primary text-xs font-bold bg-red-600 hover:bg-red-700 text-white">Save Task</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleEditSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '420px' }} className="animate-fade-in shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-800">Edit Backlog Task</h3>
            </div>
            <div className="input-group mb-3">
              <label className="input-label text-xs font-bold text-slate-600 uppercase tracking-wider">Task Description *</label>
              <textarea required value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="input-field" rows="3" placeholder="Enter task details..."></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingTaskId(null); setFormData({ description: '', priority: 'Medium', category: categories[0], assignedStaff: currentUser?.id || '' }); }} className="btn btn-outline text-xs font-bold">Cancel</button>
              <button type="submit" className="btn btn-primary text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">Update Task</button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleScheduleSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '420px' }} className="animate-fade-in shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-800">Schedule Task to Calendar</h3>
            </div>
            <div className="input-group mb-3">
              <label className="input-label text-xs font-bold text-slate-600 uppercase tracking-wider">Date *</label>
              <input required type="date" value={scheduleModal.date} onChange={e => setScheduleModal(prev => ({ ...prev, date: e.target.value }))} className="input-field" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label text-xs font-bold text-slate-600 uppercase tracking-wider">Start Time *</label>
                <select required value={scheduleModal.startTime} onChange={handleStartTimeChange} className="input-field">
                  <option value="">Select Time Slot</option>
                  {timeSlots.map(t => <option key={t} value={t}>{formatTime12h ? formatTime12h(t) : t}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label text-xs font-bold text-slate-600 uppercase tracking-wider">End Time *</label>
                <input required type="time" value={scheduleModal.endTime} onChange={e => setScheduleModal(prev => ({ ...prev, endTime: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setScheduleModal({ isOpen: false, taskId: null, date: '', startTime: '', endTime: '' })} className="btn btn-outline text-xs font-bold">Cancel</button>
              <button type="submit" className="btn btn-primary text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">Schedule Now</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SomedayTasks;
