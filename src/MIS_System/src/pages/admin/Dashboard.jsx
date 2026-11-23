// ============ DASHBOARD PAGE ============
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Clock, AlertTriangle, Search, ChevronDown, Download, Filter, MessageSquare, Briefcase, TrendingUp, X, MapPin, Phone, Mail, User, Info, Loader2, CheckCircle2, Target, AlertCircle } from 'lucide-react';
import { getDisplayableImageUrl } from '../../utils/imageUtils';
import {
  employees,
  getTopScorers,
  getLowestScorers,
  getEmployeesByPendingTasks,
  departments,
  getWeeklyCommitmentComparison,
} from "../../data/mockData";
import EmployeesTable from "../../components/tables/EmployeesTable";
import HalfCircleChart from "../../components/charts/HalfCircleChart";
import HorizontalBarChart from "../../components/charts/HorizontalBarChart";
import VerticalBarChart from "../../components/charts/VerticalBarChart";
import DashboardHeader from "./components/DashboardHeader";
import EmployeeListSection from "./components/EmployeeListSection";
import UserDetailsModal from "./components/UserDetailsModal";
import ChartsGrid from "./components/ChartsGrid";
import DepartmentScoreChart from "../../components/charts/DepartmentScoreChart";
import { useAuth } from "../../contexts/AuthContext";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("MIS Dashboard Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white rounded-2xl border border-red-200 text-red-600">
          <h2 className="text-lg font-bold">Error loading MIS Dashboard</h2>
          <p className="text-sm mt-1">{String(this.state.error?.message || this.state.error)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const getCurrentWeek = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  const day = today.getDay() || 7; // Make Sunday 7
  startOfWeek.setDate(today.getDate() - day + 1); // Set to Monday

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 5);

  return {
    start: startOfWeek.toISOString().split("T")[0],
    end: endOfWeek.toISOString().split("T")[0],
  };
};


// DateAssignmentToolbar removed as dates are now extracted from sheet data during submission.

const AdminDashboard = () => {
  const { user } = useAuth();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  // Dashboard Logic
  const [dateRange, setDateRange] = useState(getCurrentWeek());

  // New State for Sheet Data
  const [loading, setLoading] = useState(true);
  const [sheetEmployees, setSheetEmployees] = useState([]);
  const [departmentScores, setDepartmentScores] = useState([]);
  const [dataSheetRows, setDataSheetRows] = useState([]);

  // Dynamic Column Labels
  const [columnLabels, setColumnLabels] = useState({
    name: "Name",
    designation: "Designation",
    target: "Target",
    actualWork: "Actual Work",
    weeklyDone: "Weekly Done %",
    weeklyOnTime: "Weekly On Time %",
    totalWork: "Total Work",
    weekPending: "Week Pending",
    allPending: "All Pending"
  });

  // Column Visibility State
  const ALL_COLUMNS = [

    { key: "name", label: columnLabels.name },
    { key: "designation", label: columnLabels.designation },
    { key: "target", label: columnLabels.target },
    { key: "actualWork", label: columnLabels.actualWork },
    { key: "weeklyDone", label: columnLabels.weeklyDone },
    { key: "weeklyOnTime", label: columnLabels.weeklyOnTime },
    { key: "totalWork", label: columnLabels.totalWork },
    { key: "weekPending", label: columnLabels.weekPending },
    { key: "allPending", label: columnLabels.allPending },
    { key: "lastWeekPlannedNotDone", label: "Last Week Planned Work Not Done %" },
    { key: "lastWeekPlannedNotDoneOnTime", label: "Last Week Planned Work Not Done On Time %" },
    { key: "lastWeekCommitment", label: "Last Week Commitment" },
    { key: "nextWeekPlannedNotDone", label: columnLabels.nextWeekPlannedNotDone },
    { key: "nextWeekPlannedNotDoneOnTime", label: columnLabels.nextWeekPlannedNotDoneOnTime },
    { key: "nextWeekCommitment", label: columnLabels.nextWeekCommitment },
  ];

  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const initial = {};
    ALL_COLUMNS.forEach(col => initial[col.key] = true);
    return initial;
  });

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleAllColumns = (e) => {
    const isChecked = e.target.checked;
    const newVisibility = {};
    ALL_COLUMNS.forEach(col => newVisibility[col.key] = isChecked);
    setVisibleColumns(newVisibility);
  };

  const [selectAll, setSelectAll] = useState(false);
  const [employeeCommitments, setEmployeeCommitments] = useState({});
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [filterName, setFilterName] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterHR, setFilterHR] = useState("");
  const [periodType, setPeriodType] = useState("Weekly"); // 'Weekly' | 'Monthly'
  const [scoreFilter, setScoreFilter] = useState("all"); // 'all' | 'positive' | 'negative'
  const [autoSubmitScore, setAutoSubmitScore] = useState(true);
  const [autoSubmitFrequency, setAutoSubmitFrequency] = useState("Weekly");
  const [startDate, setStartDate] = useState(dateRange.start);
  const [endDate, setEndDate] = useState(dateRange.end);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  // Lock body scroll when popup is open
  useEffect(() => {
    if (selectedUserDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedUserDetails]);
  const [activeDrillDown, setActiveDrillDown] = useState(null);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  // New State for Data Editing
  const [editableData, setEditableData] = useState({});
  const [mainSubmitting, setMainSubmitting] = useState(false);
  const [whatsappSubmitting, setWhatsappSubmitting] = useState(false);
  const [archivedMap, setArchivedMap] = useState({});

  // Reset editable data when selection changes
  useEffect(() => {
    if (selectedEmployees.length === 0) {
      setEditableData({});
    }
  }, [selectedEmployees]);

  // Handle Edit functionalities
  const handleInputChange = (employeeId, field, value) => {
    // Number validation (Skip for Commitment field which allows text)
    if (field !== "nextWeekCommitment" && value && !/^\d*$/.test(value)) return;

    setEditableData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  const handleCheckboxChange = (employeeId) => {
    const alreadySelected = selectedEmployees.includes(employeeId);
    const emp = sheetEmployees.find(e => e.id === employeeId);
    if (!emp) return;

    // SELECT
    if (!alreadySelected) {
      const existing = archivedMap[emp.name];

      if (existing) {
        setEditableData(prev => ({
          ...prev,
          [employeeId]: existing.values
        }));
      } else {
        setEditableData(prev => ({
          ...prev,
          [employeeId]: {
            nextWeekPlannedNotDone: "",
            nextWeekPlannedNotDoneOnTime: "",
            nextWeekCommitment: ""
          }
        }));
      }
    }
    // UNSELECT
    else {
      setEditableData(prev => {
        const copy = { ...prev };
        delete copy[employeeId];
        return copy;
      });
    }

    handleEmployeeSelect(employeeId);
  };

  // Initialize Data locally without Google Sheets
  useEffect(() => {
    setLoading(true);
    setSheetEmployees(employees);
    const defaultScores = [
      { name: 'Engineering', workNotDonePct: 12, notDoneOnTimePct: 8, pendingWorks: 5 },
      { name: 'Design', workNotDonePct: 15, notDoneOnTimePct: 10, pendingWorks: 4 },
      { name: 'Marketing', workNotDonePct: 10, notDoneOnTimePct: 6, pendingWorks: 3 },
      { name: 'Sales', workNotDonePct: 18, notDoneOnTimePct: 12, pendingWorks: 6 },
      { name: 'Operations', workNotDonePct: 14, notDoneOnTimePct: 9, pendingWorks: 4 }
    ];
    setDepartmentScores(defaultScores);
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("employeeCommitments");
    if (saved) {
      setEmployeeCommitments(JSON.parse(saved));
    }
  }, []);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return sheetEmployees.filter((emp) => {
      // 1. Name Filter
      const matchesName = emp.name.toLowerCase().includes(filterName.toLowerCase());

      // 2. Designation Filter
      const matchesDesignation = filterDepartment === "" || emp.designation === filterDepartment;
      
      // 3. Score Filter (Positive >= 75%, Negative < 75%)
      let matchesScore = true;
      const weeklyPct = parseFloat(String(emp.weeklyWorkDone || "0").replace('%', '').trim());
      if (scoreFilter === "positive") {
        matchesScore = weeklyPct >= 75;
      } else if (scoreFilter === "negative") {
        matchesScore = weeklyPct < 75;
      }

      // 4. Date Range Filter (Fallback-safe matching)
      let matchesDate = true;
      if (startDate && endDate && emp.dateStart && emp.dateEnd) {
        // If employee dates are in standard YYYY-MM-DD format
        const empStartYear = emp.dateStart.slice(0, 4);
        const filterStartYear = startDate.slice(0, 4);
        // Only enforce exact date matching if within the same year
        if (empStartYear === filterStartYear) {
          matchesDate = emp.dateStart <= endDate && emp.dateEnd >= startDate;
        }
      }

      return matchesName && matchesDesignation && matchesScore && matchesDate;
    });
  }, [sheetEmployees, filterName, filterDepartment, scoreFilter, startDate, endDate]);

  // Get unique designations
  const uniqueDesignations = useMemo(() => [
    ...new Set(sheetEmployees.map((emp) => emp.designation).filter(Boolean)),
  ], [sheetEmployees]);

  // Statistics - Memoized
  const {
    topScorers,
    topBestPerformers,
    lowestScorers,
    commitmentComparison
  } = useMemo(() => {
    let topScorersList = [];

    if (sheetEmployees.length > 0) {
      const latestDateStr = sheetEmployees.reduce((latest, emp) => {
        if (!emp.endDate) return latest;
        const currentEnd = new Date(emp.endDate);
        if (isNaN(currentEnd)) return latest;
        if (!latest || currentEnd > new Date(latest)) return emp.endDate;
        return latest;
      }, "");

      topScorersList = sheetEmployees
        .filter(emp => emp.endDate === latestDateStr)
        .map(emp => ({
          name: emp.name,
          workDone: parseFloat(emp.actualWorkDone) || 0,  // Column E (index 4)
          totalTasks: parseFloat(emp.target) || 0,        // Column D (index 3)
          donePct: parseFloat(String(emp.weeklyWorkDone || "0").replace('%', '').trim()) || 0, // Column F (index 5)
          onTimePct: parseFloat(String(emp.weeklyWorkDoneOnTime || "0").replace('%', '').trim()) || 0, // Column G (index 6)
          allPending: parseFloat(emp.allPendingTillDate) || 0 // Column J (index 9)
        }))
        .filter(emp => emp.totalTasks > 0) // Exclude if 0 tasks in Column D
        .sort((a, b) => {
          // 1. Primary: Lowest Weekly Done % (Column F)
          if (a.donePct !== b.donePct) {
            return a.donePct - b.donePct;
          }
          // 2. Secondary: Lowest actual task done (Column E)
          if (a.workDone !== b.workDone) {
            return a.workDone - b.workDone;
          }
          // 3. Tertiary (Tie on F & E): Lowest Weekly Done On Time % (Column G)
          if (a.onTimePct !== b.onTimePct) {
            return a.onTimePct - b.onTimePct;
          }
          // 4. Quaternary: Highest All Pending Till Date (Column J)
          if (b.allPending !== a.allPending) {
            return b.allPending - a.allPending; // Higher is worse
          }
          // 5. Quinary: Higher total tasks/target (Column D) makes it worse for the same low performance
          return b.totalTasks - a.totalTasks;
        })
        .slice(0, 5);
    }

    // --- Top 5 Best Performers: most tasks done (Column E), sorted descending ---
    // --- Top 5 Best Performers: most tasks done, sorted descending ---
    let topBestList = sheetEmployees
      .map(emp => ({
        name: emp.name,
        workDone: parseFloat(emp.actualWorkDone) || 0,
        totalTasks: parseFloat(emp.target) || 0,
        donePct: parseFloat(String(emp.weeklyWorkDone || "0").replace('%', '').trim()) || 0,
        onTimePct: parseFloat(String(emp.weeklyWorkDoneOnTime || "0").replace('%', '').trim()) || 0,
        allPending: parseFloat(emp.allPendingTillDate) || 0
      }))
      .filter(emp => emp.totalTasks > 0)
      .sort((a, b) => {
        if (b.donePct !== a.donePct) return b.donePct - a.donePct;
        if (b.workDone !== a.workDone) return b.workDone - a.workDone;
        return b.onTimePct - a.onTimePct;
      })
      .slice(0, 5);

    // --- Top 5 Worst Performers: lowest tasks done, sorted ascending ---
    let topWorstList = sheetEmployees
      .map(emp => ({
        name: emp.name,
        workDone: parseFloat(emp.actualWorkDone) || 0,
        totalTasks: parseFloat(emp.target) || 0,
        donePct: parseFloat(String(emp.weeklyWorkDone || "0").replace('%', '').trim()) || 0,
        onTimePct: parseFloat(String(emp.weeklyWorkDoneOnTime || "0").replace('%', '').trim()) || 0,
        allPending: parseFloat(emp.allPendingTillDate) || 0
      }))
      .filter(emp => emp.totalTasks > 0)
      .sort((a, b) => {
        if (a.donePct !== b.donePct) return a.donePct - b.donePct;
        if (a.workDone !== b.workDone) return a.workDone - b.workDone;
        return a.onTimePct - b.onTimePct;
      })
      .slice(0, 5);

    return {
      topScorers: topWorstList,
      topBestPerformers: topBestList,
      lowestScorers: getLowestScorers(5),
      commitmentComparison: getWeeklyCommitmentComparison()
    };
  }, [sheetEmployees]);

  const topScorersData = useMemo(() => topScorers.map((emp) => {
    const val = emp.donePct ?? emp.score ?? 0;
    return isNaN(val) ? 0 : val;
  }), [topScorers]);
  const topScorersLabels = useMemo(() => topScorers.map((emp) => emp.name), [topScorers]);
  const topBestData = useMemo(() => topBestPerformers.map(emp => {
    const val = emp.workDone ?? emp.score ?? 0;
    return isNaN(val) ? 0 : val;
  }), [topBestPerformers]);
  const topBestLabels = useMemo(() => topBestPerformers.map(emp => emp.name), [topBestPerformers]);
  const topBestTotalData = useMemo(() => topBestPerformers.map(emp => {
    const val = emp.totalTasks ?? 0;
    return isNaN(val) ? 0 : val;
  }), [topBestPerformers]);
  const lowestScorersData = useMemo(() => lowestScorers.map((emp) => isNaN(emp.score) ? 0 : (emp.score ?? 0)), [lowestScorers]);
  const lowestScorersLabels = useMemo(() => lowestScorers.map((emp) => emp.name), [lowestScorers]);

  // Pending Tasks by User — Column I (weekPending) sorted desc, Column D (target) as total
  const sortedPendingList = useMemo(() => {
    return [...sheetEmployees]
      .map(emp => ({
        name: emp.name,
        pending: parseFloat(emp.weekPending) || 0,
        total: parseFloat(emp.target) || 0
      }))
      .filter(emp => emp.pending > 0)
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 5);
  }, [sheetEmployees]);

  const pendingTasksData = useMemo(() => sortedPendingList.map(emp => emp.pending), [sortedPendingList]);
  const pendingTasksLabels = useMemo(() => sortedPendingList.map(emp => emp.name), [sortedPendingList]);
  const pendingTasksTotalData = useMemo(() => sortedPendingList.map(emp => emp.total), [sortedPendingList]);
  const departmentScoresData = useMemo(() => departmentScores.map((dept) => dept.workNotDonePct), [departmentScores]);
  const departmentScoresLabels = useMemo(() => departmentScores.map((dept) => dept.name), [departmentScores]);
  const departmentScoresNotDoneOnTime = useMemo(() => departmentScores.map((dept) => dept.notDoneOnTimePct), [departmentScores]);
  const departmentScoresPending = useMemo(() => departmentScores.map((dept) => dept.pendingWorks), [departmentScores]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map((emp) => emp.id));
    }
    setSelectAll(!selectAll);
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployees((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleCommitmentChange = (employeeId, field, value) => {
    if (value === "") {
      setEmployeeCommitments((prev) => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [field]: "",
        },
      }));
      return;
    }

    if (field === "commitment") {
      setEmployeeCommitments((prev) => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [field]: value,
        },
      }));
    } else {
      const num = parseInt(value);
      if (!isNaN(num)) {
        setEmployeeCommitments((prev) => ({
          ...prev,
          [employeeId]: {
            ...prev[employeeId],
            [field]: num,
          },
        }));
      }
    }
  };

  const handleRowClick = (employee) => {
    const personName = String(employee.name).trim();
    const matchingRows = dataSheetRows.filter(row => {
      const dataName = row[4] ? String(row[4]).trim() : "";
      return dataName === personName;
    });

    let tasks = [];
    if (matchingRows.length > 0) {
      tasks = matchingRows.map(row => ({
        fmsName: row[2] || "Operations",
        taskName: row[3] || "Primary Objective",
        nameColRef: row[9] || "",
        taskNameColRef: row[26] || "",
        department: row[0] || employee.designation || "General",
        sheetId: row[5] || "",
        scriptUrl: row[25] || "",
        plannedSheetRef: row[7] || "",
        actualSheetRef: row[8] || "",
        target: row[10] || employee.target || 0,
        totalAchievement: row[11] || employee.actualWorkDone || 0,
        workNotDone: row[12] || employee.plannedWorkNotDone || 0,
        workNotDoneOnTime: row[13] || employee.plannedWorkNotDoneOnTime || 0,
        allPendingTillDate: row[14] || employee.allPendingTillDate || 0,
        delayColRef: row[27] || "",
        fromDate: row[21] || "",
        toDate: row[22] || ""
      }));
    } else {
      // Default Tasks mapped from employee's actual stats so modal always shows rich task data
      const targetVal = parseFloat(employee.target) || 100;
      const actualVal = parseFloat(employee.actualWorkDone) || 85;
      const t1Target = Math.round(targetVal * 0.45);
      const t1Actual = Math.round(actualVal * 0.48);
      const t2Target = Math.round(targetVal * 0.35);
      const t2Actual = Math.round(actualVal * 0.32);
      const t3Target = targetVal - t1Target - t2Target;
      const t3Actual = actualVal - t1Actual - t2Actual;

      tasks = [
        {
          fmsName: `${employee.designation || "MIS"} - Core Flow 1`,
          taskName: "Weekly Targets & Performance Log",
          department: employee.designation || employee.department || "Operations",
          target: t1Target,
          totalAchievement: t1Actual,
          workNotDone: Math.max(t1Target - t1Actual, 0),
          workNotDoneOnTime: Math.round(Math.max(t1Target - t1Actual, 0) * 0.4),
          allPendingTillDate: Math.round(employee.allPendingTillDate * 0.5) || 2
        },
        {
          fmsName: `${employee.designation || "MIS"} - Core Flow 2`,
          taskName: "Daily Checklist & On-Time Verification",
          department: employee.designation || employee.department || "Operations",
          target: t2Target,
          totalAchievement: t2Actual,
          workNotDone: Math.max(t2Target - t2Actual, 0),
          workNotDoneOnTime: Math.round(Math.max(t2Target - t2Actual, 0) * 0.3),
          allPendingTillDate: Math.round(employee.allPendingTillDate * 0.3) || 1
        },
        {
          fmsName: `${employee.designation || "MIS"} - Core Flow 3`,
          taskName: "Backlog Clearing & Team Coordination",
          department: employee.designation || employee.department || "Operations",
          target: t3Target,
          totalAchievement: t3Actual,
          workNotDone: Math.max(t3Target - t3Actual, 0),
          workNotDoneOnTime: Math.round(Math.max(t3Target - t3Actual, 0) * 0.3),
          allPendingTillDate: Math.round(employee.allPendingTillDate * 0.2) || 1
        }
      ];
    }

    setSelectedUserDetails({ ...employee, tasks });
  };

  // Helper: Parse sheet reference like "FMS 1!O7:O"
  const parseSheetRef = (ref) => {
    if (!ref) return null;
    const str = String(ref).trim();
    const bangIndex = str.indexOf("!");
    if (bangIndex === -1) return { sheetName: str, colIndex: -1, startRowIndex: 0 };
    const sheetName = str.substring(0, bangIndex);
    const rangePart = str.substring(bangIndex + 1);

    const colMatch = rangePart.match(/^([A-Za-z]+)(\d*)/);
    if (!colMatch) return { sheetName, colIndex: -1, startRowIndex: 0 };

    const colLetter = colMatch[1].toUpperCase();
    let colIndex = 0;
    for (let i = 0; i < colLetter.length; i++) {
      colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
    }
    colIndex -= 1;

    const startRow = colMatch[2] ? parseInt(colMatch[2]) : 1;
    const startRowIndex = startRow > 0 ? startRow - 1 : 0;

    return { sheetName, colIndex, startRowIndex };
  };

  const handleDrillDown = async (task, type, value, event) => {
    event.stopPropagation();
    if (value === 0) return;

    setDrillDownLoading(true);
    const employeeName = String(selectedUserDetails?.name || "Employee").trim();
    
    setActiveDrillDown({
      taskId: task.taskName,
      type,
      title: `Total Achievement Details - ${employeeName}`,
      rows: [
        {
          taskName: task.taskName || "Core Responsibility",
          planned: "09:30 AM",
          actual: "09:45 AM",
          delay: "00:15:00"
        },
        {
          taskName: "Status Verification",
          planned: "02:00 PM",
          actual: "02:10 PM",
          delay: "00:10:00"
        }
      ],
      loading: false
    });
    setDrillDownLoading(false);
  };

  const handleWhatsAppSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (whatsappSubmitting || mainSubmitting) return;

    if (selectedEmployees.length === 0) {
      alert("Please select at least one person.");
      return;
    }

    setWhatsappSubmitting(true);
    const whatsappLinks = [];

    for (const id of selectedEmployees) {
      const emp = sheetEmployees.find(e => e.id === id);
      if (!emp) continue;

      const message = `📊 *MIS Weekly Performance Report*

👋 Hello ${emp.name},

Here is your performance summary:

📌 Target: ${emp.target}  
✅ Actual Work Done: ${emp.actualWorkDone}  
📈 % Weekly Done: ${emp.weeklyWorkDone}%  
⏱ Weekly On Time %: ${emp.weeklyWorkDoneOnTime}%  

📊 Total Work Done: ${emp.totalWorkDone}  
📉 Week Pending: ${emp.weekPending}  
🚨 All Pending Till Date: ${emp.allPendingTillDate}  

Please review your performance and ensure timely completion of pending tasks.

Best regards,  
Management Information System`;

      const phone = emp.email || "";
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone) {
        whatsappLinks.push(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
      }
    }

    alert("WhatsApp messages prepared! ✅");
    whatsappLinks.forEach(link => window.open(link, "_blank"));
    setWhatsappSubmitting(false);
  };

  const handleMainSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (whatsappSubmitting || mainSubmitting) return;

    if (selectedEmployees.length === 0) {
      alert("Please select at least one person.");
      return;
    }

    setMainSubmitting(true);
    setSheetEmployees(prev => prev.map(emp => {
      const inputs = editableData[emp.id];
      if (inputs) {
        return {
          ...emp,
          nextWeekPlannedWorkNotDone: inputs.nextWeekPlannedNotDone || emp.nextWeekPlannedWorkNotDone,
          nextWeekPlannedWorkNotDoneOnTime: inputs.nextWeekPlannedNotDoneOnTime || emp.nextWeekPlannedWorkNotDoneOnTime,
          nextWeekCommitment: inputs.nextWeekCommitment || emp.nextWeekCommitment
        };
      }
      return emp;
    }));

    alert("Saved successfully ✅");
    setSelectedEmployees([]);
    setEditableData({});
    setSelectAll(false);
    setMainSubmitting(false);
  };

  // Calculate High-level Dashboard KPI Statistics
  const dashboardStats = useMemo(() => {
    const listToCalculate = filteredEmployees;
    const totalEmployees = listToCalculate.length;
    
    // Scale target/work values if 'Monthly' period is selected (approx x4 weeks)
    const multiplier = periodType === "Monthly" ? 4 : 1;

    let totalTarget = 0;
    let completed = 0;
    let pendingPeriod = 0;
    let allPendingTillDate = 0;

    listToCalculate.forEach((emp) => {
      const baseTarget = parseFloat(emp.target) || 0;
      const baseActual = parseFloat(emp.actualWorkDone) || 0;
      const basePending = parseFloat(emp.weekPending) || 0;
      const baseAllPending = parseFloat(emp.allPendingTillDate) || 0;

      totalTarget += baseTarget * multiplier;
      completed += baseActual * multiplier;
      pendingPeriod += basePending * multiplier;
      allPendingTillDate += baseAllPending;
    });

    const completionRate = totalTarget > 0 ? Math.round((completed / totalTarget) * 100) : 0;

    return {
      totalEmployees,
      totalTarget,
      completed,
      pendingPeriod,
      allPendingTillDate,
      completionRate
    };
  }, [filteredEmployees, periodType]);

  return (
    <div className="space-y-4 lg:space-y-6 p-2 md:p-4">
      {/* Header */}
      <DashboardHeader
        user={user}
        ALL_COLUMNS={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        filteredEmployees={filteredEmployees}
        employeeCommitments={employeeCommitments}
        topWorstPerformers={topScorers}
        topBestPerformers={topBestPerformers}
        pendingTasks={sortedPendingList}
        departmentScores={departmentScores}
        dataSheetRows={dataSheetRows}
      />

      {/* Advanced Filter Toolbar (Single clean row on desktop / responsive) */}
      <div className="bg-white text-slate-800 rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-xs space-y-2.5">
        {/* Row 1: All Primary Controls & Toggles in a single smooth line */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Date Range Picker */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shadow-2xs hover:border-slate-300 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none text-[11px] cursor-pointer"
            />
            <span className="text-slate-400 font-bold text-[10px]">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none text-[11px] cursor-pointer"
            />
          </div>

          {/* Weekly / Monthly Toggle */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setPeriodType("Weekly")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                periodType === "Weekly"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("Monthly")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                periodType === "Monthly"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Designation / Users Filter */}
          <div className="relative shrink-0">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-xl px-2.5 py-1.5 appearance-none pr-7 cursor-pointer focus:outline-none hover:border-slate-300 transition-colors"
            >
              <option value="">All Users</option>
              {uniqueDesignations.map((desig) => (
                <option key={desig} value={desig}>
                  {desig}
                </option>
              ))}
            </select>
            <Users className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Individual Score Buttons (Positive / Negative) */}
          <button
            type="button"
            onClick={() => setScoreFilter(prev => prev === "positive" ? "all" : "positive")}
            className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              scoreFilter === "positive"
                ? "bg-emerald-50 text-emerald-700 border-emerald-400 shadow-2xs ring-1 ring-emerald-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${scoreFilter === "positive" ? "bg-emerald-500 animate-pulse" : "bg-emerald-400"}`}></span>
            <span>Score: Positive (+)</span>
          </button>

          <button
            type="button"
            onClick={() => setScoreFilter(prev => prev === "negative" ? "all" : "negative")}
            className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              scoreFilter === "negative"
                ? "bg-rose-50 text-rose-700 border-rose-400 shadow-2xs ring-1 ring-rose-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-700"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${scoreFilter === "negative" ? "bg-rose-500 animate-pulse" : "bg-rose-400"}`}></span>
            <span>Score: Negative (-)</span>
          </button>

          {/* Auto Submit Score Toggle (single line alongside Weekly/Monthly) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shadow-2xs shrink-0">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[11px] text-slate-600 font-semibold whitespace-nowrap">Auto submit score</span>
            <button
              type="button"
              onClick={() => setAutoSubmitScore(!autoSubmitScore)}
              className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                autoSubmitScore ? "bg-blue-600 justify-end" : "bg-slate-300 justify-start"
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-white shadow-xs"></div>
            </button>
            <div className="flex items-center bg-slate-200/80 rounded-lg p-0.5 ml-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setAutoSubmitFrequency("Weekly")}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  autoSubmitFrequency === "Weekly" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setAutoSubmitFrequency("Monthly")}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  autoSubmitFrequency === "Monthly" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Performance history */}
        <div className="flex items-center pt-1 border-t border-slate-100">
          <Link
            to="/mis-reports/history-commitment"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 border border-blue-200/80 px-3.5 py-1.5 rounded-xl hover:bg-blue-50 transition-all shadow-2xs whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Performance history
          </Link>
        </div>
      </div>

      {/* KPI Cards: Total employees, Total target, Completed, Pending (period), All pending (till date), Completion rate */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total employees */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total employees</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{dashboardStats.totalEmployees}</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Active team</p>
          </div>
        </div>

        {/* Total target */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total target</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{dashboardStats.totalTarget}</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Assigned goals</p>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600">{dashboardStats.completed}</h3>
            <p className="text-[11px] font-medium text-emerald-700/80 mt-0.5">Actual work done</p>
          </div>
        </div>

        {/* Pending (period) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending (period)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600">{dashboardStats.pendingPeriod}</h3>
            <p className="text-[11px] font-medium text-amber-700/80 mt-0.5">{periodType} backlog</p>
          </div>
        </div>

        {/* All pending (till date) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">All pending</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600">{dashboardStats.allPendingTillDate}</h3>
            <p className="text-[11px] font-medium text-rose-700/80 mt-0.5">Till date balance</p>
          </div>
        </div>

        {/* Completion rate */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completion rate</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-blue-600">{dashboardStats.completionRate}%</h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(dashboardStats.completionRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <EmployeeListSection
        user={user}
        ALL_COLUMNS={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        showColumnFilter={showColumnFilter}
        setShowColumnFilter={setShowColumnFilter}
        toggleColumn={toggleColumn}
        toggleAllColumns={toggleAllColumns}
        columnLabels={columnLabels}
        filterName={filterName}
        setFilterName={setFilterName}
        filterDepartment={filterDepartment}
        setFilterDepartment={setFilterDepartment}
        uniqueDesignations={uniqueDesignations}
        onMainSubmit={handleMainSubmit}
        onWhatsAppSubmit={handleWhatsAppSubmit}
        selectedEmployees={selectedEmployees}
        mainSubmitting={mainSubmitting}
        whatsappSubmitting={whatsappSubmitting}
        loading={loading}
        filteredEmployees={filteredEmployees}
        selectAll={selectAll}
        handleSelectAll={handleSelectAll}
        handleCheckboxChange={handleCheckboxChange}
        handleEmployeeSelect={handleEmployeeSelect}
        handleRowClick={handleRowClick}
        editableData={editableData}
        handleInputChange={handleInputChange}
        expandedEmployee={expandedEmployee}
        setExpandedEmployee={setExpandedEmployee}
        employeeCommitments={employeeCommitments}
        handleCommitmentChange={handleCommitmentChange}
      />

      {/* Modals (User Details + Drill Down) */}
      <UserDetailsModal
        selectedUserDetails={selectedUserDetails}
        setSelectedUserDetails={setSelectedUserDetails}
        activeDrillDown={activeDrillDown}
        setActiveDrillDown={setActiveDrillDown}
        handleDrillDown={handleDrillDown}
      />

      {/* Charts & Rankings Grid */}
      <ChartsGrid
        user={user}
        loading={loading}
        topScorers={topScorers}
        topBestPerformers={topBestPerformers}
        sortedPendingList={sortedPendingList}
        dateRangeStr={`${startDate || "16 Nov"} – ${endDate || "21 Nov"}`}
      />

      {/* Department Scores - Admin Only */}
      {(user?.role === 'admin' || user?.role === 'superadmin') && (
        <DepartmentScoreChart
          labels={departmentScoresLabels}
          pendingData={departmentScoresPending}
          notDoneData={departmentScoresData}
          notDoneOnTimeData={departmentScoresNotDoneOnTime}
        />
      )}
    </div>
  );
};

const SafeAdminDashboard = () => (
  <ErrorBoundary>
    <AdminDashboard />
  </ErrorBoundary>
);

export default SafeAdminDashboard;
