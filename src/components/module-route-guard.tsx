import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getModuleDefinition, type ModuleName } from '@/config/modules';
import { canAccessModuleRoute } from '@/lib/auth/access';
import { getAuthSession } from '@/lib/auth/server-session';

export async function ModuleRouteGuard({ module, children }: { module: ModuleName; children: ReactNode }) {
  const session = await getAuthSession();
  if (!session.authenticated || !session.user) {
    redirect('/login');
    return null;
  }

  const definition = getModuleDefinition(module);
  if (!definition?.route) {
    return (
      <section className="management-state" role="alert">
        <h1>This module is not available in the workspace yet.</h1>
        <Link className="secondary-button" href="/app">Back to workspace</Link>
      </section>
    );
  }
  if (!canAccessModuleRoute(session.user, module)) {
    return (
      <section className="management-state" role="alert">
        <h1>You don&apos;t have access to this module.</h1>
        <p>Please contact your organization administrator if you need access.</p>
        <Link className="secondary-button" href="/app">Back to workspace</Link>
      </section>
    );
  }

  return children;
}