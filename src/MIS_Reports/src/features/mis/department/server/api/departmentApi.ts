import { api } from '@/lib/axios';

export const getDepartmentReportData = async () => {
  try {
    const [employeesResponse, todayTasksResponse, pendingTasksResponse] = await Promise.allSettled([
      api.get('/mis/dashboard'),
      api.get('/mis/tasks/today'),
      api.get('/mis/tasks/pending'),
    ]);

    const empData = employeesResponse.status === 'fulfilled' ? employeesResponse.value.data : [];
    const todayData = todayTasksResponse.status === 'fulfilled' ? todayTasksResponse.value.data : [];
    const pendingData = pendingTasksResponse.status === 'fulfilled' ? pendingTasksResponse.value.data : [];

    const employees = Array.isArray(empData)
      ? empData
      : Array.isArray(empData?.data)
        ? empData.data
        : [];
    const todayTasks = Array.isArray(todayData)
      ? todayData
      : Array.isArray(todayData?.data)
        ? todayData.data
        : [];
    const pendingTasks = Array.isArray(pendingData)
      ? pendingData
      : Array.isArray(pendingData?.data)
        ? pendingData.data
        : [];

    return {
      employees,
      tasks: [...todayTasks, ...pendingTasks],
    };
  } catch (_error) {
    return {
      employees: [],
      tasks: [],
    };
  }
};
