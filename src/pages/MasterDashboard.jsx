import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  CheckSquare, Banknote, UserRound, HelpCircle, CalendarCheck, Settings2, Wallet,
  Loader2, ArrowRight, FileText, Shield, Calendar, Car, Repeat, Landmark,
  Users, Briefcase, Building2, Activity, Flame, Truck, Route, Fuel,
  FileCheck, TrendingUp, Sparkles, AlertCircle, Clock, CheckCircle2, ChevronRight
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import supabase from "../SupabaseClient";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { fetchDocumentsFromGoogleSheets, fetchLoansFromGoogleSheets, fetchCarInsuranceFromGoogleSheets } from "../modules/document/utils/googleSheetsService";
import { syncSubscriptions } from "../modules/document/utils/subscriptionSync";

export default function MasterDashboard() {
  const username = localStorage.getItem("user-name") || "Admin";
  
  const [stats, setStats] = useState({
    checklistData: [],
    delegationData: [],
    pettyCashData: [],
    pettyCashTotalCredits: 0,
    pettyCashTotalExpenses: 0,
    hrData: [],
    hrTotalEmployees: 0,
    hrMetrics: {
      employees: [],
      attendance: [],
      leaves: [],
      payroll: []
    },
    helpSlipData: [],
    helpSlipTotal: 0,
    dailySchedulerData: [],
    dailyTotalTasks: 0,
    dailyCompletionRate: 0,
    dailyTasksNotDone: 0,
    uniqueNames: 0,
    uniqueRoles: 0,
    uniqueDepts: 0,
    activeStatusCount: 0,
    docTotal: 0,
    subTotal: 0,
    loanTotal: 0,
    carTotal: 0,
    reminderCount: 0,
    vehicleReportCount: 0,
    docStatsLoading: true,
    loading: true
  });

  const [coalStats, setCoalStats] = useState({
    soValid: 0,
    soExpired: 0,
    paValid: 0,
    paExpired: 0,
    seclQty: 0,
    seclBid: 0,
    distData: [],
    loading: true
  });

  const [transportStats, setTransportStats] = useState({
    totalTrips: 0,
    activeTrucks: 0,
    totalFreight: 0,
    totalAdvance: 0,
    totalBalance: 0,
    totalDiesel: 0,
    chartData: [],
    loading: true
  });

  const [rentMonth, setRentMonth] = useState(() => new Date().toLocaleString('default', { month: 'long' }));
  const [rentStats, setRentStats] = useState({
    total: 0,
    pending: 0,
    onTime: 0,
    done: 0,
    delay: 0,
    loading: true
  });

  // Live real-time Clock & Month Date state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        const [{ data: checklistRawData }, { data: delegationRawData }] = await Promise.all([
          supabase.from('checklist').select('status, submission_date, planned_date'),
          supabase.from('delegation').select('status, submission_date, planned_date')
        ]);
        
        const processTaskData = (tasks) => {
          let analyzed = 0;
          let done = 0;
          let dueToday = 0;
          let overdue = 0;
          
          const todayStr = new Date().toISOString().split('T')[0];
          
          (tasks || []).forEach(task => {
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
          
          return [
            { name: 'Analyzed', value: analyzed, fill: '#3b82f6' },
            { name: 'Done', value: done, fill: '#10b981' },
            { name: 'Due Today', value: dueToday, fill: '#f59e0b' },
            { name: 'Overdue', value: overdue, fill: '#ef4444' }
          ];
        };

        const checklistChart = processTaskData(checklistRawData);
        const delegationChart = processTaskData(delegationRawData);

        // 2. HR & Global Settings Stats
        const { data: usersData, error: usersError } = await supabase.from('users').select('*');
        if (usersError) console.error("Error fetching users:", usersError);
        const users = usersData || [];
        
        const totalEmployees = users.length;
        const activeEmployees = users.filter(user => String(user.status || user.Status || 'active').toLowerCase() === 'active').length;

        const today = new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentMonthYear = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
        const currentDayKey = `day_${today.getDate()}`;

        const [{ data: attendanceRows, error: attendanceError }, { data: leaveRows, error: leaveError }, { data: payrollRows, error: payrollError }] = await Promise.all([
          supabase.from('monthly_attendance').select(currentDayKey).eq('month_year', currentMonthYear),
          supabase.from('leave_requests').select('status'),
          supabase.from('processed_payroll').select('month_year, net')
        ]);

        if (attendanceError) console.error('Error fetching attendance summary:', attendanceError);
        if (leaveError) console.error('Error fetching leave summary:', leaveError);
        if (payrollError) console.error('Error fetching payroll summary:', payrollError);

        const attendancePresent = (attendanceRows || []).filter(row => ['P', 'HD'].includes(row[currentDayKey])).length;
        const attendanceExplicitAbsent = (attendanceRows || []).filter(row => row[currentDayKey] === 'A').length;
        // Total absent includes employees explicitly marked 'A', or if absent is not explicitly marked yet, other remaining active employees
        const attendanceAbsent = attendanceExplicitAbsent > 0 
          ? attendanceExplicitAbsent 
          : Math.max(totalEmployees - attendancePresent, 0);
        const attendanceOther = Math.max(totalEmployees - attendancePresent - attendanceAbsent, 0);
        const pendingLeaves = (leaveRows || []).filter(row => ['pending', 'requested'].includes(String(row.status || '').trim().toLowerCase())).length;
        const approvedLeaves = (leaveRows || []).filter(row => String(row.status || '').trim().toLowerCase() === 'approved').length;
        const processedPayroll = (payrollRows || []).filter(row => row.month_year).length;

        const hrMetrics = {
          employees: [
            { name: 'Active', value: activeEmployees },
            { name: 'Other', value: Math.max(totalEmployees - activeEmployees, 0) }
          ],
          attendance: [
            { name: 'Present', value: attendancePresent },
            { name: 'Absent', value: attendanceAbsent },
            { name: 'Other', value: attendanceOther }
          ],
          leaves: [
            { name: 'Pending', value: pendingLeaves },
            { name: 'Approved', value: approvedLeaves },
            { name: 'Other', value: Math.max((leaveRows || []).length - pendingLeaves - approvedLeaves, 0) }
          ],
          payroll: [
            { name: 'Processed', value: processedPayroll },
            { name: 'Remaining', value: Math.max(totalEmployees - processedPayroll, 0) }
          ]
        };

        const uniqueNames = new Set(users.map(u => u.user_name || u.username || u.name).filter(Boolean)).size;
        const uniqueRoles = new Set(users.map(u => u.Designation || u.designation || u.role).filter(Boolean)).size;
        const uniqueDepts = new Set(users.map(u => u.department || u.Department).filter(Boolean)).size;
        const activeStatusCount = users.filter(u => {
          const s = u.status || u.Status || '';
          return s.toLowerCase() === 'active';
        }).length;
        const departmentCounts = {};
        
        users.forEach(u => {
          const dept = u.department || 'Unassigned';
          departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        });
        
        const hrChart = Object.entries(departmentCounts).map(([name, value]) => ({
          name, value
        }));

        // 3. Petty Cash
        const { data: pcCredits } = await supabase.from('petty_cash_addcash_credits').select('amount');
        const { data: pcExpenses } = await supabase.from('petty_cash_expenses').select('amount').eq('status', 'APPROVED');
        const totalCredits = (pcCredits || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalExpenses = (pcExpenses || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        
        const pcChart = [
          { name: 'Financials', Credits: totalCredits, Expenses: totalExpenses }
        ];

        // 4. Help Slips
        const { data: slipsData } = await supabase.from('help_slips').select('*');
        const slips = slipsData || [];
        const resolvedSlips = slips.filter(s => s.admin_reply || s.adminReply).length;
        const pendingSlips = slips.length - resolvedSlips;

        const helpSlipChart = [
          { name: 'Resolved', value: resolvedSlips },
          { name: 'Pending', value: pendingSlips }
        ];

        // 5. Daily Scheduler
        let dailyTasks = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data: chunk, error } = await supabase.from('tasks').select('date, status').range(from, from + step - 1);
          if (error) {
            console.error("Error fetching daily tasks:", error);
            break;
          }
          if (chunk && chunk.length > 0) {
            dailyTasks = [...dailyTasks, ...chunk];
            if (chunk.length < step) {
              hasMore = false;
            } else {
              from += step;
            }
          } else {
            hasMore = false;
          }
        }
        
        let dailyTotalTasks = dailyTasks.length;
        let dailyCompletedTasks = 0;

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
          const statusLower = (t.status || "").toLowerCase();
          const isComp = statusLower === 'completed' || statusLower === 'done';
          if (isComp) {
            dailyCompletedTasks += 1;
          }

          if (t.date) {
            const d = new Date(t.date);
            if (!isNaN(d.getTime())) {
              const dayName = daysOfWeek[d.getDay()];
              dayWiseData[dayName].Scheduled += 1;
              if (isComp) {
                dayWiseData[dayName].Completed += 1;
              }
            }
          }
        });
        
        const dailySchedulerChart = Object.values(dayWiseData);
        const dailyCompletionRate = dailyTotalTasks > 0 ? Math.round((dailyCompletedTasks / dailyTotalTasks) * 100) : 0;
        const dailyTasksNotDone = dailyTotalTasks - dailyCompletedTasks;

        setStats(prev => ({
          ...prev,
          checklistData: checklistChart,
          delegationData: delegationChart,
          pettyCashData: pcChart,
          pettyCashTotalCredits: totalCredits,
          pettyCashTotalExpenses: totalExpenses,
          hrData: hrChart,
          hrTotalEmployees: totalEmployees,
          hrMetrics,
          helpSlipData: helpSlipChart,
          helpSlipTotal: slips.length,
          dailySchedulerData: dailySchedulerChart,
          dailyTotalTasks,
          dailyCompletionRate,
          dailyTasksNotDone,
          uniqueNames,
          uniqueRoles,
          uniqueDepts,
          activeStatusCount,
          loading: false
        }));
      } catch (error) {
        console.error("Error fetching master stats:", error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  // Fetch Rent Stats separately based on selected month
  useEffect(() => {
    const fetchRentStats = async () => {
      try {
        setRentStats(prev => ({ ...prev, loading: true }));
        
        const { data: rentMasterRecords } = await supabase.from('rent_master').select('id');
        const rentTotalTenant = rentMasterRecords ? rentMasterRecords.length : 0;
        
        const { data: monthlyTrackerData } = await supabase.from('rent_monthly_tracker').select('*').eq('month', rentMonth);
        
        let rPending = 0, rOnTime = 0, rDone = 0, rDelay = 0;
        
        const getRentStatus = (record) => {
          if (record.status === 'Done' || record.status === 'Received') {
            if (record.received_date && record.due_date_end && 
                record.received_date <= record.due_date_end) {
              return 'On Time';
            }
            return 'Received';
          }
          const today = new Date().toISOString().split('T')[0];
          if (record.due_date_end && today > record.due_date_end) return 'Delay';
          return 'Pending';
        };

        (monthlyTrackerData || []).forEach(r => {
          const s = getRentStatus(r);
          if (s === 'Pending') rPending++;
          else if (s === 'On Time') rOnTime++;
          else if (s === 'Received') rDone++;
          else if (s === 'Delay') rDelay++;
        });

        setRentStats({
          total: rentTotalTenant,
          pending: rPending + rDelay,
          onTime: rOnTime,
          done: rDone + rOnTime,
          delay: rDelay,
          loading: false
        });
      } catch (error) {
        console.error("Error fetching rent stats:", error);
        setRentStats(prev => ({ ...prev, loading: false }));
      }
    };
    
    fetchRentStats();
  }, [rentMonth]);

  // Fetch Document Module Stats Independently
  useEffect(() => {
    const fetchDocStats = async () => {
      try {
        setStats(prev => ({ ...prev, docStatsLoading: true }));
        const [docs, loans, subs, carDocs] = await Promise.all([
          fetchDocumentsFromGoogleSheets().catch(() => []),
          fetchLoansFromGoogleSheets().catch(() => []),
          syncSubscriptions().catch(() => []),
          fetchCarInsuranceFromGoogleSheets().catch(() => [])
        ]);
        
        let reminderCount = 0;
        let vehicleReportCount = 0;
        const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";
        
        if (GOOGLE_SCRIPT_URL) {
          try {
            const resRem = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=Reminder Calender&_t=${Date.now()}`);
            const jsonRem = await resRem.json();
            if (jsonRem.success && jsonRem.data) reminderCount = Math.max(0, jsonRem.data.length - 1);
          } catch (e) { console.error("Error fetching reminders", e); }
          
          try {
            const resVeh = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=VEHICLE&_t=${Date.now()}`);
            const jsonVeh = await resVeh.json();
            if (jsonVeh.success && jsonVeh.data) vehicleReportCount = Math.max(0, jsonVeh.data.length - 1);
          } catch (e) { console.error("Error fetching vehicle reports", e); }
        }
        
        const docTotal = docs.filter(doc => doc.sn && doc.sn.trim().length > 0).length;
        const subTotal = subs.filter(sub => sub.sn && sub.sn.trim().length > 0).length;
        
        setStats(prev => ({
          ...prev,
          docTotal,
          subTotal,
          loanTotal: loans.length,
          carTotal: carDocs.length,
          reminderCount,
          vehicleReportCount,
          docStatsLoading: false
        }));
      } catch (error) {
        console.error("Error fetching document stats:", error);
        setStats(prev => ({ ...prev, docStatsLoading: false }));
      }
    };
    fetchDocStats();
  }, []);

  // Fetch Coal System Stats
  useEffect(() => {
    const fetchCoalStats = async () => {
      try {
        setCoalStats(prev => ({ ...prev, loading: true }));
        const [
          { data: salesOrders },
          { data: paymentAdvices },
          { data: seclIntimations },
          { data: invoices }
        ] = await Promise.all([
          supabase.from('sales_orders').select('sales_order_valid_to'),
          supabase.from('secl_payment_advices').select('due_date'),
          supabase.from('secl_intimation_format_1').select('quantity_allotted, winning_bid_price_rs_mt'),
          supabase.from('invoices').select('id')
        ]);

        const safeArr = (arr) => Array.isArray(arr) ? arr : [];
        const so = safeArr(salesOrders);
        const pa = safeArr(paymentAdvices);
        const secl = safeArr(seclIntimations);
        const inv = safeArr(invoices);

        let soExpired = 0;
        let soValid = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        so.forEach(s => {
          if (!s.sales_order_valid_to || s.sales_order_valid_to === "-" || s.sales_order_valid_to === "Not Found") {
            soValid++;
          } else {
            const validTo = new Date(s.sales_order_valid_to);
            if (isNaN(validTo)) {
              soValid++;
            } else {
              validTo.setHours(0, 0, 0, 0);
              const diffTime = validTo - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 0) soExpired++;
              else soValid++;
            }
          }
        });

        let seclQty = 0;
        let seclBid = 0;
        secl.forEach(s => {
          seclQty += Number(s.quantity_allotted) || 0;
          seclBid += Number(s.winning_bid_price_rs_mt) || 0;
        });

        let paExpired = 0;
        let paValid = 0;
        pa.forEach(p => {
          if (!p.due_date || p.due_date === "-" || p.due_date === "Not Found") {
            paValid++;
          } else {
            const validTo = new Date(p.due_date);
            if (isNaN(validTo)) {
              paValid++;
            } else {
              validTo.setHours(0, 0, 0, 0);
              const diffTime = validTo - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 0) paExpired++;
              else paValid++;
            }
          }
        });

        let distData = [
          { name: "Valid Sales Orders", value: soValid },
          { name: "Expired Sales Orders", value: soExpired },
          { name: "Valid Payment Advices", value: paValid },
          { name: "Expired Payment Advices", value: paExpired },
          { name: "SECL Extractions", value: secl.length },
          { name: "Invoices", value: inv.length }
        ].filter(d => d.value > 0);

        if (distData.length === 0) {
          distData = [{ name: "No Data", value: 1 }];
        }

        setCoalStats({
          soValid,
          soExpired,
          paValid,
          paExpired,
          seclQty,
          seclBid,
          distData,
          loading: false
        });
      } catch (error) {
        console.error("Error fetching coal stats:", error);
        setCoalStats(prev => ({ ...prev, loading: false }));
      }
    };
    fetchCoalStats();
  }, []);

  // Fetch Transport System Stats (NEW MODULE)
  useEffect(() => {
    const fetchTransportStats = async () => {
      try {
        setTransportStats(prev => ({ ...prev, loading: true }));
        const { data: trucks, error } = await supabase
          .from('truck_reports')
          .select('vehicle_no, total_freight, advance, vehicle_balance, diesel');
        
        if (error) throw error;
        const list = trucks || [];
        const totalTrips = list.length;
        const uniqueTrucks = new Set(list.map(t => t.vehicle_no).filter(Boolean));
        const activeTrucks = uniqueTrucks.size;
        const totalFreight = list.reduce((s, t) => s + (Number(t.total_freight) || 0), 0);
        const totalAdvance = list.reduce((s, t) => s + (Number(t.advance) || 0), 0);
        const totalBalance = list.reduce((s, t) => s + (Number(t.vehicle_balance) || 0), 0);
        const totalDiesel = list.reduce((s, t) => s + (Number(t.diesel) || parseFloat(String(t.diesel || '').replace(/[^0-9.]/g, '')) || 0), 0);

        const chartData = [
          { name: 'Advance', value: totalAdvance, fill: '#f59e0b' },
          { name: 'Balance', value: totalBalance, fill: '#10b981' }
        ];

        setTransportStats({
          totalTrips,
          activeTrucks,
          totalFreight,
          totalAdvance,
          totalBalance,
          totalDiesel,
          chartData,
          loading: false
        });
      } catch (err) {
        console.error("Error fetching transport stats:", err);
        setTransportStats(prev => ({ ...prev, loading: false }));
      }
    };
    fetchTransportStats();
  }, []);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur border border-slate-200 p-2.5 rounded-xl shadow-xl text-xs font-semibold">
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.fill }} className="font-bold">
              {entry.name}: {entry.value?.toLocaleString('en-IN')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AdminLayout noPadding={true}>
      <div className="w-full px-2.5 sm:px-4 lg:px-6 py-2.5 sm:py-3.5 space-y-3.5 sm:space-y-5 lg:space-y-6 animate-in fade-in duration-300">
        
        {/* ═══════════════════════════════════════════════════════════
            ENTERPRISE BRAND HERO BANNER - RED THEME
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-red-600 via-rose-700 to-red-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 border border-red-500/30">
          {/* Subtle Ambient Backdrops */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/15 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-wider sm:tracking-widest text-red-100 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>Jay Bhole Master Intelligence Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              Welcome, <span className="text-white drop-shadow-xs">{username}</span>!
            </h1>
            <p className="text-red-100/90 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
              Unified command center & real-time monitoring across all 12 operational enterprise modules.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {/* Live Clock & Month / Date Widget */}
            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-2.5 text-center shadow-lg min-w-[200px] sm:min-w-[230px] flex flex-col justify-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-100 uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                <span className="whitespace-nowrap">
                  {currentTime.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 my-0.5">
                <Clock className="h-4 w-4 text-emerald-300 animate-pulse shrink-0" />
                <span className="text-lg sm:text-xl font-black text-white tracking-wider tabular-nums whitespace-nowrap">
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
              <div className="text-[10.5px] font-semibold text-red-100/80 leading-none">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 text-center shadow-lg">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-100 uppercase tracking-wider mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Company Status
              </div>
              <div className="text-base sm:text-lg md:text-xl font-black text-white truncate">All Systems Go</div>
            </div>

            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 text-center shadow-lg">
              <div className="text-xs font-bold text-red-100 uppercase tracking-wider mb-0.5">
                Active Modules
              </div>
              <div className="text-base sm:text-lg md:text-xl font-black text-white truncate">12 Integrated</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            EXECUTIVE QUICK KPI BAR - RESPONSIVE GRID
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          
          {/* 1. HR Active Employees */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 truncate" title="HR Workforce">
                Workforce
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-orange-50 text-orange-600">
                <UserRound className="h-4 w-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {stats.hrTotalEmployees || 0}
            </div>
            <div className="text-xs text-emerald-600 mt-0.5 font-bold truncate">
              {stats.activeStatusCount || 0} Active Staff
            </div>
          </div>

          {/* 2. Active Fleet Trucks */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 truncate" title="Active Trucks">
                Active Trucks
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-blue-50 text-blue-600">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-blue-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {transportStats.activeTrucks || 0}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-semibold truncate">
              {transportStats.totalTrips || 0} Total Trips
            </div>
          </div>

          {/* 3. Coal Orders Valid */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 truncate" title="Coal Orders">
                Active Coal DO
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-red-50 text-red-600">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-red-600 tracking-tight leading-tight group-hover:text-red-700 transition-colors truncate">
              {coalStats.soValid || 0}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-semibold truncate">
              {coalStats.seclQty ? `${coalStats.seclQty.toLocaleString('en-IN')} MT` : 'SECL Extracted'}
            </div>
          </div>

          {/* 4. Rent Collection */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 truncate" title="Rent Status">
                Rent Collected
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-emerald-50 text-emerald-600">
                <Banknote className="h-4 w-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {rentStats.done || 0} / {rentStats.total || 0}
            </div>
            <div className="text-xs text-amber-600 mt-0.5 font-bold truncate">
              {rentStats.pending || 0} Pending
            </div>
          </div>

          {/* 5. Tasks Completed */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 truncate" title="Scheduler Rate">
                Scheduler Rate
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-violet-50 text-violet-600">
                <CalendarCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-violet-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {stats.dailyCompletionRate || 0}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-semibold truncate">
              {stats.dailyTotalTasks || 0} Total Tasks
            </div>
          </div>

          {/* 6. Petty Cash Credits */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 truncate" title="Petty Cash Balance">
                Petty Cash
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-teal-50 text-teal-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-teal-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              ₹ {((stats.pettyCashTotalCredits || 0) - (stats.pettyCashTotalExpenses || 0)).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-semibold truncate">
              Net Available
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            DYNAMIC ALL 12 MODULES GRID - FULL WIDTH BALANCED
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4.5 lg:gap-5 w-full">
          
          {/* ═════ 1. TRANSPORT SYSTEM (NEW) ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-blue-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Truck size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Transport System</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Fleet & Logistics Analytics</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 shrink-0">
                  {transportStats.activeTrucks} Trucks
                </span>
              </div>

              {/* Transport Metrics Strip */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Trips</span>
                  <div className="text-base font-black text-slate-800 mt-0.5">{transportStats.totalTrips}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Diesel (L)</span>
                  <div className="text-base font-black text-purple-700 mt-0.5">{transportStats.totalDiesel.toLocaleString()} L</div>
                </div>
                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-center col-span-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Total Freight</span>
                  <div className="text-base font-black text-emerald-700 mt-0.5">₹ {transportStats.totalFreight.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Transport Mini Donut */}
              <div className="h-28 w-full mb-3 flex items-center justify-center">
                {transportStats.loading ? (
                  <Loader2 className="animate-spin text-blue-300 h-6 w-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={transportStats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {transportStats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <Link 
              to="/transport-system/dashboard" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-blue-50 text-blue-700 font-black text-xs sm:text-sm rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Transport Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 2. COAL SYSTEM ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-red-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Flame size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Coal System</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Auction, DO & Extracted Coal</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 shrink-0">
                  {coalStats.soValid} Active DO
                </span>
              </div>

              {/* Coal Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Valid Advices</span>
                  <div className="text-base font-black text-emerald-600 mt-0.5">{coalStats.paValid}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Expired DO</span>
                  <div className="text-base font-black text-rose-600 mt-0.5">{coalStats.soExpired}</div>
                </div>
                <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 text-center col-span-2">
                  <span className="text-xs font-bold text-amber-700 uppercase">SECL Allotted Qty</span>
                  <div className="text-base font-black text-amber-800 mt-0.5">{coalStats.seclQty.toLocaleString('en-IN')} MT</div>
                </div>
              </div>

              {/* Coal Mini Pie */}
              <div className="h-28 w-full mb-3 flex items-center justify-center">
                {coalStats.loading ? (
                  <Loader2 className="animate-spin text-red-300 h-6 w-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={coalStats.distData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={45}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {coalStats.distData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <Link 
              to="/coal-system/dashboard" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-red-50 text-red-700 font-black text-xs sm:text-sm rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Coal Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 3. CHECKLIST TASKS ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-blue-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <CheckSquare size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Checklist Tasks</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Daily Operational Checklist</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 shrink-0">
                  Checklist
                </span>
              </div>
              
              <div className="h-44 w-full mb-3">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-300 h-6 w-6" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.checklistData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {stats.checklistData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <Link 
              to="/dashboard/admin" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-blue-50 text-blue-700 font-black text-xs sm:text-sm rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 4. DELEGATION TASKS ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-indigo-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Briefcase size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Delegation Tasks</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Delegated Work Orders</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 shrink-0">
                  Delegation
                </span>
              </div>
              
              <div className="h-44 w-full mb-3">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-300 h-6 w-6" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.delegationData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {stats.delegationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <Link 
              to="/dashboard/admin" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-indigo-50 text-indigo-700 font-black text-xs sm:text-sm rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 5. RENT MANAGEMENT TRACKER ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-emerald-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Banknote size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Rent Management</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Tenants & Monthly Rent</p>
                  </div>
                </div>
                <select
                  value={rentMonth}
                  onChange={(e) => setRentMonth(e.target.value)}
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer shrink-0"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-center col-span-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tenants</span>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{rentStats.total || 0}</div>
                </div>
                <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-100 text-center">
                  <span className="text-xs font-bold text-orange-600">Pending</span>
                  <div className="text-base font-black text-orange-700 mt-0.5">{rentStats.pending || 0}</div>
                </div>
                <div className="bg-green-50 p-2.5 rounded-xl border border-green-100 text-center">
                  <span className="text-xs font-bold text-green-600">On Time</span>
                  <div className="text-base font-black text-green-700 mt-0.5">{rentStats.onTime || 0}</div>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 text-center">
                  <span className="text-xs font-bold text-blue-600">Received</span>
                  <div className="text-base font-black text-blue-700 mt-0.5">{rentStats.done || 0}</div>
                </div>
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 text-center">
                  <span className="text-xs font-bold text-red-600">Delay</span>
                  <div className="text-base font-black text-red-700 mt-0.5">{rentStats.delay || 0}</div>
                </div>
              </div>
            </div>

            <Link 
              to="/dashboard/rent-tracker/dashboard" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-emerald-50 text-emerald-700 font-black text-xs sm:text-sm rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Rent Dashboard <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 6. HR SYSTEM ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-orange-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <UserRound size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">HR System</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Staff, Attendance & Payroll</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 shrink-0">
                  {stats.hrTotalEmployees} Staff
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block truncate">Today Present</span>
                  <div className="text-base font-black text-emerald-600 mt-0.5">
                    {(stats.hrMetrics.attendance || []).find(i => i.name === 'Present')?.value || 0}
                  </div>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-2.5 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block truncate">Total Absent</span>
                  <div className="text-base font-black text-rose-600 mt-0.5">
                    {(stats.hrMetrics.attendance || []).find(i => i.name === 'Absent')?.value || 0}
                  </div>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-2.5 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block truncate">Pending Leaves</span>
                  <div className="text-base font-black text-orange-600 mt-0.5">
                    {(stats.hrMetrics.leaves || []).find(i => i.name === 'Pending')?.value || 0}
                  </div>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-2.5 col-span-3">
                  <span className="text-xs font-bold text-slate-600 block">Payroll Status</span>
                  <div className="text-sm font-black text-purple-700 mt-0.5">
                    {(stats.hrMetrics.payroll || []).find(i => i.name === 'Processed')?.value > 0 ? 'Processing Active' : 'Monthly Ready'}
                  </div>
                </div>
              </div>
            </div>

            <Link 
              to="/hr/dashboard" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-orange-50 text-orange-700 font-black text-xs sm:text-sm rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 7. PETTY CASH ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-teal-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <Wallet size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Petty Cash</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Credits vs Expenses</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 shrink-0">
                  Finance
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Credits</span>
                  <div className="text-base font-black text-emerald-600 mt-0.5">₹{Math.round(stats.pettyCashTotalCredits / 1000)}k</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Expenses</span>
                  <div className="text-base font-black text-rose-600 mt-0.5">₹{Math.round(stats.pettyCashTotalExpenses / 1000)}k</div>
                </div>
              </div>

              <div className="h-32 w-full mb-3">
                {stats.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-teal-300 h-6 w-6" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.pettyCashData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" hide />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Credits" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <Link 
              to="/petty-cash/dashboard" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-teal-50 text-teal-700 font-black text-xs sm:text-sm rounded-xl hover:bg-teal-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 8. DAILY SCHEDULER ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-violet-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <CalendarCheck size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Daily Scheduler</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Time & Task Management</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 shrink-0">
                  {stats.dailyCompletionRate}% Done
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center bg-violet-50/50 p-2.5 rounded-xl border border-violet-100/50">
                  <span className="text-xs font-bold text-slate-600">Total Tasks</span>
                  <span className="text-sm font-black text-violet-700">{stats.dailyTotalTasks || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                  <span className="text-xs font-bold text-slate-600">Completion Rate</span>
                  <span className="text-sm font-black text-emerald-700">{stats.dailyCompletionRate || 0}%</span>
                </div>
                <div className="flex justify-between items-center bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50">
                  <span className="text-xs font-bold text-slate-600">Pending Tasks</span>
                  <span className="text-sm font-black text-rose-700">{stats.dailyTasksNotDone || 0}</span>
                </div>
              </div>
            </div>

            <Link 
              to="/daily-scheduler/dashboard" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-violet-50 text-violet-700 font-black text-xs sm:text-sm rounded-xl hover:bg-violet-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 9. DOCUMENT & SUBSTRUCTIONS ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-cyan-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Document & Substruction</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Legal, Insurance & Loans</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 shrink-0">
                  Docs Hub
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100/50 text-center">
                  <span className="text-xs font-bold text-slate-500 block">Total Insurance</span>
                  <span className="text-sm font-black text-cyan-700 mt-0.5">{stats.docStatsLoading ? "..." : stats.docTotal || 0}</span>
                </div>
                <div className="bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100/50 text-center">
                  <span className="text-xs font-bold text-slate-500 block">Reminders</span>
                  <span className="text-sm font-black text-cyan-700 mt-0.5">{stats.docStatsLoading ? "..." : stats.reminderCount || 0}</span>
                </div>
                <div className="bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100/50 text-center">
                  <span className="text-xs font-bold text-slate-500 block">Car Insurance</span>
                  <span className="text-sm font-black text-cyan-700 mt-0.5">{stats.docStatsLoading ? "..." : stats.carTotal || 0}</span>
                </div>
                <div className="bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100/50 text-center">
                  <span className="text-xs font-bold text-slate-500 block">Total Loans</span>
                  <span className="text-sm font-black text-cyan-700 mt-0.5">{stats.docStatsLoading ? "..." : stats.loanTotal || 0}</span>
                </div>
              </div>
            </div>

            <Link 
              to="/doc-dashboard" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-cyan-50 text-cyan-700 font-black text-xs sm:text-sm rounded-xl hover:bg-cyan-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 10. HELP SLIP & SUPPORT ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-rose-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <HelpCircle size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Help Slip</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Internal Support Desk</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 shrink-0">
                  {stats.helpSlipTotal} Requests
                </span>
              </div>
              
              <div className="h-36 w-full mb-3 flex items-center justify-center">
                {stats.loading ? (
                  <Loader2 className="animate-spin text-rose-300 h-6 w-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.helpSlipData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={4} dataKey="value">
                        {stats.helpSlipData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Resolved' ? '#10b981' : '#f43f5e'} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <Link 
              to="/dashboard/help-slip" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-rose-50 text-rose-700 font-black text-xs sm:text-sm rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 11. LETTERS & WORK ORDERS (NEW) ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <FileCheck size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Letter System</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">Offer Letters & Work Orders</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 shrink-0">
                  Letters
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Issuing Firms</span>
                  <div className="text-base font-black text-slate-800 mt-0.5">4 Entities</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">PDF Engine</span>
                  <div className="text-base font-black text-emerald-600 mt-0.5">Instant A4</div>
                </div>
              </div>

              <div className="space-y-1.5 mb-3 text-xs sm:text-sm">
                <Link 
                  to="/letter/offer-letter"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-700 text-slate-700 font-semibold transition-colors border border-slate-100"
                >
                  <span>Coal Offer Letter</span>
                  <ChevronRight size={15} className="text-slate-400" />
                </Link>
                <Link 
                  to="/letter/work-order"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-700 text-slate-700 font-semibold transition-colors border border-slate-100"
                >
                  <span>Work Order Form</span>
                  <ChevronRight size={15} className="text-slate-400" />
                </Link>
              </div>
            </div>

            <Link 
              to="/letter/offer-letter" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-slate-100 text-slate-700 font-black text-xs sm:text-sm rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Letter Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

          {/* ═════ 12. GLOBAL SETTINGS ═════ */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-slate-700 group-hover:text-white transition-colors">
                    <Settings2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Global Settings</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">System Configuration</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 shrink-0">
                  Admin
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 block">Total Users</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5">{stats.loading ? "..." : stats.uniqueNames || 0}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 block">Total Roles</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5">{stats.loading ? "..." : stats.uniqueRoles || 0}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 block">Departments</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5">{stats.loading ? "..." : stats.uniqueDepts || 0}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-500 block">Active Status</span>
                  <span className="text-sm font-black text-emerald-600 mt-0.5">{stats.loading ? "..." : stats.activeStatusCount || 0}</span>
                </div>
              </div>
            </div>

            <Link 
              to="/dashboard/global-settings" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-slate-100 text-slate-700 font-black text-xs sm:text-sm rounded-xl hover:bg-slate-700 hover:text-white transition-all shadow-2xs mt-auto group-hover:shadow-md"
            >
              Open Module <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
