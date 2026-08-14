import React from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { isSameDay } from 'date-fns';

const TeamOverview = ({ currentDate }) => {
  const { staffList, tasks, currentUser } = useScheduler();

  const getStaffStats = (staffId, staffName) => {
    const staffTasks = tasks.filter(t => {
      const isAssigned = String(t.assignedStaff) === String(staffId);
      const isCreatedBySelfAndUnassigned = (!t.assignedStaff || t.assignedStaff === '') && 
                                           (String(t.createdBy).toLowerCase().trim() === String(staffName).toLowerCase().trim());
      
      return (isAssigned || isCreatedBySelfAndUnassigned) && isSameDay(new Date(t.date), currentDate);
    });
    
    return {
      total: staffTasks.length,
      completed: staffTasks.filter(t => t.status === 'Completed').length,
      pending: staffTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length,
      notDone: staffTasks.filter(t => t.status === 'Not Done').length,
      overdue: staffTasks.filter(t => t.status === 'Overdue').length,
    };
  };

  return (
    <div className="table-container">
      <table className="table" style={{ minWidth: '800px' }}>
        <thead>
          <tr>
            <th>Staff Member</th>
            <th style={{ textAlign: 'center' }}>Total Tasks</th>
            <th style={{ textAlign: 'center' }}>Completed</th>
            <th style={{ textAlign: 'center' }}>Pending</th>
            <th style={{ textAlign: 'center' }}>Not Done</th>
            <th style={{ textAlign: 'center' }}>Overdue</th>
          </tr>
        </thead>
        <tbody>
          {currentUser && [currentUser].map(staff => {
            const stats = getStaffStats(staff.id, staff.name);
            return (
              <tr key={staff.id}>
                <td data-label="Staff Member">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
                      {staff.name ? staff.name.charAt(0) : 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{staff.name || 'Unknown User'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{staff.designation || 'System Admin'}</div>
                    </div>
                  </div>
                </td>
                <td data-label="Total Tasks" style={{ textAlign: 'center', fontWeight: '500' }}>{stats.total}</td>
                <td data-label="Completed" style={{ textAlign: 'center', color: stats.completed > 0 ? 'var(--status-completed)' : 'inherit', fontWeight: stats.completed > 0 ? '600' : 'normal' }}>{stats.completed}</td>
                <td data-label="Pending" style={{ textAlign: 'center', color: stats.pending > 0 ? 'var(--status-progress)' : 'inherit', fontWeight: stats.pending > 0 ? '600' : 'normal' }}>{stats.pending}</td>
                <td data-label="Not Done" style={{ textAlign: 'center', color: stats.notDone > 0 ? 'var(--status-notdone)' : 'inherit', fontWeight: stats.notDone > 0 ? '600' : 'normal' }}>{stats.notDone}</td>
                <td data-label="Overdue" style={{ textAlign: 'center', color: stats.overdue > 0 ? 'var(--status-overdue)' : 'inherit', fontWeight: stats.overdue > 0 ? '600' : 'normal' }}>{stats.overdue}</td>
              </tr>
            );
          })}
          {!currentUser && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No staff members found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TeamOverview;
