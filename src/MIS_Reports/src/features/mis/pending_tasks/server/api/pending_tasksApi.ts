import { api } from '@/lib/axios';

export const getPendingTasks = async () => {
  try {
    const response = await api.get('/mis/tasks/pending');
    return response.data;
  } catch (_error) {
    return [];
  }
};
