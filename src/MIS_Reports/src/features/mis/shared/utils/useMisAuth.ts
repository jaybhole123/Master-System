'use client';

import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';

export interface MisUser {
  role: 'superadmin' | 'admin' | 'hod' | 'user';
  name: string;
  email: string;
  department: string;
  id: string;
  companyName?: string;
}

export const useMisAuth = (): { user: MisUser | null } => {
  const osUser = useAppSelector(selectUser);
  if (!osUser) return { user: null };

  const roleMap: Record<string, MisUser['role']> = {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    HOD: 'hod',
    USER: 'user',
    COMPANY: 'user',
  };

  const user: MisUser = {
    id: osUser.id,
    name: osUser.fullName,
    email: osUser.email,
    department: (osUser.department as any)?.name ?? '',
    role: roleMap[(osUser.role as string) ?? 'USER'] ?? 'user',
    companyName: osUser.companyName ?? '',
  };

  return { user };
};
