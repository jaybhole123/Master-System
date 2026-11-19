'use client';

import { Calendar, ChevronDown, Filter, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getDepartmentReportData } from '../server/api/departmentApi';

const Report = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterName, setFilterName] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getDepartmentReportData();
        setEmployees(Array.isArray(data?.employees) ? data.employees : []);
        setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      } catch (_error) {
        setEmployees([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const uniqueDepartments = useMemo(
    () => [...new Set(employees.map((emp) => emp.department))].filter(Boolean),
    [employees]
  );
  const uniqueNames = useMemo(
    () => [...new Set(employees.map((emp) => emp.name))].filter(Boolean),
    [employees]
  );

  const filteredData = useMemo(() => {
    let filteredTasks = [...tasks];
    if (filterName) {
      filteredTasks = filteredTasks.filter((task) => {
        const emp = employees.find((e) => e.id === task.assignedTo);
        const personName = task.personName || emp?.name || '';
        return personName.toLowerCase().includes(filterName.toLowerCase());
      });
    }
    if (filterDepartment) {
      const departmentEmployeeIds = employees
        .filter((emp) => emp.department === filterDepartment)
        .map((emp) => emp.id);
      filteredTasks = filteredTasks.filter((task) =>
        departmentEmployeeIds.includes(task.assignedTo)
      );
    }
    if (startDate) filteredTasks = filteredTasks.filter((task) => (task.dueDate || '') >= startDate);
    if (endDate) filteredTasks = filteredTasks.filter((task) => (task.dueDate || '') <= endDate);
    return filteredTasks;
  }, [tasks, employees, filterName, filterDepartment, startDate, endDate]);

  const clearFilters = () => {
    setFilterName('');
    setFilterDepartment('');
    setStartDate('');
    setEndDate('');
  };

  const handleNameSelect = (name: string) => {
    setFilterName(name);
    setIsNameDropdownOpen(false);
  };

  const getTaskMetrics = (task: any) => {
    const employee = employees.find((emp) => emp.id === task.assignedTo);
    if (!employee) {
      return {
        target: Number(task.target || 100),
        totalAchievement: Number(task.actualAchievement || 0),
        workDonePercentage: Number(task.workDone || 0),
        workDoneOnTimePercentage: Number(task.workDoneOnTime || 0),
        allPendingTillDate: Number(task.allPendingTillDate || 0),
      };
    }
    return {
      target: Number(employee.target ?? 100),
      totalAchievement: Number(employee.actualWorkDone ?? 0),
      workDonePercentage: Number(employee.totalWorkDone ?? 0),
      workDoneOnTimePercentage: Number(employee.weeklyWorkDoneOnTime ?? 0),
      allPendingTillDate: Number(employee.allPendingTillDate ?? 0),
    };
  };

  return (
    <div className="p-3 space-y-4 md:space-y-6 md:p-4 lg:p-6">
      <div className="flex flex-col gap-3 justify-between items-start sm:flex-row sm:items-center md:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Department Report</h1>
        </div>
        <div className="flex flex-shrink-0 gap-2 items-center px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded-md">
          <Filter className="flex-shrink-0 w-4 h-4" />
          <span className="font-medium whitespace-nowrap">{filteredData.length} tasks found</span>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 justify-between items-start mb-6 sm:flex-row sm:items-center sm:mb-4">
          <h2 className="flex gap-2 items-center text-lg font-semibold text-gray-900">
            <Filter className="w-5 h-5" />
            Filters
          </h2>
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 w-full text-sm font-medium text-gray-600 rounded-md border border-gray-300 transition-colors hover:text-gray-800 hover:bg-gray-50 sm:w-auto"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Filter by Name</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNameDropdownOpen(!isNameDropdownOpen)}
                className="flex justify-between items-center px-3 py-3 w-full bg-white rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <span className={filterName ? 'text-gray-900' : 'text-gray-500'}>
                  {filterName || 'Select employee...'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${isNameDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isNameDropdownOpen && (
                <div className="overflow-auto absolute z-50 mt-1 w-full max-h-60 bg-white rounded-md border border-gray-300 shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={() => handleNameSelect('')}
                      className="px-4 py-3 w-full text-sm text-left text-gray-700 border-b border-gray-100 hover:bg-gray-100"
                    >
                      All Employees
                    </button>
                    {uniqueNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => handleNameSelect(name)}
                        className="flex gap-3 items-center px-4 py-3 w-full text-sm text-left text-gray-900 border-b border-gray-100 hover:bg-gray-100 last:border-b-0"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Filter by Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-3 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="py-3 pr-3 pl-10 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="py-3 pr-3 pl-10 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 md:gap-4">
        <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">FMS Name</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {[...new Set(filteredData.map((task) => task.fmsName))].filter(Boolean).length}
              </p>
            </div>
            <div className="flex justify-center items-center w-9 h-9 bg-blue-50 rounded-full ml-3">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">Employees</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {
                  [
                    ...new Set(
                      filteredData.map((task) => {
                        const employee = employees.find((emp) => emp.id === task.assignedTo);
                        return employee?.name || task.personName;
                      })
                    ),
                  ].filter(Boolean).length
                }
              </p>
            </div>
            <div className="flex justify-center items-center w-9 h-9 bg-green-50 rounded-full ml-3">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">Pending Tasks</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {filteredData.reduce((total, task) => {
                  const employee = employees.find((emp) => emp.id === task.assignedTo);
                  return total + (employee?.allPendingTillDate || task.allPendingTillDate || 0);
                }, 0)}
              </p>
            </div>
            <div className="flex justify-center items-center w-9 h-9 bg-orange-50 rounded-full ml-3">
              <svg
                className="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">Overall Score</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {filteredData.length > 0
                  ? Math.round(
                      filteredData.reduce((total, task) => {
                        const metrics = getTaskMetrics(task);
                        return total + (metrics?.workDonePercentage || 0);
                      }, 0) / filteredData.length
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="flex justify-center items-center w-9 h-9 bg-purple-50 rounded-full ml-3">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="w-full p-3 bg-white rounded-lg border border-gray-200 sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">Delay Score</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {filteredData.length > 0
                  ? Math.round(
                      filteredData.reduce((total, task) => {
                        const metrics = getTaskMetrics(task);
                        const delay = Math.max(
                          0,
                          (metrics?.workDonePercentage || 0) -
                            (metrics?.workDoneOnTimePercentage || 0)
                        );
                        return total + delay;
                      }, 0) / filteredData.length
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="flex justify-center items-center w-9 h-9 bg-red-50 rounded-full ml-3">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Employee ID
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  FMS Name
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Task Name
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Employee
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Target
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Total Achievement
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  % Work Done
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  % Work Done On Time
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  All Pending Till Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading department report...</p>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((task) => {
                  const employee = employees.find((emp) => emp.id === task.assignedTo);
                  const metrics = getTaskMetrics(task);
                  const employeeId = employee?.id || task.assignedTo || '-';
                  const employeeName = employee?.name || task.personName || 'Unknown';
                  const employeeImage = employee?.image || task.personImage;

                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap md:px-4">
                        {employeeId}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap md:px-4">
                        {task.fmsName}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap md:px-4">
                        <div>
                          <div className="font-medium">{task.taskName}</div>
                          {task.description && (
                            <div className="mt-1 text-xs text-gray-500">{task.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap md:px-4">
                        <div className="flex items-center">
                          {employeeImage ? (
                            <img
                              className="object-cover mr-3 w-8 h-8 rounded-full"
                              src={employeeImage}
                              alt={employeeName}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 mr-3">
                              {employeeName.charAt(0)}
                            </div>
                          )}
                          <div className="text-sm font-medium text-gray-900">{employeeName}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span className="inline-flex justify-center items-center w-12 h-8 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full">
                          {metrics.target}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span
                          className={`inline-flex items-center justify-center w-16 h-8 rounded-full text-sm font-semibold ${metrics.totalAchievement >= metrics.target ? 'bg-green-100 text-green-800' : metrics.totalAchievement >= metrics.target * 0.8 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {metrics.totalAchievement}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span
                          className={`inline-flex items-center justify-center w-16 h-8 rounded-full text-sm font-semibold ${metrics.workDonePercentage >= 90 ? 'bg-green-100 text-green-800' : metrics.workDonePercentage >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {metrics.workDonePercentage}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span
                          className={`inline-flex items-center justify-center w-16 h-8 rounded-full text-sm font-semibold ${metrics.workDoneOnTimePercentage >= 90 ? 'bg-green-100 text-green-800' : metrics.workDoneOnTimePercentage >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {metrics.workDoneOnTimePercentage}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${metrics.allPendingTillDate === 0 ? 'bg-green-100 text-green-800' : metrics.allPendingTillDate <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {metrics.allPendingTillDate}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col justify-center items-center">
                      <Filter className="mb-2 w-12 h-12 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">No tasks found</p>
                      <p className="text-gray-500">
                        Currently there are no department report tasks.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden">
        <div className="space-y-3">
          {filteredData.length > 0 ? (
            filteredData.map((task) => {
              const employee = employees.find((emp) => emp.id === task.assignedTo);
              const metrics = getTaskMetrics(task);
              const employeeId = employee?.id || task.assignedTo || '-';
              const employeeName = employee?.name || task.personName || 'Unknown';
              const employeeImage = employee?.image || task.personImage;

              return (
                <div key={task.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-600 mb-1">ID: {employeeId}</div>
                    <div className="text-xs font-medium text-blue-600 mb-1">{task.fmsName}</div>
                    <div className="text-sm font-medium text-gray-900">{task.taskName}</div>
                  </div>
                  <div className="flex items-center mb-3 pb-2 border-b border-gray-100">
                    {employeeImage ? (
                      <img
                        className="w-6 h-6 rounded-full mr-2"
                        src={employeeImage}
                        alt={employeeName}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 mr-2">
                        {employeeName.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs text-gray-600">{employeeName}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">TGT</div>
                      <span className="text-sm font-semibold text-blue-600">{metrics.target}%</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">ACH</div>
                      <span
                        className={`text-sm font-semibold ${metrics.totalAchievement >= metrics.target ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {metrics.totalAchievement}%
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">WD</div>
                      <span
                        className={`text-sm font-semibold ${metrics.workDonePercentage >= 90 ? 'text-green-600' : metrics.workDonePercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
                      >
                        {metrics.workDonePercentage}%
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">OT</div>
                      <span
                        className={`text-sm font-semibold ${metrics.workDoneOnTimePercentage >= 90 ? 'text-green-600' : metrics.workDoneOnTimePercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
                      >
                        {metrics.workDoneOnTimePercentage}%
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">PEN</div>
                      <span
                        className={`text-sm font-semibold ${metrics.allPendingTillDate === 0 ? 'text-green-600' : metrics.allPendingTillDate <= 3 ? 'text-yellow-600' : 'text-red-600'}`}
                      >
                        {metrics.allPendingTillDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No tasks found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;
