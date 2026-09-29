'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/logout-button';
import type { AuthUser } from '@/types/auth';

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const pathname = usePathname();
  const navigation = [
    { href: '/app', label: 'Workspace', visible: true },
    { href: '/app/organization', label: 'Organization', visible: true },
    { href: '/app/branches', label: 'Branches', visible: true },
    { href: '/app/users', label: 'Users', visible: user.role === 'OWNER' },
  ].filter(item => item.visible);

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="wordmark" href="/app">doybiz<span>.</span></Link>
        <nav className="app-navigation" aria-label="Workspace navigation">
          {navigation.map(item => {
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
          })}
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