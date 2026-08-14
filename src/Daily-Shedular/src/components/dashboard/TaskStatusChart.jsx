import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TaskStatusChart = ({ tasks }) => {
  const data = [
    { name: 'Admin Approved', value: tasks.filter(t => t.status === 'Completed' && t.adminApproved).length, color: '#059669' },
    { name: 'Completed', value: tasks.filter(t => t.status === 'Completed' && !t.adminApproved).length, color: '#10b981' },
    { name: 'Pending', value: tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Scheduled').length, color: '#f59e0b' },
    { name: 'Not Done', value: tasks.filter(t => t.status === 'Not Done').length, color: '#ef4444' },
    { name: 'Overdue', value: tasks.filter(t => t.status === 'Overdue').length, color: '#f43f5e' },
  ].filter(item => item.value > 0); // Only show statuses that have tasks

  // Fallback if no tasks
  if (data.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No tasks to display for today.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={65}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        />
        <Legend verticalAlign="bottom" height={60} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default TaskStatusChart;
