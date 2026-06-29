import React, { useState, useEffect } from 'react';
import { Settings2, Users, Layout, Search, Plus, Edit2, Trash2, Shield, Settings, ChevronRight, X, Save, LayoutDashboard } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import supabase from '../../SupabaseClient';
import { useMagicToast } from '../../context/MagicToastContext';

const MODULES = [
  {
    id: 'Checklist & Delegation',
    name: 'Checklist & Delegation',
    pages: ['Dashboard', 'Notifications', 'Task Manager', 'Assign Task', 'Delegation', 'Checklist', 'Calendar', 'Holiday', 'Admin Approval', 'Settings', 'Global Settings', 'Training Video']
  },
  {
    id: 'Document & Substruction',
    name: 'Document & Substruction',
    pages: [
      'Dashboard', 
      'All Resources', 
      'Document Renewal', 
      'Subscription Renewal', 
      'Document Shared', 
      'Subscription Approval', 
      'Subscription Payment', 
      'All Loan', 
      'Request Forecloser', 
      'Collect NOC', 
      'Bank Guarantee'
    ]
  }
];

export default function GlobalSettings() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalTab, setModalTab] = useState('profile');
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
    Designation: '',
    system_access: [],
    page_access: []
  });
  
  const [selectedModule, setSelectedModule] = useState('Checklist & Delegation');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Error fetching users', 'error');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      
      const parseAccess = (val) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
              if (val.trim().startsWith('[')) {
                  try { return JSON.parse(val); } catch(e) { return []; }
              }
              return val.split(',').filter(Boolean);
          }
          return [];
      };

      let parsedSystemAccess = parseAccess(user.system_access);
      let parsedPageAccess = parseAccess(user.page_access);

      setFormData({
        user_name: user.user_name || '',
        password: user.password || '',
        employee_id: user.employee_id || '',
        email_id: user.email_id || '',
        number: user.number || '',
        role: user.role || 'user',
        status: user.status || 'active',
        department: user.department || '',
        Designation: user.Designation || '',
        system_access: parsedSystemAccess,
        page_access: parsedPageAccess,
        profile_image: user.profile_image || ''
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
        Designation: '',
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
      // Loop to automatically advance the broken PostgreSQL sequence
      let finalError = null;
      let success = false;
      
      for (let i = 0; i < 50; i++) { // Try up to 50 times to bypass duplicate IDs
        const { error } = await supabase.from('users').insert([payload]);
        if (!error) {
          success = true;
          break;
        }
        if (error.code !== '23505') { // If it's not a duplicate key error, stop trying
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
          // Remove old ones for this module first
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

  const filteredUsers = users.filter((u) => 
    u.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                <Settings2 className="text-red-600 h-8 w-8" />
                Global Settings
              </h1>
              <p className="text-slate-500 font-medium ml-11">Master System Permissions & Modules Controller</p>
            </div>
            
            <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Users size={16} /> User Accounts
                </button>
                <button
                    onClick={() => setActiveTab('modules')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'modules' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <LayoutDashboard size={16} /> Active Modules
                </button>
            </div>
        </div>

        {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Search users by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <button 
                    onClick={() => handleOpenModal()}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 text-sm"
                >
                    <Plus size={16} /> Create New User
                </button>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
                    <table className="w-full relative">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                            <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4">Employee ID</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Role / Designation</th>
                                <th className="p-4">Department</th>
                                <th className="p-4">Access Modules</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No users found.</td></tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-mono text-sm text-slate-600">{user.employee_id || '-'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {user.user_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{user.user_name}</p>
                                                    <p className="text-xs text-slate-500">{user.email_id || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${user.role?.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {user.role}
                                                </span>
                                                <span className="text-xs text-slate-500">{user.Designation || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">{user.department || '-'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-700">
                                                    {(typeof user.system_access === 'string' ? (user.system_access.trim().startsWith('[') ? (() => { try { return JSON.parse(user.system_access).length; } catch(e) { return 0; }})() : user.system_access.split(',').filter(Boolean).length) : (user.system_access?.length || 0))} Modules
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                                {user.status?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button 
                                                onClick={() => handleOpenModal(user)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Settings size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'modules' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MODULES.map(module => (
                    <div key={module.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
                            <LayoutDashboard size={80} />
                        </div>
                        <div className="relative z-10">
                            <div className="h-12 w-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                                <LayoutDashboard size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">{module.name}</h3>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    Active System
                                </span>
                                <span className="text-slate-400 text-sm font-medium">•</span>
                                <span className="text-slate-500 text-sm font-semibold">{module.pages.length} Pages</span>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Available Pages</div>
                                <div className="flex flex-wrap gap-2">
                                    {module.pages.map(page => (
                                        <span key={page} className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                                            {page}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

      </div>

      {/* User Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">
                            {editingUser ? `Edit User: ${editingUser.user_name}` : 'Create User Account'}
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Configuring General Profile & Systems Authorization</p>
                    </div>
                    <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Tabs */}
                <div className="flex border-b border-slate-200 px-6 bg-white">
                    <button
                        onClick={() => setModalTab('profile')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${modalTab === 'profile' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        1. GENERAL PROFILE
                    </button>
                    <button
                        onClick={() => setModalTab('permissions')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${modalTab === 'permissions' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        2. SYSTEM & PAGE PERMISSIONS
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    
                    {modalTab === 'profile' && (
                        <div className="space-y-6">
                            {/* Profile Image Upload */}
                            <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                                        {formData.profile_image ? (
                                            <img src={formData.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-black text-slate-300">
                                                {formData.user_name ? formData.user_name.charAt(0).toUpperCase() : '?'}
                                            </span>
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 p-1.5 bg-red-600 rounded-full text-white shadow-md cursor-pointer hover:bg-red-700 transition-colors">
                                        <Edit2 size={12} />
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Profile Picture</h4>
                                    <p className="text-xs text-slate-500 mt-1">Upload a photo to help identify this user.</p>
                                    {formData.profile_image && (
                                        <button 
                                            onClick={() => setFormData({...formData, profile_image: ''})} 
                                            className="text-xs text-red-600 hover:text-red-800 font-bold mt-2 inline-block"
                                        >
                                            Remove Photo
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Username *</label>
                                <input
                                    type="text"
                                    value={formData.user_name}
                                    onChange={(e) => setFormData({...formData, user_name: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Password *</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Employee ID</label>
                                <input
                                    type="text"
                                    value={formData.employee_id}
                                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email_id}
                                    onChange={(e) => setFormData({...formData, email_id: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.number}
                                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">System Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="user">User (Doer)</option>
                                    <option value="admin">Admin</option>
                                    <option value="hod">HOD</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Account Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Designation</label>
                                <input
                                    type="text"
                                    value={formData.Designation}
                                    onChange={(e) => setFormData({...formData, Designation: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>
                        </div>
                    )}

                    {modalTab === 'permissions' && (
                        <div className="space-y-8">
                            
                            {/* System Module Access */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">System Module Access</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {MODULES.map(mod => {
                                        const isSelected = formData.system_access?.includes(mod.id);
                                        return (
                                            <div 
                                                key={mod.id}
                                                onClick={() => toggleModuleAccess(mod.id)}
                                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-red-600 bg-red-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        <Shield size={20} />
                                                    </div>
                                                    <span className={`font-bold ${isSelected ? 'text-red-900' : 'text-slate-600'}`}>{mod.name}</span>
                                                </div>
                                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-red-600 bg-red-600' : 'border-slate-200'}`}>
                                                    {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Page Navigation Access */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Page & Navigation Access</h3>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {MODULES.filter(m => formData.system_access?.includes(m.id)).map(mod => (
                                        <button
                                            key={mod.id}
                                            onClick={() => setSelectedModule(mod.id)}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${selectedModule === mod.id ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {mod.name}
                                        </button>
                                    ))}
                                    {(formData.system_access?.length === 0 || !formData.system_access) && (
                                        <p className="text-sm text-slate-400 italic py-2">Select a module above to configure page access.</p>
                                    )}
                                </div>

                                {formData.system_access?.includes(selectedModule) && (
                                    <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Pages Available in {selectedModule}</span>
                                            <div className="flex items-center gap-3 text-sm font-bold">
                                                <button onClick={() => handleCheckAllPages(selectedModule)} className="text-red-600 hover:text-red-700">Check All</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => handleClearAllPages(selectedModule)} className="text-slate-500 hover:text-slate-700">Clear All</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 max-h-[300px] overflow-y-auto">
                                            {MODULES.find(m => m.id === selectedModule)?.pages.map(page => {
                                                const pageKey = `${selectedModule}::${page}`;
                                                const isSelected = formData.page_access?.includes(pageKey);
                                                return (
                                                    <div 
                                                        key={page}
                                                        onClick={() => togglePageAccess(selectedModule, page)}
                                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-red-200 bg-red-50/30' : 'border-slate-100 hover:border-slate-200'}`}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className={`font-bold text-sm ${isSelected ? 'text-red-900' : 'text-slate-600'}`}>{page}</span>
                                                        </div>
                                                        <div className={`h-5 w-5 rounded border flex items-center justify-center ${isSelected ? 'border-red-600 bg-red-600' : 'border-slate-300'}`}>
                                                            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
                <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                    <button onClick={handleCloseModal} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSaveUser} className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm shadow-red-200 transition-all">
                        SAVE CHANGES
                    </button>
                </div>
            </div>
        </div>
      )}

    </AdminLayout>
  );
}
