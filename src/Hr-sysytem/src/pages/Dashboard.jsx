import React, { useState, useEffect } from 'react';
import { Users, CalendarCheck, FileText, PieChart as PieChartIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    recentActivities: [],
    departmentData: [],
    payrollData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // 1. Fetch total employees
        const { count: employeeCount, error: employeeError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
          
        if (employeeError) console.error("Error fetching employees", employeeError);

        // 2. Fetch pending leaves
        const { count: leaveCount, error: leaveError } = await supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending');
          
        if (leaveError) console.error("Error fetching leaves", leaveError);

        // 3. Fetch recent employees for activity
        const { data: recentUsers, error: usersError } = await supabase
          .from('users')
          .select('user_name, department, created_at')
          .order('created_at', { ascending: false })
          .limit(4);

        const activities = [];
        if (recentUsers) {
          recentUsers.forEach(u => {
            activities.push({
              text: `${u.user_name || 'New Employee'} joined the ${u.department || 'organization'}.`,
              date: new Date(u.created_at)
            });
          });
        }
        
        // sort activities
        activities.sort((a, b) => b.date - a.date);

        // 4. Fetch Department Distribution
        const { data: allUsers } = await supabase.from('users').select('department');
        let deptCounts = {};
        if (allUsers) {
          allUsers.forEach(u => {
            const dept = u.department || 'Unassigned';
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
          });
        }
        const deptData = Object.keys(deptCounts).map(key => ({ name: key, value: deptCounts[key] }));

        // 5. Fetch Payroll Trends (Total Net Salary per month)
        const { data: payroll } = await supabase.from('processed_payroll').select('month_year, net');
        let monthAgg = {};
        if (payroll) {
          payroll.forEach(p => {
            monthAgg[p.month_year] = (monthAgg[p.month_year] || 0) + p.net;
          });
        }
        const payData = Object.keys(monthAgg).map(key => ({ month: key, total: monthAgg[key] }));

        setMetrics({
          totalEmployees: employeeCount || 0,
          pendingLeaves: leaveCount || 0,
          recentActivities: activities.slice(0, 4),
          departmentData: deptData,
          payrollData: payData
        });
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of HR System metrics and activities.</p>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '12px', borderRadius: '8px', display: 'flex' }}>
            <Users size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Total Employees</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary, #6b7280)' }}>
              {loading ? '...' : `${metrics.totalEmployees} Active`}
            </p>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#10b981', color: 'white', padding: '12px', borderRadius: '8px', display: 'flex' }}>
            <CalendarCheck size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Attendance Today</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary, #6b7280)' }}>Not Calculated</p>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px', borderRadius: '8px', display: 'flex' }}>
            <FileText size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Pending Leaves</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary, #6b7280)' }}>
              {loading ? '...' : `${metrics.pendingLeaves} Requests`}
            </p>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '12px', borderRadius: '8px', display: 'flex' }}>
            <PieChartIcon size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Payroll Status</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary, #6b7280)' }}>Processing</p>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="card">
          <h3>Employee Distribution by Department</h3>
          <div style={{ height: '300px', marginTop: '16px' }}>
            {loading ? <p>Loading chart...</p> : metrics.departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {metrics.departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Employees`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p style={{ color: 'var(--text-secondary)' }}>No department data available.</p>}
          </div>
        </div>

        <div className="card">
          <h3>Total Payroll Processed (Net Salary)</h3>
          <div style={{ height: '300px', marginTop: '16px' }}>
            {loading ? <p>Loading chart...</p> : metrics.payrollData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.payrollData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Net']} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: 'var(--text-secondary)' }}>No payroll data processed yet.</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Activities</h3>
        <div style={{ marginTop: '16px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-secondary, #6b7280)' }}>Loading activities...</p>
          ) : metrics.recentActivities.length > 0 ? (
            metrics.recentActivities.map((act, idx) => (
              <p key={idx} style={{ 
                color: 'var(--text-secondary, #6b7280)', 
                padding: '12px 0', 
                borderBottom: idx < metrics.recentActivities.length - 1 ? '1px solid var(--border-color, #e5e7eb)' : 'none', 
                margin: 0 
              }}>
                {act.text} <span style={{fontSize: '0.85em', opacity: 0.7, marginLeft: '8px'}}>{act.date.toLocaleDateString()}</span>
              </p>
            ))
          ) : (
            <p style={{ color: 'var(--text-secondary, #6b7280)' }}>No recent activities found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
