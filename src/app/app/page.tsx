import { redirect } from 'next/navigation';
import { WorkspacePage } from '@/components/workspace-page';
import { getAuthSession } from '@/lib/auth/server-session';

export default async function AuthenticatedWorkspacePage() {
  const session = await getAuthSession();
  if (!session.authenticated || !session.user) redirect('/login');
  return <WorkspacePage user={session.user} />;
}