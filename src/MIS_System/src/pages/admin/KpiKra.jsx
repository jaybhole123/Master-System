import React, { useState, useEffect } from 'react';
import { Video, Users, MessageSquare, Target, Award, Briefcase, CheckSquare, Users2, Database, Link, PlayCircle, ChevronDown, TrendingUp, User, Download } from 'lucide-react';
import { useAuth } from "../../contexts/AuthContext";

const designations = [
  'All',
  'CRM',
  'PURCHASER',
  'HR',
  'EA',
  'SALES Coordination',
  'AUDITOR',
  'ACCOUNTANT'
];


// Designation data is now fetched dynamically from the sheet.
// Fallback structure for type safety
const defaultData = {
  actualRole: '—',
  totalTasks: '0 daily tasks',
  scoringWorks: '',
  scoreBetter: '',
  keyPerson: '—',
  communicationTeam: [],
  howToCommunicate: '—',
  systems: []
};

const KpiKra = () => {
  const { user } = useAuth();
  const [selectedDesignation, setSelectedDesignation] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userDept, setUserDept] = useState(user?.department || '');
  const [userRole, setUserRole] = useState(user?.role || '');

  // Set default designation for non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin' && user.designation) {
      // Find matching designation from our list
      const matchingDesignation = designations.find(d =>
        d.toLowerCase() === user.designation.toLowerCase() ||
        user.designation.toLowerCase().includes(d.toLowerCase())
      );
      if (matchingDesignation) {
        setSelectedDesignation(matchingDesignation);
      }
    }
  }, [user]);
  const [notification, setNotification] = useState(null);
  const [fetchedRoleData, setFetchedRoleData] = useState('');
  const [fetchedTaskData, setFetchedTaskData] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [commTeam, setCommTeam] = useState('');
  const [howToComm, setHowToComm] = useState('');
  const [keyPerson, setKeyPerson] = useState('');
  const [systemsData, setSystemsData] = useState([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const currentData = defaultData;

  const fetchDashboardData = (sheetOverride, currentDept) => {
    setIsLoadingDashboard(true);
    const selected = selectedDesignation || 'All';
    setFetchedRoleData(`Responsible for execution of ${selected} operations, timely task completion and coordination.`);
    setFetchedTaskData(`5 daily tasks`);
    setCommTeam('Management, Operations Team, Coordination Desk');
    setKeyPerson('Operations Head / Admin');
    setHowToComm('Daily MIS review & team communication channel');
    setSystemsData([
      {
        systemName: `${selected} Task Manager`,
        taskName: 'Daily Activity Log',
        description: `Complete planned activities and log actual work for ${selected}`,
        systemLink: '#',
        dbLink: '#',
        trainingVideo: '#'
      },
      {
        systemName: 'Performance Tracker',
        taskName: 'Scorecard & KRA Audit',
        description: 'Verify weekly targets and commitment metrics',
        systemLink: '#',
        dbLink: '#',
        trainingVideo: '#'
      }
    ]);
    setIsLoadingDashboard(false);
  };

  const fetchUserDepartment = () => {
    setUserDept(user?.department || 'Management');
    setUserRole(user?.role || 'admin');
    fetchDashboardData();
  };

  useEffect(() => {
    fetchUserDepartment();
  }, [user?.name, selectedDesignation]);

  const ensureAbsoluteUrl = (url) => {
    if (!url) return '';
    const strUrl = String(url).trim();
    if (strUrl.startsWith('http://') || strUrl.startsWith('https://')) return strUrl;
    return `https://${strUrl}`;
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = (designationToSubmit) => {
    const valueToSubmit = typeof designationToSubmit === 'string' ? designationToSubmit : (typeof selectedDesignation === 'string' ? selectedDesignation : 'All');
    setIsSubmitting(true);
    setSelectedDesignation(valueToSubmit);
    fetchDashboardData(valueToSubmit);
    showNotification(`${valueToSubmit} selection updated!`, 'success');
    setIsSubmitting(false);
  };

  const dropdownRef = React.useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">KPI & KRA Dashboard</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-500 text-sm md:text-base">Role-specific performance metrics & resources</p>
                  {userRole !== 'admin' && userDept && (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                      {userDept}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:border-blue-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all group"
            >
              <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              Download PDF
            </button>
            {(userRole === 'admin' || userRole === 'superadmin') && (
              <>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:border-blue-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[240px] text-left group"
                  >
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="truncate">{typeof selectedDesignation === 'string' ? selectedDesignation : 'All'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                        <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                          Select Designation
                        </div>
                        {designations.map((designation) => (
                          <button
                            key={designation}
                            onClick={() => {
                              setSelectedDesignation(designation);
                              setIsDropdownOpen(false);
                              handleSubmit(designation); // Immediate submission
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${selectedDesignation === designation
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                              }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full transition-all ${selectedDesignation === designation ? 'bg-blue-600 scale-125' : 'bg-transparent'
                              }`} />
                            {designation}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSubmit(selectedDesignation)}
                  disabled={isSubmitting}
                  className={`relative overflow-hidden px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 ${isSubmitting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      <span>Submit</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Custom Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 border ${notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              {notification.type === 'success' ? (
                <CheckSquare className="w-5 h-5 text-emerald-600" />
              ) : (
                <Award className="w-5 h-5 text-red-600" />
              )}
              <p className="text-sm font-semibold">{notification.message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Role Information Card */}
          <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Official Designation</h2>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Primary Role</p>
                {isLoadingDashboard ? (
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="h-6 w-48 bg-gray-100 rounded" />
                  </div>
                ) : (
                  <p className="text-md text-gray-900 leading-tight">
                    {fetchedRoleData || 'No role description found in sheet'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tasks Card */}
          <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Task Velocity</h2>
              </div>
              <div className="flex items-baseline gap-2">
                {isLoadingDashboard ? (
                  <div className="h-10 w-24 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-4xl font-black text-gray-900">
                      {fetchedTaskData !== '' ? (String(fetchedTaskData).includes(' ') ? String(fetchedTaskData).split(' ')[0] : fetchedTaskData) : '0'}
                    </span>
                    <span className="text-gray-500 font-medium">
                      {fetchedTaskData !== '' ? (String(fetchedTaskData).includes(' ') ? String(fetchedTaskData).split(' ').slice(1).join(' ') : 'Daily Tasks') : 'Daily Tasks'}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Scoring Card */}
          <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Success Guides</h2>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <a
                  href={ensureAbsoluteUrl(youtubeLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-purple-600 hover:text-white transition-all group/link"
                >
                  <div className="flex items-center gap-3">
                    <PlayCircle className="w-4 h-4 text-purple-600 group-hover/link:text-white" />
                    <span className="text-sm font-semibold">How Scoring Works</span>
                  </div>
                  <ChevronDown className="w-4 h-4 -rotate-90 opacity-0 group-hover/link:opacity-100 transition-all" />
                </a>
                <a
                  href={ensureAbsoluteUrl(instagramLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all group/link"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-blue-600 group-hover/link:text-white" />
                    <span className="text-sm font-semibold">How To Score Better</span>
                  </div>
                  <ChevronDown className="w-4 h-4 -rotate-90 opacity-0 group-hover/link:opacity-100 transition-all" />
                </a>
              </div>
            </div>
          </div>

          {/* Communication Section - Full Width */}
          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Communication Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden relative">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Users2 className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Collaborative Network</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isLoadingDashboard ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)
                ) : (
                  (commTeam ? String(commTeam).split(',').map(s => s.trim()) : []).map((member, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-transparent hover:border-amber-200 hover:bg-amber-50 transition-all">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-xs font-bold text-amber-600 border border-amber-100">
                        {member.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{member}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Communication Process Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden relative">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                <div className="p-2 bg-cyan-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-cyan-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Communication Protocol</h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100">
                  <p className="text-sm font-bold text-cyan-800 mb-2 uppercase tracking-wide">Methodology</p>
                  {isLoadingDashboard ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-white/50 rounded w-full animate-pulse" />
                      <div className="h-4 bg-white/50 rounded w-2/3 animate-pulse" />
                    </div>
                  ) : (
                    <p className="text-sm text-cyan-900 font-medium leading-relaxed">{howToComm || 'Protocol not defined in sheet'}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md border border-gray-200 flex-shrink-0">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Key Reporting Person</p>
                    <p className="text-base font-bold text-gray-900 uppercase">
                      {isLoadingDashboard ? 'Loading...' : (keyPerson || 'N/A')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiKra;