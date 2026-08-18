import React, { useState } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import SchedulerTable from '../components/dashboard/SchedulerTable';
import TeamOverview from '../components/dashboard/TeamOverview';
import TaskModal from '../components/dashboard/TaskModal';
import TaskStatusChart from '../components/dashboard/TaskStatusChart';
import { format, isSameDay, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Search } from 'lucide-react';

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { tasks, somedayTasks, staffList, markTaskDone, markAllPendingDone, rescheduleTask, scheduleSomedayTask } = useScheduler();

  const [modalState, setModalState] = useState({ isOpen: false, time: null, task: null });
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' });
  const [scheduleModal, setScheduleModal] = useState({ isOpen: false, taskId: null, date: '', startTime: '', endTime: '' });

  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');

  const overdueTasks = tasks.filter(t => t.status === 'Overdue');
  const todaysTasks = tasks.filter(t => isSameDay(new Date(t.date), currentDate)).filter(t => {
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
    <div className="daily-scheduler-container">
      <div className="header-flex">
        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Daily Scheduler</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selectedTaskIds.length > 0 && (
            <button onClick={handleMarkSelectedDone} className="btn btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
              <Check size={16} /> Mark Selected Done ({selectedTaskIds.length})
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-color)', padding: '0.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <button onClick={handlePrevDay} className="btn btn-outline" style={{ padding: '0.375rem', border: 'none' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleToday} className="btn" style={{ padding: '0.375rem 0.75rem', border: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)' }}>
            Today
          </button>
          <button onClick={handleNextDay} className="btn btn-outline" style={{ padding: '0.375rem', border: 'none' }}>
            <ChevronRight size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', borderLeft: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.875rem' }}>
            <CalendarIcon size={16} color="var(--primary-color)" />
            {format(currentDate, 'dd MMM yyyy')}
          </div>
          </div>
        </div>
      </div>
      {/* Top Overview Section */}
      <div className="dashboard-grid">
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', height: '250px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Team Overview</h2>
          <TeamOverview currentDate={currentDate} />
        </div>
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', height: '250px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Today's Progress</h2>
          <TaskStatusChart tasks={todaysTasks} />
        </div>
      </div>

      <div style={{ display: 'block', width: '100%' }}>
        
        {/* Main Scheduler */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem', border: '1px solid var(--border-color)', minWidth: '300px' }}>
              <Search size={16} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
              <input 
                type="text" 
                placeholder="Search by description, remark, or staff..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '0.875rem', padding: '0.25rem 0' }}
              />
            </div>
          </div>
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
            <h3 style={{ marginBottom: '1rem' }}>Reschedule Task</h3>
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
            <h3 style={{ marginBottom: '1rem' }}>Schedule Task</h3>
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
