import React from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { isSameDay } from 'date-fns';

const TeamOverview = ({ currentDate }) => {
  const { staffList, allTasks, currentUser } = useScheduler();

  const getStaffStats = (staffId, staffName) => {
    const staffTasks = allTasks.filter(t => {
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

  const localRole = localStorage.getItem('userRole');
  const currentRole = currentUser?.role?.toLowerCase();
  const isSuperadmin = localRole === 'superadmin' || currentRole === 'superadmin' || 
                       (currentUser?.designation && currentUser.designation.toLowerCase() === 'superadmin');

  const displayStaffList = isSuperadmin && staffList && staffList.length > 0 
    ? staffList 
    : (currentUser ? [currentUser] : []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {displayStaffList.length > 0 && displayStaffList.map(staff => {
        const stats = getStaffStats(staff.id, staff.name);
        return (
          <div key={staff.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '1rem' }}>
                {staff.name ? staff.name.charAt(0) : 'U'}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{staff.name || 'Unknown User'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{staff.designation || 'System Admin'}</div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.25rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '0.25rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.6rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{stats.total}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '0.25rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.6rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Done</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: stats.completed > 0 ? 'var(--status-completed)' : 'inherit' }}>{stats.completed}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '0.25rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.6rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Pending</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: stats.pending > 0 ? 'var(--status-progress)' : 'inherit' }}>{stats.pending}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '0.25rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.6rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Not Done</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: stats.notDone > 0 ? 'var(--status-notdone)' : 'inherit' }}>{stats.notDone}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '0.25rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.6rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Overdue</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: stats.overdue > 0 ? 'var(--status-overdue)' : 'inherit' }}>{stats.overdue}</span>
              </div>
            </div>
          </div>
        );
      })}
      
      {displayStaffList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No staff members found.
        </div>
      )}
    </div>
  );
};

export default TeamOverview;
