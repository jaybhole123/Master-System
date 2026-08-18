import React, { useState, useEffect } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import { Plus, Calendar as CalendarIcon, MoreVertical, Edit, Trash2 } from 'lucide-react';
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
    <div className="daily-scheduler-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Add Someday Task
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {somedayTasks.length > 0 ? somedayTasks.map(task => (
          <div key={task.id} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{task.description || 'No description'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${task.priority === 'High' ? 'badge-notdone' : 'badge-progress'}`}>{task.priority}</span>
                  <button onClick={() => handleEditClick(task)} className="btn btn-outline" style={{ padding: '0.25rem', border: 'none' }} title="Edit">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => deleteSomedayTask(task.id)} className="btn btn-outline" style={{ padding: '0.25rem', border: 'none', color: 'var(--danger-color)' }} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', minHeight: '2.5rem' }}></p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>Added: {format(new Date(task.createdDate), 'dd MMM yyyy')}</span>
              </div>
            </div>
            <button 
              onClick={() => setScheduleModal({ isOpen: true, taskId: task.id, date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '10:30' })} 
              className="btn btn-outline" style={{ width: '100%' }}
            >
              <CalendarIcon size={16} /> Schedule Task
            </button>
          </div>
        )) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)' }}>
            No someday tasks found. Add a task that you want to do later.
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleAddSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }} className="animate-fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Add Someday Task</h3>
            <div className="input-group">
              <label className="input-label">Task Description *</label>
              <textarea required value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="input-field" rows="3" placeholder="Enter task details..."></textarea>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Priority</label>
                <select value={formData.priority} onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))} className="input-field">
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))} className="input-field">
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => { setIsAddModalOpen(false); setFormData({ description: '', priority: 'Medium', category: categories[0], assignedStaff: currentUser?.id || '' }); }} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Task</button>
            </div>
          </form>
        </div>
      )}

      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleEditSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }} className="animate-fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Edit Someday Task</h3>
            <div className="input-group">
              <label className="input-label">Task Description *</label>
              <textarea required value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="input-field" rows="3" placeholder="Enter task details..."></textarea>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Priority</label>
                <select value={formData.priority} onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))} className="input-field">
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))} className="input-field">
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingTaskId(null); setFormData({ description: '', priority: 'Medium', category: categories[0], assignedStaff: currentUser?.id || '' }); }} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Update Task</button>
            </div>
          </form>
        </div>
      )}

      {scheduleModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleScheduleSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }} className="animate-fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Schedule Task</h3>
            <div className="input-group">
              <label className="input-label">Date *</label>
              <input required type="date" value={scheduleModal.date} onChange={e => setScheduleModal(prev => ({ ...prev, date: e.target.value }))} className="input-field" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Start Time *</label>
                <select required value={scheduleModal.startTime} onChange={handleStartTimeChange} className="input-field">
                  <option value="">Select Time Slot</option>
                  {timeSlots.map(t => <option key={t} value={t}>{formatTime12h(t)}</option>)}
                </select>
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

export default SomedayTasks;
