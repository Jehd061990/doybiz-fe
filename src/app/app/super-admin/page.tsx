import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth/server-session';
import { SuperAdminPage } from '@/components/super-admin/super-admin-page';

export default async function SuperAdminRoute() {
  const session = await getAuthSession();
  if (!session.authenticated || session.user?.role !== 'PLATFORM_ADMIN') redirect('/login');
  return <SuperAdminPage />;
}
