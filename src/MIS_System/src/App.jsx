import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/admin/Dashboard';
import AdminHistoryCommitment from './pages/admin/HistoryCommitment';
import AdminTodayTasks from './pages/admin/TodayTasks';
import AdminPendingTasks from './pages/admin/PendingTasks';
import KpiKra from './pages/admin/KpiKra';
import AdminLayout from './layouts/AdminLayout';
import NotFound from './pages/NotFound';
import Report from './pages/admin/Report';

function App() {
  return (
    <Routes>
      {/* Redirect /login and / to Admin Dashboard */}
      <Route path="/login" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Admin Routes */}
      <Route path="/admin/*" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="history-commitment" element={<AdminHistoryCommitment />} />
        <Route path="today-tasks" element={<AdminTodayTasks />} />
        <Route path="pending-tasks" element={<AdminPendingTasks />} />
        <Route path="kpi-kra" element={<KpiKra />} />
        <Route path="department" element={<Report />} />
      </Route>

      {/* User Routes */}
      <Route path="/user/*" element={<AdminLayout />}>
        <Route index element={<Navigate to="/user/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="history-commitment" element={<AdminHistoryCommitment />} />
        <Route path="kpi-kra" element={<KpiKra />} />
      </Route>

      {/* Root route */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;