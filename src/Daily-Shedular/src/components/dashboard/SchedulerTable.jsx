import React, { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { format, parse, isSameDay } from 'date-fns';
import { Plus, Check, X, Edit2, AlertCircle, Trash, Paperclip, ShieldCheck } from 'lucide-react';

const SchedulerTable = ({ currentDate, onAddTask }) => {
  const { tasks, generateTimeSlots, markTaskDone, markTaskNotDone, staffList, deleteTask, settings, setSettings } = useScheduler();
  const timeSlots = generateTimeSlots();

  const [remarkModal, setRemarkModal] = useState({ isOpen: false, taskId: null, remark: '' });
  const [hiddenExtraRows, setHiddenExtraRows] = useState([]);
  const [previewMedia, setPreviewMedia] = useState({ isOpen: false, url: '', type: '' });

  const handleNotDoneSubmit = (e) => {
    e.preventDefault();
    markTaskNotDone(remarkModal.taskId, remarkModal.remark);
    setRemarkModal({ isOpen: false, taskId: null, remark: '' });
  };

  return (
    <div className="table-container animate-fade-in" style={{ marginTop: '1.5rem' }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: '10%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>TIME</th>
            <th style={{ width: '20%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>TASK DESCRIPTION</th>
            <th style={{ width: '10%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center', whiteSpace: 'nowrap' }}>SUBMITTED BY</th>
            <th style={{ width: '12%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>REMARK</th>
            <th style={{ width: '12%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>STATUS</th>
            <th style={{ width: '13%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>ATTACHMENT</th>
            <th style={{ width: '12%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(time => {
            const timeDate = parse(time, 'HH:mm', new Date());
            const endTimeDate = new Date(timeDate.getTime() + (settings?.intervalMinutes || 60) * 60000);
            const timeRange = `${format(timeDate, 'hh:mm a')} - ${format(endTimeDate, 'hh:mm a')}`;
            
            const slotTasks = tasks.filter(t => 
              isSameDay(new Date(t.date), currentDate) && 
              t.startTime === time
            );

            return (
              <React.Fragment key={time}>
                {slotTasks.length > 0 ? (
                  <>
                    {slotTasks.map((task, idx) => (
                      <tr key={task.id} style={{ borderTop: idx === 0 ? '1px solid var(--border-color)' : 'none' }}>
                        {idx === 0 && (
                          <td data-label="TIME" rowSpan={slotTasks.length + (hiddenExtraRows.includes(time) ? 0 : 1)} style={{ fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {timeRange}
                          </td>
                        )}
                        {/* TASK DESCRIPTION COLUMN */}
                        <td data-label="TASK DESCRIPTION" style={{ verticalAlign: 'top' }}>
                          <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{task.description || 'No description'}</div>
                        </td>
                        {/* SUBMITTED BY COLUMN */}
                        <td data-label="SUBMITTED BY" style={{ verticalAlign: 'top', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            {task.createdBy || 'Admin'}
                          </div>
                        </td>

                        {/* REMARK COLUMN */}
                        <td data-label="REMARK" style={{ verticalAlign: 'top' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {task.remark && <div style={{ fontStyle: 'italic', marginBottom: task.adminRemark ? '0.5rem' : '0' }}>"{task.remark}"</div>}
                            {task.adminRemark && (
                              <div style={{ fontStyle: 'italic', color: 'var(--status-notdone)' }}>
                                <span style={{ fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Admin Rejected:</span><br/>
                                "{task.adminRemark}"
                              </div>
                            )}
                            {!task.remark && !task.adminRemark && '-'}
                          </div>
                        </td>

                        {/* STATUS COLUMN */}
                        <td data-label="STATUS" style={{ verticalAlign: 'top' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {task.status === 'Completed' ? (
                              <div>
                                <span style={{ color: 'var(--status-completed)', fontWeight: '600' }}>Done</span>
                                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>at {format(new Date(task.actualDoneDate), 'hh:mm a')}</div>
                              </div>
                            ) : task.status === 'Not Done' ? (
                              <span style={{ color: 'var(--status-notdone)' }}><AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Not Done</span>
                            ) : task.status === 'Overdue' ? (
                              <span style={{ color: 'white', backgroundColor: 'var(--status-overdue)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 'bold' }}>OVERDUE</span>
                            ) : (
                              <span style={{ color: 'var(--status-pending)' }}>Pending...</span>
                            )}
                          </div>
                        </td>

                        {/* ATTACHMENT COLUMN */}
                        <td data-label="ATTACHMENT" style={{ verticalAlign: 'top' }}>
                          {task.attachments && task.attachments.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                              {task.attachments.map((att, idx) => {
                                if (att.type?.startsWith('image/')) {
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
                                      {att.url && (
                                        <img 
                                          src={att.url} 
                                          alt={att.name} 
                                          style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                          onClick={() => setPreviewMedia({ isOpen: true, url: att.url, type: 'image' })}
                                        />
                                      )}
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                    </div>
                                  );
                                } else if (att.type?.startsWith('audio/')) {
                                  return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: 'var(--bg-color)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎤 {att.name}</span>
                                      </div>
                                      {att.url && <audio src={att.url} controls style={{ height: '28px', width: '100%', maxWidth: '250px' }} />}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                                      <Paperclip size={12} color="var(--text-secondary)" />
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>

                        {/* ACTIONS COLUMN */}
                        <td data-label="ACTIONS" style={{ verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'center' }}>
                            {(task.status === 'Pending' || task.status === 'In Progress' || task.status === 'Scheduled') && (
                              <>
                                <button onClick={() => markTaskDone(task.id)} className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', color: 'var(--status-completed)', borderColor: 'var(--status-completed)' }} title="Mark Done">
                                  <Check size={14} />
                                </button>
                                <button onClick={() => setRemarkModal({ isOpen: true, taskId: task.id, remark: '' })} className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', color: 'var(--status-notdone)', borderColor: 'var(--status-notdone)' }} title="Mark Not Done">
                                  <X size={14} />
                                </button>
                              </>
                            )}
                            <button onClick={() => onAddTask(time, task)} className="btn btn-outline" style={{ padding: '0.15rem 0.35rem' }} title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteTask(task.id)} className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', color: 'var(--status-notdone)', borderColor: 'var(--status-notdone)' }} title="Delete">
                              <Trash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!hiddenExtraRows.includes(time) && (
                      <tr style={{ backgroundColor: '#fef9c3' }}>
                        <td colSpan="5">
                          <button 
                            onClick={() => onAddTask(time)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0', width: '100%', textAlign: 'left' }}
                          >
                            <Plus size={16} /> Add Another Task
                          </button>
                        </td>
                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <button onClick={() => setHiddenExtraRows(prev => [...prev, time])} className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', color: 'var(--text-muted)', border: 'none' }} title="Hide Extra Row">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  !hiddenExtraRows.includes(time) && (
                    <tr style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        {timeRange}
                      </td>
                      <td colSpan="5">
                        <button 
                          onClick={() => onAddTask(time)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0', width: '100%', textAlign: 'left' }}
                        >
                          <Plus size={16} /> Add Task
                        </button>
                      </td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        <button onClick={() => setHiddenExtraRows(prev => [...prev, time])} className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', color: 'var(--text-muted)', border: 'none' }} title="Hide Extra Row">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
        <button 
          onClick={() => {
            if (settings) {
              const currentEndTimeDate = parse(settings.endTime, 'HH:mm', new Date());
              const newEndTimeDate = new Date(currentEndTimeDate.getTime() + (settings.intervalMinutes || 60) * 60000);
              setSettings({ ...settings, endTime: format(newEndTimeDate, 'HH:mm') });
            }
          }}
          className="btn btn-outline" 
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', borderStyle: 'dashed' }}
        >
          <Plus size={16} /> Add Another Row (Time Slot)
        </button>
      </div>

      {remarkModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleNotDoneSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }} className="animate-fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Task Not Done</h3>
            <div className="input-group">
              <label className="input-label">Reason / Remark *</label>
              <textarea required value={remarkModal.remark} onChange={e => setRemarkModal(prev => ({ ...prev, remark: e.target.value }))} className="input-field" rows="3" placeholder="e.g., Client was unavailable..."></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setRemarkModal({ isOpen: false, taskId: null, remark: '' })} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-danger">Confirm</button>
            </div>
          </form>
        </div>
      )}
      {/* Media Preview Modal */}
      {previewMedia.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '2rem' }} onClick={() => setPreviewMedia({ isOpen: false, url: '', type: '' })}>
          <button 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            onClick={() => setPreviewMedia({ isOpen: false, url: '', type: '' })}
          >
            <X size={32} />
          </button>
          {previewMedia.type === 'image' && (
            <img src={previewMedia.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
};

export default SchedulerTable;
