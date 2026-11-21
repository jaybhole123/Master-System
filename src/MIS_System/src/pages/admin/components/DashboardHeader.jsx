import React from "react";
import { Download, Calendar, Sparkles } from "lucide-react";
import { generateDashboardPDF } from "../../../utils/pdfGenerator";
import DailyReportButton from "./DailyReportButton";

const DashboardHeader = ({
    user,
    ALL_COLUMNS,
    visibleColumns,
    filteredEmployees,
    employeeCommitments,
    topWorstPerformers,
    topBestPerformers,
    pendingTasks,
    departmentScores = [],
    dataSheetRows = [],
}) => {
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs mb-2">
            <div>
                <div className="flex items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {isAdmin ? "Admin Dashboard" : (user?.role === 'hod' ? "HOD Dashboard" : "Employee Dashboard")}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Sparkles className="w-3 h-3 text-blue-600" /> Live MIS
                    </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                    Weekly performance analytics, commitments and task tracking overview
                </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
                <DailyReportButton dataSheetRows={dataSheetRows} />
                <button
                    onClick={() => {
                        const visibleColsList = ALL_COLUMNS.filter(col =>
                            visibleColumns[col.key] &&
                            !["nextWeekPlannedNotDone", "nextWeekPlannedNotDoneOnTime", "nextWeekCommitment"].includes(col.key)
                        );
                        const exportData = filteredEmployees.map(emp => ({
                            ...emp,
                            nextWeekPlannedWorkNotDone: employeeCommitments[emp.id]?.nextWeekPlannedWorkNotDone || emp.nextWeekPlannedWorkNotDone,
                            nextWeekPlannedWorkNotDoneOnTime: employeeCommitments[emp.id]?.nextWeekPlannedWorkNotDoneOnTime || emp.nextWeekPlannedWorkNotDoneOnTime,
                            nextWeekCommitment: employeeCommitments[emp.id]?.commitment || emp.nextWeekCommitment
                        }));
                        generateDashboardPDF(
                            visibleColsList,
                            exportData,
                            topBestPerformers,
                            pendingTasks,
                            topWorstPerformers,
                            departmentScores
                        );
                    }}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all duration-150 gap-2 border border-blue-700/20"
                >
                    <Download className="h-4 w-4" />
                    <span>Download PDF Report</span>
                </button>
            </div>
        </div>
    );
};

export default DashboardHeader;
