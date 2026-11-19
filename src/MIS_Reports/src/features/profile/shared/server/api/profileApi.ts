import { api } from '@/lib/axios';

// this function is used to logout the user from the application
export const profileApi = {
  logoutRequest: async () => {
    const response = await api.delete('/auth/logout');
    return response.data;
  },

  // fetch the user main data for the profile
  getProfile: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (_error) {
      return null;
    }
  },

  getSystemSettings: async () => {
    const response = await api.get('/system-settings');
    return response.data.data;
  },

  saveSystemSettings: async (data: {
    appName?: string;
    supportEmail?: string;
    maintenanceMode?: boolean;
  }) => {
    const response = await api.put('/system-settings', data);
    return response.data.data;
  },

  triggerBackup: async () => {
    const response = await api.post('/system-settings/backup');
    return response.data.data;
  },

  clearCache: async () => {
    const response = await api.post('/system-settings/cache/clear');
    return response.data.data;
  },

  completeSuperAdminTour: async () => {
    const response = await api.patch('/auth/me/tour-complete');
    return response.data;
  },
};
