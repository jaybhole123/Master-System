import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';

const DepartmentScoreChart = ({ labels = [], pendingData = [], notDoneData = [], notDoneOnTimeData = [] }) => {
    // Total pending summary
    const totalPending = useMemo(() => {
        return pendingData.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    }, [pendingData]);

    // Max pending for chart scaling
    const maxVal = useMemo(() => {
        const highest = Math.max(...pendingData.map(v => parseFloat(v) || 0), 25);
        return Math.ceil(highest / 5) * 5;
    }, [pendingData]);

    const yTicks = [25, 20, 15, 10, 5, 0];

    if (!labels || labels.length === 0) {
        return (
            <div className="bg-white text-slate-800 rounded-3xl p-5 md:p-7 border border-slate-200/90 shadow-xs mt-6 text-center">
                <div className="flex items-center gap-3 justify-center mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Department Scores</h3>
                </div>
                <p className="text-xs text-slate-400 mt-2">No department performance data available</p>
            </div>
        );
    }

    return (
        <div className="bg-white text-slate-800 rounded-3xl p-5 md:p-7 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow mt-6">
            {/* Header matching screenshot 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Department Scores</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {labels.length} departments · {totalPending} pending works · Score: Positive (+) · hover a column for details
                        </p>
                    </div>
                </div>

                {/* Legend matching screenshot 2 */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
                        <span className="text-slate-600">Total pending works</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"></span>
                        <span className="text-slate-600">Work Done %</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
                        <span className="text-slate-600">Done On Time %</span>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="pt-8 pb-4 relative">
                {/* Horizontal Grid lines & Y-Axis */}
                <div className="relative h-64 w-full flex">
                    {/* Left Y Axis Numbers */}
                    <div className="w-8 shrink-0 flex flex-col justify-between text-right pr-2 text-xs font-bold text-slate-400">
                        {yTicks.map((tick) => (
                            <span key={tick} className="leading-none">{tick}</span>
                        ))}
                    </div>

                    {/* Chart Bars Column area */}
                    <div className="flex-1 relative border-b border-slate-200">
                        {/* Background Dotted Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            {yTicks.map((tick) => (
                                <div key={tick} className="w-full border-b border-slate-100 border-dashed" />
                            ))}
                        </div>

                        {/* Columns Container */}
                        <div className="absolute inset-0 flex items-end justify-around px-2 sm:px-6">
                            {labels.map((deptName, idx) => {
                                const pending = parseFloat(pendingData[idx]) || 0;
                                const heightPercent = Math.min(Math.round((pending / maxVal) * 100), 100);

                                return (
                                    <div key={idx} className="flex flex-col items-center justify-end h-full w-20 sm:w-28 group relative">
                                        {/* Value Pill Above Bar */}
                                        <div
                                            className="mb-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-extrabold text-amber-700 shadow-xs transition-transform group-hover:scale-110"
                                        >
                                            {pending}
                                        </div>

                                        {/* Golden/Orange Gradient Bar */}
                                        <div
                                            className="w-10 sm:w-14 rounded-2xl bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 shadow-md shadow-amber-500/20 transition-all duration-500 group-hover:brightness-105"
                                            style={{ height: `${Math.max(heightPercent, 6)}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sub-metrics Bottom Row (Done % & On time %) */}
                <div className="flex justify-around items-start pl-8 pr-2 sm:px-6 mt-4">
                    {labels.map((deptName, idx) => {
                        const notDone = parseFloat(notDoneData[idx]) || 0;
                        const notDoneOnTime = parseFloat(notDoneOnTimeData[idx]) || 0;

                        // Actual done % and on-time %
                        const donePct = Math.max(100 - notDone, 0).toFixed(1);
                        const onTimePct = Math.max(100 - notDoneOnTime, 0).toFixed(1);

                        return (
                            <div key={idx} className="w-20 sm:w-28 text-center space-y-2">
                                {/* Department Label & ppl */}
                                <div>
                                    <div className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide uppercase">
                                        {deptName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-semibold">
                                        {idx + 1} ppl
                                    </div>
                                </div>

                                {/* Done % Bar */}
                                <div className="space-y-1 text-left">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                        <span>Done</span>
                                        <span className="text-slate-800 font-bold">{donePct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${donePct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* On Time % Bar */}
                                <div className="space-y-1 text-left">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                        <span>On time</span>
                                        <span className="text-slate-800 font-bold">{onTimePct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${onTimePct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DepartmentScoreChart;
