import { api } from '@/lib/axios';

export const getTodayTasks = async () => {
  const response = await api.get('/mis/tasks/today');
  return response.data;
};
