import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ListTodo, 
  Clock, 
  Settings, 
  BarChart, 
  List,
  Repeat,
  X,
  ShieldCheck
} from 'lucide-react';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const navItems = [
    { name: 'My Scheduler', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Waiting List', path: '/waiting-list', icon: <Clock size={18} /> },
    { name: 'Someday Tasks', path: '/someday', icon: <ListTodo size={18} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart size={18} /> },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{ backgroundColor: 'var(--surface-color)', padding: '1rem 0' }}>
      <div className="logo-container" style={{ padding: '0 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={24} />
         Daily Shedular
        </h2>
        <button onClick={closeSidebar} className="mobile-menu-btn">
          <X size={24} />
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {navItems.map((item, i) => (
            <li key={i}>
              <NavLink 
                to={item.path} 
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 1.5rem',
                  color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  borderRight: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'all var(--transition-fast)'
                })}
              >
                {item.icon}
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        © 2026 Shedular v1.0
      </div>
    </div>
  );
};

export default Sidebar;
