import React, { useState } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import { format, differenceInHours } from 'date-fns';
import { Check, Calendar } from 'lucide-react';

const WaitingList = () => {
  const { tasks, markTaskDone, rescheduleTask, staffList } = useScheduler();
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' });

  const overdueTasks = tasks.filter(t => t.status === 'Overdue');

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    rescheduleTask(rescheduleModal.taskId, rescheduleModal.newDate, rescheduleModal.newStartTime, rescheduleModal.newEndTime);
    setRescheduleModal({ isOpen: false, taskId: null, newDate: '', newStartTime: '', newEndTime: '' });
  };

  return (
    <div className="daily-scheduler-container">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Original Schedule</th>
              <th>Overdue Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {overdueTasks.length > 0 ? (
              overdueTasks.map(task => (
                <tr key={task.id}>
                  <td data-label="Task">
                    <div style={{ fontWeight: '500' }}>{task.description || 'No description'}</div>
                  </td>
                  <td data-label="Original Schedule">
                    <div style={{ color: 'var(--text-primary)' }}>{format(new Date(task.date), 'dd MMM yyyy')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{task.startTime} - {task.endTime}</div>
                  </td>
                  <td data-label="Overdue Duration">
                    <span className="badge badge-overdue">
                      {Math.max(0, differenceInHours(new Date(), new Date(`${task.date}T${task.endTime}`)))} hours
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => markTaskDone(task.id)} className="btn btn-success" title="Mark Done">
                        <Check size={16} /> Complete
                      </button>
                      <button 
                        onClick={() => setRescheduleModal({ 
                          isOpen: true, taskId: task.id, 
                          newDate: new Date().toISOString().split('T')[0], 
                          newStartTime: task.startTime, newEndTime: task.endTime 
                        })} 
                        className="btn btn-primary" title="Reschedule"
                      >
                        <Calendar size={16} /> Reschedule
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No overdue tasks in the waiting list.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rescheduleModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleRescheduleSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }} className="animate-fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Reschedule Task</h3>
            
            <div className="input-group">
              <label className="input-label">New Date</label>
              <input required type="date" value={rescheduleModal.newDate} onChange={e => setRescheduleModal(prev => ({ ...prev, newDate: e.target.value }))} className="input-field" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
    </div>
  );
};

export default WaitingList;
