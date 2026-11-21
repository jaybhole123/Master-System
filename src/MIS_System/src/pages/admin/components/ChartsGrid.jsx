import React from "react";
import { Trophy, Clock, TrendingDown } from "lucide-react";

const ChartsGrid = ({
    user,
    loading,
    topScorers = [],
    topBestPerformers = [],
    sortedPendingList = [],
    dateRangeStr = "16 Nov – 21 Nov"
}) => {
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    // Helper for initials
    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const avatarColors = [
        "bg-blue-600 text-white",
        "bg-purple-600 text-white",
        "bg-amber-600 text-white",
        "bg-emerald-600 text-white",
        "bg-pink-600 text-white"
    ];

    return (
        <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4 md:gap-5`}>
            
            {/* 1. Top 5 Best Performers */}
            {isAdmin && (
                <div className="bg-white text-slate-800 rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Top 5 Best Performers</h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">% Done, then on time, work done, pending</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full shrink-0">
                                {dateRangeStr}
                            </span>
                        </div>

                        {/* List Items */}
                        <div className="space-y-3 mt-4">
                            {topBestPerformers.slice(0, 5).map((emp, idx) => {
                                const rank = idx + 1;
                                const donePct = emp.donePct ?? 0;
                                const workDone = emp.workDone ?? 0;
                                const total = emp.totalTasks ?? 0;
                                const onTimePct = emp.onTimePct ?? 0;

                                return (
                                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-b-0">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Rank circle */}
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                rank === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {rank}
                                            </div>

                                            {/* Avatar */}
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${avatarColors[idx % avatarColors.length]}`}>
                                                {getInitials(emp.name)}
                                            </div>

                                            {/* Name */}
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                                {emp.name}
                                            </span>
                                        </div>

                                        {/* Stats Right */}
                                        <div className="text-right shrink-0">
                                            <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                                                {donePct}%
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-medium">
                                                {workDone}/{total} done · {onTimePct}% on time
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Pending Tasks by User */}
            <div className="bg-white text-slate-800 rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Pending Tasks by User</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Pending in this period, out of their tasks</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full shrink-0">
                            {dateRangeStr}
                        </span>
                    </div>

                    {/* List Items */}
                    <div className="space-y-4 mt-4">
                        {sortedPendingList.slice(0, 5).map((emp, idx) => {
                            const rank = idx + 1;
                            const pending = emp.pending || 0;
                            const total = emp.total || 0;
                            const pct = total > 0 ? Math.min(Math.round((pending / total) * 100), 100) : 50;

                            return (
                                <div key={idx} className="space-y-1.5 pb-2 border-b border-slate-100 last:border-b-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Rank circle */}
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                rank === 1 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {rank}
                                            </div>

                                            {/* Avatar */}
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${avatarColors[idx % avatarColors.length]}`}>
                                                {getInitials(emp.name)}
                                            </div>

                                            {/* Name */}
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                                {emp.name}
                                            </span>
                                        </div>

                                        {/* Value */}
                                        <div className="text-right shrink-0">
                                            <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                                                {pending}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-medium ml-1">
                                                of {total} tasks
                                            </span>
                                        </div>
                                    </div>

                                    {/* Orange Progress bar matching screenshot */}
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 3. Top 5 Worst Performers */}
            {isAdmin && (
                <div className="bg-white text-slate-800 rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                                    <TrendingDown className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Top 5 Worst Performers</h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Lowest % done first (reverse of best)</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full shrink-0">
                                {dateRangeStr}
                            </span>
                        </div>

                        {/* List Items */}
                        <div className="space-y-3 mt-4">
                            {topScorers.slice(0, 5).map((emp, idx) => {
                                const rank = idx + 1;
                                const donePct = emp.donePct ?? 0;
                                const workDone = emp.workDone ?? 0;
                                const total = emp.totalTasks ?? 0;
                                const onTimePct = emp.onTimePct ?? 0;

                                return (
                                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-b-0">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Rank circle */}
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                rank === 1 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {rank}
                                            </div>

                                            {/* Avatar */}
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${avatarColors[idx % avatarColors.length]}`}>
                                                {getInitials(emp.name)}
                                            </div>

                                            {/* Name */}
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                                {emp.name}
                                            </span>
                                        </div>

                                        {/* Stats Right */}
                                        <div className="text-right shrink-0">
                                            <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                                                {donePct}%
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-medium">
                                                {workDone}/{total} done · {onTimePct}% on time
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChartsGrid;
