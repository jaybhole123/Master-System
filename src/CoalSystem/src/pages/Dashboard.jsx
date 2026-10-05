import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts";
import { supabase } from "../utils/supabase";

const PIE_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

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
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "4px solid #e5e7eb", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", padding: "10px 32px 40px" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "0 0 6px 0", color: "var(--text)" }}>
            Dashboard Overview
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Real-time analytics across all Coal System modules
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>
            {stats.totalDocs} Total Records
          </div>
          <div style={{ background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            {fmtCurrency(stats.totalValue)}
          </div>
        </div>
      </div>

      {/* ═══════════ SECTION 1: SECL INTIMATION ═══════════ */}
      <SectionTitle title="SECL Intimation" icon="📑" onNavigate={() => onNavigate("secl-intimation")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
        <MiniCard label="Total Allotted" value={`${fmtNum(stats.seclTotalQty)} MT`} color="#3b82f6" />
        <MiniCard label="Total Pending" value={stats.seclTotalPending} color="#f59e0b" badge="Pending" />
        <MiniCard label="Total Done" value={stats.seclTotalDone} color="#10b981" badge="Done" />
      </div>
      {/* Sub-breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        <SubSection title="M-junction" items={[
          { label: "Records", value: stats.f1Count },
          { label: "Qty Allotted", value: `${fmtNum(stats.f1Qty)} MT` },
          { label: "Winning Bid", value: fmtCurrency(stats.f1Bid) },
          { label: "Pending", value: stats.f1Pending, color: "#f59e0b" },
          { label: "Done", value: stats.f1Done, color: "#10b981" }
        ]} color="#3b82f6" />
        <SubSection title="MSTC" items={[
          { label: "Records", value: stats.f2Count },
          { label: "Qty Allotted", value: `${fmtNum(stats.f2Qty)} MT` },
          { label: "Bid Price", value: fmtCurrency(stats.f2Bid) },
          { label: "Pending", value: stats.f2Pending, color: "#f59e0b" },
          { label: "Done", value: stats.f2Done, color: "#10b981" }
        ]} color="#8b5cf6" />
        <SubSection title="CMPDCIL" items={[
          { label: "Records", value: stats.clCount },
          { label: "Allocated", value: `${fmtNum(stats.clQty)} MT` },
          { label: "Value", value: fmtCurrency(stats.clValue) },
          { label: "Pending", value: stats.clPending, color: "#f59e0b" },
          { label: "Done", value: stats.clDone, color: "#10b981" }
        ]} color="#14b8a6" />
      </div>

      {/* ═══════════ SECTION 2: SALES ORDER ═══════════ */}
      <SectionTitle title="Sales Order (DO)" icon="📄" onNavigate={() => onNavigate("sales-order")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <MiniCard label="Total DOs" value={stats.soCount} color="#3b82f6" />
        <MiniCard label="Active DOs" value={stats.soValid} color="#10b981" badge="Valid" />
        <MiniCard label="Expired DOs" value={stats.soExpired} color="#ef4444" badge="Expired" />
        <MiniCard label="Total Quantity" value={`${fmtNum(stats.soTotalQty)} MT`} color="#8b5cf6" />
        <MiniCard label="Total Amount" value={fmtCurrency(stats.soTotalAmt)} color="#f59e0b" />
      </div>

      {/* ═══════════ SECTION 3: SECL PAYMENT ADVICE ═══════════ */}
      <SectionTitle title="SECL Payment Advice" icon="💰" onNavigate={() => onNavigate("secl-payment-advice")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <MiniCard label="Total Advices" value={stats.paCount} color="#3b82f6" />
        <MiniCard label="Active" value={stats.paValid} color="#10b981" badge="Valid" />
        <MiniCard label="Expired" value={stats.paExpired} color="#ef4444" badge="Expired" />
        <MiniCard label="Grand Total" value={fmtCurrency(stats.paTotalAmt)} color="#f59e0b" />
      </div>

      {/* ═══════════ SECTION 4: INVOICE ═══════════ */}
      <SectionTitle title="Invoice" icon="🧾" onNavigate={() => onNavigate("invoice")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <MiniCard label="Total Invoices" value={stats.invCount} color="#3b82f6" />
        <MiniCard label="Total Amount" value={fmtCurrency(stats.invTotal)} color="#10b981" />
      </div>

      {/* ═══════════ SECTION 5: AUCTION ═══════════ */}
      <SectionTitle title="Auction / Deal" icon="🔨" onNavigate={() => onNavigate("auction")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <MiniCard label="Total Auctions" value={stats.aucCount} color="#8b5cf6" />
        <MiniCard label="Qty Offered" value={`${fmtNum(stats.aucTotalQty)} MT`} color="#f59e0b" />
      </div>

      {/* ═══════════ SECTION 6: DISPATCH ═══════════ */}
      <SectionTitle title="Dispatch Tracking" icon="🚛" onNavigate={() => onNavigate("dispatch")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <MiniCard label="Total Dispatches" value={stats.dispCount} color="#3b82f6" />
        <MiniCard label="Total Qty" value={`${fmtNum(stats.dispQty)} MT`} color="#10b981" />
        <MiniCard label="Total Freight" value={fmtCurrency(stats.dispFreight)} color="#f59e0b" />
      </div>

      {/* ═══════════ CHARTS ROW ═══════════ */}
      <div className="dash-grid-main" style={{ marginBottom: 24 }}>
        {/* Document Distribution Pie */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: "0 0 20px 0", color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Document Distribution
          </h3>
          <div style={{ height: 320, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.distData} innerRadius={70} outerRadius={115} paddingAngle={4} dataKey="value" stroke="none">
                  {stats.distData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 13 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: "0 0 20px 0", color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Quick Navigation
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto" }}>
            <QuickLink title="Auction / Deal" icon="🔨" count={stats.aucCount} onClick={() => onNavigate("auction")} />
            <QuickLink title="SECL Intimation" icon="📑" count={stats.f1Count + stats.f2Count + stats.clCount} onClick={() => onNavigate("secl-intimation")} />
            <QuickLink title="SECL Payment Advice" icon="💰" count={stats.paCount} onClick={() => onNavigate("secl-payment-advice")} />
            <QuickLink title="Sales Order (DO)" icon="📄" count={stats.soCount} onClick={() => onNavigate("sales-order")} />
            <QuickLink title="Invoice" icon="🧾" count={stats.invCount} onClick={() => onNavigate("invoice")} />
            <QuickLink title="Dispatch" icon="🚛" count={stats.dispCount} onClick={() => onNavigate("dispatch")} />
            <QuickLink title="Refund / Lapse" icon="🔄" count="" onClick={() => onNavigate("refund-lapse")} />
          </div>
        </div>
      </div>

      {/* ═══════════ TREND + ACTIVITY ═══════════ */}
      <div className="dash-grid-main" style={{ marginBottom: 24 }}>
        {/* Monthly Trend */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: "0 0 20px 0", color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Monthly Document Trend
          </h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={stats.trendData}>
                <defs>
                  <linearGradient id="gradDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 13 }} />
                <Area type="monotone" dataKey="documents" stroke="#3b82f6" fill="url(#gradDocs)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: "0 0 20px 0", color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Weekly Activity
          </h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={stats.activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 13 }} />
                <Bar dataKey="processed" fill="#dc2626" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════ Sub-components ════════ */

function SectionTitle({ title, icon, onNavigate }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: 0, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </h3>
      </div>
      <button
        onClick={onNavigate}
        style={{
          background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 12px",
          fontSize: 12, color: "var(--muted)", cursor: "pointer", fontWeight: 600,
          transition: "all 0.2s"
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ember)"; e.currentTarget.style.color = "var(--ember)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--muted)"; }}
      >
        View All →
      </button>
    </div>
  );
}

function MiniCard({ label, value, color, badge }) {
  return (
    <div
      className="card"
      style={{
        padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8,
        transition: "transform 0.2s, box-shadow 0.2s", cursor: "default",
        background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)"
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
            background: color === "#10b981" ? "#d1fae5" : color === "#ef4444" ? "#fee2e2" : "#fef3c7",
            color: color === "#10b981" ? "#065f46" : color === "#ef4444" ? "#991b1b" : "#92400e"
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 28, fontWeight: 800, color: "var(--ember-bright)", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
    </div>
  );
}

function SubSection({ title, items, color }) {
  return (
    <div className="card" style={{ padding: "20px 24px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15 }}>
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>{item.label}</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--ember-bright)", fontFamily: "var(--font-mono, monospace)" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickLink({ title, icon, count, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer",
        transition: "all 0.2s ease", background: "var(--panel-2)"
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--ember)";
        e.currentTarget.style.background = "var(--ember-dim)";
        e.currentTarget.style.transform = "translateX(4px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--line)";
        e.currentTarget.style.background = "var(--panel-2)";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", flex: 1 }}>{title}</div>
      {count !== "" && (
        <div style={{ background: "var(--ember-dim)", color: "var(--ember)", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
          {count}
        </div>
      )}
      <div style={{ color: "var(--muted)", fontWeight: "bold", fontSize: 14 }}>→</div>
    </div>
  );
}
