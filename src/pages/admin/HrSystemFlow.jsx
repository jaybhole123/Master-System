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
  Wallet,
  Workflow,
  Eye,
  X,
  AlertCircle,
  FileCheck
} from "lucide-react";

export default function HrSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedStage, setSelectedStage] = useState(null);

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
    <div className="w-full px-1 sm:px-3 lg:px-4 py-3 space-y-6">
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

        {/* ═══════════ NAVIGATION TABS (WORKFLOW / SALARY BREAKUP FORMULA / LEAVE SOP) ═══════════ */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter("workflow")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === "workflow" || activeFilter === "all"
                  ? "bg-red-600 text-white shadow-md shadow-red-500/25"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Workflow className="w-4 h-4" />
              <span>5-Phase Workforce Pipeline</span>
            </button>

            <button
              onClick={() => setActiveFilter("salary_formula")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === "salary_formula"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-500/25"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Statutory CTC &amp; Net Formula</span>
            </button>

            <button
              onClick={() => setActiveFilter("attendance_matrix")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === "attendance_matrix"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>31-Day Attendance &amp; Leave Rules</span>
            </button>
          </div>

          <span className="hidden sm:inline-flex text-[11px] font-bold text-gray-400">
            Click any phase card for complete step-by-step checklist &amp; audit rules
          </span>
        </div>

        {/* ═══════════ VIEW 1: 5-PHASE INTERACTIVE WORKFORCE LIFECYCLE ═══════════ */}
        {(activeFilter === "workflow" || activeFilter === "all") && (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
                    <Workflow className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    End-to-End Enterprise HR &amp; Payroll Architecture
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sequential flow: Recruitment Onboarding → CTC Structure → Daily Attendance &amp; Leaves → Payroll Engine → Bank NEFT &amp; Payslip
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                5-Stage Enterprise Pipeline
              </span>
            </div>

            {/* 5-Step Desktop Grid with Directional Connectors */}
            <div className="relative py-4 px-2 bg-slate-50/70 rounded-2xl border border-slate-200/80">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch relative z-10">
                {[
                  {
                    id: "phase-1",
                    stepNum: "01",
                    title: "Recruitment & Onboarding",
                    subtitle: "Candidate Offer & Profile Master",
                    phase: "Talent Acquisition",
                    icon: Users,
                    color: "border-red-500",
                    accent: "bg-red-600 text-white",
                    stats: `${stats.totalEmployees} Active Staff`,
                    route: "/hr/employee-master",
                    summary: "Candidate appointment issuance, Aadhaar/PAN KYC documentation, emergency contacts, and designation allocation.",
                    systemActions: [
                      "Issue digital Offer / Appointment Letter with probation and business terms",
                      "Collect mandatory KYC: Aadhaar, PAN card, address verification and bank details",
                      "Assign Department, Designation, Job Code, and Direct Reporting HOD",
                      "Provision biometric ID, staff email address, and system login credentials",
                      "Issue welcome kit, PPE safety gear, and asset hand-over acknowledgment"
                    ],
                    keyDocuments: [
                      "Candidate Offer Letter",
                      "Employee Joining Form & KYC",
                      "Biometric & ID Card Record"
                    ],
                    kpiNote: "100% KYC completion before Day 1 prevents downstream banking remittance failures."
                  },
                  {
                    id: "phase-2",
                    stepNum: "02",
                    title: "CTC & Salary Structuring",
                    subtitle: "Statutory Levies & Allowances",
                    phase: "Compensation Base",
                    icon: CreditCard,
                    color: "border-amber-500",
                    accent: "bg-amber-500 text-white",
                    stats: `${stats.salaryStructures} Defined Scales`,
                    route: "/hr/salary-structure",
                    summary: "Compensation architecture separating Gross CTC into Basic, HRA, DA, Special Allowances and statutory EPF/ESIC deductions.",
                    systemActions: [
                      "Configure Grade-wise compensation bands (Management, Staff, Plant Technicians)",
                      "Define Basic Pay (40-50% of CTC), House Rent Allowance (HRA) & Conveyance",
                      "Automate Statutory Computations: Employee EPF (12%), Employer EPF & ESIC (0.75%)",
                      "Configure Professional Tax (PT) state slabs and voluntary deductions",
                      "Lock audited compensation template before monthly attendance cutoff"
                    ],
                    keyDocuments: [
                      "Salary Structure Annexure",
                      "Statutory EPF / ESIC Declaration",
                      "Annual CTC Breakup Sheet"
                    ],
                    kpiNote: "Standardized pay components guarantee seamless income tax Form 16 issuance."
                  },
                  {
                    id: "phase-3",
                    stepNum: "03",
                    title: "Daily Attendance & Leaves",
                    subtitle: "31-Day Grid & Approval Queue",
                    phase: "Time & Operations",
                    icon: CalendarCheck,
                    color: "border-blue-500",
                    accent: "bg-blue-600 text-white",
                    stats: `${stats.attendanceToday} Present Today`,
                    route: "/hr/attendance",
                    summary: "Multi-shift attendance tracking across plants and head office, integrating leave balance deductions and working day calculation.",
                    systemActions: [
                      "Daily presence logging: Present (P), Absent (A), Half Day (HD), Week Off (WO)",
                      "Leave Portal: Employee applies for Casual (CL), Medical (ML) or Earned Leaves (EL)",
                      "HOD Verification Gate: Single-click digital leave approval adjusting available quotas",
                      "Auto-compute Total Payable Days = Total Month Days − Unapproved LWP Days",
                      "Lock finalized monthly working hours sheet on last working day of calendar"
                    ],
                    keyDocuments: [
                      "Monthly 31-Day Attendance Sheet",
                      "Approved Leave Application Logs",
                      "HOD Attendance Signoff Note"
                    ],
                    kpiNote: "Attendance lock freeze eliminates manual pay discrepancies and late salary releases."
                  },
                  {
                    id: "phase-4",
                    stepNum: "04",
                    title: "Automated Payroll Engine",
                    subtitle: "1-Click Net Salary Formulation",
                    phase: "Calculation Core",
                    icon: RefreshCw,
                    color: "border-purple-500",
                    accent: "bg-purple-600 text-white",
                    stats: `${stats.processedPayrolls} Pay Runs`,
                    route: "/hr/payroll-process",
                    summary: "Algorithmic salary calculation combining Payable Working Days with compensation structures and statutory deduction deductions.",
                    systemActions: [
                      "Formulate Earned Pay = (Gross Salary ÷ Month Calendar Days) × Payable Working Days",
                      "Compute Employee Statutory Deductions (EPF + ESIC + Professional Tax)",
                      "Deduct en-route cash advances, canteen charges, or loan installments",
                      "Generate Net Payable Salary = Total Earned Gross − Total Deductions",
                      "Lock and freeze monthly payroll run with complete audit reconciliation"
                    ],
                    keyDocuments: [
                      "Monthly Payroll Register (Master Roll)",
                      "Statutory EPF ECR Return File",
                      "Executive Payroll Summary"
                    ],
                    kpiNote: "Automated computation prevents human calculation errors and payroll leaks."
                  },
                  {
                    id: "phase-5",
                    stepNum: "05",
                    title: "Disbursement & Payslip Delivery",
                    subtitle: "Bank NEFT & Branded PDF Slips",
                    phase: "Settlement & Delivery",
                    icon: DollarSign,
                    color: "border-emerald-500",
                    accent: "bg-emerald-600 text-white",
                    stats: "Direct NEFT",
                    route: "/hr/net-salary",
                    summary: "Generation of bank corporate salary transfer files, automated accounting ledger debit, and branded employee PDF payslips.",
                    systemActions: [
                      "Generate Bank NEFT / RTGS Corporate Excel upload sheet with Account & IFSC",
                      "Reconcile bank batch debit acknowledgment against payroll liability ledgers",
                      "Auto-generate tamper-proof branded PDF payslips with net amount in words",
                      "Provide 1-click payslip download and employee portal access",
                      "Archive monthly disbursement proofs for corporate audits and statutory filings"
                    ],
                    keyDocuments: [
                      "Bank Batch NEFT Upload Sheet",
                      "Branded Employee PDF Payslip",
                      "Accounting Salary Debit Voucher"
                    ],
                    kpiNote: "Direct bank transfer sheets ensure 100% timely salary credit on 1st of every month."
                  }
                ].map((stage, idx) => {
                  const StageIcon = stage.icon;
                  return (
                    <div key={stage.id} className="relative group flex flex-col justify-between">
                      {/* Card Node */}
                      <div
                        className={`h-full flex flex-col justify-between rounded-2xl border-2 ${stage.color} p-4 bg-white shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
                      >
                        <div>
                          {/* Top Step Number + Icon */}
                          <div className="flex items-center justify-between mb-3">
                            <span className={`w-8 h-8 rounded-xl ${stage.accent} font-black text-xs flex items-center justify-center shadow-xs`}>
                              {stage.stepNum}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                              {stage.phase}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-gray-900 text-sm group-hover:text-red-600 transition-colors">
                            {stage.title}
                          </h3>
                          <div className="text-[10.5px] font-bold text-gray-400 mt-0.5 mb-2 truncate">
                            {stage.subtitle}
                          </div>
                          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                            {stage.summary}
                          </p>

                          {/* Technical Parameter Checklist */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            {stage.systemActions.slice(0, 3).map((action, pIdx) => (
                              <div key={pIdx} className="flex items-start gap-1.5 text-[10.5px] text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="leading-tight">{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bottom Deliverable & Action Buttons */}
                        <div className="mt-4 pt-2.5 border-t border-slate-100 space-y-2">
                          <div>
                            <div className="text-[9.5px] uppercase font-bold text-slate-400">Key Deliverable:</div>
                            <div className="text-[11px] font-extrabold text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-150 truncate">
                              {stage.keyDocuments[0]}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => setSelectedStage(stage)}
                              className="flex-1 py-1.5 px-2 text-[10.5px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-slate-600" />
                              <span>Deep View</span>
                            </button>
                            <button
                              onClick={() => navigate(stage.route)}
                              className="flex-1 py-1.5 px-2 text-[10.5px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Open Page</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Right Connector Arrow */}
                      {idx < 4 && (
                        <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-red-600 text-white items-center justify-center shadow-md ring-2 ring-white">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ═══════════ HR DISBURSEMENT & AUDIT BANNER ═══════════ */}
              <div className="mt-6 pt-5 border-t border-dashed border-slate-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs shrink-0">
                      <DollarSign className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        Closed-Loop Workforce Operations &amp; Bank Disbursement
                        <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          100% On-Time Credit
                        </span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Attendance lock hone ke baad system automatically <strong>Bank NEFT batch upload</strong> generate karta hai aur employees ke registered profiles par branded <strong>PDF Payslips</strong> deliver karta hai.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate("/hr/net-salary")}
                      className="px-3.5 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      NEFT Sheet
                    </button>
                    <button
                      onClick={() => navigate("/hr/payslip")}
                      className="px-3.5 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      View Payslips
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ VIEW 2: STATUTORY SALARY FORMULATION ENGINE ═══════════ */}
        {activeFilter === "salary_formula" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  Statutory Salary Formulation &amp; CTC Component Breakdown
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Exact compensation algorithm used by the HR Payroll Engine for net salary credits
                </p>
              </div>
              <button
                onClick={() => navigate("/hr/salary-structure")}
                className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Salary Structure Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Component 1: Base Earnings</div>
                <div className="text-sm font-extrabold text-gray-900">Gross Monthly CTC</div>
                <div className="font-mono text-xs bg-white p-2 rounded-lg border border-amber-200 text-amber-900 space-y-1">
                  <div>• Basic Pay (40-50% CTC)</div>
                  <div>• HRA (20-25% CTC)</div>
                  <div>• Dearness / Special Allowance</div>
                </div>
                <p className="text-[11px] text-gray-600">
                  Fixed agreed monthly salary before attendance working day pro-rata proration.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Component 2: Pro-Rata Earnings</div>
                <div className="text-sm font-extrabold text-gray-900">Earned Gross Formulation</div>
                <div className="font-mono text-xs bg-white p-2 rounded-lg border border-blue-200 text-blue-900">
                  (Gross CTC ÷ Month Days) × Payable Days
                </div>
                <p className="text-[11px] text-gray-600">
                  Payable Days = Month Calendar Days − Unapproved Absent / LWP days recorded in attendance.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-2">
                <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Component 3: Statutory Deductions</div>
                <div className="text-sm font-extrabold text-gray-900">PF, ESIC &amp; Tax Levies</div>
                <div className="font-mono text-xs bg-white p-2 rounded-lg border border-rose-200 text-rose-900 space-y-1">
                  <div>• Employee EPF = 12% of Basic</div>
                  <div>• Employee ESIC = 0.75% of Gross</div>
                  <div>• Professional Tax (PT)</div>
                </div>
                <p className="text-[11px] text-gray-600">
                  Mandatory statutory retentions remitted directly to EPFO and ESIC government portals.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Component 4: Net Payout</div>
                <div className="text-sm font-extrabold text-gray-900">Net Take-Home Remittance</div>
                <div className="font-mono text-xs bg-white p-2 rounded-lg border border-emerald-200 text-emerald-900">
                  Earned Gross − Total Deductions
                </div>
                <p className="text-[11px] text-gray-600">
                  Transferred via bank corporate NEFT batch. Amount in words rendered on official PDF payslips.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ VIEW 3: 31-DAY ATTENDANCE & LEAVE RULES ═══════════ */}
        {activeFilter === "attendance_matrix" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                  31-Day Attendance Grid &amp; Leave Routing Rules
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Standard operating rules for daily shift marks, leave quotas, and HOD approvals
                </p>
              </div>
              <button
                onClick={() => navigate("/hr/attendance")}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Attendance Grid</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">P</span>
                  Present &amp; Half-Day Codes
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Full day working shifts marked as <strong>P (1.0 Day)</strong>. Shifts with less than 4.5 hours or approved half-day requests logged as <strong>HD (0.5 Day)</strong>.
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-700">
                  Payable Value = P (1.0) or HD (0.5)
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">L</span>
                  Approved Leave Routing (CL / ML)
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Staff submits leave via portal. HOD approval automatically deducts from available Casual Leave or Medical Leave quota without any salary deduction.
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-700">
                  Approved Leave = Counted as Paid Day
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">A</span>
                  Unapproved Absent &amp; LWP
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Uninformed absence or exhaustion of leave quota results in <strong>Leave Without Pay (LWP)</strong>, proportionately reducing monthly earned salary.
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-700">
                  Salary Deduction = (Gross / Month Days) × LWP
                </div>
              </div>
            </div>
          </div>
        )}


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

        {/* ═══════════ DEEP AUDIT INSPECTION MODAL ═══════════ */}
        {selectedStage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${selectedStage.accent} flex items-center justify-center font-black text-sm shadow-md`}>
                    {selectedStage.stepNum}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {selectedStage.phase}
                      </span>
                      <span className="text-xs font-bold text-red-600">{selectedStage.stats}</span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mt-0.5">
                      {selectedStage.title}
                    </h3>
                    <div className="text-xs text-gray-500 font-medium">{selectedStage.subtitle}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStage(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stage Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10.5px] uppercase font-bold text-slate-400 mb-1">Phase Objective</div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedStage.summary}
                </p>
              </div>

              {/* Detailed System Actions */}
              <div>
                <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Step-by-Step Operational &amp; Compliance Checklist
                </div>
                <div className="space-y-2">
                  {selectedStage.systemActions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-800">
                      <span className="w-5 h-5 rounded-full bg-white text-gray-700 font-bold text-[10px] flex items-center justify-center border border-gray-200 shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mandatory Key Documents */}
              <div>
                <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  Statutory Documents &amp; Digital Artifacts
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedStage.keyDocuments.map((doc, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 flex items-center gap-2 shadow-2xs">
                      <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* KPI / Audit Note */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Operational Compliance Rule:</strong> {selectedStage.kpiNote}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setSelectedStage(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close View
                </button>
                <button
                  onClick={() => {
                    const targetRoute = selectedStage.route;
                    setSelectedStage(null);
                    navigate(targetRoute);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Navigate to Module</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
}
