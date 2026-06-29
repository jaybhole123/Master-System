"use client";
import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Shield,
  Edit2,
  Trash2,
  X,
  Save,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Building2,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import supabase from "../../SupabaseClient";

const INSURANCE_TYPES = ["Life", "Health", "Vehicle", "Property", "Term", "ULIP", "Endowment", "Other"];

const EMPTY_FORM = {
  company: "",
  type: "",
  due_date: "",
  date_of_proposal: "",
  sum_assured: "",
  premium: "",
  premium_paying_term: "",
  policy_term: "",
  first_premium_date: "",
  due_date_of_last_premium: "",
  coverage_till: "",
  remarks: "",
  auto: "",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(val) {
  if (!val && val !== 0) return "—";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return val;
  return "₹" + num.toLocaleString("en-IN");
}

function getDueBadge(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { label: "Overdue", color: "bg-red-100 text-red-700 border border-red-200" };
  if (diffDays <= 30)
    return { label: `Due in ${diffDays}d`, color: "bg-orange-100 text-orange-700 border border-orange-200" };
  if (diffDays <= 90)
    return { label: `Due in ${diffDays}d`, color: "bg-yellow-100 text-yellow-700 border border-yellow-200" };
  return { label: "Active", color: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
}

const SETUP_SQL = `CREATE TABLE public.insurance_policies (
  id                       bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at               timestamp with time zone NOT NULL DEFAULT now(),
  company                  text NOT NULL,
  type                     text,
  due_date                 date,
  date_of_proposal         date,
  sum_assured              numeric(18,2),
  premium                  numeric(18,2),
  premium_paying_term      text,
  policy_term              text,
  first_premium_date       date,
  due_date_of_last_premium date,
  coverage_till            date,
  remarks                  text,
  auto                     text,
  CONSTRAINT insurance_policies_pkey PRIMARY KEY (id)
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON public.insurance_policies FOR ALL USING (true) WITH CHECK (true);`;

export default function InsuranceManagement() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);

  const userRole = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = userRole === "admin" || (localStorage.getItem("user-name") || "").toLowerCase() === "admin";

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPolicies = async () => {
    setLoading(true);
    setError("");
    setTableNotFound(false);
    const { data, error: err } = await supabase
      .from("insurance_policies")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      // 404 or PGRST116 = table does not exist
      if (err.code === "PGRST116" || err.message?.includes("does not exist") || err.message?.includes("404")) {
        setTableNotFound(true);
      } else {
        setError("Failed to load: " + err.message);
      }
    } else {
      setPolicies(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  // Auto-dismiss messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3500);
      return () => clearTimeout(t);
    }
  }, [success]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (policy) => {
    setEditingId(policy.id);
    setForm({
      company: policy.company || "",
      type: policy.type || "",
      due_date: policy.due_date || "",
      date_of_proposal: policy.date_of_proposal || "",
      sum_assured: policy.sum_assured || "",
      premium: policy.premium || "",
      premium_paying_term: policy.premium_paying_term || "",
      policy_term: policy.policy_term || "",
      first_premium_date: policy.first_premium_date || "",
      due_date_of_last_premium: policy.due_date_of_last_premium || "",
      coverage_till: policy.coverage_till || "",
      remarks: policy.remarks || "",
      auto: policy.auto || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.company.trim()) { setError("Company name is required."); return; }
    setSaving(true);
    setError("");

    const payload = {
      company: form.company.trim(),
      type: form.type || null,
      due_date: form.due_date || null,
      date_of_proposal: form.date_of_proposal || null,
      sum_assured: form.sum_assured ? parseFloat(String(form.sum_assured).replace(/,/g, "")) : null,
      premium: form.premium ? parseFloat(String(form.premium).replace(/,/g, "")) : null,
      premium_paying_term: form.premium_paying_term || null,
      policy_term: form.policy_term || null,
      first_premium_date: form.first_premium_date || null,
      due_date_of_last_premium: form.due_date_of_last_premium || null,
      coverage_till: form.coverage_till || null,
      remarks: form.remarks || null,
      auto: form.auto || null,
    };

    let err;
    if (editingId) {
      ({ error: err } = await supabase.from("insurance_policies").update(payload).eq("id", editingId));
    } else {
      ({ error: err } = await supabase.from("insurance_policies").insert([payload]));
    }

    if (err) {
      setError("Save failed: " + err.message);
    } else {
      setSuccess(editingId ? "Policy updated successfully!" : "Policy added successfully!");
      closeModal();
      fetchPolicies();
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const { error: err } = await supabase.from("insurance_policies").delete().eq("id", id);
    if (err) setError("Delete failed: " + err.message);
    else {
      setSuccess("Policy deleted.");
      fetchPolicies();
    }
    setDeleteConfirmId(null);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = policies.filter((p) => {
    const matchSearch =
      !search ||
      p.company?.toLowerCase().includes(search.toLowerCase()) ||
      p.type?.toLowerCase().includes(search.toLowerCase()) ||
      p.remarks?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "All" || p.type === filterType;
    return matchSearch && matchType;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalPremium = policies.reduce((s, p) => s + (parseFloat(p.premium) || 0), 0);
  const totalSumAssured = policies.reduce((s, p) => s + (parseFloat(p.sum_assured) || 0), 0);
  const overdueCount = policies.filter((p) => {
    if (!p.due_date) return false;
    return new Date(p.due_date) < new Date();
  }).length;

  const copySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="max-w-full mx-auto space-y-6 p-2 sm:p-4">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-xl text-red-700 shadow-sm">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
                Insurance <span className="text-red-700">Management</span>
              </h1>
              <p className="text-gray-500 text-sm font-medium">Track all insurance policies in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPolicies}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-red-200 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Add Policy
              </button>
            )}
          </div>
        </div>

        {/* ── Table-not-found setup banner ── */}
        {tableNotFound && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-base">Supabase table not created yet</h3>
                <p className="text-amber-700 text-sm mt-1">
                  The <code className="bg-amber-100 px-1 rounded font-mono">insurance_policies</code> table is missing.
                  Go to your <strong>Supabase → SQL Editor</strong>, paste the SQL below, and click <strong>Run</strong>.
                </p>
              </div>
            </div>
            <div className="relative">
              <pre className="bg-gray-900 text-green-300 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed">{SETUP_SQL}</pre>
              <button
                onClick={copySQL}
                className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy SQL"}
              </button>
            </div>
            <button
              onClick={fetchPolicies}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Retry after running SQL
            </button>
          </div>
        )}

        {/* ── Alerts ── */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Policies", value: policies.length, icon: Shield, color: "red" },
            { label: "Total Premium / Year", value: formatCurrency(totalPremium), icon: Building2, color: "blue" },
            { label: "Total Sum Assured", value: formatCurrency(totalSumAssured), icon: CheckCircle, color: "emerald" },
            { label: "Overdue Payments", value: overdueCount, icon: Clock, color: "orange" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-white rounded-2xl p-4 border border-${color}-100 shadow-sm`}>
              <div className={`w-9 h-9 rounded-xl bg-${color}-100 flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 text-${color}-600`} />
              </div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search company, type, remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
            >
              <option value="All">All Types</option>
              {INSURANCE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading policies...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Shield className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-semibold">No policies found</p>
                <p className="text-sm mt-1">
                  {policies.length === 0 ? "Add your first insurance policy to get started." : "Try adjusting your search or filter."}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100">
                    {[
                      "Company", "TYPE", "DUE DATE", "DATE OF PROPOSAL", "Sum Assured",
                      "Premium", "PPT", "Policy Term", "First Premium Date",
                      "Due Date of Last Premium", "Coverage Till", "Remarks", "Auto", "Status", "Actions"
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-bold text-red-800 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p, i) => {
                    const badge = getDueBadge(p.due_date);
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-red-50/40 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                              <Building2 className="h-3.5 w-3.5 text-red-600" />
                            </div>
                            {p.company || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.type ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{p.type}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(p.due_date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(p.date_of_proposal)}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800">{formatCurrency(p.sum_assured)}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800">{formatCurrency(p.premium)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{p.premium_paying_term || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{p.policy_term || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(p.first_premium_date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(p.due_date_of_last_premium)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{p.coverage_till ?? "—"}</td>
                        <td className="px-4 py-3 max-w-[160px]">
                          <p className="truncate text-gray-500" title={p.remarks}>{p.remarks || "—"}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{p.auto || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {badge ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>{badge.label}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isAdmin && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openEdit(p)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {deleteConfirmId === p.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(p.id)}
                                    className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(p.id)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
              <span>Showing {filtered.length} of {policies.length} policies</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div
            ref={modalRef}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <h2 className="text-lg font-bold">
                  {editingId ? "Edit Insurance Policy" : "Add New Insurance Policy"}
                </h2>
              </div>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-white/20 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LIC, SBI Life, HDFC Ergo..."
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">TYPE</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full appearance-none px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="">Select type</option>
                      {INSURANCE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">DUE DATE</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Date of Proposal */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">DATE OF THE PROPOSAL</label>
                  <input
                    type="date"
                    value={form.date_of_proposal}
                    onChange={(e) => setForm((f) => ({ ...f, date_of_proposal: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Sum Assured */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sum Assured (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000000"
                    value={form.sum_assured}
                    onChange={(e) => setForm((f) => ({ ...f, sum_assured: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Premium */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Premium (₹ / year)</label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={form.premium}
                    onChange={(e) => setForm((f) => ({ ...f, premium: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Premium Paying Term */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Premium Paying Term</label>
                  <input
                    type="text"
                    placeholder="e.g. 20 years, Single Pay..."
                    value={form.premium_paying_term}
                    onChange={(e) => setForm((f) => ({ ...f, premium_paying_term: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Policy Term */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Policy Term</label>
                  <input
                    type="text"
                    placeholder="e.g. 25 years"
                    value={form.policy_term}
                    onChange={(e) => setForm((f) => ({ ...f, policy_term: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* First Premium Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Premium Date</label>
                  <input
                    type="date"
                    value={form.first_premium_date}
                    onChange={(e) => setForm((f) => ({ ...f, first_premium_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Due Date of Last Premium */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date of Last Premium</label>
                  <input
                    type="date"
                    value={form.due_date_of_last_premium}
                    onChange={(e) => setForm((f) => ({ ...f, due_date_of_last_premium: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Coverage Till */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Coverage Till (years)</label>
                  <input
                    type="number"
                    placeholder="e.g. 25"
                    value={form.coverage_till}
                    onChange={(e) => setForm((f) => ({ ...f, coverage_till: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Any additional notes..."
                    value={form.remarks}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>
                {/* Auto */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Auto Debited</label>
                  <input
                    type="text"
                    placeholder="Auto generated name..."
                    value={form.auto}
                    onChange={(e) => setForm((f) => ({ ...f, auto: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-200 transition active:scale-95 disabled:opacity-60"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : editingId ? "Update Policy" : "Save Policy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
