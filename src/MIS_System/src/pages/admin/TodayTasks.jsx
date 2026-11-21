import React, { useState, useMemo } from "react";
import { Search, X, Loader2, Calendar, Clock, ChevronDown } from "lucide-react";
import { employees, tasks } from '../../data/mockData';

const AdminTodayTasks = () => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [activeDrillDown, setActiveDrillDown] = useState(null);

  // Group by Employee Name
  const groupedEmployees = useMemo(() => {
    return employees.map((emp) => {
      const empTasks = tasks.filter(t => t.assignedTo === emp.id || t.personName === emp.name);
      return {
        personName: emp.name,
        personImage: emp.image,
        assignedTo: emp.id,
        designation: emp.designation,
        department: emp.department,
        plannedCount: empTasks.length || 2,
        tasks: empTasks.length > 0 ? empTasks : [
          {
            id: `task-${emp.id}-1`,
            fmsName: 'General MIS',
            taskName: 'Daily Review & Task Execution',
            plannedCount: 1,
            todayTask: 'Verify daily targets and log completed tasks'
          }
        ]
      };
    });
  }, []);

  const persons = useMemo(() => [...new Set(groupedEmployees.map(e => e.personName))].sort(), [groupedEmployees]);

  const filteredEmployees = useMemo(() => {
    return groupedEmployees.filter((e) => {
      const matchesSearch = e.personName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPerson = personFilter === "all" || e.personName === personFilter;
      return matchesSearch && matchesPerson;
    });
  }, [groupedEmployees, searchQuery, personFilter]);

  const handleRowClick = (empGroup) => {
    setActiveDrillDown({
      personName: empGroup.personName,
      title: `Today's Task Details - ${empGroup.personName}`,
      rows: empGroup.tasks.map(t => ({
        taskName: t.taskName || 'Core Task',
        fmsName: t.fmsName || 'MIS',
        planned: 'Today',
        actual: 'In Progress'
      })),
      loading: false
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Daily task assignment and progress overview</p>
        </div>
        <span className="text-sm text-gray-500 bg-white border border-gray-200 rounded px-3 py-1 shadow-sm">
          {filteredEmployees.length} Employees
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="w-full sm:w-64">
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="all">All Employees</option>
              {persons.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Tasks</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((emp) => (
                <tr key={emp.personName} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img src={emp.personImage} alt={emp.personName} className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-medium text-gray-900">{emp.personName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{emp.department || "General"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{emp.designation || "Executive"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {emp.plannedCount} Tasks
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleRowClick(emp)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal */}
      {activeDrillDown && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{activeDrillDown.title}</h3>
              <button
                onClick={() => setActiveDrillDown(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              {activeDrillDown.rows.map((row, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{row.taskName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Module: {row.fmsName}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 font-medium rounded">
                    {row.actual}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTodayTasks;
