import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth/server-session';

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getAuthSession();
  if (!session.authenticated || !session.user) redirect('/login');
  return children;
}