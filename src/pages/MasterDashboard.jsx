import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  CheckSquare, Banknote, UserRound, HelpCircle, CalendarCheck, Settings2, Wallet,
  Loader2, ArrowRight, FileText
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import supabase from "../SupabaseClient";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, ComposedChart, Line
} from 'recharts';

export default function MasterDashboard() {
  const username = localStorage.getItem("user-name") || "User";
  
  const [stats, setStats] = useState({
    tasksData: [],
    rentData: [],
    pettyCashData: [],
    hrData: [],
    hrTotalEmployees: 0,
    helpSlipData: [],
    helpSlipTotal: 0,
    loading: true
  });

  const COLORS = {
    blue: ['#3b82f6', '#93c5fd', '#bfdbfe'],
    emerald: ['#10b981', '#6ee7b7', '#a7f3d0'],
    teal: ['#14b8a6', '#5eead4', '#99f6e4'],
    orange: ['#f97316', '#fdba74', '#fed7aa'],
    rose: ['#f43f5e', '#fda4af', '#fecdd3'],
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Tasks (Checklist & Delegation)
        const { data: checklistData } = await supabase.from('checklist').select('status, submission_date, planned_date');
        const tasks = checklistData || [];
        
        let analyzed = 0;
        let done = 0;
        let dueToday = 0;
        let overdue = 0;
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        tasks.forEach(task => {
          const statusLower = (task.status || "").toLowerCase();
          const isCompleted = (task.submission_date !== null) || 
                              (statusLower === 'yes') || 
                              (statusLower.includes('done')) || 
                              (statusLower.includes('completed'));
                              
          const pDateStr = task.planned_date ? task.planned_date.split('T')[0] : null;
          
          if (pDateStr && pDateStr <= todayStr) {
            analyzed++;
            if (isCompleted) {
              done++;
            } else if (pDateStr === todayStr) {
              dueToday++;
            } else if (pDateStr < todayStr) {
              overdue++;
            }
          }
        });
        
        const tasksChart = [
          { name: 'Analyzed', value: analyzed, fill: '#3b82f6' },
          { name: 'Done', value: done, fill: '#10b981' },
          { name: 'Due Today', value: dueToday, fill: '#f59e0b' },
          { name: 'Overdue', value: overdue, fill: '#ef4444' }
        ];

        // 2. Rent (Overall)
        const { data: rentRecords } = await supabase.from('rent_records').select('monthly_rent, status');
        const rent = rentRecords || [];
        const expectedRent = rent.reduce((acc, curr) => acc + (Number(curr.monthly_rent) || 0), 0);
        const collectedRent = rent.filter(r => r.status === 'Done').reduce((acc, curr) => acc + (Number(curr.monthly_rent) || 0), 0);
        
        const rentChart = [
          { name: 'Rent Status', Expected: expectedRent, Collected: collectedRent }
        ];

        // 3. HR
        const { data: usersData } = await supabase.from('users').select('department');
        const users = usersData || [];
        
        const totalEmployees = users.length;
        const departmentCounts = {};
        
        users.forEach(u => {
          const dept = u.department || 'Unassigned';
          departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        });
        
        const hrChart = Object.entries(departmentCounts).map(([name, value]) => ({
          name, value
        }));

        // 4. Petty Cash
        const { data: pcCredits } = await supabase.from('petty_cash_addcash_credits').select('amount');
        const { data: pcExpenses } = await supabase.from('petty_cash_expenses').select('amount').eq('status', 'APPROVED');
        const totalCredits = (pcCredits || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalExpenses = (pcExpenses || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        
        const pcChart = [
          { name: 'Financials', Credits: totalCredits, Expenses: totalExpenses }
        ];

        // 5. Help Slips
        const { data: slipsData } = await supabase.from('help_slips').select('*');
        const slips = slipsData || [];
        const resolvedSlips = slips.filter(s => s.admin_reply || s.adminReply).length;
        const pendingSlips = slips.length - resolvedSlips;

        const helpSlipChart = [
          { name: 'Resolved', value: resolvedSlips },
          { name: 'Pending', value: pendingSlips }
        ];

        // 6. Daily Scheduler (Day-wise)
        const { data: dailyTasksData } = await supabase.from('tasks').select('date, status');
        const dailyTasks = dailyTasksData || [];
        
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayWiseData = {
          Mon: { name: 'Mon', Scheduled: 0, Completed: 0 },
          Tue: { name: 'Tue', Scheduled: 0, Completed: 0 },
          Wed: { name: 'Wed', Scheduled: 0, Completed: 0 },
          Thu: { name: 'Thu', Scheduled: 0, Completed: 0 },
          Fri: { name: 'Fri', Scheduled: 0, Completed: 0 },
          Sat: { name: 'Sat', Scheduled: 0, Completed: 0 },
          Sun: { name: 'Sun', Scheduled: 0, Completed: 0 },
        };

        dailyTasks.forEach(t => {
          if (t.date) {
            const d = new Date(t.date);
            if (!isNaN(d.getTime())) {
              const dayName = daysOfWeek[d.getDay()];
              dayWiseData[dayName].Scheduled += 1;
              const statusLower = (t.status || "").toLowerCase();
              const isComp = statusLower === 'completed' || statusLower === 'done';
              if (isComp) {
                dayWiseData[dayName].Completed += 1;
              }
            }
          }
        });
        
        const dailySchedulerChart = Object.values(dayWiseData);

        setStats({
          tasksData: tasksChart,
          rentData: rentChart,
          pettyCashData: pcChart,
          hrData: hrChart,
          hrTotalEmployees: totalEmployees,
          helpSlipData: helpSlipChart,
          helpSlipTotal: slips.length,
          dailySchedulerData: dailySchedulerChart,
          loading: false
        });
      } catch (error) {
        console.error("Error fetching master stats:", error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-xl text-sm">
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.fill }} className="font-bold">
              {entry.name}: {entry.value.toLocaleString('en-IN')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 p-4 md:p-8">
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-700 to-purple-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden flex justify-between items-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl md:text-5xl font-black mb-3">Welcome to Jai Bhole, {username}!</h1>
            <p className="text-blue-100 text-lg md:text-xl max-w-2xl font-medium">
              Access your modules securely from one central hub. Select a module below to manage your operations.
            </p>
          </div>
          <div className="relative z-10 hidden md:flex">
            {stats.loading ? (
              <Loader2 className="animate-spin text-white h-12 w-12 opacity-50" />
            ) : (
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 text-center shadow-lg">
                 <h2 className="text-sm font-bold text-blue-100 uppercase tracking-widest mb-1">Company Status</h2>
                 <p className="text-2xl font-black">All Systems Go</p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Graphical Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. Tasks Module (Donut Chart) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CheckSquare size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Checklist & Tasks</h2>
                  <p className="text-xs text-gray-500">Task completion overview</p>
                </div>
              </div>
              
              <div className="h-48 w-full mb-4">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-300 h-8 w-8" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.tasksData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                      <YAxis tick={{fontSize: 10}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {stats.tasksData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <Link to="/dashboard/admin" className="flex items-center justify-center w-full py-3 px-4 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all">
              Open Module <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>

          {/* 2. Rent Management Module (Bar Chart) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Banknote size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Rent Management</h2>
                  <p className="text-xs text-gray-500">Expected vs Collected (Current Month)</p>
                </div>
              </div>
              
              <div className="h-48 w-full mb-4">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-300 h-8 w-8" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.rentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" hide />
                      <YAxis tick={{fontSize: 10}} tickFormatter={(value) => `₹${value/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="Expected" fill={COLORS.emerald[1]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Collected" fill={COLORS.emerald[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <Link to="/dashboard/rent-management" className="flex items-center justify-center w-full py-3 px-4 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
              Open Module <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>

          {/* 3. Petty Cash (Composed Chart) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-teal-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Wallet size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Petty Cash</h2>
                  <p className="text-xs text-gray-500">Balance vs Expenses Overview</p>
                </div>
              </div>
              
              <div className="h-48 w-full mb-4">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-teal-300 h-8 w-8" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.pettyCashData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" hide />
                      <YAxis tick={{fontSize: 10}} tickFormatter={(value) => `₹${value/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="Credits" fill={COLORS.teal[1]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill={COLORS.teal[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <Link to="/petty-cash/dashboard" className="flex items-center justify-center w-full py-3 px-4 bg-teal-50 text-teal-700 font-bold rounded-xl hover:bg-teal-600 hover:text-white transition-all">
              Open Module <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>

          {/* 4. HR System (Radial/Pie Chart) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <UserRound size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">HR System</h2>
                  <p className="text-xs text-gray-500">Employee Distribution by Department</p>
                </div>
              </div>
              
              {!stats.loading && (
                <div className="mb-2 inline-flex items-center bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold border border-orange-100">
                  Total Employees: {stats.hrTotalEmployees} Active
                </div>
              )}
              
              <div className="h-40 w-full mb-4">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-orange-300 h-8 w-8" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.hrData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">
                        {stats.hrData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.orange[index % COLORS.orange.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <Link to="/hr/dashboard" className="flex items-center justify-center w-full py-3 px-4 bg-orange-50 text-orange-700 font-bold rounded-xl hover:bg-orange-600 hover:text-white transition-all">
              Open Module <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>

          {/* 5. Help Slip (Pie Chart) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-rose-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="h-12 w-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Help Slip</h2>
                  <p className="text-xs text-gray-500">Support Ticket Status</p>
                </div>
              </div>
              
              {!stats.loading && (
                <div className="mb-2 inline-flex items-center bg-pink-50 text-pink-700 px-2.5 py-1 rounded-full text-xs font-bold border border-pink-100">
                  Total Support Requests: {stats.helpSlipTotal}
                </div>
              )}
              
              <div className="h-40 w-full mb-4">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-rose-300 h-8 w-8" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.helpSlipData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                        {stats.helpSlipData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.rose[index % COLORS.rose.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <Link to="/dashboard/help-slip" className="flex items-center justify-center w-full py-3 px-4 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-600 hover:text-white transition-all">
              Open Module <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>

          {/* 6. Daily Scheduler */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-violet-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Daily Scheduler</h2>
                  <p className="text-xs text-gray-500">Scheduled Tasks Overview</p>
                </div>
              </div>
              
              <div className="h-48 w-full mb-4">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-violet-300 h-8 w-8" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dailySchedulerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                      <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="Scheduled" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <Link to="/daily-scheduler/dashboard" className="flex items-center justify-center w-full py-3 px-4 bg-violet-50 text-violet-700 font-bold rounded-xl hover:bg-violet-600 hover:text-white transition-all">
              Open Module <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>

          {/* 7. Static Modules (Without Charts) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Other Modules</h2>
                  <p className="text-xs text-gray-500">Documents, Settings</p>
                </div>
              </div>
              
              <div className="h-48 w-full mb-4 space-y-3 pt-2">
                <Link to="/doc-dashboard" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-700 transition-colors group">
                  <div className="flex items-center gap-3"><FileText size={18} className="text-slate-400 group-hover:text-purple-600" /> <span className="font-medium text-sm">Documents</span></div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-purple-600" />
                </Link>
                <Link to="/dashboard/global-settings" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <div className="flex items-center gap-3"><Settings2 size={18} className="text-slate-400 group-hover:text-slate-700" /> <span className="font-medium text-sm">Global Settings</span></div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-700" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
