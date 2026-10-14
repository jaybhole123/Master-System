import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../../SupabaseClient";
import {
  GitFork,
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarCheck,
  Calendar as CalendarIcon,
  RefreshCw,
  DollarSign,
  FileText,
  CirclePlus,
  ClipboardList,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Layers,
  CheckCircle2,
  Clock,
  Building2,
  FileCheck2,
  TrendingUp,
  Award,
  Wallet
} from "lucide-react";

export default function HrSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const [stats, setStats] = useState({
    totalEmployees: 0,
    salaryStructures: 0,
    attendanceToday: 0,
    pendingLeaves: 0,
    processedPayrolls: 0,
    pendingIndents: 0,
    inventoryItems: 0,
    totalOfferLetters: 0
  });

  const fetchHrFlowStats = async () => {
    try {
      setRefreshing(true);

      const today = new Date();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const currentMonthYear = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
      const currentDayKey = `day_${today.getDate()}`;

      const [
        empRes,
        salRes,
        leaveRes,
        payrollRes,
        indentRes,
        inventoryRes,
        offerRes,
        attRes
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("salary_structures").select("*", { count: "exact", head: true }),
        supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("processed_payroll").select("*", { count: "exact", head: true }),
        supabase.from("indents").select("*", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("inventory").select("*", { count: "exact", head: true }),
        supabase.from("offer_letters").select("*", { count: "exact", head: true }),
        supabase.from("monthly_attendance").select(currentDayKey).eq("month_year", currentMonthYear)
      ]);

      const presentCount = (attRes.data || []).filter(row => ["P", "HD"].includes(row[currentDayKey])).length;

      setStats({
        totalEmployees: empRes.count || 0,
        salaryStructures: salRes.count || 0,
        attendanceToday: presentCount,
        pendingLeaves: leaveRes.count || 0,
        processedPayrolls: payrollRes.count || 0,
        pendingIndents: indentRes.count || 0,
        inventoryItems: inventoryRes.count || 0,
        totalOfferLetters: offerRes.count || 0
      });
    } catch (err) {
      console.error("Error fetching HR flow stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHrFlowStats();
  }, []);

  const flowNodes = [
    {
      id: "employee-master",
      title: "Employee Master Directory",
      subtitle: "Personnel profiles, KYC, reporting hierarchy & designations",
      category: "core",
      badge: "Onboarding Origin",
      color: "red",
      icon: Users,
      path: "/hr/employee-master",
      stats: [
        { label: "Total Workforce", value: stats.totalEmployees },
        { label: "Active Profiles", value: stats.totalEmployees }
      ],
      description: "Employee foundation. Master table holding personal details, designation, department, reporting HOD, banking data & joining paperwork.",
      outputs: ["salary-structure", "attendance", "leave-tracker"]
    },
    {
      id: "salary-structure",
      title: "Salary Structure",
      subtitle: "CTC breakup, Basic, HRA, DA, PF & deductions",
      category: "core",
      badge: "Compensation Base",
      color: "red",
      icon: CreditCard,
      path: "/hr/salary-structure",
      stats: [
        { label: "Defined Structures", value: stats.salaryStructures },
        { label: "Components", value: "Earnings / Deductions" }
      ],
      description: "Configures fixed pay, variable allowances, gross compensation, statutory EPF/ESIC calculations, and taxable slabs.",
      outputs: ["payroll-process"]
    },
    {
      id: "attendance",
      title: "Attendance Management",
      subtitle: "Daily bio/geo register, working hours & monthly grid",
      category: "operations",
      badge: "Daily Tracking",
      color: "blue",
      icon: CalendarCheck,
      path: "/hr/attendance",
      stats: [
        { label: "Present Today", value: stats.attendanceToday },
        { label: "Mode", value: "31-Day Excel Grid" }
      ],
      description: "Month-long grid logging Present (P), Absent (A), Half Day (HD), and Holidays (H). Feeds payable days into payroll engine.",
      outputs: ["payroll-process"]
    },
    {
      id: "leave-tracker",
      title: "Leave Tracker & Approvals",
      subtitle: "Casual/Medical leave requests, approval queue & balance",
      category: "operations",
      badge: "Workflow Gate",
      color: "amber",
      icon: CalendarIcon,
      path: "/hr/leave-tracker",
      stats: [
        { label: "Pending Approvals", value: stats.pendingLeaves, alert: stats.pendingLeaves > 0 },
        { label: "Status", value: stats.pendingLeaves === 0 ? "Clear" : "Action Needed" }
      ],
      description: "Employees apply for planned leaves. HOD/Admin verifies balance, approves or rejects, adjusting paid vs unpaid days.",
      outputs: ["attendance", "payroll-process"]
    },
    {
      id: "payroll-process",
      title: "Payroll Processing Engine",
      subtitle: "Auto-computes monthly salary using attendance & deductions",
      category: "payroll",
      badge: "Calculation Core",
      color: "red",
      icon: RefreshCw,
      path: "/hr/payroll-process",
      stats: [
        { label: "Processed Months", value: stats.processedPayrolls },
        { label: "Audit State", value: "Auto-Reconciled" }
      ],
      description: "Takes (Gross Pay ÷ Month Days × Payable Days) - Deductions. Automatically locks monthly salary roll with one-click compute.",
      outputs: ["net-salary", "payslip", "bank-transfer"]
    },
    {
      id: "net-salary",
      title: "Net Salary & Bank Statement",
      subtitle: "Final payable disbursement schedule & NEFT sheet",
      category: "payroll",
      badge: "Disbursement",
      color: "blue",
      icon: DollarSign,
      path: "/hr/net-salary",
      stats: [
        { label: "Disbursement Mode", value: "NEFT / Bank Transfer" },
        { label: "Status", value: "Audited Roll" }
      ],
      description: "Executive ledger showing employee account numbers, IFSC codes, net payable salaries, and Excel exports for bank upload.",
      outputs: ["payslip"]
    },
    {
      id: "payslip",
      title: "Digital Payslips",
      subtitle: "Salary slip generation, PDF download & employee distribution",
      category: "payroll",
      badge: "Employee Delivery",
      color: "rose",
      icon: FileText,
      path: "/hr/payslip",
      stats: [
        { label: "Slips Ready", value: stats.processedPayrolls > 0 ? "Available" : "Pending" },
        { label: "Format", value: "PDF & Print" }
      ],
      description: "Generates formatted PDF salary slips with company branding, CTC breakup, deductions, and net amount in words.",
      outputs: []
    },
    {
      id: "create-indent",
      title: "Create Indent & Procurement",
      subtitle: "Department supply requisitions, purchase indents & approvals",
      category: "supplies",
      badge: "Material Requisition",
      color: "amber",
      icon: CirclePlus,
      path: "/hr/create-indent",
      stats: [
        { label: "Pending Indents", value: stats.pendingIndents, alert: stats.pendingIndents > 0 },
        { label: "Workflow", value: "PO / Approval" }
      ],
      description: "Staff and departments submit requests for office equipment, safety gear, tools, and consumables with approval signoff.",
      outputs: ["inventory"]
    },
    {
      id: "inventory",
      title: "Inventory Stock Control",
      subtitle: "Issued goods, stock ledger & replenishment tracking",
      category: "supplies",
      badge: "Stock Ledger",
      color: "purple",
      icon: ClipboardList,
      path: "/hr/inventory",
      stats: [
        { label: "Cataloged Items", value: stats.inventoryItems },
        { label: "Tracking", value: "Issue & Inward" }
      ],
      description: "Centralized stock ledger keeping track of safety shoes, uniforms, stationery, spares, and tool issuance to staff.",
      outputs: []
    },
    {
      id: "offer-letter",
      title: "Offer & Onboarding Letters",
      subtitle: "Candidate appointment letters, agreements & terms",
      category: "supplies",
      badge: "HR Legal",
      color: "teal",
      icon: FileCheck2,
      path: "/hr/offer-letter",
      stats: [
        { label: "Templates", value: "Standard & Coal" },
        { label: "Format", value: "PDF Generation" }
      ],
      description: "Auto-generates official offer and appointment letters with candidate designations, CTC details, and standard business clauses.",
      outputs: ["employee-master"]
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case "red":
        return {
          border: "border-red-200 hover:border-red-400",
          bg: "bg-red-500/10",
          cardBg: "from-red-50/60 via-white to-white",
          text: "text-red-700",
          badge: "bg-red-50 text-red-700 border-red-200",
          ring: "focus:ring-red-400",
          iconBg: "bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-red-200"
        };
      case "rose":
        return {
          border: "border-red-200 hover:border-red-400",
          bg: "bg-red-500/10",
          cardBg: "from-red-50/60 via-white to-white",
          text: "text-red-700",
          badge: "bg-red-50 text-red-700 border-red-200",
          ring: "focus:ring-red-400",
          iconBg: "bg-rose-600 text-white shadow-rose-200"
        };
      case "blue":
        return {
          border: "border-blue-200 hover:border-blue-400",
          bg: "bg-blue-500/10",
          cardBg: "from-blue-50/60 via-white to-white",
          text: "text-blue-700",
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          ring: "focus:ring-blue-400",
          iconBg: "bg-blue-600 text-white shadow-blue-200"
        };
      case "amber":
        return {
          border: "border-amber-200 hover:border-amber-400",
          bg: "bg-amber-500/10",
          cardBg: "from-amber-50/60 via-white to-white",
          text: "text-amber-700",
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          ring: "focus:ring-amber-400",
          iconBg: "bg-amber-600 text-white shadow-amber-200"
        };
      case "purple":
        return {
          border: "border-purple-200 hover:border-purple-400",
          bg: "bg-purple-500/10",
          cardBg: "from-purple-50/60 via-white to-white",
          text: "text-purple-700",
          badge: "bg-purple-50 text-purple-700 border-purple-200",
          ring: "focus:ring-purple-400",
          iconBg: "bg-purple-600 text-white shadow-purple-200"
        };
      case "teal":
        return {
          border: "border-teal-200 hover:border-teal-400",
          bg: "bg-teal-500/10",
          cardBg: "from-teal-50/60 via-white to-white",
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

  const filteredNodes = flowNodes.filter((node) => {
    if (activeFilter === "all") return true;
    return node.category === activeFilter;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header Section — System Red Theme */}
        <div className="pb-4 border-b border-gray-200 space-y-1">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Icon + Heading + Badge in Single Line */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-500/25 shrink-0">
                <GitFork className="w-5 h-5 transform rotate-90" />
              </div>
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">
                  HR System <span className="text-red-600">Flow</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                  Live Workforce Data
                </span>
              </div>
            </div>

            {/* Right: Buttons in Single Line */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={fetchHrFlowStats}
                disabled={refreshing}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-red-600" : "text-gray-500"}`} />
                <span>Refresh Stats</span>
              </button>
              <Link
                to="/hr/dashboard"
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
                <span>HR Dashboard</span>
              </Link>
              <Link
                to="/hr/employee-master"
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md shadow-red-600/25 active:scale-95 whitespace-nowrap"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Employee Master</span>
              </Link>
            </div>
          </div>

          {/* Subtitle Underneath */}
          <p className="text-xs sm:text-sm font-medium text-gray-500 pl-[52px]">
            How employee profiles, salary structures, attendance, leaves, payroll processing, and indents flow end-to-end
          </p>
        </div>

        {/* Quick Navigation Strip for HR Module */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-1.5 border border-gray-200/80 shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            to="/hr/system-flow"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold bg-red-600 text-white shadow-sm whitespace-nowrap"
          >
            <GitFork className="w-4 h-4 transform rotate-90" />
            <span>System Flow</span>
          </Link>
          <Link
            to="/hr/dashboard"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>HR Dashboard</span>
          </Link>
          <Link
            to="/hr/employee-master"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <Users className="w-4 h-4" />
            <span>Employee Master</span>
            <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {stats.totalEmployees}
            </span>
          </Link>
          <Link
            to="/hr/attendance"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance</span>
          </Link>
          <Link
            to="/hr/leave-tracker"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Leave Tracker</span>
            {stats.pendingLeaves > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {stats.pendingLeaves}
              </span>
            )}
          </Link>
          <Link
            to="/hr/payroll-process"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Payroll Process</span>
          </Link>
          <Link
            to="/hr/payslip"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Payslips</span>
          </Link>
        </div>

        {/* ═══════════ INTERACTIVE HR WORKFLOW DIAGRAM (MODULE MAP) ═══════════ */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-sm overflow-hidden relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Interactive HR Workflow Map</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Visual representation of data progression from Employee Onboarding to Attendance, Payroll & Payout</p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> 1. Workforce Master
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> 2. Daily Tracking
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> 3. Payroll & Disbursement
              </span>
            </div>
          </div>

          {/* Diagram Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 lg:gap-2 items-center">
            
            {/* Step 1: Employee & Compensation Master */}
            <div className="lg:col-span-3">
              <div
                onClick={() => navigate("/hr/employee-master")}
                className="group cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-600/25 border border-red-500 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md tracking-wider uppercase">
                    Step 1: Onboard
                  </span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">Employee & Salary Master</h3>
                <p className="text-xs text-red-100 mt-1 leading-relaxed">
                  Origin of HR records. Register staff profiles, assign department, designation, bank credentials & setup CTC salary structures.
                </p>
                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                  <span>{stats.totalEmployees} Active Staff</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Connector Arrow 1 */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-gray-300">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tracks</span>
                <ArrowRight className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
            </div>

            {/* Step 2: Attendance & Leave Engine */}
            <div className="lg:col-span-3">
              <div
                onClick={() => navigate("/hr/attendance")}
                className="group cursor-pointer p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-400 shadow-sm hover:shadow-lg transition-all duration-300 relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Step 2: Operations
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors">
                  Attendance & Leaves
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Captures daily Present/Absent/Half-day logs and routes medical/casual leave approvals to lock final payable working days.
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="text-blue-600">{stats.attendanceToday} Present Today</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-blue-600">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Connector Arrow 2 */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-gray-300">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculates</span>
                <ArrowRight className="w-6 h-6 text-rose-500 animate-pulse" />
              </div>
            </div>

            {/* Step 3: Payroll, Payslip & Bank Payout */}
            <div className="lg:col-span-3">
              <div
                onClick={() => navigate("/hr/payroll-process")}
                className="group cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-red-50/70 via-white to-white border-2 border-red-200 hover:border-red-500 shadow-sm hover:shadow-lg transition-all duration-300 relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                    Step 3: Settlement
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-red-700 transition-colors">
                  Payroll & Payslip Payout
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Automatic net salary formulation, bank transfer NEFT sheets generation, and instant employee PDF payslip delivery.
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="text-red-600">{stats.processedPayrolls} Payroll Cycles Logged</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-red-600">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ═══════════ DETAILED MODULE CARDS ═══════════ */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Module Deep-Dive Cards</h2>
              <p className="text-xs text-gray-500">Live indicators, configuration capabilities, and operational flows</p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "All Modules" },
                { id: "core", label: "Core Master" },
                { id: "operations", label: "Attendance & Leaves" },
                { id: "payroll", label: "Payroll & Payout" },
                { id: "supplies", label: "Supplies & Legal" }
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
                    border ${styles.border} rounded-2xl shadow-xs hover:shadow-lg hover:-translate-y-0.5
                    transition-all duration-300 cursor-pointer text-left
                  `}
                >
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
                    <div className="p-1 rounded-lg text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                    {node.description}
                  </p>

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

        {/* ═══════════ HR PROCESS LIFECYCLE BLUEPRINT ═══════════ */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <Sparkles className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Standard Operating HR Lifecycle (SOP)</h2>
              <p className="text-xs text-gray-500">Step-by-step personnel lifecycle from recruitment to month-end payroll credit</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-red-50/40 border border-red-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  1
                </span>
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Recruit</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Offer & Onboarding</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Offer letter issued with role terms. On joining, employee master is populated with KYC, designation, reporting manager & salary structure.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  2
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Attendance</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Daily Presence & Leaves</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Attendance logged daily across shifts. Leave requests verified by HODs to determine exact paid days, absences, and overtime hours.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  3
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Calculation</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Payroll Formulation</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                System computes Gross Earnings, calculates PF/ESIC/tax deductions, and locks audited net pay for each staff member.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  4
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Payout</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Disbursement & Payslip</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Bank transfer sheet exported for corporate payout, and automated branded PDF payslips generated for all employees.
              </p>
            </div>
          </div>
        </div>

      </div>
  );
}
