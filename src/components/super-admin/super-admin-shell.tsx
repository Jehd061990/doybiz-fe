'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/logout-button';
import type { PlatformAdminUser } from '@/types/auth';

export function SuperAdminShell({ user, children }: { user: PlatformAdminUser; children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="wordmark" href="/app/super-admin">doybiz<span>.</span></Link>
        <nav className="app-navigation" aria-label="Platform administration">
          <div className="app-nav-group">
            <Link className="app-nav-link app-nav-link-active" href="/app/super-admin">Super Admin</Link>
          </div>
        </nav>
        <div className="account-menu">
          <span className="account-name">{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <span>DOYBIZ PLATFORM</span>
        <span>Platform provisioning is restricted to the bootstrap Super Admin.</span>
      </footer>
    </div>
  );
}
