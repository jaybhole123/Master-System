import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts";
import { supabase } from "../utils/supabase";
import {
  Flame,
  Database,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Boxes,
  Receipt,
  Gavel,
  Truck,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ShieldCheck,
  ChevronRight,
  Wallet,
  Sparkles,
  DollarSign,
  Briefcase
} from "lucide-react";

const PIE_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export default function Dashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState({
    salesOrders: [], invoices: [], paymentAdvices: [],
    seclF1: [], seclF2: [], cmpdcil: [],
    auctions: [], auctionItems: [], dispatch: []
  });

  useEffect(() => {
    (async () => {
      try {
        const [
          { data: salesOrders },
          { data: invoices },
          { data: paymentAdvices },
          { data: seclF1 },
          { data: seclF2 },
          { data: cmpdcil },
          { data: auctions },
          { data: auctionItems },
          { data: dispatch }
        ] = await Promise.all([
          supabase.from('sales_orders').select('*'),
          supabase.from('invoices').select('*'),
          supabase.from('secl_payment_advices').select('*'),
          supabase.from('secl_intimation_format_1').select('*'),
          supabase.from('secl_intimation_format_2').select('*'),
          supabase.from('secl_cmpdcil').select('*'),
          supabase.from('auctions').select('*'),
          supabase.from('auction_items').select('*'),
          supabase.from('dispatch_records').select('*')
        ]);
        setRaw({
          salesOrders: salesOrders || [],
          invoices: invoices || [],
          paymentAdvices: paymentAdvices || [],
          seclF1: seclF1 || [],
          seclF2: seclF2 || [],
          cmpdcil: cmpdcil || [],
          auctions: auctions || [],
          auctionItems: auctionItems || [],
          dispatch: dispatch || []
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { salesOrders, invoices, paymentAdvices, seclF1, seclF2, cmpdcil, auctions, auctionItems, dispatch } = raw;

    // Sales Orders (DO)
    let soValid = 0, soExpired = 0, soTotalQty = 0, soTotalAmt = 0;
    salesOrders.forEach(s => {
      soTotalQty += Number(s.quantity) || 0;
      soTotalAmt += Number(s.amount) || 0;
      if (!s.sales_order_valid_to || s.sales_order_valid_to === "-" || s.sales_order_valid_to === "Not Found") {
        soValid++;
      } else {
        const vt = new Date(s.sales_order_valid_to);
        if (isNaN(vt)) soValid++;
        else { vt.setHours(0,0,0,0); vt < today ? soExpired++ : soValid++; }
      }
    });

    // Payment Advices
    let paValid = 0, paExpired = 0, paTotalAmt = 0;
    paymentAdvices.forEach(p => {
      paTotalAmt += Number(p.grand_total) || 0;
      if (!p.due_date || p.due_date === "-" || p.due_date === "Not Found") {
        paValid++;
      } else {
        const vt = new Date(p.due_date);
        if (isNaN(vt)) paValid++;
        else { vt.setHours(0,0,0,0); vt < today ? paExpired++ : paValid++; }
      }
    });

    // SECL Intimation Format 1 (M-junction)
    let f1Qty = 0, f1Bid = 0, f1Pending = 0, f1Done = 0;
    seclF1.forEach(s => {
      f1Qty += Number(s.quantity_allotted) || 0;
      f1Bid += Number(s.winning_bid_price_rs_mt) || 0;
      s.status === 'done' ? f1Done++ : f1Pending++;
    });

    // SECL Intimation Format 2 (MSTC)
    let f2Qty = 0, f2Bid = 0, f2Pending = 0, f2Done = 0;
    seclF2.forEach(s => {
      f2Qty += Number(s.qty_allotted) || 0;
      f2Bid += Number(s.bid_price) || 0;
      s.status === 'done' ? f2Done++ : f2Pending++;
    });

    // CMPDCIL
    let clQty = 0, clValue = 0, clPending = 0, clDone = 0;
    cmpdcil.forEach(s => {
      clQty += Number(s.allocated_qty) || 0;
      clValue += Number(s.value_rs) || 0;
      s.status === 'done' ? clDone++ : clPending++;
    });

    // Invoices
    let invTotal = 0;
    invoices.forEach(i => invTotal += Number(i.total_amount) || 0);

    // Auctions
    const aucCount = auctions.length;
    let aucTotalQty = 0;
    auctionItems.forEach(a => aucTotalQty += Number(a.quantity_offered) || 0);

    // Dispatch
    let dispQty = 0, dispFreight = 0;
    dispatch.forEach(d => {
      dispQty += Number(d.truck_qty) || 0;
      dispFreight += Number(d.freight) || 0;
    });

    // All SECL totals
    const seclTotalQty = f1Qty + f2Qty + clQty;
    const seclTotalPending = f1Pending + f2Pending + clPending;
    const seclTotalDone = f1Done + f2Done + clDone;

    // Pie chart distribution
    let distData = [
      { name: "Sales Orders (DO)", value: salesOrders.length },
      { name: "Invoices", value: invoices.length },
      { name: "Payment Advices", value: paymentAdvices.length },
      { name: "M-junction", value: seclF1.length },
      { name: "MSTC", value: seclF2.length },
      { name: "CMPDCIL", value: cmpdcil.length },
      { name: "Auctions", value: auctions.length },
      { name: "Dispatches", value: dispatch.length }
    ].filter(d => d.value > 0);
    if (distData.length === 0) distData = [{ name: "No Data", value: 1 }];

    // Trend data (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const tMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      tMap[key] = { month: monthNames[d.getMonth()], docs: 0, value: 0, sk: d.getTime() };
    }
    const allRecords = [
      ...invoices.map(i => ({ date: new Date(i.created_at), val: Number(i.total_amount) || 0 })),
      ...salesOrders.map(s => ({ date: new Date(s.created_at), val: Number(s.amount) || 0 })),
      ...paymentAdvices.map(p => ({ date: new Date(p.created_at), val: Number(p.grand_total) || 0 })),
      ...seclF1.map(s => ({ date: new Date(s.created_at), val: 0 })),
      ...seclF2.map(s => ({ date: new Date(s.created_at), val: 0 })),
      ...cmpdcil.map(s => ({ date: new Date(s.created_at), val: 0 })),
      ...dispatch.map(d => ({ date: new Date(d.created_at), val: 0 }))
    ];
    allRecords.forEach(r => {
      if (isNaN(r.date?.getTime())) return;
      const key = `${r.date.getFullYear()}-${r.date.getMonth()}`;
      if (tMap[key]) { tMap[key].docs++; tMap[key].value += r.val; }
    });
    const trendData = Object.values(tMap).sort((a, b) => a.sk - b.sk).map(t => ({ month: t.month, documents: t.docs, value: t.value }));

    // Activity data (last 7 days)
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const actMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      actMap[key] = { name: dayNames[d.getDay()], count: 0, sk: d.getTime() };
    }
    allRecords.forEach(r => {
      if (isNaN(r.date?.getTime())) return;
      const key = `${r.date.getFullYear()}-${r.date.getMonth()}-${r.date.getDate()}`;
      if (actMap[key]) actMap[key].count++;
    });
    const activityData = Object.values(actMap).sort((a, b) => a.sk - b.sk).map(a => ({ name: a.name, processed: a.count }));

    const totalDocs = salesOrders.length + invoices.length + paymentAdvices.length + seclF1.length + seclF2.length + cmpdcil.length + auctions.length + dispatch.length;
    const totalValue = soTotalAmt + invTotal + paTotalAmt;

    return {
      totalDocs, totalValue,
      soValid, soExpired, soTotalQty, soTotalAmt, soCount: salesOrders.length,
      paValid, paExpired, paTotalAmt, paCount: paymentAdvices.length,
      f1Qty, f1Bid, f1Count: seclF1.length, f1Pending, f1Done,
      f2Qty, f2Bid, f2Count: seclF2.length, f2Pending, f2Done,
      clQty, clValue, clCount: cmpdcil.length, clPending, clDone,
      seclTotalQty, seclTotalPending, seclTotalDone,
      invTotal, invCount: invoices.length,
      aucCount, aucTotalQty,
      dispQty, dispFreight, dispCount: dispatch.length,
      distData, trendData, activityData
    };
  }, [raw]);

  const fmtNum = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtCurrency = (v) => {
    const n = Number(v) || 0;
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(2)} K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="h-10 w-10 border-3 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-600 animate-pulse">Loading Coal Intelligence Dashboard...</p>
    </div>
  );

  return (
    <div className="w-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-200">
      
      {/* ═══════════ TOP EXECUTIVE BANNER ═══════════ */}
      <div className="relative overflow-hidden bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xs">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent pointer-events-none blur-2xl"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/25 shrink-0">
              <Flame size={30} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100/70 text-red-700 border border-red-200">
                  Operations & Intelligence
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Live Connected
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Coal System Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Comprehensive overview of Sales Orders, SECL Intimations, Payment Advices & Dispatch Pipeline
              </p>
            </div>
          </div>

          {/* Key High-Level Stats */}
          <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto">
            <div className="bg-slate-50/90 rounded-2xl px-3.5 py-2.5 border border-slate-200/80 flex flex-col justify-center min-w-[130px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Total Records</span>
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5 whitespace-nowrap">{stats.totalDocs}</span>
              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Across all tables</span>
            </div>

            <div className="bg-slate-50/90 rounded-2xl px-3.5 py-2.5 border border-slate-200/80 flex flex-col justify-center min-w-[145px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 whitespace-nowrap">Total Valuation</span>
              <span className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-0.5 whitespace-nowrap">{fmtCurrency(stats.totalValue)}</span>
              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">SO + Inv + Advices</span>
            </div>

            <div className="bg-slate-50/90 rounded-2xl px-3.5 py-2.5 border border-slate-200/80 flex flex-col justify-center min-w-[155px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 whitespace-nowrap">Total Coal Qty</span>
              <span className="text-base sm:text-lg font-black text-blue-700 font-mono mt-0.5 whitespace-nowrap">{fmtNum(stats.soTotalQty + stats.seclTotalQty)} MT</span>
              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Allotted & SO Volume</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SECTION 1: SALES ORDER (DO) ═══════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <SectionHeader 
          title="Sales Order (DO)" 
          subtitle="Contract allocations, active validity & tonnage tracking"
          icon={FileSpreadsheet} 
          count={stats.soCount}
          onNavigate={() => onNavigate("sales-order")} 
        />
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
          <StatBox label="Total DOs" value={stats.soCount} subtext="Registered orders" color="blue" icon={FileText} />
          <StatBox label="Active DOs" value={stats.soValid} badge="Valid" subtext="In validity period" color="emerald" />
          <StatBox label="Expired DOs" value={stats.soExpired} badge="Expired" subtext="Elapsed validity" color="rose" />
          <StatBox label="Total Quantity" value={`${fmtNum(stats.soTotalQty)} MT`} subtext="Combined DO tonnage" color="purple" icon={Boxes} />
          <StatBox label="Total Amount" value={fmtCurrency(stats.soTotalAmt)} subtext="Financial contract value" color="amber" icon={TrendingUp} />
        </div>
      </div>

      {/* ═══════════ SECTION 2: SECL PAYMENT ADVICE ═══════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <SectionHeader 
          title="SECL Payment Advice" 
          subtitle="Due dates, approved payment advices & total financial commitments"
          icon={Wallet} 
          count={stats.paCount}
          onNavigate={() => onNavigate("secl-payment-advice")} 
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <StatBox label="Total Advices" value={stats.paCount} subtext="Bank advices generated" color="blue" icon={Receipt} />
          <StatBox label="Active" value={stats.paValid} badge="Valid" subtext="Within payment window" color="emerald" />
          <StatBox label="Expired" value={stats.paExpired} badge="Expired" subtext="Past due date" color="rose" />
          <StatBox label="Grand Total" value={fmtCurrency(stats.paTotalAmt)} subtext="Cumulative payment value" color="amber" icon={TrendingUp} />
        </div>
      </div>

      {/* ═══════════ SECTION 3: SECL INTIMATION BREAKDOWN ═══════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <SectionHeader 
          title="SECL Intimation Formats" 
          subtitle="M-Junction, MSTC Auction allotments & CMPDCIL allocations"
          icon={FileText} 
          count={stats.f1Count + stats.f2Count + stats.clCount}
          onNavigate={() => onNavigate("secl-intimation")} 
        />

        {/* Aggregate Strip */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/70 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/70">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Total Allotted Qty</span>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono whitespace-nowrap">{fmtNum(stats.seclTotalQty)} MT</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 whitespace-nowrap">Pending Execution</span>
            <div className="text-base sm:text-lg font-black text-amber-700 font-mono whitespace-nowrap">{stats.seclTotalPending}</div>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 whitespace-nowrap">Completed (Done)</span>
            <div className="text-base sm:text-lg font-black text-emerald-700 font-mono whitespace-nowrap">{stats.seclTotalDone}</div>
          </div>
        </div>

        {/* 3 Formats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormatCard 
            title="M-Junction (Format 1)"
            count={stats.f1Count}
            qty={`${fmtNum(stats.f1Qty)} MT`}
            value={fmtCurrency(stats.f1Bid)}
            valueLabel="Winning Bid Rate"
            pending={stats.f1Pending}
            done={stats.f1Done}
            color="blue"
          />
          <FormatCard 
            title="MSTC (Format 2)"
            count={stats.f2Count}
            qty={`${fmtNum(stats.f2Qty)} MT`}
            value={fmtCurrency(stats.f2Bid)}
            valueLabel="Bid Price Rate"
            pending={stats.f2Pending}
            done={stats.f2Done}
            color="purple"
          />
          <FormatCard 
            title="CMPDCIL"
            count={stats.clCount}
            qty={`${fmtNum(stats.clQty)} MT`}
            value={fmtCurrency(stats.clValue)}
            valueLabel="Allocated Value"
            pending={stats.clPending}
            done={stats.clDone}
            color="teal"
          />
        </div>
      </div>

      {/* ═══════════ SECTION 4: INVOICE, AUCTION & DISPATCH ROW ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        
        {/* INVOICE CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <SectionHeader 
            title="Invoice" 
            subtitle="Commercial billing & tax invoices"
            icon={Receipt} 
            count={stats.invCount}
            onNavigate={() => onNavigate("invoice")} 
          />
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <StatBox label="Total Invoices" value={stats.invCount} subtext="Generated invoices" color="blue" icon={Receipt} />
            <StatBox label="Total Amount" value={fmtCurrency(stats.invTotal)} subtext="Tax invoice amount" color="emerald" icon={TrendingUp} />
          </div>
        </div>

        {/* AUCTION CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <SectionHeader 
            title="Auction / Deal" 
            subtitle="SECL e-Auction notices & lots"
            icon={Gavel} 
            count={stats.aucCount}
            onNavigate={() => onNavigate("auction")} 
          />
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <StatBox label="Total Auctions" value={stats.aucCount} subtext="Bidding notices" color="purple" icon={Gavel} />
            <StatBox label="Qty Offered" value={`${fmtNum(stats.aucTotalQty)} MT`} subtext="Volume on block" color="amber" icon={Boxes} />
          </div>
        </div>

        {/* DISPATCH CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <SectionHeader 
            title="Dispatch Tracking" 
            subtitle="Physical truck dispatches from mines"
            icon={Truck} 
            count={stats.dispCount}
            onNavigate={() => onNavigate("dispatch")} 
          />
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Dispatches" value={stats.dispCount} subtext="Truck records" color="blue" />
            <StatBox label="Total Qty" value={`${fmtNum(stats.dispQty)} MT`} subtext="Lifted tonnage" color="emerald" />
            <StatBox label="Freight" value={fmtCurrency(stats.dispFreight)} subtext="Transport cost" color="amber" />
          </div>
        </div>

      </div>

      {/* ═══════════ SECTION 5: ANALYTICS & QUICK NAVIGATION ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Document Distribution Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <PieChartIcon size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Document Volume Distribution
                </h3>
                <p className="text-xs text-slate-400 font-medium">Proportion of files across all functional areas</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-black text-slate-700 border border-slate-200">
              Total: {stats.totalDocs}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats.distData} 
                  innerRadius={65} 
                  outerRadius={100} 
                  paddingAngle={4} 
                  dataKey="value" 
                  stroke="none"
                >
                  {stats.distData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff", 
                    borderRadius: "14px", 
                    border: "1px solid #e2e8f0", 
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)", 
                    fontSize: "12px",
                    fontWeight: "700"
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links Navigation */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Quick Navigation
                </h3>
                <p className="text-xs text-slate-400 font-medium">Direct module access</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shortcuts</span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
            <QuickNavItem title="Sales Order (DO)" icon={FileSpreadsheet} count={stats.soCount} onClick={() => onNavigate("sales-order")} />
            <QuickNavItem title="SECL Payment Advice" icon={Wallet} count={stats.paCount} onClick={() => onNavigate("secl-payment-advice")} />
            <QuickNavItem title="SECL Intimation" icon={FileText} count={stats.f1Count + stats.f2Count + stats.clCount} onClick={() => onNavigate("secl-intimation")} />
            <QuickNavItem title="Invoice" icon={Receipt} count={stats.invCount} onClick={() => onNavigate("invoice")} />
            <QuickNavItem title="Auction / Deal" icon={Gavel} count={stats.aucCount} onClick={() => onNavigate("auction")} />
            <QuickNavItem title="Dispatch Tracking" icon={Truck} count={stats.dispCount} onClick={() => onNavigate("dispatch")} />
            <QuickNavItem title="Sauda Scale (Buy/Sell)" icon={Briefcase} count="" onClick={() => onNavigate("sauda-scale")} />
            <QuickNavItem title="Refund / Lapse" icon={RotateCcw} count="" onClick={() => onNavigate("refund-lapse")} />
          </div>
        </div>

      </div>

      {/* ═══════════ SECTION 6: TREND & ACTIVITY ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-6">
        
        {/* Monthly Trend */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Monthly Intake Trend
                </h3>
                <p className="text-xs text-slate-400 font-medium">Document volume (last 6 months)</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500">Last 6 Months</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData}>
                <defs>
                  <linearGradient id="gradDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} axisLine={false} tickLine={false} width={32} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff", 
                    borderRadius: "14px", 
                    border: "1px solid #e2e8f0", 
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)", 
                    fontSize: "12px",
                    fontWeight: "600"
                  }} 
                />
                <Area type="monotone" dataKey="documents" stroke="#ef4444" fill="url(#gradDocs)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  7-Day Operational Activity
                </h3>
                <p className="text-xs text-slate-400 font-medium">Daily document logs processed</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500">Last 7 Days</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} axisLine={false} tickLine={false} width={32} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff", 
                    borderRadius: "14px", 
                    border: "1px solid #e2e8f0", 
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)", 
                    fontSize: "12px",
                    fontWeight: "600"
                  }} 
                />
                <Bar dataKey="processed" fill="#dc2626" radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}

/* ═════════════════════════════════════════════════
   HELPER SUB-COMPONENTS
═════════════════════════════════════════════════ */

function SectionHeader({ title, subtitle, icon: Icon, count, onNavigate }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200/80 shadow-2xs shrink-0">
          <Icon size={16} className="stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {title}
            </h3>
            {count !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black font-mono bg-slate-100 text-slate-700 border border-slate-200">
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {onNavigate && (
        <button
          onClick={onNavigate}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
        >
          <span>View All</span>
          <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}

function StatBox({ label, value, subtext, badge, color = "blue", icon: Icon }) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50/50 hover:bg-blue-50/80",
      border: "border-blue-100 hover:border-blue-200",
      label: "text-blue-900",
      value: "text-blue-950",
      iconBg: "bg-blue-100 text-blue-700",
      badge: "bg-blue-100 text-blue-800 border-blue-200"
    },
    emerald: {
      bg: "bg-emerald-50/50 hover:bg-emerald-50/80",
      border: "border-emerald-100 hover:border-emerald-200",
      label: "text-emerald-900",
      value: "text-emerald-900",
      iconBg: "bg-emerald-100 text-emerald-700",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200"
    },
    rose: {
      bg: "bg-rose-50/50 hover:bg-rose-50/80",
      border: "border-rose-100 hover:border-rose-200",
      label: "text-rose-900",
      value: "text-rose-950",
      iconBg: "bg-rose-100 text-rose-700",
      badge: "bg-rose-100 text-rose-800 border-rose-200"
    },
    purple: {
      bg: "bg-purple-50/50 hover:bg-purple-50/80",
      border: "border-purple-100 hover:border-purple-200",
      label: "text-purple-900",
      value: "text-purple-950",
      iconBg: "bg-purple-100 text-purple-700",
      badge: "bg-purple-100 text-purple-800 border-purple-200"
    },
    amber: {
      bg: "bg-amber-50/50 hover:bg-amber-50/80",
      border: "border-amber-100 hover:border-amber-200",
      label: "text-amber-900",
      value: "text-amber-950",
      iconBg: "bg-amber-100 text-amber-700",
      badge: "bg-amber-100 text-amber-800 border-amber-200"
    }
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <div className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border ${style.border} ${style.bg} transition-all flex flex-col justify-between`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">
          {label}
        </span>
        {badge ? (
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${style.badge} whitespace-nowrap`}>
            {badge}
          </span>
        ) : Icon ? (
          <div className={`w-5 h-5 rounded-md ${style.iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={11} />
          </div>
        ) : null}
      </div>

      <div>
        <div className="text-sm sm:text-base lg:text-lg font-black font-mono text-slate-900 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
          {value}
        </div>
        {subtext && (
          <div className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}

function FormatCard({ title, count, qty, value, valueLabel, pending, done, color = "blue" }) {
  return (
    <div className="bg-slate-50/70 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">{title}</span>
        <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 text-[10px] font-mono font-black border border-slate-200 whitespace-nowrap">
          {count} Entries
        </span>
      </div>

      <div className="space-y-1 text-xs font-medium">
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">Quantity Allotted</span>
          <span className="font-mono font-bold text-slate-900 whitespace-nowrap">{qty}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">{valueLabel}</span>
          <span className="font-mono font-bold text-emerald-700 whitespace-nowrap">{value}</span>
        </div>
      </div>

      <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-bold">
        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 whitespace-nowrap">
          <Clock size={11} className="text-amber-600" />
          Pending: {pending}
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 whitespace-nowrap">
          <CheckCircle2 size={11} className="text-emerald-600" />
          Done: {done}
        </span>
      </div>
    </div>
  );
}

function QuickNavItem({ title, icon: Icon, count, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-red-50/50 border border-slate-200/70 hover:border-red-200 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 group-hover:text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
          <Icon size={14} />
        </div>
        <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {count !== "" && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-200/70 group-hover:bg-red-100 group-hover:text-red-700 text-slate-700">
            {count}
          </span>
        )}
        <ChevronRight size={14} className="text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
