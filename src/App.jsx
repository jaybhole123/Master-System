

import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import "./index.css"
import "./Hr-sysytem/src/index.css"
import "./Hr-sysytem/src/App.css"
import "./Petty-Cash/src/index.css"
import "./Daily-Shedular/src/index.css"
import "./Daily-Shedular/src/App.css"
import DocumentRoutes from "./modules/document/DocumentRoutes"

// --- Page Imports ---
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminAssignTask from "./pages/admin/AssignTask"
import ChecklistTask from "./pages/admin/ChecklistTask"     // New
import MaintenanceTask from "./pages/admin/MaintenanceTask" // New
import RepairTask from "./pages/admin/RepairTask"           // New
import EATask from "./pages/admin/EATask"                   // New
import CalendarPage from "./pages/admin/CalendarPage"       // New
import QuickTask from "./pages/QuickTask"
import Demo from "./pages/user/Demo"
import Setting from "./pages/Setting"
import MisReport from "./pages/MisReport"
import MasterDashboard from "./pages/MasterDashboard"
import ProfilePage from "./pages/ProfilePage"
import GlobalSettings from "./pages/admin/GlobalSettings"
import HelpSlipPage from "./HelpSlip/src/pages/HelpSlip"

// --- HR System Imports ---
import HrDashboard from "./Hr-sysytem/src/pages/Dashboard"
import HrEmployeeMaster from "./Hr-sysytem/src/pages/EmployeeMaster"
import HrSalaryStructure from "./Hr-sysytem/src/pages/SalaryStructure"
import HrAttendance from "./Hr-sysytem/src/pages/Attendance"
import HrLeaveTracker from "./Hr-sysytem/src/pages/LeaveTracker"
import HrPayrollProcess from "./Hr-sysytem/src/pages/PayrollProcess"
import HrNetSalary from "./Hr-sysytem/src/pages/NetSalary"
import HrPayslip from "./Hr-sysytem/src/pages/Payslip"
import HrBankTransfer from "./Hr-sysytem/src/pages/BankTransfer"
import HrCreateIndent from "./Hr-sysytem/src/pages/Create-Indent"
import HrInventory from "./Hr-sysytem/src/pages/Inventory"
import HrOfferLetter from "./Hr-sysytem/src/pages/OfferLetter"
import HrEmployeeJoin from "./Hr-sysytem/src/pages/EmployeeJoin"

// --- Petty Cash Imports ---
import PettyDashboard from "./Petty-Cash/src/pages/AdminDashboard"
import PettyAddCase from "./Petty-Cash/src/pages/AddCase"
import PettyExpenses from "./Petty-Cash/src/pages/Expenses"
import PettyLedger from "./Petty-Cash/src/pages/Ledger"
import PettySummary from "./Petty-Cash/src/pages/Summary"
import PettySettings from "./Petty-Cash/src/pages/Settings"
import { initializeStorage } from "./Petty-Cash/src/utils/storageManager"

// --- Daily Scheduler Imports ---
import { SchedulerProvider } from "./Daily-Shedular/src/context/SchedulerContext"
import DailyDashboard from "./Daily-Shedular/src/pages/Dashboard"
import DailyWaitingList from "./Daily-Shedular/src/pages/WaitingList"
import DailySomedayTasks from "./Daily-Shedular/src/pages/SomedayTasks"
import DailyReports from "./Daily-Shedular/src/pages/Reports"

// --- Data & Delegation Imports ---
import DataPage from "./pages/admin/DataPage"
import AdminDataPage from "./pages/admin/admin-data-page"
import AccountDataPage from "./pages/delegation"
import MyDelegation from "./pages/MyDelegation" // New
import AdminDelegationTask from "./pages/delegation-data"
import AllTasks from "./pages/admin/AllTasks"
import MyTasks from "./pages/admin/MyTasks" // New
import HolidayListPage from "./pages/admin/HolidayListPage"         // New
import WorkingDayCalendarPage from "./pages/admin/WorkingDayCalendarPage" // New
import AdminApprovalPage from "./pages/admin/AdminApprovalPage" // New
import NotificationsPage from "./pages/admin/Notifications"
import TrainingVideo from "./pages/admin/TrainingVideo"
import InsuranceManagement from "./pages/admin/InsuranceManagement"
import RentManagement from "./pages/admin/RentManagement"

// --- Layout & Components ---
import AdminLayout from "./components/layout/AdminLayout"
import RealtimeLogoutListener from "./components/RealtimeLogoutListener"
import { MagicToastProvider } from "./context/MagicToastContext"

// --- Auth Wrapper ---
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const username = (localStorage.getItem("user-name") || "").toLowerCase();
    const role = (localStorage.getItem("role") || "").toLowerCase();
    
    // Custom Permission Bypass
    const sysAccessStr = localStorage.getItem("system_access");
    const hasCustomPermissions = sysAccessStr && sysAccessStr.length > 0;

    if (!username) {
        return <Navigate to="/login" replace />
    }

    const isSuperAdmin = role === 'superadmin';

    if (!isSuperAdmin && !hasCustomPermissions && allowedRoles.length > 0 && !allowedRoles.map(r => r.toLowerCase()).includes(role)) {
        return <Navigate to="/master-dashboard" replace />
    }

    return children
}

const SuperAdminRoute = ({ children }) => {
    const username = (localStorage.getItem("user-name") || "").toLowerCase();
    const role = (localStorage.getItem("role") || "").toLowerCase();

    if (!username || username !== "admin" || role !== "admin") {
        return <Navigate to="/master-dashboard" replace />
    }

    return children
}

const HrWrapper = ({ children }) => (
    <ProtectedRoute>
        <AdminLayout>
            <div className="hr-system-container p-2 sm:p-4">
                {children}
            </div>
        </AdminLayout>
    </ProtectedRoute>
);

const PettyWrapper = ({ children }) => (
    <ProtectedRoute>
        <AdminLayout>
            <div className="petty-cash-container p-2 sm:p-4">
                {children}
            </div>
        </AdminLayout>
    </ProtectedRoute>
);

const DailySchedulerWrapper = ({ children }) => (
    <ProtectedRoute>
        <SchedulerProvider>
            <AdminLayout>
                <div className="daily-scheduler-container p-2 sm:p-4">
                    {children}
                </div>
            </AdminLayout>
        </SchedulerProvider>
    </ProtectedRoute>
);

function App() {
    return (
        <MagicToastProvider>
            <Toaster position="top-right" />
            <Router>
                {/* Realtime listener handles logout logic across tabs */}
                <RealtimeLogoutListener />

                <Routes>
                    {/* --- Public Routes --- */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* --- Main Dashboard Redirect --- */}
                    {/* Redirects /dashboard to /dashboard/admin to ensure canonical URL */}
                    <Route path="/dashboard" element={<Navigate to="/master-dashboard" replace />} />

                    {/* --- Master Dashboard --- */}
                    <Route 
                        path="/master-dashboard"
                        element={
                            <ProtectedRoute>
                                <MasterDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Profile Route --- */}
                    <Route
                        path="/dashboard/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Core Dashboard Routes --- */}
                    <Route
                        path="/dashboard/admin"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/demo"
                        element={
                            <ProtectedRoute>
                                <Demo />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Task Management (Admin Only) --- */}
                    <Route
                        path="/dashboard/assign-task"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <AdminAssignTask />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Rent Management --- */}
                    <Route
                        path="/dashboard/rent-management"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <RentManagement />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Operational Tasks (All Authenticated Users) --- */}
                    {/* Based on snippet 2, these are open to all users. Add allowedRoles={['admin']} if they should be restricted. */}
                    <Route
                        path="/dashboard/quick-task"
                        element={
                            <ProtectedRoute>
                                <QuickTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/checklist"
                        element={
                            <ProtectedRoute>
                                <ChecklistTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/maintenance"
                        element={
                            <ProtectedRoute>
                                <MaintenanceTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/repair"
                        element={
                            <ProtectedRoute>
                                <RepairTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/ea-task"
                        element={
                            <ProtectedRoute>
                                <EATask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/calendar"
                        element={
                            <ProtectedRoute>
                                <CalendarPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/task"
                        element={
                            <ProtectedRoute>
                                <AllTasks />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/my-task"
                        element={
                            <ProtectedRoute allowedRoles={["superadmin"]}>
                                <MyTasks />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/my-task/delegation"
                        element={
                            <ProtectedRoute allowedRoles={["superadmin"]}>
                                <MyDelegation />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/holiday-list"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <HolidayListPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/working-day-calendar"
                        element={
                            <ProtectedRoute>
                                <WorkingDayCalendarPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Data & Reporting (Admin Only) --- */}
                    <Route
                        path="/dashboard/data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <DataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/data/:category"
                        element={
                            <ProtectedRoute>
                                <DataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/admin-data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <AdminDataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/delegation"
                        element={
                            <ProtectedRoute>
                                <AccountDataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/delegation-data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <AdminDelegationTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/admin-approval"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <AdminApprovalPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mis-report"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <MisReport />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/notifications"
                        element={
                            <ProtectedRoute>
                                <NotificationsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/training-video"
                        element={
                            <ProtectedRoute>
                                <TrainingVideo />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/insurance"
                        element={
                            <ProtectedRoute>
                                <InsuranceManagement />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Settings (Admin Only) --- */}
                    <Route
                        path="/dashboard/setting"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <Setting />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/global-settings"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <GlobalSettings />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Help Slip --- */}
                    <Route
                        path="/dashboard/help-slip"
                        element={
                            <ProtectedRoute>
                                <AdminLayout>
                                    <div className="h-full overflow-y-auto w-full">
                                        <HelpSlipPage />
                                    </div>
                                </AdminLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* --- HR System Routes --- */}
                    <Route path="/hr" element={<HrWrapper><HrDashboard /></HrWrapper>} />
                    <Route path="/hr/dashboard" element={<HrWrapper><HrDashboard /></HrWrapper>} />
                    <Route path="/hr/employee-master" element={<HrWrapper><HrEmployeeMaster /></HrWrapper>} />
                    <Route path="/hr/salary-structure" element={<HrWrapper><HrSalaryStructure /></HrWrapper>} />
                    <Route path="/hr/attendance" element={<HrWrapper><HrAttendance /></HrWrapper>} />
                    <Route path="/hr/leave-tracker" element={<HrWrapper><HrLeaveTracker /></HrWrapper>} />
                    <Route path="/hr/leaves" element={<Navigate to="/hr/leave-tracker" replace />} />
                    <Route path="/hr/payroll-process" element={<HrWrapper><HrPayrollProcess /></HrWrapper>} />
                    <Route path="/hr/process" element={<Navigate to="/hr/payroll-process" replace />} />
                    <Route path="/hr/net-salary" element={<HrWrapper><HrNetSalary /></HrWrapper>} />
                    <Route path="/hr/payslip" element={<HrWrapper><HrPayslip /></HrWrapper>} />
                    <Route path="/hr/bank-transfer" element={<HrWrapper><HrBankTransfer /></HrWrapper>} />
                    <Route path="/hr/bank" element={<Navigate to="/hr/bank-transfer" replace />} />
                    <Route path="/hr/create-indent" element={<HrWrapper><HrCreateIndent /></HrWrapper>} />
                    <Route path="/hr/indent" element={<Navigate to="/hr/create-indent" replace />} />
                    <Route path="/hr/inventory" element={<HrWrapper><HrInventory /></HrWrapper>} />
                    <Route path="/hr/offer-letter" element={<HrWrapper><HrOfferLetter /></HrWrapper>} />
                    <Route path="/hr/employee-join" element={<HrWrapper><HrEmployeeJoin /></HrWrapper>} />

                    {/* --- Petty Cash System Routes --- */}
                    <Route path="/petty-cash" element={<PettyWrapper><PettyDashboard /></PettyWrapper>} />
                    <Route path="/petty-cash/dashboard" element={<PettyWrapper><PettyDashboard /></PettyWrapper>} />
                    <Route path="/petty-cash/add-case" element={<PettyWrapper><PettyAddCase /></PettyWrapper>} />
                    <Route path="/petty-cash/expenses" element={<PettyWrapper><PettyExpenses /></PettyWrapper>} />
                    <Route path="/petty-cash/ledger" element={<PettyWrapper><PettyLedger /></PettyWrapper>} />
                    <Route path="/petty-cash/summary" element={<PettyWrapper><PettySummary /></PettyWrapper>} />
                    <Route path="/petty-cash/settings" element={<PettyWrapper><PettySettings /></PettyWrapper>} />

                    {/* --- Daily Scheduler System Routes --- */}
                    <Route path="/daily-scheduler" element={<DailySchedulerWrapper><DailyDashboard /></DailySchedulerWrapper>} />
                    <Route path="/daily-scheduler/dashboard" element={<DailySchedulerWrapper><DailyDashboard /></DailySchedulerWrapper>} />
                    <Route path="/daily-scheduler/waiting-list" element={<DailySchedulerWrapper><DailyWaitingList /></DailySchedulerWrapper>} />
                    <Route path="/daily-scheduler/someday" element={<DailySchedulerWrapper><DailySomedayTasks /></DailySchedulerWrapper>} />
                    <Route path="/daily-scheduler/reports" element={<DailySchedulerWrapper><DailyReports /></DailySchedulerWrapper>} />

                    {/* --- Backward Compatibility Redirects (From Snippet 1) --- */}
                    {/* These catch old URLs and forward them to the new structure */}
                    <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />
                    <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin" replace />} />
                    <Route path="/admin/quick" element={<Navigate to="/dashboard/quick-task" replace />} />
                    <Route path="/admin/assign-task" element={<Navigate to="/dashboard/assign-task" replace />} />
                    <Route path="/admin/delegation-task" element={<Navigate to="/dashboard/delegation-data" replace />} />
                    <Route path="/admin/mis-report" element={<Navigate to="/dashboard/mis-report" replace />} />
                    {/* --- Document & Substruction Routes --- */}
                    <Route 
                        path="/*" 
                        element={
                            <ProtectedRoute>
                                <DocumentRoutes />
                            </ProtectedRoute>
                        } 
                    />

                </Routes>
            </Router>
        </MagicToastProvider>
    )
}

export default App