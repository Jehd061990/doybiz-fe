import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { SuperAdminShell } from '@/components/super-admin/super-admin-shell';
import { getAuthSession } from '@/lib/auth/server-session';

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getAuthSession();
  if (!session.authenticated || !session.user) redirect('/login');

  if (session.user.role === 'PLATFORM_ADMIN') {
    return <SuperAdminShell user={session.user}>{children}</SuperAdminShell>;
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
