import axios from 'axios';
import { setupAxiosInterceptors } from '@/utils/axiosInterceptors';

const getApiBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

  if (typeof window === 'undefined' || !configuredUrl) {
    return configuredUrl;
  }

  try {
    const apiUrl = new URL(configuredUrl);
    const appHostname = window.location.hostname;

    if (
      (apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1') &&
      appHostname !== apiUrl.hostname &&
      appHostname !== '0.0.0.0' &&
      Boolean(appHostname)
    ) {
      apiUrl.hostname = appHostname;
      return apiUrl.toString();
    }
  } catch {
    return configuredUrl;
  }

  return configuredUrl;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30_000,
  withCredentials: true, // sends the accessToken cookie
});

// Automatic token refresh + redirect to /login on auth failure
setupAxiosInterceptors(api);
