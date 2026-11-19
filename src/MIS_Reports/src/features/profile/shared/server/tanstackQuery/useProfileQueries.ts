import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { authToastPosition, authToastStyle } from '@/lib/toastStyles';
import { useAppDispatch } from '@/store/hook';
import { setError, setLoading, setUser } from '@/store/slice/userAccountData';
import { beginIntentionalLogout } from '@/utils/axiosInterceptors';
import { profileApi } from '../api/profileApi';

export const useLogoutMutation = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: () => {
      // Suppress the auth interceptor's own redirect-to-/login handling —
      // not just for this request, but left on until the user actually
      // logs back in (resetAuthInterceptorState() runs there instead, see
      // use-login-form.ts / LoginPage.tsx). A request that races logout
      // and comes back 401 seconds later would otherwise still be able to
      // fire handleAuthFailure's hard redirect and bounce the user to the
      // login page a second time.
      beginIntentionalLogout();
    },
    mutationFn: () => profileApi.logoutRequest(),
    onSuccess: (data) => {
      queryClient.clear(); // Clear all cached data so next login gets fresh data
      toast.error(data?.message || 'Logged out successfully', {
        style: authToastStyle,
        position: authToastPosition,
      });
      router.push('/'); // Back to the landing page (not /login, which auto-opens the login popup)
      router.refresh(); // Refresh to clear server state
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      toast.error(error.response?.data?.message || 'Logout failed');
    },
  });
};

export const useGetProfileQuery = () => {
  const dispatch = useAppDispatch();

  const query = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 min — profile rarely changes mid-session
    gcTime: 30 * 60 * 1000, // Keep in cache 30 min after last use
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    refetchOnMount: false, // Don't refetch when ProfileSync re-mounts
  });

  // Sync query state to Redux store
  useEffect(() => {
    if (query.isLoading) {
      dispatch(setLoading(true));
      return;
    }

    if (query.data?.success && query.data?.data) {
      dispatch(setUser(query.data.data));
    } else if (query.error) {
      const errorMessage =
        query.error instanceof Error ? query.error.message : 'Failed to fetch profile';
      dispatch(setError(errorMessage));
    } else if (!query.isLoading) {
      dispatch(setLoading(false));
    }
  }, [query.data, query.isLoading, query.error, dispatch]);

  return query;
};

export interface SystemSettingsData {
  settings: { appName: string; supportEmail: string; maintenanceMode: boolean };
  status: { cpu: number; memoryPercent: number; memoryTotal: string; memoryUsed: string };
  maintenance: { lastBackupAt: string | null; lastBackupLabel: string };
}

export const useSystemSettings = () => {
  return useQuery<SystemSettingsData>({
    queryKey: ['system-settings'],
    queryFn: () => profileApi.getSystemSettings(),
    staleTime: 30 * 1000,
  });
};

export const useSaveSystemSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { appName?: string; supportEmail?: string; maintenanceMode?: boolean }) =>
      profileApi.saveSystemSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });
};

export const useTriggerBackup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => profileApi.triggerBackup(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Backup completed successfully');
    },
    onError: () => toast.error('Backup failed'),
  });
};

export const useClearCache = () => {
  return useMutation({
    mutationFn: () => profileApi.clearCache(),
    onSuccess: () => toast.success('Cache cleared successfully'),
    onError: () => toast.error('Failed to clear cache'),
  });
};
