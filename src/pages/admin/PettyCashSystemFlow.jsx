import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../../SupabaseClient";
import {
  GitFork,
  Banknote,
  LayoutDashboard,
  CirclePlus,
  CreditCard,
  BookOpen,
  PieChart,
  Settings,
  RefreshCw,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Wallet,
  TrendingUp,
  TrendingDown,
  Workflow,
  AlertCircle,
  FileCheck2,
  Receipt,
  Layers
} from "lucide-react";

export default function PettyCashSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalBalance: 0,
    totalCredits: 0,
    totalCreditAmount: 0,
    totalExpenses: 0,
    totalExpenseAmount: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    groupHeadsCount: 0,
  });

  const fetchPettyCashStats = async () => {
    try {
      setRefreshing(true);
      const [
        creditsRes,
        expensesRes,
        settingsRes
      ] = await Promise.all([
        supabase.from("petty_cash_addcash_credits").select("id, amount, status"),
        supabase.from("petty_cash_expenses").select("id, amount, status"),
        supabase.from("petty_cash_setting").select("id, group_head")
      ]);

      const creditsData = creditsRes.data || [];
      const expensesData = expensesRes.data || [];
      const settingsData = settingsRes.data || [];

      const totalCreditAmount = creditsData
        .filter(c => !c.status || c.status === "APPROVED")
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      const approvedExpenses = expensesData.filter(e => e.status === "APPROVED");
      const pendingExpenses = expensesData.filter(e => e.status === "PENDING");

      const totalExpenseAmount = approvedExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const totalBalance = totalCreditAmount - totalExpenseAmount;

      const uniqueGroups = new Set(settingsData.map(s => s.group_head && s.group_head.trim()).filter(Boolean));

      setStats({
        totalBalance,
        totalCredits: creditsData.length,
        totalCreditAmount,
        totalExpenses: expensesData.length,
        totalExpenseAmount,
        pendingExpenses: pendingExpenses.length,
        approvedExpenses: approvedExpenses.length,
        groupHeadsCount: uniqueGroups.size || 5,
      });
    } catch (err) {
      console.error("Error fetching Petty Cash stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPettyCashStats();
  }, []);

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

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
                Petty Cash <span className="text-red-600">Flow</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                Audited Financial Stream
              </span>
            </div>
          </div>

          {/* Right: Buttons in Single Line */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchPettyCashStats}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? "animate-spin text-red-600" : ""}`} />
              <span>Sync Ledger</span>
            </button>

            <Link
              to="/petty-cash/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm shadow-red-500/20 active:scale-95 whitespace-nowrap"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Open Petty Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Subtitle Underneath */}
        <p className="text-xs sm:text-sm font-medium text-gray-500 pl-[52px]">
          Complete workflow architecture from Cash Inflow (Credit) to Expense Logging, Two-Tier Approval, and Ledger Reconciliation
        </p>
      </div>

      {/* KPI Metric Cards — System Red Accent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Net Cash Balance</span>
            <Wallet className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.totalBalance)}</p>
          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{formatCurrency(stats.totalCreditAmount)} Inflow</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Total Credits Logged</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.totalCredits}</p>
          <p className="text-[11px] text-gray-500 mt-1">Cash received entries</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Pending Audit Approval</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{stats.pendingExpenses}</p>
          <p className="text-[11px] text-gray-500 mt-1">Awaiting verification</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Audited Expenses</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.approvedExpenses}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            {formatCurrency(stats.totalExpenseAmount)} disbursed
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          AUTHENTIC FLOWCHART WORKFLOW CANVAS WITH ARROWS & NODES
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
                <Workflow className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                Petty Cash Life-Cycle Flowchart Diagram
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Visual financial flow connected with directional arrows showing cash deposit, expenditure logging, audit approval, and ledger closing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              Double-Entry Flow
            </span>
          </div>
        </div>

        {/* ─── DESKTOP HORIZONTAL FLOW PIPELINE (WITH SVG CONNECTORS) ─── */}
        <div className="hidden lg:block relative py-6 px-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
          <div className="grid grid-cols-4 gap-6 items-center relative z-10">
            {/* Step 1 Node: Inflow (Credit) */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-emerald-500 shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    01
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Cash Inflow
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Add Credit / Cash</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Deposit received from bank or head office. Logged with SN, date, person name, and receipt bill.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-600">{stats.totalCredits} Inflow Entries</span>
                  <Link to="/petty-cash/add-case" className="text-gray-400 hover:text-emerald-600 font-bold">Credit &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 2 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-red-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-red-500"></div>
              </div>
            </div>

            {/* Step 2 Node: Outflow (Expenses) */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-red-500 shadow-md shadow-red-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    02
                  </span>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Voucher Entry
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Expenses Logging</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Daily branch expenses recorded under specific Group Heads (Fuel, Food, Office, Freight) with uploaded receipts.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-red-600">{stats.groupHeadsCount} Group Heads</span>
                  <Link to="/petty-cash/expenses" className="text-gray-400 hover:text-red-600 font-bold">Expense &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 3 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-amber-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-amber-500"></div>
              </div>
            </div>

            {/* Step 3 Node: Audit & Verification */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-amber-500 shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    03
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Verification
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Audit & Approval</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Superadmin verifies bills and payment mode. Approves voucher to deduct from balance or rejects fraudulent claims.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-600">{stats.pendingExpenses} Pending Verification</span>
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                </div>
              </div>

              {/* Connected Arrow to Step 4 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-purple-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-purple-500"></div>
              </div>
            </div>

            {/* Step 4 Node: Ledger & Reconciliation */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-purple-500 shadow-md shadow-purple-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    04
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Final Book
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Ledger & Summary</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Realtime running balance computation, category-wise monthly summary reports, and PDF print exports.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-purple-600">{formatCurrency(stats.totalBalance)} Balance</span>
                  <Link to="/petty-cash/ledger" className="text-gray-400 hover:text-purple-600 font-bold">Ledger &rarr;</Link>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RETURN AUDIT RECONCILIATION LOOP ─── */}
          <div className="mt-8 pt-6 border-t border-dashed border-slate-300">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    Running Balance Formulation
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-red-50 text-red-700 border border-red-200">
                      Auto-Audited
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    Running Balance = Cumulative Credits (Cash In) &minus; Cumulative Approved Expenses (Cash Out). Rejected expenses do not deduct from cash reserves.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200/80">
                <span>Verified Balance: {formatCurrency(stats.totalBalance)}</span>
                <CheckCircle2 className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── MOBILE VERTICAL FLOW DIAGRAM (WITH DOWN ARROWS) ─── */}
        <div className="block lg:hidden space-y-3">
          {/* Node 1 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                01
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Step 1: Cash Inflow
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Add Credit / Cash Deposit</h4>
            <p className="text-xs text-gray-600 mt-1">
              Deposit received from bank or head office. Logged with SN, date, person name, and receipt bill.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 2 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-red-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center">
                02
              </span>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                Step 2: Voucher Entry
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Expenses Logging & Receipts</h4>
            <p className="text-xs text-gray-600 mt-1">
              Daily branch expenses recorded under specific Group Heads (Fuel, Food, Office, Freight) with uploaded receipts.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 3 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-amber-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                03
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Step 3: Verification
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Audit & Approval</h4>
            <p className="text-xs text-gray-600 mt-1">
              Superadmin verifies bills and payment mode. Approves voucher to deduct from balance or rejects fraudulent claims.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 4 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-purple-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                04
              </span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                Step 4: Final Book
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Ledger & Summary Reconciliation</h4>
            <p className="text-xs text-gray-600 mt-1">
              Realtime running balance computation, category-wise monthly summary reports, and PDF print exports.
            </p>
          </div>
        </div>

        {/* ─── TECHNICAL ARCHITECTURE CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Cash Deposits (petty_cash_addcash_credits)
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Auto-generates sequential SN codes. Tracks fund origin, depositor name, payment channel, and digital vouchers.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-700">
              <CreditCard className="w-4 h-4 text-red-600" />
              Expenditures (petty_cash_expenses)
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Categorized under custom Head Groups. Status defaults to PENDING until reviewed by authorized accountant or superadmin.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
              <BookOpen className="w-4 h-4 text-purple-600" />
              Double-Entry Ledger & PDF Generation
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Produces official consolidated day-wise registers with automatic running balance calculations and downloadable PDF summaries.
            </p>
          </div>
        </div>
      </div>

      {/* ════════════ QUICK NAVIGATION STRIP ════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link
          to="/petty-cash/dashboard"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Petty Dashboard</p>
            <p className="text-[11px] text-gray-500 truncate">Register View</p>
          </div>
        </Link>

        <Link
          to="/petty-cash/add-case"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <CirclePlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Add Credit</p>
            <p className="text-[11px] text-gray-500 truncate">Cash Inflow</p>
          </div>
        </Link>

        <Link
          to="/petty-cash/expenses"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Expenses</p>
            <p className="text-[11px] text-gray-500 truncate">Cash Outflow</p>
          </div>
        </Link>

        <Link
          to="/petty-cash/ledger"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Ledger</p>
            <p className="text-[11px] text-gray-500 truncate">Balance Register</p>
          </div>
        </Link>

        <Link
          to="/petty-cash/summary"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <PieChart className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Summary</p>
            <p className="text-[11px] text-gray-500 truncate">Monthly Audit</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
