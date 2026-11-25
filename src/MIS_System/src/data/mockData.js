// MIS System Data (All dummy/mock data removed)

export const employees = [];

export const tasks = [];

export const departments = [];

// Helper functions
export const getEmployeeById = (id) => {
  return employees.find(emp => emp.id === id);
};

export const getTasksByEmployeeId = (employeeId) => {
  return tasks.filter(task => task.assignedTo === employeeId);
};

export const getTasksForToday = (employeeId) => {
  const today = new Date().toISOString().split('T')[0];
  const filteredTasks = tasks.filter(task => task.dueDate === today);
  
  if (employeeId) {
    return filteredTasks.filter(task => task.assignedTo === employeeId);
  }
  
  return filteredTasks;
};

export const getPendingTasks = (employeeId) => {
  const filteredTasks = tasks.filter(task => task.status === 'pending');
  
  if (employeeId) {
    return filteredTasks.filter(task => task.assignedTo === employeeId);
  }
  
  return filteredTasks;
};

export const getTopScorers = (count) => {
  return [...employees].sort((a, b) => b.score - a.score).slice(0, count);
};

export const getLowestScorers = (count) => {
  return [...employees].sort((a, b) => a.score - b.score).slice(0, count);
};

export const getEmployeesByPendingTasks = () => {
  return [...employees].sort((a, b) => b.pendingTasks - a.pendingTasks);
};

export const getDepartmentScores = () => {
  return [...departments].sort((a, b) => b.averageScore - a.averageScore);
};

export const getWeeklyCommitmentComparison = () => {
  return employees.map(emp => ({
    name: emp.name,
    commitment: emp.weeklyCommitment || 0,
    actual: emp.completedTasks
  }));
};
