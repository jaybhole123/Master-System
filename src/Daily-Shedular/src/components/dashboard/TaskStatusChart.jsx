import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        No tasks to display for today.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <div className="w-full h-[120px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={52}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', fontSize: '12px', padding: '4px 8px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Clean Custom Compact Inline Legend */}
      <div className="flex items-center justify-center gap-3 flex-wrap pt-1 px-1 shrink-0">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
            <span>{item.name}: <strong className="font-mono text-slate-800">{item.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskStatusChart;
