'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { queryClient } from '@/lib/queryClient';
import { store } from './store';

export default function Redux_Provider_Wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

export function TanstackQueryWrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
