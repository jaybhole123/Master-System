import React, { useState, useEffect, useMemo } from "react";
import { Search, Loader2, History } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { employees } from "../../data/mockData";

const AdminHistoryCommitment = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState(() => {
        return employees.map((emp, idx) => ({
            id: idx,
            dateStart: emp.dateStart || "2025-01-01",
            dateEnd: emp.dateEnd || "2025-12-31",
            name: emp.name || "",
            target: emp.target || 100,
            actualWorkDone: emp.actualWorkDone || 85,
            workNotDone: emp.plannedWorkNotDone || 10,
            workNotDoneOnTime: emp.plannedWorkNotDoneOnTime || 5,
            totalWorkDone: emp.totalWorkDone || 88,
            weekPending: emp.weekPending || 2,
            allPendingTillDate: emp.allPendingTillDate || 5,
            lastWeekPlannedNotDone: emp.plannedWorkNotDone || 10,
            lastWeekPlannedNotDoneOnTime: emp.plannedWorkNotDoneOnTime || 5,
            lastWeekCommitment: emp.commitment || 90,
            linkWithName: "",
            nextWeekPlannedNotDone: emp.nextWeekPlannedWorkNotDone || 8,
            nextWeekPlannedNotDoneOnTime: emp.nextWeekPlannedWorkNotDoneOnTime || 4,
            nextWeekCommitment: emp.nextWeekCommitment || 95
        }));
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [nameFilter, setNameFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");

    const uniqueNames = useMemo(() => {
        return [...new Set(records.map(r => r.name))].sort();
    }, [records]);

    const uniqueDates = useMemo(() => {
        return [...new Set(records.map(r => r.dateStart))].filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSearch =
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.dateStart.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.dateEnd.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesName = nameFilter === "all" || r.name === nameFilter;
            const matchesDate = dateFilter === "all" || r.dateStart === dateFilter;
            return matchesSearch && matchesName && matchesDate;
        });
    }, [records, searchQuery, nameFilter, dateFilter]);

    const formatValue = (val) => {
        if (val === "" || val === null || val === undefined) return "-";
        return String(val);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-gray-600 font-medium">Loading History...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-5">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Commitment History</h1>
                        <p className="text-xs text-slate-500 font-medium">Historical audit of work commitments vs actual achievements</p>
                    </div>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-2xs">
                    {filteredRecords.length} of {records.length} records
                </span>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 w-full">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by name or date..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder-slate-400"
                        />
                    </div>
                    <div className="w-full md:w-56">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-700"
                        >
                            <option value="all">All Dates</option>
                            {uniqueDates.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-56">
                        <select
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-700"
                        >
                            <option value="all">All Names</option>
                            {uniqueNames.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Records</p>
                        <p className="text-2xl font-extrabold text-slate-900 mt-1">{records.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                        #
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Unique Members</p>
                        <p className="text-2xl font-extrabold text-slate-900 mt-1">{uniqueNames.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm">
                        ✓
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden w-full">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-800">History Records Log</h2>
                    <span className="text-xs text-slate-400 font-medium">Auto-synced</span>
                </div>
                <div className="overflow-x-auto w-full max-h-[calc(100vh-320px)] relative">
                    <table className="w-full min-w-full text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-50 sticky top-0 z-30 shadow-2xs">
                                <tr>
                                    <th className="w-12 px-4 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap sticky left-0 top-0 bg-slate-50 z-40 border-b border-slate-200">S.No</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200">Date Start</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200">Date End</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-12 top-0 bg-slate-50 z-40 border-l border-b border-slate-200">Name</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200">Target</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200">Actual Done</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200">% Not Done</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200">% Late</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200">Total Work</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200">Week Pending</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200">All Pending</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-extrabold bg-rose-50 text-rose-700 uppercase tracking-wider whitespace-nowrap border-b border-rose-200">LW Planned % Not Done</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-extrabold bg-rose-50 text-rose-700 uppercase tracking-wider whitespace-nowrap border-b border-rose-200">LW % Late</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-extrabold bg-rose-50 text-rose-700 uppercase tracking-wider whitespace-nowrap border-b border-rose-200">LW Commitment</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-extrabold bg-emerald-50 text-emerald-700 uppercase tracking-wider whitespace-nowrap border-b border-emerald-200">NW Planned % Not Done</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-extrabold bg-emerald-50 text-emerald-700 uppercase tracking-wider whitespace-nowrap border-b border-emerald-200">NW % Late</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-extrabold bg-emerald-50 text-emerald-700 uppercase tracking-wider whitespace-nowrap border-b border-emerald-200">NW Commitment</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((r, idx) => (
                                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 text-slate-400 font-semibold text-center sticky left-0 bg-white z-10">{idx + 1}</td>
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap bg-white text-xs font-medium">{formatValue(r.dateStart)}</td>
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap bg-white text-xs font-medium">{formatValue(r.dateEnd)}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap sticky left-12 bg-white z-10 border-l border-slate-200">{formatValue(r.name)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatValue(r.target)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 min-w-[2.5rem]">
                                                    {formatValue(r.actualWorkDone)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold min-w-[2.5rem] ${parseFloat(r.workNotDone) > 30
                                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                    : parseFloat(r.workNotDone) > 10
                                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    }`}>
                                                    {formatValue(r.workNotDone)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold min-w-[2.5rem] ${parseFloat(r.workNotDoneOnTime) > 30
                                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                    : parseFloat(r.workNotDoneOnTime) > 10
                                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    }`}>
                                                    {formatValue(r.workNotDoneOnTime)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 min-w-[2.5rem]">
                                                    {formatValue(r.totalWorkDone)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold min-w-[2.5rem] ${parseFloat(r.weekPending) > 5
                                                    ? "bg-rose-100 text-rose-800"
                                                    : parseFloat(r.weekPending) > 0
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-emerald-100 text-emerald-800"
                                                    }`}>
                                                    {formatValue(r.weekPending)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold min-w-[2.5rem] ${parseFloat(r.allPendingTillDate) > 10
                                                    ? "bg-rose-100 text-rose-800"
                                                    : parseFloat(r.allPendingTillDate) > 3
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-emerald-100 text-emerald-800"
                                                    }`}>
                                                    {formatValue(r.allPendingTillDate)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-rose-50/40">
                                                <span className="text-rose-700 font-bold">{formatValue(r.lastWeekPlannedNotDone)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-rose-50/40">
                                                <span className="text-rose-700 font-bold">{formatValue(r.lastWeekPlannedNotDoneOnTime)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-rose-50/40">
                                                <span className="text-rose-800 font-extrabold">{formatValue(r.lastWeekCommitment)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-emerald-50/40">
                                                <span className="text-emerald-700 font-bold">{formatValue(r.nextWeekPlannedNotDone)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-emerald-50/40">
                                                <span className="text-emerald-700 font-bold">{formatValue(r.nextWeekPlannedNotDoneOnTime)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-emerald-50/40">
                                                <span className="text-emerald-800 font-extrabold">{formatValue(r.nextWeekCommitment)}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="17" className="px-6 py-12 text-center text-slate-400">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
        </div>
    );
};

export default AdminHistoryCommitment;
