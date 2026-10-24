import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useVault } from "../context/VaultContext";
import {
  Shield, 
  Users, 
  FileText, 
  Clock, 
  AlertTriangle,
  ArrowRight, 
  ArrowDown, 
  CheckCircle2, 
  Sparkles,
  Database, 
  RefreshCw,
  FileCheck2, 
  Layers, 
  Building2,
  Workflow,
  Eye,
  X,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Lock,
  RotateCcw,
  FileCheck,
  Briefcase,
  AlertCircle,
  Timer,
  Share2,
  Cpu,
  BadgeCheck,
  CheckSquare
} from "lucide-react";
import { COMPANY_CHECKLIST_SECTIONS } from "../utils/constants";

export default function DocumentVaultSystemFlow() {
  const navigate = useNavigate();
  const { clients, docs } = useVault();

  const [selectedStage, setSelectedStage] = useState(null);
  const [activeTab, setActiveTab] = useState("pipeline"); // "pipeline" | "sections" | "expiry_radar"

  // Live KPI statistics computed directly from vault context
  const stats = useMemo(() => {
    const totalClients = clients?.length || 0;
    const individualClients = clients?.filter(c => !c.ctype || c.ctype === "Individual")?.length || 0;
    const corporateClients = clients?.filter(c => c.ctype && c.ctype !== "Individual")?.length || 0;
    const totalDocs = docs?.length || 0;
    
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    const expired = docs?.filter(d => d.exp && new Date(d.exp) < now)?.length || 0;
    const expiringSoon = docs?.filter(d => {
      if (!d.exp) return false;
      const dDate = new Date(d.exp);
      return dDate >= now && dDate <= in30Days;
    })?.length || 0;

    return {
      totalClients,
      individualClients,
      corporateClients,
      totalDocs,
      expired,
      expiringSoon,
      renewalsDue: expired + expiringSoon
    };
  }, [clients, docs]);

  const flowStages = [
    {
      id: "stage-1",
      stepNum: "01",
      title: "Entity & KYC Onboarding",
      subtitle: "Multi-Category Person Master",
      phase: "Identity & Validation",
      icon: Users,
      color: "border-red-500",
      accent: "bg-red-600 text-white",
      lightBg: "bg-red-50/60",
      badgeBg: "bg-red-100 text-red-700 border-red-200",
      stats: `${stats.totalClients} Entities Registered`,
      route: "/document-vault",
      summary: "Registration and multi-format KYC validation for Individuals, Proprietary Firms, Private Limited Companies, and Manufacturing Plants.",
      systemActions: [
        "Select Entity Type: Individual, Firm, Company, or Manufacturing Plant",
        "Capture legal identifiers with real-time format regex: GSTIN, PAN, CIN, and Aadhar",
        "Store communication records (Primary Contact, Registered Email, Operational Address)",
        "Configure entity-specific metadata fields and operational jurisdiction",
        "Generate unique Master Client ID with cryptographic data indexing"
      ],
      keyDocuments: [
        "Certificate of Incorporation (COI)",
        "PAN & Aadhaar Identity Verification",
        "Board Resolution / Authorization Letter"
      ],
      kpiNote: "Strict regex validation guarantees zero invalid GSTIN/PAN records across the registry."
    },
    {
      id: "stage-2",
      stepNum: "02",
      title: "Encrypted Document Ingestion",
      subtitle: "12-Category Cloud Storage",
      phase: "Ingestion & Classification",
      icon: FileText,
      color: "border-rose-500",
      accent: "bg-rose-600 text-white",
      lightBg: "bg-rose-50/60",
      badgeBg: "bg-rose-100 text-rose-700 border-rose-200",
      stats: `${stats.totalDocs} Files Ingested`,
      route: "/document-vault",
      summary: "Upload and indexing across 12 document categories with metadata extraction, issue dates, and document identification numbers.",
      systemActions: [
        "Categorize documents: Driving Licence, Property Deed, RC, Passport, Tax/GST, etc.",
        "Store Document Number, Place of Issue, Issuing Authority & Valid Expiry Date",
        "Upload high-res scans in PDF, Image, Word or Excel formats (up to 15 MB per file)",
        "Attach custom tags and confidential access privileges",
        "Generate audit-safe preview thumbnails and secure client-side storage cache"
      ],
      keyDocuments: [
        "Registered Property Title Deeds",
        "Commercial Fleet Vehicle RC & Fitness",
        "GST Certificates & Trade Licenses"
      ],
      kpiNote: "Multi-format file upload stores high-res original copies with zero compression loss."
    },
    {
      id: "stage-3",
      stepNum: "03",
      title: "Predictive Expiry Radar",
      subtitle: "30-Day Warning & Lapse Prevention",
      phase: "Monitoring & Audit",
      icon: Clock,
      color: "border-amber-500",
      accent: "bg-amber-500 text-white",
      lightBg: "bg-amber-50/60",
      badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
      stats: `${stats.renewalsDue} Expiries Tracked`,
      route: "/document-vault",
      summary: "Real-time expiration calendar calculating document validity windows, auto-flagging expired records, and issuing warning statuses.",
      systemActions: [
        "Continuous cron background computation: Valid (Green), Expiring Soon (Amber), Expired (Red)",
        "Automated 30-day early warning threshold trigger for vehicular & statutory filings",
        "Interactive dashboard status counters updating in real-time without manual refresh",
        "Priority alert escalation on critical regulatory licenses (Pollution NOC, Fire Safety)",
        "Prevent downstream allocation of expired vehicles or un-certified drivers"
      ],
      keyDocuments: [
        "Upcoming Expiry Status Radar",
        "30-Day Compliance Risk Summary",
        "Statutory Renewal Action Matrix"
      ],
      kpiNote: "Predictive 30-day warning completely prevents statutory vehicle impoundment and fines."
    },
    {
      id: "stage-4",
      stepNum: "04",
      title: "One-Click Renewal Engine",
      subtitle: "Zero-Downtime Document Cycling",
      phase: "Renewal & Re-validation",
      icon: RefreshCw,
      color: "border-blue-500",
      accent: "bg-blue-600 text-white",
      lightBg: "bg-blue-50/60",
      badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
      stats: "Active Renewal Cycle",
      route: "/document-vault",
      summary: "Streamlined modal renewal uploading newly issued document files, updating valid-through dates, and auto-resetting compliance health.",
      systemActions: [
        "Launch instant 1-click renewal dialog directly from dashboard warning tile",
        "Input new Issue Date, Extended Expiry Date, and updated Policy / Endorsement Number",
        "Upload new digital document certificate scan without overwriting prior records",
        "Auto-transition status badge from Expired/Warning back to 100% Valid (Active)",
        "Broadcast compliance clearance update across all interconnected operational modules"
      ],
      keyDocuments: [
        "Renewed Policy Certificate",
        "Renewal Premium Payment Slip",
        "Endorsement Letter / Extension Order"
      ],
      kpiNote: "Renewals automatically archive superseded files to prevent accidental deletion."
    },
    {
      id: "stage-5",
      stepNum: "05",
      title: "Immutable History & Version Audit",
      subtitle: "Full Historical Audit Trail",
      phase: "Compliance Archive",
      icon: Database,
      color: "border-emerald-500",
      accent: "bg-emerald-600 text-white",
      lightBg: "bg-emerald-50/60",
      badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
      stats: "100% Traceable History",
      route: "/document-vault",
      summary: "Every renewal moves the previous document and dates into an immutable version history ledger with timestamps and digital file retrieval.",
      systemActions: [
        "Automatically preserve previous document version, expired date, and uploaded file blob",
        "Record user identity, modification timestamp, and renewal remarks in version ledger",
        "Enable 1-click historical file preview to inspect previous-year agreements and policies",
        "Provide tamper-proof chronological compliance audit trail for external corporate auditors",
        "Support complete JSON encrypted backup and instant vault state restoration"
      ],
      keyDocuments: [
        "Chronological Version History Log",
        "Auditor Inspection Package",
        "Encrypted Vault JSON Backup File"
      ],
      kpiNote: "Version history guarantees 100% legal traceability across multiple years of renewals."
    }
  ];

  return (
    <div className="w-full space-y-6 pb-12 max-w-7xl mx-auto">
      {/* ═══════════ TOP HEADER SECTION ═══════════ */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-red-600 to-rose-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-red-500/25 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Document Vault <span className="text-red-600">Enterprise Flow</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Multi-Entity Vault Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                5-Stage Document Lifecycle: Person Onboarding, Encrypted Ingestion, Predictive Expiry Radar, Renewal Engine &amp; Version History
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => navigate("/document-vault/company")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs active:scale-95"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Company Vault</span>
            </button>
            <button
              onClick={() => navigate("/document-vault")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-500/20 transition-all active:scale-95"
            >
              <span>Open Document Vault</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ KPI STAT COUNTERS ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-red-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Individuals</div>
            <div className="text-lg font-black text-gray-900">{stats.individualClients}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-blue-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Companies/Firms</div>
            <div className="text-lg font-black text-gray-900">{stats.corporateClients}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-rose-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Total Documents</div>
            <div className="text-lg font-black text-gray-900">{stats.totalDocs}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-amber-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Expiring in 30D</div>
            <div className="text-lg font-black text-gray-900">{stats.expiringSoon}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-rose-400 transition-all">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Expired Files</div>
            <div className="text-lg font-black text-gray-900">{stats.expired}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-emerald-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Vault Health</div>
            <div className="text-lg font-black text-emerald-600">
              {stats.totalDocs === 0 ? "100%" : `${Math.round(((stats.totalDocs - stats.expired) / stats.totalDocs) * 100)}%`}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ RECENT VAULT UPGRADES TICKER ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-red-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-red-600">4 Entity Categories</div>
            <div className="text-xs font-extrabold text-slate-800">Individual, Firm, Co &amp; Plant</div>
            <p className="text-[10px] text-slate-400">GSTIN, CIN &amp; PAN verified</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-blue-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Corporate Checklist</div>
            <div className="text-xs font-extrabold text-slate-800">Sections A–E Structured</div>
            <p className="text-[10px] text-slate-400">25+ Standard MCA &amp; Bank types</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Timer className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600">30-Day Warning Radar</div>
            <div className="text-xs font-extrabold text-slate-800">Predictive Expiry Alert</div>
            <p className="text-[10px] text-slate-400">Zero fine &amp; zero vehicle lapse</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Immutable Audit Trail</div>
            <div className="text-xs font-extrabold text-slate-800">Multi-Version Archiving</div>
            <p className="text-[10px] text-slate-400">Prior documents &amp; dates preserved</p>
          </div>
        </div>
      </div>

      {/* ═══════════ NAVIGATION TABS (PIPELINE / CORPORATE SECTIONS / SUPPORTED TYPES) ═══════════ */}
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
            <span>5-Phase Governance Workflow</span>
          </button>

          <button
            onClick={() => setActiveTab('sections')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sections'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Corporate Checklist (Sections A–E)</span>
          </button>

          <button
            onClick={() => setActiveTab('expiry_radar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'expiry_radar'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>12 Core Document Categories</span>
          </button>
        </div>

        <span className="hidden sm:inline-flex text-[11px] font-bold text-gray-400">
          Click any phase card for deep operational &amp; audit inspection
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
                  Document Vault Lifecycle &amp; Renewal Architecture
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Sequential workflow: Entity Onboarding $\rightarrow$ Encrypted Storage $\rightarrow$ Expiry Radar $\rightarrow$ 1-Click Renewal $\rightarrow$ Version Audit Trail
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

            {/* ═══════════ CONTINUOUS ENCRYPTED BACKUP & RECOVERY BANNER ═══════════ */}
            <div className="mt-6 pt-5 border-t border-dashed border-slate-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs shrink-0">
                    <Database className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      Encrypted Client-Side Vault Backups &amp; Zero Data Loss
                      <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        100% Data Protection
                      </span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Vault automatically maintains local state cache and allows 1-click JSON backup downloads. Agar browser cache clear ho jaye toh aap instant JSON restore se sabhi records aur version history retrieve kar sakte hain.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate('/document-vault')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    Manage Vault
                  </button>
                  <button
                    onClick={() => navigate('/document-vault/company')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    Checklist Matrix
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 2: CORPORATE CHECKLIST (SECTIONS A–E) ═══════════ */}
      {activeTab === 'sections' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Firm &amp; Company Checklist Vault (Sections A–E)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pre-configured 25+ statutory document slots structured by Ministry of Corporate Affairs (MCA) standards
              </p>
            </div>
            <button
              onClick={() => navigate('/document-vault/company')}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open Company Vault</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {COMPANY_CHECKLIST_SECTIONS.map((sec) => (
              <div key={sec.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 uppercase">
                      Section {sec.id}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {sec.types.length} Slots
                    </span>
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-sm mt-2">
                    {sec.title}
                  </h3>
                  <div className="space-y-1.5 mt-3">
                    {sec.types.map((type, tIdx) => (
                      <div key={tIdx} className="flex items-start gap-1.5 text-[11px] text-slate-700 font-medium">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="truncate" title={type}>{type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 text-[10px] text-gray-500 font-medium">
                  Tracks completion progress (%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 3: 12 CORE DOCUMENT CATEGORIES ═══════════ */}
      {activeTab === 'expiry_radar' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-600" />
                12 Core Standardized Document Categories
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Every document type contains specialized metadata fields (IDV, Registration Number, Validity Dates)
              </p>
            </div>
            <button
              onClick={() => navigate('/document-vault')}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Add Document in Vault</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { title: "Driving Licence", meta: "DL No, Validity, RTO Authority", icon: "🪪" },
              { title: "Property Document", meta: "Khasra, Registry Date, Plot Area", icon: "🏛️" },
              { title: "Aadhaar Card", meta: "UIDAI 12-Digit, Name as per UID", icon: "🆔" },
              { title: "PAN Card", meta: "10-Digit Alphanumeric, IT Dept", icon: "💳" },
              { title: "Passport", meta: "Passport No, Country, Valid Till", icon: "🛂" },
              { title: "Voter ID", meta: "EPIC No, Assembly Constituency", icon: "🗳️" },
              { title: "Vehicle RC", meta: "Chassis, Engine No, RTO Fitness", icon: "🚛" },
              { title: "Insurance Policy", meta: "Policy No, IDV, Premium Amount", icon: "🛡️" },
              { title: "Bank Document", meta: "Account No, IFSC, Branch Code", icon: "🏦" },
              { title: "Agreement / Contract", meta: "Parties, Stamp Duty, Tenure", icon: "📜" },
              { title: "Tax / GST Filing", meta: "GSTIN, Financial Year, Return Type", icon: "📊" },
              { title: "Custom Other", meta: "Custom Metadata Fields & Files", icon: "📁" }
            ].map((cat, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-red-300 hover:bg-red-50/20 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-xs font-extrabold text-slate-800">{cat.title}</span>
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium">{cat.meta}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ DIRECT MODULE NAVIGATION GRID ═══════════ */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
          Document Vault Direct Module Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {[
            { label: 'Individual Vault', path: '/document-vault', icon: Users },
            { label: 'Company Vault', path: '/document-vault/company', icon: Building2 },
            { label: 'Doc Ingestion', path: '/document/all', icon: FileText },
            { label: 'Reminder Radar', path: '/document/reminder-calendar', icon: Calendar },
            { label: 'Shared Access', path: '/document/shared', icon: Share2 },
            { label: 'General Insurance', path: '/resource-manager', icon: ShieldCheck }
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

