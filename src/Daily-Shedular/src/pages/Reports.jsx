import React, { useState, useEffect } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import { format, isSameDay, parse } from 'date-fns';
import TaskStatusChart from '../components/dashboard/TaskStatusChart';
import { Paperclip, Image as ImageIcon, PlayCircle, ShieldCheck, Download } from 'lucide-react';
import jsPDF from 'jspdf';

const Reports = () => {
  const { allTasks: tasks, staffList, formatTime12h, settings, currentUser, fetchTasks } = useScheduler();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    setVisibleCount(50);
  }, [startDate, endDate, statusFilter, staffFilter]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const localRole = (localStorage.getItem('role') || '').toLowerCase().trim();
  const currentRole = (currentUser?.role || '').toLowerCase().trim();
  const isSuperadmin = localRole === 'superadmin' || currentRole === 'superadmin' ||
    staffList.some(u => String(u.id) === String(currentUser?.id) && (u.role || '').toLowerCase().trim() === 'superadmin');
  
  const isDateInRange = (dateString) => {
    const taskDate = new Date(dateString);
    taskDate.setHours(0,0,0,0);

    let isValid = true;
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0,0,0,0);
      if (taskDate < sDate) isValid = false;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(0,0,0,0);
      if (taskDate > eDate) isValid = false;
    }
    return isValid;
  };

  const getFilteredTasks = () => {
    return tasks.filter(t => {
      // Date filter
      if (!isDateInRange(t.date)) return false;

      // Role filter
      if (!currentUser || isSuperadmin) return true;

      // Regular users see only their own
      if (String(t.assignedStaff) !== String(currentUser.id) &&
          String(t.createdBy) !== String(currentUser.id)) {
        return false;
      }
      return true;
    });
  };

  // Get unique staff names for dropdown
  const uniqueStaff = [...new Set(getFilteredTasks().map(t => t.createdBy).filter(Boolean))].sort();

  // Apply additional filters for the table display
  const getTableTasks = () => {
    let result = getFilteredTasks();
    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }
    if (staffFilter !== 'All') {
      result = result.filter(t => t.createdBy === staffFilter);
    }
    return result;
  };

  const filteredTasks = getFilteredTasks();
  const tableTasks = getTableTasks();
  
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed').length;
  const notDoneTasks = filteredTasks.filter(t => t.status === 'Not Done').length;
  const overdueTasks = filteredTasks.filter(t => t.status === 'Overdue').length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Detailed Task History Report', 14, 22);
    
    const tableColumn = ["Date", "Time", "Task Details", "Submitted By", "Remarks", "Status", "Completed At"];
    const tableRows = [];

    tableTasks.slice().reverse().forEach(task => {
      const timeDate = parse(task.startTime, 'HH:mm', new Date());
      const endTimeDate = new Date(timeDate.getTime() + (settings?.intervalMinutes || 60) * 60000);
      
      const taskData = [
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
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
      });
      
      doc.save(`Task_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    });
  };

  return (
    <div className="daily-scheduler-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Task History & Reports</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Total Tasks Generated</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--primary-color)' }}>{totalTasks}</div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Overall Completion Rate</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--status-completed)' }}>{completionRate}%</div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Tasks Not Done</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--status-notdone)' }}>{notDoneTasks}</div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Task Status Breakdown</h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <TaskStatusChart tasks={filteredTasks} />
          </div>
        </div>
      </div>

      <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }} onScroll={(e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
          if (visibleCount < tableTasks.length) {
            setVisibleCount(prev => prev + 50);
          }
        }
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.5rem 0', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Detailed Task History</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Date Range Filter */}
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="input-field" 
              style={{ width: '150px' }} 
              title="Start Date"
            />
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="input-field" 
              style={{ width: '150px' }} 
              title="End Date"
            />
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="btn btn-outline"
              style={{ padding: '0 0.75rem', height: '36px' }}
              title="Clear Dates (Show All Time)"
            >
              Clear
            </button>
            {/* Superadmin-only filters */}
            {isSuperadmin && (
              <>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ width: '145px' }}>
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Not Done">Not Done</option>
                  <option value="Overdue">Overdue</option>
                </select>
                <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="input-field" style={{ width: '170px' }}>
                  <option value="All">All Staff</option>
                  {uniqueStaff.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </>
            )}
            <button 
              onClick={exportToPDF}
              className="btn btn-primary"
              style={{ padding: '0 0.75rem', height: '36px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title="Download PDF"
            >
              <Download size={16} /> PDF
            </button>
          </div>
        </div>
        <table className="table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '8%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center', whiteSpace: 'nowrap' }}>DATE</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '8%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>TIME</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '45%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>TASK DETAILS</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '9%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center', whiteSpace: 'nowrap' }}>SUBMITTED BY</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '8%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>IMAGE / ATTACHMENT</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '8%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>REMARKS</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '7%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>STATUS</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, width: '7%', backgroundColor: '#bfdbfe', color: '#1e3a8a', textAlign: 'center' }}>COMPLETED AT</th>
            </tr>
          </thead>
          <tbody>
            {tableTasks.length > 0 ? (
              tableTasks.slice().reverse().slice(0, visibleCount).map(task => {
                const timeDate = parse(task.startTime, 'HH:mm', new Date());
                const endTimeDate = new Date(timeDate.getTime() + (settings?.intervalMinutes || 60) * 60000);
                return (
                <tr key={task.id}>
                  <td data-label="DATE" style={{ verticalAlign: 'top', textAlign: 'center', fontWeight: '500', whiteSpace: 'nowrap' }}>
                    {format(new Date(task.date), 'dd MMM yyyy')}
                  </td>
                  <td data-label="TIME" style={{ verticalAlign: 'top', textAlign: 'center', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatTime12h(task.startTime)} - {format(endTimeDate, 'hh:mm a')}
                  </td>
                  <td data-label="TASK DETAILS" style={{ verticalAlign: 'top' }}>
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{task.description || 'No description'}</div>
                  </td>
                  <td data-label="SUBMITTED BY" style={{ verticalAlign: 'top', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                      {task.createdBy || 'Admin'}
                    </div>
                  </td>
                  <td data-label="IMAGE / ATTACHMENT" style={{ verticalAlign: 'top' }}>
                    {task.attachments && task.attachments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                        {task.attachments.map((att, idx) => {
                          if (att.type?.startsWith('image/')) {
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
                                {att.url && <img src={att.url} alt={att.name} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />}
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
                  <td data-label="REMARKS" style={{ verticalAlign: 'top' }}>
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
                  <td data-label="STATUS" style={{ verticalAlign: 'top', textAlign: 'center' }}>
                    <span className={`badge ${
                      task.status === 'Completed' ? 'badge-completed' : 
                      task.status === 'Not Done' ? 'badge-notdone' : 
                      task.status === 'Overdue' ? 'badge-overdue' : 'badge-pending'
                    }`}>{task.status}</span>
                  </td>
                  <td data-label="COMPLETED AT" style={{ verticalAlign: 'top', textAlign: 'center' }}>
                    <div style={{ color: 'var(--status-completed)', fontWeight: '600', fontSize: '0.875rem' }}>
                      {task.actualDoneDate ? format(new Date(task.actualDoneDate), 'hh:mm a') : '-'}
                    </div>
                  </td>
                </tr>
              )})
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No tasks found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {visibleCount < tableTasks.length && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
