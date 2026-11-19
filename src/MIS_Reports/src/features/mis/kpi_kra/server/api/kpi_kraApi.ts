import { api } from '@/lib/axios';

export const getKpiKraDataApi = async () => {
  try {
    const response = await api.get('/mis/kpi-kra');
    return response.data;
  } catch (error: any) {
    // If backend is offline (Network Error), 404, or route doesn't exist, safely return null
    return null;
  }
};
