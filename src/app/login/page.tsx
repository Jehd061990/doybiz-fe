import { redirect } from 'next/navigation';
import { LoginScreen } from '@/components/login-screen';
import { getAuthSession } from '@/lib/auth/server-session';

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session.authenticated) redirect('/app');
  return <LoginScreen />;
}
