import { api } from '@/lib/axios';

export const getCommitmentHistory = async () => {
  try {
    const response = await api.get('/mis/commitments/history');
    return response.data;
  } catch (error: any) {
    // If backend is offline (Network Error), 404, or route doesn't exist, safely return empty list
    return [];
  }
};

export const deleteCommitmentApi = async (id: string) => {
  try {
    const response = await api.delete(`/mis/commitments/${id}`);
    return response.data;
  } catch (_error) {
    return null;
  }
};
