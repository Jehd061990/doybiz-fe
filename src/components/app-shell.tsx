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
    { href: '/app', label: 'Dashboard', icon: '⌂', visible: true },
    { href: '/app/organization', label: 'Organization', icon: '◫', visible: true },
    { href: '/app/branches', label: 'Branches', icon: '⌘', visible: true },
    { href: '/app/users', label: 'Users', icon: '♙', visible: user.role === 'OWNER' },
  ].filter(item => item.visible);
  const moduleNavigation = MODULE_REGISTRY
    .filter(module => canAccessModuleRoute(user, module.key))
    .map(module => ({ href: module.route!, label: module.label, icon: '▦' }));

  const link = (item: { href: string; label: string; icon: string }) => {
    const active = item.href === '/app'
      ? pathname === '/app'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        aria-current={active ? 'page' : undefined}
        className={active ? 'sidebar-nav-link sidebar-nav-link-active' : 'sidebar-nav-link'}
        href={item.href}
        key={item.href}
      >
        <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Main navigation">
        <Link className="sidebar-brand" href="/app" aria-label="DOYBIZ home">
          <span className="sidebar-brand-mark">d</span>
          <span>doybiz<span>.</span></span>
        </Link>

        <div className="sidebar-scroll">
          <nav className="sidebar-navigation">
            <div className="sidebar-section">
              <span className="sidebar-section-label">Workspace</span>
              {workspaceNavigation.map(link)}
            </div>
            {moduleNavigation.length ? (
              <div className="sidebar-section">
                <span className="sidebar-section-label">Modules</span>
                {moduleNavigation.map(link)}
              </div>
            ) : null}
          </nav>
        </div>

        <div className="sidebar-account">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">{user.name.trim().charAt(0).toUpperCase() || 'U'}</span>
            <div className="sidebar-user-copy">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="app-main-column">
        <main className="app-main">{children}</main>
        <footer className="app-footer">
          <span>DOYBIZ</span>
          <span>Organization access is enforced by your account permissions.</span>
        </footer>
      </div>
    </div>
  );
}
