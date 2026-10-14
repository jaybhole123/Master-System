import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import TaskManagementTabs from "../../components/TaskManagementTabs";
import supabase from "../../SupabaseClient";
import {
  GitFork,
  CheckSquare,
  ClipboardList,
  CalendarCheck,
  Calendar,
  BookmarkCheck,
  Settings,
  Bell,
  Zap,
  Video,
  ArrowRight,
  RefreshCw,
  Eye,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck,
  Send,
  HelpCircle,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  Sliders,
  Filter,
  BarChart3
} from "lucide-react";

export default function ChecklistSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  // Live Counts State
  const [counts, setCounts] = useState({
    checklistPending: 0,
    checklistTotal: 0,
    delegationPending: 0,
    delegationTotal: 0,
    pendingApprovals: 0,
    calendarEvents: 0,
    holidays: 0,
    unreadNotifications: 0,
    totalUsers: 0,
    totalDepartments: 0,
    quickTasks: 0,
  });

  const username = localStorage.getItem("user-name") || "";
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin" || username.toLowerCase() === "admin";

  // Fetch live stats from Supabase
  const fetchCounts = async () => {
    try {
      setLoading(true);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const endOfTodayISO = endOfToday.toISOString();

      const [
        chkPendingRes,
        chkTotalRes,
        delPendingRes,
        delTotalRes,
        chkApprRes,
        delApprRes,
        holidaysRes,
        notifRes,
        usersRes,
        deptRes
      ] = await Promise.all([
        supabase.from("checklist").select("*", { count: "exact", head: true })
          .is("submission_date", null)
          .is("status", null)
          .lte("task_start_date", endOfTodayISO),
        supabase.from("checklist").select("*", { count: "exact", head: true }),
        supabase.from("delegation").select("*", { count: "exact", head: true })
          .or("submission_date.is.null,status.neq.done")
          .lte("task_start_date", endOfTodayISO),
        supabase.from("delegation").select("*", { count: "exact", head: true }),
        supabase.from("checklist").select("*", { count: "exact", head: true })
          .not("submission_date", "is", null)
          .or("admin_done.is.null,admin_done.eq.Pending"),
        supabase.from("delegation").select("*", { count: "exact", head: true })
          .eq("status", "done")
          .or("admin_done.is.null,admin_done.eq.Pending"),
        supabase.from("holidays").select("*", { count: "exact", head: true }),
        supabase.from("notifications").select("*", { count: "exact", head: true })
          .eq("isRead", false),
        supabase.from("users").select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("departments").select("*", { count: "exact", head: true })
      ]);

      const totalApprovals = (chkApprRes.count || 0) + (delApprRes.count || 0);

      setCounts({
        checklistPending: chkPendingRes.count || 0,
        checklistTotal: chkTotalRes.count || 0,
        delegationPending: delPendingRes.count || 0,
        delegationTotal: delTotalRes.count || 0,
        pendingApprovals: totalApprovals,
        calendarEvents: (chkPendingRes.count || 0) + (delPendingRes.count || 0),
        holidays: holidaysRes.count || 0,
        unreadNotifications: notifRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalDepartments: deptRes.count || 0,
        quickTasks: (chkTotalRes.count || 0) + (delTotalRes.count || 0)
      });
    } catch (err) {
      console.error("Error fetching system flow counts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  // System Flow Nodes Configuration in System Red & Accent Colors
  const flowNodes = [
    {
      id: "assign-task",
      title: "Task Assignment Engine",
      subtitle: "Single or recurring work initiation point",
      category: "core",
      badge: "Origin",
      color: "red",
      icon: CheckSquare,
      path: "/dashboard/assign-task",
      stats: [
        { label: "Active Assignees", value: counts.totalUsers },
        { label: "Departments", value: counts.totalDepartments }
      ],
      description: "Admin or HOD defines responsibility, target doer, department, schedule frequency, and attachments.",
      outputs: ["checklist", "delegation"]
    },
    {
      id: "checklist",
      title: "Checklist Operations",
      subtitle: "Recurring operational duties (Daily, Weekly, Monthly)",
      category: "execution",
      badge: "Routine SOP",
      color: "red",
      icon: CalendarCheck,
      path: "/dashboard/task",
      stats: [
        { label: "Pending Today", value: counts.checklistPending },
        { label: "Total SOPs", value: counts.checklistTotal }
      ],
      description: "Auto-recurs based on set frequency. Staff mark done with remarks, photo evidence & audio notes.",
      outputs: ["approval", "calendar", "notifications"]
    },
    {
      id: "delegation",
      title: "Delegation Tasks",
      subtitle: "One-time, urgent or priority delegated assignments",
      category: "execution",
      badge: "Direct Delegation",
      color: "blue",
      icon: Send,
      path: "/dashboard/delegation",
      stats: [
        { label: "Pending Today", value: counts.delegationPending },
        { label: "Total Delegated", value: counts.delegationTotal }
      ],
      description: "Direct person-to-person assignment with custom due dates, status updates, and WhatsApp dispatch.",
      outputs: ["approval", "calendar", "notifications"]
    },
    {
      id: "calendar",
      title: "Calendar & Schedule",
      subtitle: "360° timeline & holiday-aware scheduling",
      category: "execution",
      badge: "Schedule View",
      color: "violet",
      icon: Calendar,
      path: "/dashboard/calendar",
      stats: [
        { label: "Scheduled", value: counts.calendarEvents },
        { label: "Holidays", value: counts.holidays }
      ],
      description: "Visual date grid showing daily workload, scheduled deadlines, working day exclusions & holiday shifts.",
      outputs: ["dashboard"]
    },
    {
      id: "approval",
      title: "Admin Approval Queue",
      subtitle: "Supervisory verification & quality control gate",
      category: "approval",
      badge: "Audit & Signoff",
      color: "amber",
      icon: BookmarkCheck,
      path: "/dashboard/admin-approval",
      stats: [
        { label: "Pending Review", value: counts.pendingApprovals, alert: counts.pendingApprovals > 0 },
        { label: "Review Status", value: counts.pendingApprovals === 0 ? "Clear" : "Action Needed" }
      ],
      description: "Admin/HOD inspects proof photo, audio recording & remarks before granting closure or rejecting with remarks.",
      outputs: ["dashboard", "notifications"]
    },
    {
      id: "dashboard",
      title: "Intelligence & MIS Dashboard",
      subtitle: "Live completion KPIs, rates & performance analytics",
      category: "approval",
      badge: "Central Intelligence",
      color: "rose",
      icon: BarChart3,
      path: "/dashboard/admin",
      stats: [
        { label: "Overall Tracked", value: counts.checklistTotal + counts.delegationTotal },
        { label: "Active Doers", value: counts.totalUsers }
      ],
      description: "Aggregates overall completion rates, staff performance tables, overdue alerts, and department metrics.",
      outputs: []
    },
    {
      id: "quick-task",
      title: "Task Manager & Reassign",
      subtitle: "Bulk task editing, shift reassignments & master records",
      category: "config",
      badge: "Admin Utility",
      color: "indigo",
      icon: Zap,
      path: "/dashboard/quick-task",
      stats: [
        { label: "Total Tasks", value: counts.quickTasks },
        { label: "Mode", value: "Bulk CRUD" }
      ],
      description: "Super Admin hub to batch update planned dates, reassign tasks between staff upon leaves, or delete records.",
      outputs: ["checklist", "delegation"]
    },
    {
      id: "notifications",
      title: "Alerts & WhatsApp Gateway",
      subtitle: "Instant reminders, closure links & ping alerts",
      category: "config",
      badge: "Automations",
      color: "teal",
      icon: Bell,
      path: "/dashboard/notifications",
      stats: [
        { label: "Unread Alerts", value: counts.unreadNotifications, alert: counts.unreadNotifications > 0 },
        { label: "WhatsApp Bot", value: "Active" }
      ],
      description: "Dispatches automated WhatsApp alerts on task creation, overdue reminders, and approval / rejection pings.",
      outputs: []
    },
    {
      id: "training",
      title: "Training & SOP Videos",
      subtitle: "Standard operating procedures & video guides",
      category: "config",
      badge: "Knowledge Base",
      color: "purple",
      icon: Video,
      path: "/dashboard/training-video",
      stats: [
        { label: "Tutorials", value: "Admin & User" },
        { label: "Role Guides", value: "Active" }
      ],
      description: "Interactive video guides for users on submitting tasks and administrators on approvals & task creation.",
      outputs: []
    }
  ];

  const filteredNodes = useMemo(() => {
    if (activeFilter === "all") return flowNodes;
    return flowNodes.filter(n => n.category === activeFilter);
  }, [activeFilter, flowNodes]);

  const getColorClasses = (color) => {
    switch (color) {
      case "red":
        return {
          border: "border-red-200 hover:border-red-400",
          bg: "bg-red-500/10",
          cardBg: "from-red-500/5 via-white to-white",
          text: "text-red-700",
          badge: "bg-red-50 text-red-700 border-red-200",
          ring: "focus:ring-red-400",
          iconBg: "bg-red-600 text-white shadow-red-200"
        };
      case "rose":
        return {
          border: "border-red-200 hover:border-red-400",
          bg: "bg-red-500/10",
          cardBg: "from-red-50/60 via-white to-white",
          text: "text-red-700",
          badge: "bg-red-50 text-red-700 border-red-200",
          ring: "focus:ring-red-400",
          iconBg: "bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-200"
        };
      case "blue":
        return {
          border: "border-blue-200 hover:border-blue-400",
          bg: "bg-blue-500/10",
          cardBg: "from-blue-500/5 via-white to-white",
          text: "text-blue-700",
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          ring: "focus:ring-blue-400",
          iconBg: "bg-blue-600 text-white shadow-blue-200"
        };
      case "amber":
        return {
          border: "border-amber-200 hover:border-amber-400",
          bg: "bg-amber-500/10",
          cardBg: "from-amber-500/5 via-white to-white",
          text: "text-amber-700",
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          ring: "focus:ring-amber-400",
          iconBg: "bg-amber-600 text-white shadow-amber-200"
        };
      case "violet":
        return {
          border: "border-violet-200 hover:border-violet-400",
          bg: "bg-violet-500/10",
          cardBg: "from-violet-500/5 via-white to-white",
          text: "text-violet-700",
          badge: "bg-violet-50 text-violet-700 border-violet-200",
          ring: "focus:ring-violet-400",
          iconBg: "bg-violet-600 text-white shadow-violet-200"
        };
      case "indigo":
        return {
          border: "border-indigo-200 hover:border-indigo-400",
          bg: "bg-indigo-500/10",
          cardBg: "from-indigo-500/5 via-white to-white",
          text: "text-indigo-700",
          badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
          ring: "focus:ring-indigo-400",
          iconBg: "bg-indigo-600 text-white shadow-indigo-200"
        };
      case "teal":
        return {
          border: "border-teal-200 hover:border-teal-400",
          bg: "bg-teal-500/10",
          cardBg: "from-teal-500/5 via-white to-white",
          text: "text-teal-700",
          badge: "bg-teal-50 text-teal-700 border-teal-200",
          ring: "focus:ring-teal-400",
          iconBg: "bg-teal-600 text-white shadow-teal-200"
        };
      default:
        return {
          border: "border-gray-200 hover:border-red-400",
          bg: "bg-red-500/10",
          cardBg: "from-gray-50 via-white to-white",
          text: "text-gray-800",
          badge: "bg-gray-100 text-gray-700 border-gray-200",
          ring: "focus:ring-red-400",
          iconBg: "bg-red-600 text-white shadow-red-200"
        };
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header Section — System Red Theme */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
              <GitFork className="w-6 h-6 transform rotate-90" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  System <span className="text-red-600">Flow</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                  Live Counts
                </span>
              </div>
              <p className="text-sm font-medium text-gray-500 mt-0.5">
                How every checklist & delegation module is linked and how each process moves — counts are live, click any box to open that page
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={fetchCounts}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-red-600" : "text-gray-500"}`} />
              <span>Refresh Stats</span>
            </button>
            <button
              onClick={() => navigate("/dashboard/task")}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md shadow-red-600/25 active:scale-95"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Checklist View</span>
            </button>
          </div>
        </div>

        {/* Global Task Management Navigation Tabs */}
        <TaskManagementTabs activeTab="system-flow" />

        {/* System Architecture Flow Diagram (Banner Map) — Red Themed */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-sm overflow-hidden relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Interactive Module Map</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Visual representation of data progression from creation to approval & reporting</p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Initiation Point
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> SOP Execution
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Admin Approval
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-700"></span> Analytics & Reports
              </span>
            </div>
          </div>

          {/* Graphical Flow Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Step 1: Initiation Engine */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <div
                onClick={() => navigate("/dashboard/assign-task")}
                className="group cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-600/25 border border-red-500 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md tracking-wider uppercase">
                    Step 1: Create
                  </span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">Assign Task</h3>
                <p className="text-xs text-red-100 mt-1 leading-relaxed">
                  Origin of all tasks. Admin or HOD creates recurring checklists or one-time delegations.
                </p>
                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                  <span>{counts.totalUsers} Active Staff</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow Connector 1 */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-gray-300">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dispatches</span>
                <ArrowRight className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
            </div>

            {/* Step 2: Parallel Work Execution Channels */}
            <div className="lg:col-span-4 space-y-3.5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center lg:text-left">
                Step 2: Execution Channels (Doer App)
              </div>

              {/* Checklist Box */}
              <div
                onClick={() => navigate("/dashboard/task")}
                className="group cursor-pointer p-4 rounded-2xl bg-white border border-red-200 hover:border-red-400 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                        Checklist Tasks
                      </h4>
                      <p className="text-[11px] text-gray-500">Daily / Routine SOP recurring tasks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-red-600">{counts.checklistPending}</span>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Pending Today</span>
                  </div>
                </div>
              </div>

              {/* Delegation Box */}
              <div
                onClick={() => navigate("/dashboard/delegation")}
                className="group cursor-pointer p-4 rounded-2xl bg-white border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        Delegation Tasks
                      </h4>
                      <p className="text-[11px] text-gray-500">One-time delegated work with specific due dates</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-blue-600">{counts.delegationPending}</span>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Pending Today</span>
                  </div>
                </div>
              </div>

              {/* Calendar & Scheduling */}
              <div
                onClick={() => navigate("/dashboard/calendar")}
                className="group cursor-pointer p-4 rounded-2xl bg-white border border-violet-200 hover:border-violet-400 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-violet-600 transition-colors">
                        Calendar Schedule
                      </h4>
                      <p className="text-[11px] text-gray-500">Timeline view taking holidays into account</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-violet-600">{counts.holidays}</span>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Holidays Listed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow Connector 2 */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-gray-300">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submits</span>
                <ArrowRight className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
            </div>

            {/* Step 3: Verification & Analytics Output */}
            <div className="lg:col-span-3 space-y-3.5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center lg:text-left">
                Step 3: Verification & Insights
              </div>

              {/* Admin Approval Queue */}
              <div
                onClick={() => navigate("/dashboard/admin-approval")}
                className="group cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-white border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                    <BookmarkCheck className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${counts.pendingApprovals > 0 ? "bg-amber-100 text-amber-800 animate-bounce" : "bg-emerald-100 text-emerald-800"}`}>
                    {counts.pendingApprovals > 0 ? `${counts.pendingApprovals} Pending` : "Queue Clear"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
                  Admin Approval Gate
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Inspect doer photo evidence, voice recording, approve completion or reject with remarks.
                </p>
              </div>

              {/* Master Dashboard / Reports */}
              <div
                onClick={() => navigate("/dashboard/admin")}
                className="group cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-red-50/60 to-white border border-red-200 hover:border-red-400 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm shadow-red-200">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                    Live Analytics
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors">
                  Checklist Dashboard
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Consolidated KPIs, completion graphs, overdue stats, staff breakdown & scorecards.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Module Directory & Architecture Details */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Module Deep-Dive & Flow Cards</h2>
              <p className="text-xs text-gray-500">Detailed overview of each module with real-time counters and actions</p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "All Modules" },
                { id: "core", label: "Core" },
                { id: "execution", label: "Execution" },
                { id: "approval", label: "Review & MIS" },
                { id: "config", label: "Utilities" }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeFilter === f.id
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Interactive Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredNodes.map((node) => {
              const styles = getColorClasses(node.color);
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  onClick={() => navigate(node.path)}
                  className={`
                    group relative flex flex-col p-5 bg-gradient-to-b ${styles.cardBg}
                    border ${styles.border} rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5
                    transition-all duration-300 cursor-pointer text-left
                  `}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                          {node.title}
                        </h3>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles.badge}`}>
                          {node.badge}
                        </span>
                      </div>
                    </div>
                    <div className="p-1 rounded-lg text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Subtitle / Description */}
                  <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                    {node.description}
                  </p>

                  {/* Live Stats Pills */}
                  <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-gray-100">
                    {node.stats.map((st, idx) => (
                      <div key={idx} className="bg-white/90 border border-gray-100 rounded-xl p-2.5 shadow-2xs">
                        <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          {st.label}
                        </span>
                        <span className={`text-sm font-extrabold ${st.alert ? "text-amber-600" : "text-gray-900"}`}>
                          {loading ? "..." : st.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Action Footer */}
                  <div className="mt-3 pt-2 flex items-center justify-between text-xs font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">
                    <span className="text-[11px] font-medium text-gray-400">Click to navigate</span>
                    <span className="flex items-center gap-1 font-bold text-red-600 group-hover:translate-x-1 transition-transform">
                      Go to page <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Process Lifecycle Blueprint Explanation */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <Sparkles className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Checklist & Delegation Lifecycle Workflow</h2>
              <p className="text-xs text-gray-500">Step-by-step standard operational procedure (SOP) cycle</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-red-50/40 border border-red-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  1
                </span>
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Assign</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Create & Schedule</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Task created with target doer, department, frequency (Daily/Weekly/Monthly), attachments, and voice instructions.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  2
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Notify</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">WhatsApp & Reminders</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Doer receives WhatsApp notification with a direct closure link. Daily scheduled cron sends morning pending alerts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  3
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Execute</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Submit Work Proof</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Doer opens Checklist/Delegation screen, completes work, uploads camera photo proof, records remarks or audio, and submits.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  4
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Approval</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Review & Recur</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Admin inspects submission in Admin Approval. Once approved, recurring checklists automatically generate the next due occurrence!
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
