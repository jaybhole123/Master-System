import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  CalendarCheck, 
  Clock, 
  Calculator, 
  PlayCircle, 
  PieChart, 
  FileText, 
  Building,
  Sun,
  Moon,
  ShoppingCart,
  PlaneTakeoff,
  LayoutDashboard,
  Menu,
  X,
  FileSignature,
  Package
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import './App.css';

// Pages
import Dashboard from './pages/Dashboard';
import EmployeeMaster from './pages/EmployeeMaster';
import SalaryStructure from './pages/SalaryStructure';
import Attendance from './pages/Attendance';
import LeaveTracker from './pages/LeaveTracker';
import PayrollProcess from './pages/PayrollProcess';
import NetSalary from './pages/NetSalary';
import Payslip from './pages/Payslip';
import BankTransfer from './pages/BankTransfer';
import Indent from './pages/Create-Indent';
import OfferLetter from './pages/OfferLetter';
import Inventory from './pages/Inventory';

function App() {
  const [theme, setTheme] = useState('light');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/', label: 'Employee Master', icon: <Users size={20} /> },
    { path: '/salary-structure', label: 'Salary Structure', icon: <Calculator size={20} /> },
    { path: '/attendance', label: 'Attendance', icon: <CalendarCheck size={20} /> },
    { path: '/leaves', label: 'Leave Tracker', icon: <PlaneTakeoff size={20} /> },
    { path: '/process', label: 'Payroll Process', icon: <PlayCircle size={20} /> },
    { path: '/net-salary', label: 'Net Salary', icon: <PieChart size={20} /> },
    { path: '/payslip', label: 'Payslip', icon: <FileText size={20} /> },
    // { path: '/bank', label: 'Bank Transfer', icon: <Building size={20} /> },
    { path: '/indent', label: 'Create Indent', icon: <ShoppingCart size={20} /> },
    { path: '/inventory', label: 'Inventory', icon: <Package size={20} /> },
    { path: '/offer-letter', label: 'Offer Letter', icon: <FileSignature size={20} /> },
  ];

  return (
    <Router>
      <div className="app-container">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}

        {/* Sidebar */}
        <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                HR
              </div>
              HR System
            </div>
            {isMobileMenuOpen && (
              <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
                <X size={24} />
              </button>
            )}
          </div>
          <div className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <div style={{ fontWeight: 500 }}>Welcome, Admin</div>
            </div>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
          
          <div className="page-content">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/" element={<EmployeeMaster />} />
              <Route path="/salary-structure" element={<SalaryStructure />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leaves" element={<LeaveTracker />} />
              <Route path="/process" element={<PayrollProcess />} />
              <Route path="/net-salary" element={<NetSalary />} />
              <Route path="/payslip" element={<Payslip />} />
              <Route path="/bank" element={<BankTransfer />} />
              <Route path="/indent" element={<Indent />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/offer-letter" element={<OfferLetter />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
