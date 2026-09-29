'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/logout-button';
import { MODULE_REGISTRY } from '@/config/modules';
import { canAccessModuleRoute } from '@/lib/auth/access';
import type { AuthUser } from '@/types/auth';

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const pathname = usePathname();
  const workspaceNavigation = [
    { href: '/app', label: 'Workspace', visible: true },
    { href: '/app/organization', label: 'Organization', visible: true },
    { href: '/app/branches', label: 'Branches', visible: true },
    { href: '/app/users', label: 'Users', visible: user.role === 'OWNER' },
  ].filter(item => item.visible);
  const moduleNavigation = MODULE_REGISTRY
    .filter(module => canAccessModuleRoute(user, module.key))
    .map(module => ({ href: module.route!, label: module.label }));

  const link = (item: { href: string; label: string }) => {
    const active = item.href === '/app'
      ? pathname === '/app'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        aria-current={active ? 'page' : undefined}
        className={active ? 'app-nav-link app-nav-link-active' : 'app-nav-link'}
        href={item.href}
        key={item.href}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="wordmark" href="/app">doybiz<span>.</span></Link>
        <nav className="app-navigation" aria-label="Workspace navigation">
          <div className="app-nav-group" aria-label="Workspace">
            {workspaceNavigation.map(link)}
          </div>
          {moduleNavigation.length ? (
            <div className="app-nav-group app-nav-module-group" aria-label="Modules">
              <span className="app-nav-group-heading">Modules</span>
              {moduleNavigation.map(link)}
            </div>
          ) : null}
        </nav>
        <div className="account-menu">
          <span className="account-name">{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <span>DOYBIZ</span>
        <span>Organization access is enforced by your account permissions.</span>
      </footer>
    </div>
  );
}