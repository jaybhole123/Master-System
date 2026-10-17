import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Users, FileText, Clock, AlertTriangle,
  ArrowRight, ArrowDown, CheckCircle2, Sparkles,
  Database, RefreshCw,
  FileCheck2, Layers, Building2
} from "lucide-react";

export default function DocumentVaultSystemFlow() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(null);

  const modules = [
    {
      id: "persons",
      title: "Person / Entity Management",
      icon: Users,
      color: "from-red-500 to-rose-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      description: "Create and manage Individual, Firm, Company & Plant persons with GSTIN, PAN, CIN validations",
      features: ["Individual / Firm / Company / Plant types", "GSTIN, PAN, CIN validation", "Phone, email, address storage", "Type-specific extra fields"],
      route: "/document-vault"
    },
    {
      id: "documents",
      title: "Document Storage",
      icon: FileText,
      color: "from-rose-500 to-red-600",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      textColor: "text-rose-700",
      description: "Store driving licences, property papers, Aadhaar, PAN, passports, insurance and 12 document types",
      features: ["12 document categories", "Type-specific metadata fields", "PDF, image, Excel, Word uploads", "Up to 15 MB per file"],
      route: "/document-vault"
    },
    {
      id: "tracking",
      title: "Expiry & Renewal Tracking",
      icon: Clock,
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      description: "Track document expiry, get alerts for renewals due in 30 days, and maintain renewal history",
      features: ["Auto expiry status computation", "30-day renewal warning", "Full renewal history log", "Old file & details preserved"],
      route: "/document-vault"
    },
    {
      id: "company-vault",
      title: "Firm & Company Checklist Vault",
      icon: Building2,
      color: "from-blue-600 to-indigo-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      description: "Complete corporate checklist (Sections A–E) for company registration, MCA, bank records, tax & audit papers",
      features: ["5 Checklist Sections (A–E)", "25+ Corporate Document Types", "Checklist progress tracking (%)", "Firm, Company & Plant support"],
      route: "/document-vault/company"
    },
    {
      id: "vault-core",
      title: "Audit & Version History",
      icon: Database,
      color: "from-slate-700 to-slate-900",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      textColor: "text-slate-800",
      description: "Comprehensive version control tracking every document renewal with previous dates and files preserved",
      features: ["Full audit trail on renew", "Previous document file retention", "Date change timeline tracking", "Secure client-side storage"],
      route: "/document-vault"
    }
  ];

  const flowSteps = [
    { step: 1, title: "Add Person", desc: "Create person with type, contact details and business identifiers", icon: Users },
    { step: 2, title: "Add Documents", desc: "Attach driving licence, property papers, insurance or any of 12 categories", icon: FileText },
    { step: 3, title: "Track Expiry", desc: "Dashboard tiles show expired and expiring-soon documents at a glance", icon: AlertTriangle },
    { step: 4, title: "Renew", desc: "Use one-click renewal — old details automatically move to history", icon: RefreshCw },
    { step: 5, title: "Audit Trail", desc: "View document history with previous files and renewal timestamps", icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-2xl p-6 sm:p-8 shadow-xl shadow-red-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/5" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Document Vault — System Flow</h1>
                <p className="text-red-100 text-sm sm:text-base font-medium mt-0.5">Person document management with records, renewals, and expiry tracking</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/document-vault")}
              className="bg-white text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 text-sm shrink-0"
            >
              Open Document Vault <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Flow Diagram */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-600" /> System Workflow
          </h2>
          <div className="flex flex-col lg:flex-row items-stretch gap-4">
            {flowSteps.map((fs, i) => (
              <React.Fragment key={fs.step}>
                <div
                  className={`flex-1 rounded-xl border-2 p-4 transition-all cursor-pointer ${
                    activeStep === fs.step
                      ? "border-red-600 bg-red-50/60 shadow-sm"
                      : "border-slate-200 hover:border-red-300 hover:shadow-xs"
                  }`}
                  onClick={() => setActiveStep(activeStep === fs.step ? null : fs.step)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black ${
                        activeStep === fs.step ? "bg-red-600" : "bg-slate-400"
                      }`}
                    >
                      {fs.step}
                    </div>
                    <fs.icon className={`w-4 h-4 ${activeStep === fs.step ? "text-red-600" : "text-slate-400"}`} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">{fs.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{fs.desc}</p>
                </div>
                {i < flowSteps.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-slate-300" />
                  </div>
                )}
                {i < flowSteps.length - 1 && (
                  <div className="flex lg:hidden items-center justify-center py-1">
                    <ArrowDown className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((m) => (
            <div
              key={m.id}
              className={`bg-white rounded-2xl shadow-sm border ${m.borderColor} p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group`}
              onClick={() => navigate(m.route)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-xs`}>
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors">{m.title}</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">{m.description}</p>
              <ul className="space-y-2">
                {m.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-1 text-red-600 text-xs sm:text-sm font-bold group-hover:gap-2 transition-all">
                Open module <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Supported Document Types */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-red-600" /> Supported Document Types
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              "Driving Licence", "Property Document", "Aadhaar Card", "PAN Card",
              "Passport", "Voter ID", "Vehicle RC", "Insurance",
              "Bank Document", "Agreement / Contract", "Tax / GST", "Other"
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs sm:text-sm font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50/30 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-red-500 flex-none" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
