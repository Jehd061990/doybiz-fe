'use client';

import { useLogin } from '@refinedev/core';
import { useRouter } from 'next/navigation';
import { LoginForm, type LoginCredentials } from '@/components/login-form';

export function LoginPanel() {
  const router = useRouter();
  const { mutateAsync } = useLogin();

  async function submit(credentials: LoginCredentials) {
    const result = await mutateAsync(credentials);
    if (!result.success) throw result.error || new Error('Login failed.');
    router.replace('/app');
  }

  return <LoginForm onLogin={submit} />;
}
