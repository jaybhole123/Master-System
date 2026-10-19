import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings2, Users, Layout, Search, Plus, Edit2, Trash2, Shield, Settings, 
  ChevronRight, X, Save, LayoutDashboard, Download, FileSpreadsheet,
  ShieldCheck, UserCheck, Building2, CheckCircle2, Lock, Mail, Phone,
  User, Check, Sparkles, Filter, RefreshCw, KeyRound, ExternalLink, SlidersHorizontal
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import supabase from '../../SupabaseClient';
import { useMagicToast } from '../../context/MagicToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const getDesignationStyle = (desg) => {
  if (!desg) return { backgroundColor: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' };
  const d = desg.toUpperCase().trim();
  switch (d) {
    case 'HELPING HANDS': 
      return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' };
    case 'JAI BHOLE ENTERPRISE': 
      return { backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fde68a' };
    case 'ASAK COAL PVT.LTD.': 
      return { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' };
    case 'JAI BHOLE LOGISTICS': 
      return { backgroundColor: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' };
    case 'BOTIVATE': 
      return { backgroundColor: '#fff1f2', color: '#be123c', borderColor: '#fecdd3' };
    case 'JAI BHOLE TRADERS': 
      return { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' };
    case 'ASAK COAL LOGISTICS': 
      return { backgroundColor: '#f0fdfa', color: '#0f766e', borderColor: '#99f6e4' };
    default: 
      return { backgroundColor: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' };
  }
};

const parseAccessValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    if (value.trim().startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
};

const MODULES = [
  {
    id: 'Checklist & Delegation',
    name: 'Checklist & Delegation',
    pages: ['Dashboard', 'Notifications', 'Task Manager', 'Assign Task', 'Delegation', 'Checklist', 'Calendar', 'Holiday', 'Admin Approval', 'Settings', 'Training Video', 'System Flow']
  },
  {
    id: 'Document & Substruction',
    name: 'Document & Substruction',
    pages: [
      'System Flow',
      'Dashboard', 
      'Insurance', 
      'Document Renewal', 
      'Subscription Renewal', 
      'Document Shared', 
      'Reminder Calendar',
      'Insurance Master Data',
      'Vehicle Reports',
      'Subscription Approval', 
      'Subscription Payment', 
      'All Loan', 
      'Request Forecloser', 
      'Collect NOC', 
      'Bank Guarantee',
      'Settings'
    ]
  },
  {
    id: 'Rent Management Tracker',
    name: 'Rent Management Tracker',
    pages: ['System Flow', 'Rent Dashboard', 'Rent Master', 'Monthly Tracker', 'Rent Management']
  },
  {
    id: 'HR System',
    name: 'HR System',
    pages: ['System Flow', 'HR Dashboard', 'Employee Master', 'Salary Structure', 'Attendance', 'Leave Tracker', 'Payroll Process', 'Net Salary', 'Payslip', 'Create Indent', 'Inventory']
  },
  {
    id: 'Letter',
    name: 'Letter',
    pages: ['Offer Letter', 'Work Order']
  },
  {
    id: 'Petty Cash',
    name: 'Petty Cash',
    pages: ['System Flow', 'Petty Dashboard', 'Add Credit / Case', 'Expenses', 'Ledger', 'Summary', 'Petty Settings']
  },
  {
    id: 'Daily Scheduler',
    name: 'Daily Scheduler',
    pages: ['System Flow', 'Scheduler Dashboard', 'Waiting List', 'Someday Tasks', 'Reports']
  },
  {
    id: 'Help Slip',
    name: 'Help Slip',
    pages: ['System Flow', 'Help Slip', 'Submissions']
  },
  {
    id: 'Coal System',
    name: 'Coal System',
    pages: ['System Flow', 'Dashboard', 'Auction', 'Payment Advice', 'SECL Payment Advice', 'Sales Order', 'SECL Intimation', 'Invoice', 'Work Order', 'Dispatch', 'Transport Payment', 'Refund / Lapse', 'Sauda Sale']
  },
  {
    id: 'Transport Reporting',
    name: 'Transport Reporting',
    pages: ['System Flow', 'Dashboard', 'Purchase Truck', 'Fastag', 'Challan', 'Truck Reports']
  },
  {
    id: 'Document Vault',
    name: 'Document Vault',
    pages: ['System Flow', 'Individual Documents', 'Firm & Company Documents']
  },
  {
    id: 'Global Settings',
    name: 'Global Settings',
    pages: ['Global Settings']
  }
];

export default function GlobalSettings() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalTab, setModalTab] = useState('profile');
  const [previewImage, setPreviewImage] = useState(null);
  const { showToast } = useMagicToast();

  const [formData, setFormData] = useState({
    user_name: '',
    password: '',
    employee_id: '',
    email_id: '',
    number: '',
    role: 'user',
    status: 'active',
    department: '',
    designation: '',
    system_access: [],
    page_access: []
  });
  
  const [selectedModule, setSelectedModule] = useState('Checklist & Delegation');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, created_at, user_name, password, employee_id, email_id, number, role, status, department, designation, system_access, page_access, profile_image, display_order')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Error fetching users', 'error');
    } else {
      const normalizedUsers = (data || []).map((user) => ({
        ...user,
        systemAccessList: parseAccessValue(user.system_access),
        pageAccessList: parseAccessValue(user.page_access),
        moduleCount: parseAccessValue(user.system_access).length,
      }));
      setUsers(normalizedUsers);
    }
    setLoading(false);
  };

  const userStats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const superadmins = users.filter(u => u.role?.toLowerCase() === 'superadmin').length;
    const admins = users.filter(u => u.role?.toLowerCase() === 'admin').length;
    const regularUsers = users.filter(u => u.role?.toLowerCase() === 'user').length;
    return { total, active, superadmins, admins, regularUsers };
  }, [users]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      
      let parsedSystemAccess = parseAccessValue(user.system_access);
      let parsedPageAccess = parseAccessValue(user.page_access);

      setFormData({
        user_name: user.user_name || '',
        password: user.password || '',
        employee_id: user.employee_id || '',
        email_id: user.email_id || '',
        number: user.number || '',
        role: user.role || 'user',
        status: user.status || 'active',
        department: user.department || '',
        designation: user.designation || user.Designation || '',
        system_access: parsedSystemAccess,
        page_access: parsedPageAccess,
        profile_image: '' // fetched asynchronously below
      });

      // Fetch profile image asynchronously to prevent blocking the modal
      supabase.from('users').select('profile_image').eq('id', user.id).single().then(({ data }) => {
          if (data && data.profile_image) {
              setFormData(prev => ({ ...prev, profile_image: data.profile_image }));
          }
      });
    } else {
      setEditingUser(null);
      setFormData({
        user_name: '',
        password: '',
        employee_id: `EMP-${Date.now().toString().slice(-6)}`,
        email_id: '',
        number: '',
        role: 'user',
        status: 'active',
        department: '',
        designation: '',
        system_access: [],
        page_access: [],
        profile_image: ''
      });
    }
    setModalTab('profile');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formData.user_name || !formData.password) {
      showToast('Username and Password are required', 'error');
      return;
    }

    const payload = { 
        ...formData, 
        system_access: Array.isArray(formData.system_access) ? formData.system_access.join(',') : '', 
        page_access: Array.isArray(formData.page_access) ? formData.page_access.join(',') : ''
    };
    
    if (editingUser) {
      const { error } = await supabase.from('users').update(payload).eq('id', editingUser.id);
      if (error) showToast(error.message, 'error');
      else {
        showToast('User updated successfully', 'success');
        handleCloseModal();
        fetchUsers();
      }
    } else {
      // Loop to automatically advance the sequence if needed
      let finalError = null;
      let success = false;
      
      for (let i = 0; i < 50; i++) {
        const { error } = await supabase.from('users').insert([payload]);
        if (!error) {
          success = true;
          break;
        }
        if (error.code !== '23505') {
          finalError = error;
          break;
        }
      }

      if (!success) {
        showToast(finalError ? finalError.message : 'Database sequence error. Please contact support.', 'error');
      } else {
        showToast('User created successfully', 'success');
        handleCloseModal();
        fetchUsers();
      }
    }
  };

  const toggleModuleAccess = (moduleId) => {
    setFormData((prev) => {
      const hasAccess = prev.system_access?.includes(moduleId);
      let newAccess = [];
      let newPageAccess = [...(prev.page_access || [])];

      if (hasAccess) {
        newAccess = prev.system_access.filter((id) => id !== moduleId);
        // Remove all pages for this module
        const modulePages = MODULES.find(m => m.id === moduleId)?.pages || [];
        modulePages.forEach(p => {
            const pageKey = `${moduleId}::${p}`;
            newPageAccess = newPageAccess.filter(pa => pa !== pageKey);
        });
      } else {
        newAccess = [...(prev.system_access || []), moduleId];
      }
      return { ...prev, system_access: newAccess, page_access: newPageAccess };
    });
  };

  const togglePageAccess = (moduleId, page) => {
    const pageKey = `${moduleId}::${page}`;
    setFormData((prev) => {
      const hasAccess = prev.page_access?.includes(pageKey);
      let newAccess = [];
      if (hasAccess) {
        newAccess = prev.page_access.filter((p) => p !== pageKey);
      } else {
        newAccess = [...(prev.page_access || []), pageKey];
        // Ensure module is also selected if a page is selected
        if (!prev.system_access?.includes(moduleId)) {
            prev.system_access = [...(prev.system_access || []), moduleId];
        }
      }
      return { ...prev, page_access: newAccess, system_access: prev.system_access };
    });
  };

  const normalizeProfileImage = (image) => {
    if (!image) return null;
    return image.startsWith('image/') ? `data:${image}` : image;
  };

  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, profile_image: reader.result }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCheckAllPages = (moduleId) => {
      const modulePages = MODULES.find(m => m.id === moduleId)?.pages || [];
      const newPages = modulePages.map(p => `${moduleId}::${p}`);
      
      setFormData(prev => {
          let currentPages = [...(prev.page_access || [])];
          currentPages = currentPages.filter(p => !p.startsWith(`${moduleId}::`));
          return {
              ...prev,
              page_access: [...currentPages, ...newPages],
              system_access: prev.system_access?.includes(moduleId) ? prev.system_access : [...(prev.system_access || []), moduleId]
          }
      });
  };

  const handleClearAllPages = (moduleId) => {
    setFormData(prev => {
        let currentPages = [...(prev.page_access || [])];
        currentPages = currentPages.filter(p => !p.startsWith(`${moduleId}::`));
        return {
            ...prev,
            page_access: currentPages
        }
    });
  };

  const filteredUsers = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const matchesQuery = 
        !query ||
        u.user_name?.toLowerCase().includes(query) ||
        u.employee_id?.toLowerCase().includes(query) ||
        u.email_id?.toLowerCase().includes(query) ||
        u.department?.toLowerCase().includes(query) ||
        (u.designation || u.Designation)?.toLowerCase().includes(query);
      
      const matchesRole = 
        roleFilter === 'all' || 
        u.role?.toLowerCase() === roleFilter.toLowerCase();
      
      return matchesQuery && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('User Accounts & Permissions Report', 14, 15);
    
    const tableColumn = ["Name", "Email", "Role", "Designation", "Department", "Status"];
    const tableRows = [];
    
    filteredUsers.forEach(user => {
      const userData = [
        user.user_name || '-',
        user.email_id || '-',
        user.role || '-',
        user.designation || user.Designation || '-',
        user.department || '-',
        user.status || '-'
      ];
      tableRows.push(userData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] }
    });
    
    doc.save(`user_accounts_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF downloaded successfully', 'success');
  };

  const handleDownloadExcel = () => {
    const tableColumn = ["Name", "Email", "Role", "Designation", "Department", "Status", "Modules Count"];
    const tableRows = filteredUsers.map(user => ({
      Name: user.user_name || '-',
      Email: user.email_id || '-',
      Role: user.role || '-',
      Designation: user.designation || user.Designation || '-',
      Department: user.department || '-',
      Status: user.status || '-',
      "Modules Count": user.moduleCount || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(tableRows);
    XLSX.utils.sheet_add_aoa(worksheet, [tableColumn], { origin: "A1" });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "User Accounts");
    XLSX.writeFile(workbook, `user_accounts_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Excel downloaded successfully', 'success');
  };

  return (
    <AdminLayout>
      <div className="max-w-[1550px] mx-auto space-y-5 sm:space-y-6 animate-in fade-in duration-300">
        
        {/* ═══════════════════════════════════════════════════════════
            TOP EXECUTIVE BRAND HEADER - RED THEME
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-red-600 via-rose-700 to-red-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-red-500/30">
          {/* Subtle Ambient Backdrops */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/15 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-extrabold uppercase tracking-widest text-red-100 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>Jay Bhole Master System • Security Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Settings2 className="h-7 w-7 text-white/90 shrink-0" />
              Global Settings & Permissions
            </h1>
            <p className="text-red-100/90 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
              Master System Permissions, Role Access Control & Module-Level Security Controller.
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="relative z-10 flex items-center bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 self-start md:self-auto shrink-0 shadow-lg">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'users' 
                  ? 'bg-white text-red-700 shadow-md scale-100' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users size={16} /> 
              <span>User Accounts</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'users' ? 'bg-red-100 text-red-700' : 'bg-white/20 text-white'
              }`}>
                {users.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'modules' 
                  ? 'bg-white text-red-700 shadow-md scale-100' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard size={16} /> 
              <span>Active Modules</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'modules' ? 'bg-red-100 text-red-700' : 'bg-white/20 text-white'
              }`}>
                {MODULES.length}
              </span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TOP 4 EXECUTIVE METRICS STRIP
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Total Users
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight group-hover:text-red-600 transition-colors">
                {userStats.total}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">All Platform Accounts</span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Active Staff
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                {userStats.active}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Operational Accounts
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserCheck size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Privileged Admins
              </span>
              <div className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
                {userStats.superadmins + userStats.admins}
              </div>
              <span className="text-[10px] text-purple-600 font-medium">
                {userStats.superadmins} Super, {userStats.admins} Admin
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                System Modules
              </span>
              <div className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight">
                {MODULES.length}
              </div>
              <span className="text-[10px] text-blue-500 font-medium">Integrated Systems</span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <LayoutDashboard size={20} />
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: USER ACCOUNTS DATA TABLE & CONTROLLER
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden">
            
            {/* Action Bar & Search Filter */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
              
              {/* Search + Live Count */}
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by name, employee ID, email, department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 sm:py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium placeholder:text-slate-400 shadow-2xs"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                {/* Role Filter Pills */}
                <div className="hidden sm:flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0 text-xs font-bold text-slate-600">
                  {['all', 'superadmin', 'admin', 'user'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-lg uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                        roleFilter === r
                          ? 'bg-red-600 text-white shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {r === 'all' ? 'All Roles' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Export + Create User */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
                <button 
                  onClick={handleDownloadExcel}
                  className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/80 px-3.5 py-2 rounded-xl font-bold shadow-2xs hover:shadow-sm transition-all flex items-center gap-1.5 active:scale-95 text-xs sm:text-sm cursor-pointer"
                  title="Export to Excel"
                >
                  <FileSpreadsheet size={15} /> 
                  <span className="hidden xs:inline">Export</span> Excel
                </button>

                <button 
                  onClick={handleDownloadPDF}
                  className="bg-slate-50 hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-200/90 px-3.5 py-2 rounded-xl font-bold shadow-2xs hover:shadow-sm transition-all flex items-center gap-1.5 active:scale-95 text-xs sm:text-sm cursor-pointer"
                  title="Export to PDF"
                >
                  <Download size={15} /> 
                  <span className="hidden xs:inline">Export</span> PDF
                </button>

                <button 
                  onClick={() => handleOpenModal()}
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-4 py-2 rounded-xl font-black shadow-md shadow-red-500/20 hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 text-xs sm:text-sm cursor-pointer ml-auto sm:ml-0"
                >
                  <Plus size={16} /> 
                  <span>Create New User</span>
                </button>
              </div>

            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] custom-sidebar-scroll">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200">
                  <tr className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">User / Account</th>
                    <th className="py-3.5 px-4">Role & Firm</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Module Access</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-red-500 mb-2" />
                        Loading platform users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-600">No users match your filter criteria.</p>
                        <p className="text-xs text-slate-400 mt-1">Try clearing the search query or role filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const designationStyle = getDesignationStyle(user.designation || user.Designation);
                      const isSuper = user.role?.toLowerCase() === 'superadmin';
                      const isAdmin = user.role?.toLowerCase() === 'admin';
                      const moduleCount = user.moduleCount || user.systemAccessList?.length || 0;
                      const progressPct = Math.min(100, Math.round((moduleCount / MODULES.length) * 100));

                      return (
                        <tr 
                          key={user.id} 
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* 1. User & Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => user.profile_image && setPreviewImage(normalizeProfileImage(user.profile_image))}
                                className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-xs ring-2 ring-white hover:ring-red-200 transition-all cursor-pointer"
                                title={user.profile_image ? "Click to view photo" : user.user_name}
                              >
                                {user.profile_image ? (
                                  <img 
                                    src={normalizeProfileImage(user.profile_image)} 
                                    alt={user.user_name} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  user.user_name ? user.user_name.charAt(0).toUpperCase() : 'U'
                                )}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-black text-slate-800 text-sm truncate leading-tight group-hover:text-red-600 transition-colors">
                                    {user.user_name}
                                  </p>
                                  {user.employee_id && (
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-md">
                                      {user.employee_id}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                                  <Mail size={11} className="shrink-0 text-slate-300" />
                                  <span>{user.email_id || 'No email attached'}</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Role & Firm / Designation */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start gap-1">
                              {isSuper ? (
                                <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-2xs tracking-wider">
                                  SUPERADMIN
                                </span>
                              ) : isAdmin ? (
                                <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                                  ADMIN
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md tracking-wider">
                                  {user.role?.toUpperCase() || 'USER'}
                                </span>
                              )}
                              
                              {(user.designation || user.Designation) && (
                                <span 
                                  className="text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-tight"
                                  style={{ 
                                    backgroundColor: designationStyle.backgroundColor, 
                                    color: designationStyle.color, 
                                    borderColor: designationStyle.borderColor 
                                  }}
                                >
                                  {user.designation || user.Designation}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Department */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <Building2 size={13} className="text-slate-400 shrink-0" />
                              <span>{user.department || '—'}</span>
                            </div>
                          </td>

                          {/* 4. Module Access Meter */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1 max-w-[140px]">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-slate-800">
                                  {moduleCount} <span className="font-medium text-slate-400">/ {MODULES.length}</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {progressPct}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-300"
                                  style={{ width: `${progressPct}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          {/* 5. Status */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              user.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                user.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}></span>
                              {user.status?.toUpperCase() || 'ACTIVE'}
                            </span>
                          </td>

                          {/* 6. Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              onClick={() => handleOpenModal(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-red-700 bg-slate-50 hover:bg-red-50 border border-slate-200/80 hover:border-red-200 font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
                              title="Edit user profile & permissions"
                            >
                              <Settings size={14} className="group-hover:rotate-45 transition-transform" />
                              <span>Configure</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View (< 768px) */}
            <div className="md:hidden p-3.5 space-y-3 bg-slate-50/50">
              {loading ? (
                <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-red-500 mb-2" />
                  Loading platform users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-4">
                  <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600 text-sm">No users match your search.</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const designationStyle = getDesignationStyle(user.designation || user.Designation);
                  const isSuper = user.role?.toLowerCase() === 'superadmin';
                  const isAdmin = user.role?.toLowerCase() === 'admin';
                  const moduleCount = user.moduleCount || user.systemAccessList?.length || 0;

                  return (
                    <div 
                      key={user.id} 
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                    >
                      {/* Top Row: User Avatar + Name + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => user.profile_image && setPreviewImage(normalizeProfileImage(user.profile_image))}
                            className="h-11 w-11 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-xs ring-2 ring-white"
                          >
                            {user.profile_image ? (
                              <img 
                                src={normalizeProfileImage(user.profile_image)} 
                                alt={user.user_name} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              user.user_name ? user.user_name.charAt(0).toUpperCase() : 'U'
                            )}
                          </button>
                          <div className="min-w-0">
                            <h3 className="font-black text-slate-900 text-sm truncate">{user.user_name}</h3>
                            <p className="text-xs text-slate-400 truncate">{user.email_id || '-'}</p>
                            {user.employee_id && (
                              <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                {user.employee_id}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          user.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}></span>
                          {user.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </div>

                      {/* Middle Row: Role, Firm, Department, Modules */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Role / Firm</span>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-slate-800 text-[11px] uppercase">
                              {user.role || 'USER'}
                            </span>
                            {(user.designation || user.Designation) && (
                              <span className="text-[10px] font-semibold truncate text-slate-500">
                                {user.designation || user.Designation}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Department & Access</span>
                          <p className="font-bold text-slate-700 text-[11px] truncate">{user.department || '—'}</p>
                          <p className="text-[10px] text-red-600 font-bold mt-0.5">
                            {moduleCount} / {MODULES.length} Modules
                          </p>
                        </div>
                      </div>

                      {/* Bottom Button */}
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="w-full py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                      >
                        <Settings size={14} />
                        <span>Manage Permissions & Profile</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Table Footer Summary Bar */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-medium">
              <div>
                Showing <span className="font-black text-slate-800">{filteredUsers.length}</span> of <span className="font-black text-slate-800">{users.length}</span> user accounts
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Active Database Connection</span>
              </div>
            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: ACTIVE ENTERPRISE MODULES DIRECTORY
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {MODULES.map((module) => {
              const usersWithAccess = users.filter(u => u.systemAccessList?.includes(module.id)).length;

              return (
                <div 
                  key={module.id} 
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden group flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all pointer-events-none">
                    <LayoutDashboard size={90} />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-12 w-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <LayoutDashboard size={22} />
                      </div>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active System
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-800 group-hover:text-red-600 transition-colors">
                        {module.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-1">
                        <span>{module.pages.length} Pages Configured</span>
                        <span>•</span>
                        <span className="text-red-600">{usersWithAccess} Users Authorized</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Sub-pages in this module
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-sidebar-scroll pr-1">
                        {module.pages.map((page) => (
                          <span 
                            key={page} 
                            className="px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                          >
                            {page}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Enterprise Security</span>
                    <span className="text-emerald-600 font-bold">100% Operational</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════
          FULL RESOLUTION PROFILE IMAGE PREVIEW MODAL
      ═══════════════════════════════════════════════════════════ */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 z-10 bg-white text-slate-700 rounded-full p-2 shadow-xl hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              aria-label="Close profile preview"
            >
              <X size={18} />
            </button>
            <img 
              src={previewImage} 
              alt="Profile preview" 
              className="w-full max-h-[80vh] object-contain rounded-3xl bg-white shadow-2xl p-2" 
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CREATE & EDIT USER PERMISSION CONTROLLER MODAL
      ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">
                    {editingUser ? `Configure User: ${editingUser.user_name}` : 'Create New Platform User'}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Profile Information & System Authorization Controller
                  </p>
                </div>
              </div>

              <button 
                onClick={handleCloseModal} 
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-slate-200 px-6 bg-white gap-2">
              <button
                onClick={() => setModalTab('profile')}
                className={`py-3.5 px-4 text-xs sm:text-sm font-black border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  modalTab === 'profile' 
                    ? 'border-red-600 text-red-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <User size={15} />
                <span>1. General Profile</span>
              </button>
              <button
                onClick={() => setModalTab('permissions')}
                className={`py-3.5 px-4 text-xs sm:text-sm font-black border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  modalTab === 'permissions' 
                    ? 'border-red-600 text-red-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <KeyRound size={15} />
                <span>2. Systems & Pages Access</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-700 font-black">
                  {formData.system_access?.length || 0}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-slate-50/40 custom-sidebar-scroll">
              
              {/* Tab 1: Profile Information */}
              {modalTab === 'profile' && (
                <div className="space-y-6">
                  
                  {/* Photo Upload Area */}
                  <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                        {formData.profile_image ? (
                          <img
                            src={normalizeProfileImage(formData.profile_image)}
                            alt="Profile"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setPreviewImage(normalizeProfileImage(formData.profile_image))}
                          />
                        ) : (
                          <span className="text-2xl font-black text-slate-300">
                            {formData.user_name ? formData.user_name.charAt(0).toUpperCase() : '?'}
                          </span>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-1.5 bg-red-600 hover:bg-red-700 rounded-full text-white shadow-md cursor-pointer transition-colors">
                        <Edit2 size={12} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800">Profile Picture</h4>
                      <p className="text-xs text-slate-500">Upload a professional image for this user account.</p>
                      {formData.profile_image && (
                        <button 
                          onClick={() => setFormData({...formData, profile_image: ''})} 
                          className="text-xs text-red-600 hover:text-red-800 font-bold inline-block cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Input Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" /> Username *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={formData.user_name}
                        onChange={(e) => setFormData({...formData, user_name: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Lock size={13} className="text-slate-400" /> Password *
                      </label>
                      <input
                        type="text"
                        placeholder="Login password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <KeyRound size={13} className="text-slate-400" /> Employee ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EMP-1002"
                        value={formData.employee_id}
                        onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" /> Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="name@jaibhole.in"
                        value={formData.email_id}
                        onChange={(e) => setFormData({...formData, email_id: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" /> Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +91 9876543210"
                        value={formData.number}
                        onChange={(e) => setFormData({...formData, number: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Shield size={13} className="text-slate-400" /> System Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="user">User (Standard Access)</option>
                        <option value="admin">Admin (Manager)</option>
                        <option value="superadmin">Superadmin (Master Controller)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-slate-400" /> Account Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="active">Active (Access Allowed)</option>
                        <option value="inactive">Inactive (Account Locked)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400" /> Department
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Accounts, HR, Logistics"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400" /> Firm / Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. JAI BHOLE TRADERS, Senior Accountant"
                        value={formData.designation}
                        onChange={(e) => setFormData({...formData, designation: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* Tab 2: System & Page Permissions */}
              {modalTab === 'permissions' && (
                <div className="space-y-7">
                  
                  {/* System Module Access Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          1. System Module Authorization
                        </h3>
                        <p className="text-xs text-slate-500">
                          Select the enterprise modules this user can view on their navigation sidebar.
                        </p>
                      </div>
                      <span className="text-xs font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                        {formData.system_access?.length || 0} Modules Selected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MODULES.map((mod) => {
                        const isSelected = formData.system_access?.includes(mod.id);
                        return (
                          <div 
                            key={mod.id}
                            onClick={() => toggleModuleAccess(mod.id)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-red-600 bg-red-50/50 shadow-2xs' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                                <Shield size={18} />
                              </div>
                              <div className="min-w-0">
                                <span className={`font-bold text-xs sm:text-sm block truncate ${
                                  isSelected ? 'text-red-950 font-black' : 'text-slate-700'
                                }`}>
                                  {mod.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {mod.pages.length} Pages Available
                                </span>
                              </div>
                            </div>

                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-Page Granular Permissions */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          2. Granular Page Permissions
                        </h3>
                        <p className="text-xs text-slate-500">
                          Select specific pages inside authorized modules.
                        </p>
                      </div>
                    </div>

                    {/* Module Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-sidebar-scroll">
                      {MODULES.filter(m => formData.system_access?.includes(m.id)).map((mod) => (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => setSelectedModule(mod.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                            selectedModule === mod.id 
                              ? 'bg-slate-900 text-white shadow-xs' 
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {mod.name}
                        </button>
                      ))}

                      {(!formData.system_access || formData.system_access.length === 0) && (
                        <p className="text-xs text-slate-400 italic py-2">
                          Please authorize at least one module above to configure page-level permissions.
                        </p>
                      )}
                    </div>

                    {/* Pages Checkbox Grid for Selected Module */}
                    {formData.system_access?.includes(selectedModule) && (
                      <div className="mt-3 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/80">
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                            {selectedModule} Pages
                          </span>
                          <div className="flex items-center gap-2 text-xs font-black">
                            <button 
                              type="button"
                              onClick={() => handleCheckAllPages(selectedModule)} 
                              className="text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                            >
                              Check All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button 
                              type="button"
                              onClick={() => handleClearAllPages(selectedModule)} 
                              className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3.5 max-h-64 overflow-y-auto custom-sidebar-scroll">
                          {MODULES.find(m => m.id === selectedModule)?.pages.map((page) => {
                            const pageKey = `${selectedModule}::${page}`;
                            const isSelected = formData.page_access?.includes(pageKey);
                            return (
                              <div 
                                key={page}
                                onClick={() => togglePageAccess(selectedModule, page)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'border-red-300 bg-red-50/50 text-red-950 font-bold' 
                                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                }`}
                              >
                                <span className="text-xs truncate pr-1">{page}</span>
                                <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'
                                }`}>
                                  {isSelected && <Check size={11} strokeWidth={3} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
              <button 
                type="button"
                onClick={handleCloseModal} 
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveUser} 
                className="px-7 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black rounded-xl shadow-md shadow-red-500/20 hover:shadow-lg transition-all flex items-center gap-2 text-xs sm:text-sm active:scale-95 cursor-pointer"
              >
                <Save size={16} />
                <span>Save User Settings</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </AdminLayout>
  );
}
