import React from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Bell, Menu } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useLocation } from 'react-router-dom';

const Header = ({ currentDate, setCurrentDate, toggleSidebar }) => {
  const { currentUser, setCurrentUser, staffList } = useScheduler();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'MY SCHEDULER';
      case '/team': return 'TEAM SCHEDULER';
      case '/waiting-list': return 'WAITING LIST';
      case '/someday': return 'SOMEDAY TASKS';
      case '/recurring': return 'RECURRING TASKS';
      case '/staff': return 'STAFF MANAGEMENT';
      case '/reports': return 'REPORTS';
      case '/settings': return 'SETTINGS';
      default: return 'DAILY SCHEDULER';
    }
  };

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const isDateNavigable = location.pathname === '/' || location.pathname === '/team';

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={toggleSidebar} className="mobile-menu-btn" style={{ padding: '0.25rem', marginRight: '0.5rem' }}>
          <Menu size={24} />
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.025em' }}>
          {getPageTitle()}
        </h1>
        
        {isDateNavigable && (
          <div className="date-nav-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '0.25rem', borderRadius: 'var(--radius-lg)' }}>
            <button onClick={handlePrevDay} className="btn btn-outline" style={{ padding: '0.375rem', border: 'none', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)' }}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleToday} className="btn" style={{ padding: '0.375rem 0.75rem', border: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)' }}>
              Today
            </button>
            <button onClick={handleNextDay} className="btn btn-outline" style={{ padding: '0.375rem', border: 'none', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)' }}>
              <ChevronRight size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', borderLeft: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.875rem' }}>
              <CalendarIcon size={16} color="var(--primary-color)" />
              {format(currentDate, 'dd MMM yyyy')}
            </div>
          </div>
        )}
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative' }}>
          <Bell size={20} />
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--status-overdue)', borderRadius: '50%' }}></span>
        </button>
        
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="user-profile-info" style={{ textAlign: 'right' }}>
              <select 
                value={currentUser.id} 
                onChange={(e) => {
                  const selectedStaff = staffList.find(s => s.id === e.target.value);
                  if (selectedStaff) setCurrentUser(selectedStaff);
                }}
                style={{ 
                  fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)',
                  backgroundColor: 'transparent', border: 'none', outline: 'none', cursor: 'pointer',
                  appearance: 'none', textAlign: 'right', paddingRight: '0.5rem'
                }}
              >
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser.designation}</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '1.125rem' }}>
              {currentUser.name.charAt(0)}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Loading...</div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
