import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  RotateCcw, 
  Calendar, 
  Share2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  ArrowRight, 
  ChevronRight, 
  DollarSign, 
  Car, 
  Building2, 
  Workflow, 
  Lock, 
  FileCheck,
  Eye,
  X,
  Sparkles,
  ShieldAlert,
  FileCheck2,
  Sliders,
  Send,
  Timer,
  BadgePercent,
  Cpu,
  Key,
  Archive,
  Award,
  Zap,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useDataStore from '../store/dataStore';
import useHeaderStore from '../store/headerStore';
import { 
  fetchDocumentsFromGoogleSheets, 
  fetchLoansFromGoogleSheets, 
  fetchCarInsuranceFromGoogleSheets 
} from '../utils/googleSheetsService';
import { syncSubscriptions } from '../utils/subscriptionSync';

export default function DocumentSystemFlow() {
  const navigate = useNavigate();
  const { setTitle } = useHeaderStore();
  const { documents, subscriptions, loans, setDocuments, setLoans, setSubscriptions } = useDataStore();

  const [loading, setLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'compliance_matrix' | 'renewal_cycle'>('pipeline');
  const [stats, setStats] = useState({
    documents: 0,
    carInsurance: 0,
    subscriptions: 0,
    loans: 0,
    renewalsPending: 0,
    bgs: 0
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [docs, loanData, carData] = await Promise.all([
        fetchDocumentsFromGoogleSheets().catch(() => []),
        fetchLoansFromGoogleSheets().catch(() => []),
        fetchCarInsuranceFromGoogleSheets().catch(() => [])
      ]);

      if (docs && docs.length > 0) setDocuments(docs);
      if (loanData && loanData.length > 0) setLoans(loanData);

      let subList: any[] = [];
      try {
        subList = await syncSubscriptions();
        if (subList && subList.length > 0) setSubscriptions(subList);
      } catch (e) {
        subList = subscriptions || [];
      }

      const activeDocs = docs || documents || [];
      const activeSubs = subList || subscriptions || [];
      const activeLoans = loanData || loans || [];

      // Calculate renewals pending
      const pendingDocRenewals = activeDocs.filter((d: any) => d.needsRenewal || (d.renewalDate && new Date(d.renewalDate) <= new Date())).length;
      const pendingSubRenewals = activeSubs.filter((s: any) => s.status === 'Active' || s.nextBillingDate).length;

      setStats({
        documents: activeDocs.length,
        carInsurance: carData ? carData.length : 0,
        subscriptions: activeSubs.length,
        loans: activeLoans.length,
        renewalsPending: pendingDocRenewals + pendingSubRenewals,
        bgs: 12 // Bank Guarantees default baseline
      });
    } catch (err) {
      console.error('Error fetching document & subscription stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTitle('Document & Subscription Flow');
    loadData();
  }, []);

  const flowStages = [
    {
      id: "stage-1",
      stepNum: "01",
      title: "Asset & Record Ingestion",
      subtitle: "Document Vault & Insurance Registry",
      phase: "Ingestion & Classification",
      icon: FileText,
      color: "border-blue-500",
      accent: "bg-blue-600 text-white",
      lightBg: "bg-blue-50/60",
      badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
      stats: `${stats.documents} Documents`,
      route: "/document/all",
      summary: "Centralized ingestion of corporate deeds, factory licenses, vehicular policies and tax filings into an encrypted cloud vault.",
      systemActions: [
        "Upload master contracts, lease deeds, registration certificates & CIN documents",
        "Record Policy Number, Insurer, IDV (Insured Declared Value), Premium & Validity",
        "Tag company branch, operating entity, department and primary concern person (HOD)",
        "Assign strict confidentiality tiers (Public, Confidential, Board-Level Restricted)",
        "Generate audit-ready Master Document Register (MDR) with cryptographic file checksums"
      ],
      keyDocuments: [
        "Incorporation Deeds & MCA Filings",
        "Commercial & Fleet Insurance Policies",
        "Factory & Environmental PCB Licenses"
      ],
      kpiNote: "Document metadata tagging enables 100% searchability and zero-missing filing audits."
    },
    {
      id: "stage-2",
      stepNum: "02",
      title: "Intelligent Expiry Radar",
      subtitle: "3-Tier Predictive Renewal Alerts",
      phase: "Monitoring & WhatsApp Alerts",
      icon: Calendar,
      color: "border-amber-500",
      accent: "bg-amber-500 text-white",
      lightBg: "bg-amber-50/60",
      badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
      stats: `${stats.renewalsPending} Expiries Monitored`,
      route: "/document/reminder-calendar",
      summary: "Automated cron schedule auditing document expiry dates with multi-channel WhatsApp and email escalation to prevent penalties.",
      systemActions: [
        "Continuously scan expiring documents across T-30, T-15, T-7 and Day 0 milestones",
        "Plot upcoming expiries onto the interactive Company Legal Calendar matrix",
        "Automate WhatsApp & Email renewal alerts directly to assigned Department Custodians",
        "Flag high-priority statutory expiries (Pollution, Fire NOC, Factory Inspector clearance)",
        "Lock un-renewed fleet vehicles from new trip dispatch allocations in Transport System"
      ],
      keyDocuments: [
        "Monthly Statutory Expiry Schedule",
        "WhatsApp / Email Escalation Logs",
        "Vehicle Compliance Fitness Cards"
      ],
      kpiNote: "Automated multi-stage alerts completely eliminate late renewal fines and regulatory shutdowns."
    },
    {
      id: "stage-3",
      stepNum: "03",
      title: "Subscription & SaaS Governance",
      subtitle: "Dual-Tier Financial Approval Workflow",
      phase: "Approval & Cost Control",
      icon: CreditCard,
      color: "border-purple-500",
      accent: "bg-purple-600 text-white",
      lightBg: "bg-purple-50/60",
      badgeBg: "bg-purple-100 text-purple-700 border-purple-200",
      stats: `${stats.subscriptions} Active Subscriptions`,
      route: "/subscription/approval",
      summary: "Dual-level management approval and automated payment authorization for corporate software tools, cloud servers, and recurrent utilities.",
      systemActions: [
        "Maintain central repository of SaaS vendors, cloud infrastructures & recurring tool seats",
        "Verify license utilization and seat demand before monthly/annual renewal",
        "Route approval requests to HOD, COO and Director with cost vs budget variance",
        "Generate electronic payment vouchers with GST credit capture & bank debit reconciliation",
        "Auto-update next billing cycles, pricing changes, and contract termination terms"
      ],
      keyDocuments: [
        "Vendor Subscription Service Agreements",
        "Dual-Tier Executive Approval Note",
        "GST Input Tax Credit Invoice"
      ],
      kpiNote: "Enforces zero unauthorized recurring charges and trims zombie software seats."
    },
    {
      id: "stage-4",
      stepNum: "04",
      title: "Financing & Bank Guarantees",
      subtitle: "Capital Facilities & Exposure Management",
      phase: "Banking & Liability Auditing",
      icon: Banknote,
      color: "border-emerald-500",
      accent: "bg-emerald-600 text-white",
      lightBg: "bg-emerald-50/60",
      badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
      stats: `${stats.loans} Loan Portfolios`,
      route: "/loan/all",
      summary: "End-to-end monitoring of secured bank borrowings, machinery financing, EMI schedules, and Bank Guarantee (BG) limits.",
      systemActions: [
        "Track loan disbursement terms, fixed vs floating interest margins, and tenure schedules",
        "Monitor monthly EMI auto-debit clearance and principal amortization breakdown",
        "Track Bank Guarantee (BG) issuance, margin money lien deposits, and claim expiry dates",
        "Audit collateral security charges and hypothecation registrations with ROC (Form CHG-1)",
        "Generate bank liability position statements for executive management review"
      ],
      keyDocuments: [
        "Bank Sanction Letters & Hypothecation Deeds",
        "Bank Guarantee (BG) Originals & Margin Slips",
        "ROC Charge Satisfaction Receipts (Form CHG-4)"
      ],
      kpiNote: "Maintains optimal debt-servicing ratios and ensures zero default penalties on credit lines."
    },
    {
      id: "stage-5",
      stepNum: "05",
      title: "Foreclosure, NOC & Clearance",
      subtitle: "Asset Un-encumbrance & Title Closure",
      phase: "Closure & Compliance Archive",
      icon: RotateCcw,
      color: "border-rose-500",
      accent: "bg-rose-600 text-white",
      lightBg: "bg-rose-50/60",
      badgeBg: "bg-rose-100 text-rose-700 border-rose-200",
      stats: `${stats.bgs} Active BGs`,
      route: "/loan/noc",
      summary: "Early loan payoff settlements, retrieval of physical bank No-Objection Certificates (NOC), title deed release, and secure archival.",
      systemActions: [
        "Calculate early prepayment penalties vs interest savings on loan foreclosure",
        "Submit formal Foreclosure Payoff Request to lending consortium / bank branch",
        "Collect Physical Bank NOC and original title deeds / vehicle RTO Form 35 hypothecation release",
        "Remove bank hypothecation from state transport portal (Vahan) and property registrar",
        "Transfer settled portfolio records to Permanent Vault Archive with immutable history logs"
      ],
      keyDocuments: [
        "Bank Loan Clearance Certificate & Final Statement",
        "Original Bank No-Objection Certificate (NOC)",
        "RTO Hypothecation Cancellation (Form 35)"
      ],
      kpiNote: "Guarantees complete legal asset title liberation and prevents unreleased bank charge liabilities."
    }
  ];

  return (
    <div className="w-full space-y-6 pb-12 max-w-7xl mx-auto">
      {/* ═══════════ TOP HEADER SECTION ═══════════ */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-red-600 to-rose-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-red-500/25 shrink-0">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Document &amp; Subscription <span className="text-red-600">Enterprise Flow</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Compliance &amp; Asset Vault Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                End-to-End Enterprise Governance: Document Ingestion, 3-Tier Renewal Radar, SaaS Approval, Financing &amp; Bank NOC Close
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : 'text-gray-500'}`} />
              <span>Sync Live Stats</span>
            </button>
            <button
              onClick={() => navigate('/doc-dashboard')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-500/20 transition-all active:scale-95"
            >
              <span>Open Overview Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ KPI STAT COUNTERS ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-blue-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Vault Documents</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.documents}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-emerald-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Car Insurance</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.carInsurance}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-purple-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Subscriptions</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.subscriptions}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-amber-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Due Renewals</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.renewalsPending}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-red-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Active Loans</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.loans}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-indigo-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Bank Guarantees</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.bgs}</div>
          </div>
        </div>
      </div>

      {/* ═══════════ RECENT STATUTORY UPGRADES TICKER ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-blue-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Lock className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Encrypted Cloud Vault</div>
            <div className="text-xs font-extrabold text-slate-800">12 Category Ingestion</div>
            <p className="text-[10px] text-slate-400">Deeds, CIN, PAN, GSTIN &amp; Leases</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Timer className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Zero Lapse Engine</div>
            <div className="text-xs font-extrabold text-slate-800">T-30 to T-0 Radar</div>
            <p className="text-[10px] text-slate-400">WhatsApp &amp; Email HOD Alerts</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-purple-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-purple-600">Spend Control</div>
            <div className="text-xs font-extrabold text-slate-800">Dual SaaS Approval</div>
            <p className="text-[10px] text-slate-400">HOD + Finance Voucher Clearing</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Title Liberation</div>
            <div className="text-xs font-extrabold text-slate-800">Loan Foreclosure &amp; NOC</div>
            <p className="text-[10px] text-slate-400">RTO Form 35 &amp; ROC Satisfaction</p>
          </div>
        </div>
      </div>

      {/* ═══════════ NAVIGATION TABS (PIPELINE / COMPLIANCE MATRIX / RENEWAL RADAR) ═══════════ */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>End-to-End Governance Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('compliance_matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'compliance_matrix'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Corporate Checklist (MCA, Bank &amp; Tax)</span>
          </button>

          <button
            onClick={() => setActiveTab('renewal_cycle')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'renewal_cycle'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Predictive Renewal Calendar Engine</span>
          </button>
        </div>

        <span className="hidden sm:inline-flex text-[11px] font-bold text-gray-400">
          Click any card for full step-by-step checklist &amp; audit rules
        </span>
      </div>

      {/* ═══════════ TAB 1: 5-PHASE INTERACTIVE MASTER FLOWCHART ═══════════ */}
      {activeTab === 'pipeline' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
                  <Workflow className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Document Lifecycle &amp; Statutory Compliance Architecture
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Sequential flow: Asset Ingestion $\rightarrow$ Expiry Radar $\rightarrow$ SaaS Governance $\rightarrow$ Bank Financing $\rightarrow$ Loan NOC Retrieval
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              5-Stage Enterprise Pipeline
            </span>
          </div>

          {/* 5-Step Desktop Grid with Directional Connectors */}
          <div className="relative py-4 px-2 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch relative z-10">
              {flowStages.map((stage, idx) => {
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
                    {idx < flowStages.length - 1 && (
                      <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-red-600 text-white items-center justify-center shadow-md ring-2 ring-white">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ═══════════ TIME-EXPIRING SHARING & TITLE CLOSURE BANNER ═══════════ */}
            <div className="mt-6 pt-5 border-t border-dashed border-slate-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
                    <Share2 className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      Secure External Document Sharing &amp; Loan NOC Settlement
                      <span className="px-2 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                        Zero Security Leak
                      </span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      External auditors, tenders aur bankers ko time-limited password-protected download links provide kiye jate hain. Loan repayment complete hote hi <strong>Bank NOC Registry</strong> hypothecation release records ko secure vault me archive kar deti hai.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate('/document/shared')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    Shared Logs
                  </button>
                  <button
                    onClick={() => navigate('/loan/noc')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    Collect NOC
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 2: CORPORATE CHECKLIST (MCA, BANK & TAX) ═══════════ */}
      {activeTab === 'compliance_matrix' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Corporate Master Checklist Architecture (MCA Sections A–E)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Standard corporate filing checklist for Companies, Partnerships, and Factory Plants
              </p>
            </div>
            <button
              onClick={() => navigate('/document-vault/company')}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Company Vault Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Section A: MCA Incorporation</div>
              <div className="text-sm font-extrabold text-gray-900">Entity Master Records</div>
              <div className="font-mono text-xs bg-white p-2 rounded-lg border border-blue-200 text-blue-900 space-y-1">
                <div>• Certificate of Incorporation (COI)</div>
                <div>• MOA &amp; AOA Constituent Charter</div>
                <div>• Director DIN &amp; KYC Verification</div>
              </div>
              <p className="text-[11px] text-gray-600">
                Core statutory identity documents required for banking consortium and government contracts.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-2">
              <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Section B: Indirect Taxes</div>
              <div className="text-sm font-extrabold text-gray-900">GST, IEC &amp; Trade Licenses</div>
              <div className="font-mono text-xs bg-white p-2 rounded-lg border border-indigo-200 text-indigo-900 space-y-1">
                <div>• GSTIN State Registrations</div>
                <div>• Import Export Code (IEC)</div>
                <div>• Municipal Trade &amp; Gumasta License</div>
              </div>
              <p className="text-[11px] text-gray-600">
                Valid state-wise sales certificates and import-export licenses for multi-location depots.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
              <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Section C: Factory &amp; Operations</div>
              <div className="text-sm font-extrabold text-gray-900">Plant Environmental NOC</div>
              <div className="font-mono text-xs bg-white p-2 rounded-lg border border-purple-200 text-purple-900 space-y-1">
                <div>• Pollution Control Board (Consent to Operate)</div>
                <div>• State Fire Safety NOC &amp; Audits</div>
                <div>• Boiler &amp; Weighbridge Calibration</div>
              </div>
              <p className="text-[11px] text-gray-600">
                Operational safety and weighment calibration compliance required for uninterrupted dispatch.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Section D &amp; E: Banking &amp; Tax</div>
              <div className="text-sm font-extrabold text-gray-900">Audited Financials &amp; ITR</div>
              <div className="font-mono text-xs bg-white p-2 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
                <div>• 3-Year Audited Balance Sheets</div>
                <div>• Income Tax Returns &amp; Tax Audit</div>
                <div>• Bank Sanctions &amp; Charge Creation</div>
              </div>
              <p className="text-[11px] text-gray-600">
                Mandatory credit appraisal documents ready for instant tender submissions and loan renewals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 3: PREDICTIVE RENEWAL CALENDAR ENGINE ═══════════ */}
      {activeTab === 'renewal_cycle' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                3-Tier Renewal Escalation Engine
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Multi-channel alerts preventing vehicular penalty points, lapse fines, and license cancellation
              </p>
            </div>
            <button
              onClick={() => navigate('/document/reminder-calendar')}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open Renewal Calendar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-gray-200 bg-amber-50/40 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                <Timer className="w-4 h-4 text-amber-600" />
                Milestone 1: T-30 Days Notice
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                System initiates early warning trigger. Department HOD receives email notification with quotation requests for renewal premiums.
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-[11px] font-mono text-amber-900">
                Action: Insurance Broker Quotation Requested
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-orange-50/40 space-y-2.5">
              <div className="flex items-center gap-2 text-orange-900 font-extrabold text-sm">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                Milestone 2: T-15 Days Critical Escalation
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Automatic WhatsApp notice dispatched to assigned concern person. Flag turns Amber in Master Dashboard and daily scheduler.
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-orange-200 text-[11px] font-mono text-orange-900">
                Action: Payment Voucher Raised in Accounts
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-rose-50/40 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Milestone 3: T-7 &amp; Day 0 Emergency Lock
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Red alert escalation sent to Director. If vehicular insurance or fitness expires, the vehicle is auto-flagged in transport system.
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-rose-200 text-[11px] font-mono text-rose-900">
                Action: Direct Management Intervention
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ DIRECT MODULE NAVIGATION GRID ═══════════ */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
          Document &amp; Subscription Direct Module Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
          {[
            { label: 'Overview', path: '/doc-dashboard', icon: Layers },
            { label: 'Insurance', path: '/resource-manager', icon: ShieldCheck },
            { label: 'Car Insurance', path: '/document/car-insurance', icon: Car },
            { label: 'Doc Vault', path: '/document/all', icon: FileText },
            { label: 'Doc Renewal', path: '/document/renewal', icon: RotateCcw },
            { label: 'Shared Docs', path: '/document/shared', icon: Share2 },
            { label: 'Calendar', path: '/document/reminder-calendar', icon: Calendar },
            { label: 'Sub Approval', path: '/subscription/approval', icon: CheckCircle2 },
            { label: 'Sub Payment', path: '/subscription/payment', icon: CreditCard },
            { label: 'Loans & NOC', path: '/loan/all', icon: Banknote }
          ].map((item, i) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-red-400 hover:bg-red-50/50 hover:shadow-xs transition-all text-center group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-red-100 text-gray-500 group-hover:text-red-600 transition-colors mb-1.5">
                  <ItemIcon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700 group-hover:text-red-700 truncate w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
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
                {selectedStage.systemActions.map((action: string, i: number) => (
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
                {selectedStage.keyDocuments.map((doc: string, idx: number) => (
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

