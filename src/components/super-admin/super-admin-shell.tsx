'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/logout-button';
import type { PlatformAdminUser } from '@/types/auth';

export function SuperAdminShell({ user, children }: { user: PlatformAdminUser; children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Platform administration">
        <Link className="sidebar-brand" href="/app/super-admin" aria-label="DOYBIZ home">
          <span className="sidebar-brand-mark">d</span>
          <span>doybiz<span>.</span></span>
        </Link>

        <div className="sidebar-scroll">
          <nav className="sidebar-navigation">
            <div className="sidebar-section">
              <span className="sidebar-section-label">Platform</span>
              <Link className="sidebar-nav-link sidebar-nav-link-active" href="/app/super-admin" aria-current="page">
                <span className="sidebar-nav-icon" aria-hidden="true">◫</span>
                <span>Organizations</span>
              </Link>
            </div>
          </nav>
        </div>

        <div className="sidebar-account">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">{user.name.trim().charAt(0).toUpperCase() || 'A'}</span>
            <div className="sidebar-user-copy">
              <strong>{user.name}</strong>
              <span>Super Admin</span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="app-main-column">
        <main className="app-main">{children}</main>
        <footer className="app-footer">
          <span>DOYBIZ PLATFORM</span>
          <span>Platform provisioning is restricted to the bootstrap Super Admin.</span>
        </footer>
      </div>
    </div>
  );
}
