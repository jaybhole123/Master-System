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
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ShieldCheck,
  ChevronRight,
  Wallet,
  Sparkles
} from "lucide-react";

const PIE_COLORS = ["#2563eb", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

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

    // Sales Orders
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

    // Pie chart data
    let distData = [
      { name: "Sales Orders", value: salesOrders.length },
      { name: "Invoices", value: invoices.length },
      { name: "Payment Advices", value: paymentAdvices.length },
      { name: "M-junction", value: seclF1.length },
      { name: "MSTC", value: seclF2.length },
      { name: "CMPDCIL", value: cmpdcil.length },
      { name: "Auctions", value: auctions.length },
      { name: "Dispatch", value: dispatch.length }
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="h-10 w-10 border-3 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
      <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading Coal Intelligence Dashboard...</p>
    </div>
  );

  return (
    <div className="w-full px-3 sm:px-6 py-2 space-y-8 animate-in fade-in duration-300">
      
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-[11px] font-bold text-red-600 mb-2 uppercase tracking-wider shadow-2xs">
            <Flame className="h-3.5 w-3.5 text-red-500" />
            <span>Coal Intelligence & Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time analytics across all Coal System modules
          </p>
        </div>

        {/* Top Metric Capsules */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Records</div>
              <div className="text-base font-extrabold text-slate-900 leading-tight">{stats.totalDocs}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Valuation</div>
              <div className="text-base font-extrabold text-emerald-600 leading-tight">{fmtCurrency(stats.totalValue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SECTION 1: SECL INTIMATION ═══════════ */}
      <section>
        <SectionTitle title="SECL Intimation" icon={FileText} onNavigate={() => onNavigate("secl-intimation")} />
        
        {/* Top KPI Cards - Single Line */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }} className="mb-3">
          <MiniCard label="Total Allotted" value={`${fmtNum(stats.seclTotalQty)} MT`} icon={Boxes} colorScheme="blue" />
          <MiniCard label="Total Pending" value={stats.seclTotalPending} badge="Pending" colorScheme="amber" />
          <MiniCard label="Total Done" value={stats.seclTotalDone} badge="Done" colorScheme="emerald" />
        </div>

        {/* Sub-breakdown: M-junction, MSTC, CMPDCIL - Single Line */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
          <SubSection 
            title="M-Junction" 
            color="blue"
            items={[
              { label: "Records", value: stats.f1Count },
              { label: "Qty Allotted", value: `${fmtNum(stats.f1Qty)} MT` },
              { label: "Winning Bid", value: fmtCurrency(stats.f1Bid) },
              { label: "Pending", value: stats.f1Pending },
              { label: "Done", value: stats.f1Done }
            ]} 
          />
          <SubSection 
            title="MSTC" 
            color="purple"
            items={[
              { label: "Records", value: stats.f2Count },
              { label: "Qty Allotted", value: `${fmtNum(stats.f2Qty)} MT` },
              { label: "Bid Price", value: fmtCurrency(stats.f2Bid) },
              { label: "Pending", value: stats.f2Pending },
              { label: "Done", value: stats.f2Done }
            ]} 
          />
          <SubSection 
            title="CMPDCIL" 
            color="teal"
            items={[
              { label: "Records", value: stats.clCount },
              { label: "Allocated", value: `${fmtNum(stats.clQty)} MT` },
              { label: "Value", value: fmtCurrency(stats.clValue) },
              { label: "Pending", value: stats.clPending },
              { label: "Done", value: stats.clDone }
            ]} 
          />
        </div>
      </section>

      {/* ═══════════ SECTION 2: SALES ORDER (DO) - Single Line ═══════════ */}
      <section>
        <SectionTitle title="Sales Order (DO)" icon={FileSpreadsheet} onNavigate={() => onNavigate("sales-order")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px" }}>
          <MiniCard label="Total DOs" value={stats.soCount} icon={FileText} colorScheme="blue" />
          <MiniCard label="Active DOs" value={stats.soValid} badge="Valid" colorScheme="emerald" />
          <MiniCard label="Expired DOs" value={stats.soExpired} badge="Expired" colorScheme="red" />
          <MiniCard label="Total Quantity" value={`${fmtNum(stats.soTotalQty)} MT`} icon={Boxes} colorScheme="purple" />
          <MiniCard label="Total Amount" value={fmtCurrency(stats.soTotalAmt)} icon={TrendingUp} colorScheme="amber" />
        </div>
      </section>

      {/* ═══════════ SECTION 3: SECL PAYMENT ADVICE - Single Line ═══════════ */}
      <section>
        <SectionTitle title="SECL Payment Advice" icon={Wallet} onNavigate={() => onNavigate("secl-payment-advice")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" }}>
          <MiniCard label="Total Advices" value={stats.paCount} icon={FileText} colorScheme="blue" />
          <MiniCard label="Active" value={stats.paValid} badge="Valid" colorScheme="emerald" />
          <MiniCard label="Expired" value={stats.paExpired} badge="Expired" colorScheme="red" />
          <MiniCard label="Grand Total" value={fmtCurrency(stats.paTotalAmt)} icon={TrendingUp} colorScheme="amber" />
        </div>
      </section>

      {/* ═══════════ SECTION 4: INVOICE, AUCTION & DISPATCH ROW - Single Line ═══════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px" }}>
        
        {/* INVOICE */}
        <section className="space-y-3">
          <SectionTitle title="Invoice" icon={Receipt} onNavigate={() => onNavigate("invoice")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
            <MiniCard label="Total Invoices" value={stats.invCount} icon={Receipt} colorScheme="blue" />
            <MiniCard label="Total Amount" value={fmtCurrency(stats.invTotal)} icon={TrendingUp} colorScheme="emerald" />
          </div>
        </section>

        {/* AUCTION */}
        <section className="space-y-3">
          <SectionTitle title="Auction / Deal" icon={Gavel} onNavigate={() => onNavigate("auction")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
            <MiniCard label="Total Auctions" value={stats.aucCount} icon={Gavel} colorScheme="purple" />
            <MiniCard label="Qty Offered" value={`${fmtNum(stats.aucTotalQty)} MT`} icon={Boxes} colorScheme="amber" />
          </div>
        </section>

        {/* DISPATCH */}
        <section className="space-y-3">
          <SectionTitle title="Dispatch Tracking" icon={Truck} onNavigate={() => onNavigate("dispatch")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px" }}>
            <MiniCard label="Dispatches" value={stats.dispCount} icon={Truck} colorScheme="blue" />
            <MiniCard label="Total Qty" value={`${fmtNum(stats.dispQty)} MT`} colorScheme="emerald" />
            <MiniCard label="Freight" value={fmtCurrency(stats.dispFreight)} colorScheme="amber" />
          </div>
        </section>

      </div>

      {/* ═══════════ CHARTS & NAVIGATION ROW ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Document Distribution Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Document Distribution
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Total {stats.totalDocs} Records
            </span>
          </div>

          <div className="h-72 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats.distData} 
                  innerRadius={65} 
                  outerRadius={105} 
                  paddingAngle={3} 
                  dataKey="value" 
                  stroke="none"
                >
                  {stats.distData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff", 
                    borderRadius: "12px", 
                    border: "1px solid #e2e8f0", 
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", 
                    fontSize: "12px",
                    fontWeight: "600"
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 14 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links Navigation */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                <Layers className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Quick Navigation
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Shortcuts
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
            <QuickLink title="Auction / Deal" icon={Gavel} count={stats.aucCount} onClick={() => onNavigate("auction")} />
            <QuickLink title="SECL Intimation" icon={FileText} count={stats.f1Count + stats.f2Count + stats.clCount} onClick={() => onNavigate("secl-intimation")} />
            <QuickLink title="SECL Payment Advice" icon={Wallet} count={stats.paCount} onClick={() => onNavigate("secl-payment-advice")} />
            <QuickLink title="Sales Order (DO)" icon={FileSpreadsheet} count={stats.soCount} onClick={() => onNavigate("sales-order")} />
            <QuickLink title="Invoice" icon={Receipt} count={stats.invCount} onClick={() => onNavigate("invoice")} />
            <QuickLink title="Dispatch" icon={Truck} count={stats.dispCount} onClick={() => onNavigate("dispatch")} />
            <QuickLink title="Refund / Lapse" icon={RotateCcw} count="" onClick={() => onNavigate("refund-lapse")} />
          </div>
        </div>

      </div>

      {/* ═══════════ TREND & ACTIVITY ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 pb-6">
        
        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Monthly Document Trend
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Last 6 Months</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData}>
                <defs>
                  <linearGradient id="gradDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff", 
                    borderRadius: "12px", 
                    border: "1px solid #e2e8f0", 
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", 
                    fontSize: "12px" 
                  }} 
                />
                <Area type="monotone" dataKey="documents" stroke="#2563eb" fill="url(#gradDocs)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Weekly Activity
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Last 7 Days</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff", 
                    borderRadius: "12px", 
                    border: "1px solid #e2e8f0", 
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", 
                    fontSize: "12px" 
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
   SUB-COMPONENTS (Clean & Professional)
═════════════════════════════════════════════════ */

function SectionTitle({ title, icon: Icon, onNavigate }) {
  return (
    <div className="flex items-center justify-between mb-3.5 mt-8 first:mt-0">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200/70 shadow-2xs">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-wide uppercase">
          {title}
        </h3>
      </div>
      {onNavigate && (
        <button
          onClick={onNavigate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-red-200 hover:text-red-600 transition-all shadow-2xs group cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}

function MiniCard({ label, value, colorScheme = "blue", badge, icon: Icon, subtext }) {
  const schemeMap = {
    blue: { bg: "bg-blue-50", border: "border-blue-200/60", text: "text-blue-600", badgeBg: "bg-blue-50 text-blue-700 border-blue-200" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200/60", text: "text-emerald-600", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    amber: { bg: "bg-amber-50", border: "border-amber-200/60", text: "text-amber-600", badgeBg: "bg-amber-50 text-amber-700 border-amber-200" },
    red: { bg: "bg-rose-50", border: "border-rose-200/60", text: "text-rose-600", badgeBg: "bg-rose-50 text-rose-700 border-rose-200" },
    purple: { bg: "bg-purple-50", border: "border-purple-200/60", text: "text-purple-600", badgeBg: "bg-purple-50 text-purple-700 border-purple-200" },
    slate: { bg: "bg-slate-100", border: "border-slate-200/60", text: "text-slate-600", badgeBg: "bg-slate-100 text-slate-700 border-slate-200" },
  };
  const current = schemeMap[colorScheme] || schemeMap.blue;

  return (
    <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title={label}>
          {label}
        </span>
        {badge ? (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${current.badgeBg}`}>
            {badge}
          </span>
        ) : Icon ? (
          <div className={`p-1 rounded-lg shrink-0 ${current.bg} ${current.text}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        ) : null}
      </div>

      <div>
        <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate" title={String(value)}>
          {value}
        </div>
        {subtext && (
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}

function SubSection({ title, items, color = "blue" }) {
  const pendingItem = items.find(it => it.label.toLowerCase() === 'pending');
  const doneItem = items.find(it => it.label.toLowerCase() === 'done');
  const regularItems = items.filter(it => it.label.toLowerCase() !== 'pending' && it.label.toLowerCase() !== 'done');

  const colorStyles = {
    blue: { dot: "bg-blue-500", tagBg: "bg-blue-50 text-blue-700 border-blue-200", border: "hover:border-blue-300" },
    purple: { dot: "bg-purple-500", tagBg: "bg-purple-50 text-purple-700 border-purple-200", border: "hover:border-purple-300" },
    teal: { dot: "bg-teal-500", tagBg: "bg-teal-50 text-teal-700 border-teal-200", border: "hover:border-teal-300" }
  };
  const theme = colorStyles[color] || colorStyles.blue;

  return (
    <div className={`bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between min-w-0 ${theme.border}`}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`}></span>
            <h4 className="text-xs font-extrabold text-slate-800 tracking-wide uppercase truncate">
              {title}
            </h4>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${theme.tagBg}`}>
            Format
          </span>
        </div>

        {/* Regular Metric Rows */}
        <div className="space-y-1">
          {regularItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded hover:bg-slate-50 transition-colors">
              <span className="text-slate-500 font-medium truncate">{item.label}</span>
              <span className="font-bold text-slate-900 font-mono text-xs shrink-0 ml-1">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Footer Pill */}
      {(pendingItem || doneItem) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[10px]">
          {pendingItem && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold flex-1 justify-center truncate">
              <Clock className="h-3 w-3 text-amber-600 shrink-0" />
              <span>Pending: {pendingItem.value}</span>
            </div>
          )}
          {doneItem && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold flex-1 justify-center truncate">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>Done: {doneItem.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickLink({ title, icon: Icon, count, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-red-50/40 border border-slate-200/70 hover:border-red-200 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-white rounded-lg border border-slate-200/60 text-slate-600 group-hover:text-red-600 transition-colors shadow-2xs">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">
          {title}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {count !== "" && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 group-hover:bg-red-100 group-hover:text-red-700 text-slate-600 transition-colors">
            {count}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}
