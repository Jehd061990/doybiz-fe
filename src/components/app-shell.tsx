'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CreditCard,
  Globe2,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ShoppingCart,
  Store,
  UserRoundCog,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { MODULE_REGISTRY } from '@/config/modules';
import { canAccessModuleRoute } from '@/lib/auth/access';
import type { AuthUser } from '@/types/auth';

const iconMap: Record<string, LucideIcon> = {
  '/app': LayoutDashboard,
  '/app/organization': Building2,
  '/app/branches': Store,
  '/app/users': UsersRound,
  '/app/pos': ShoppingCart,
  '/app/sales': ReceiptText,
  '/app/appointments': CalendarDays,
  '/app/customers': Users,
  '/app/reports': BarChart3,
  '/app/staff': UserRoundCog,
  '/app/billing': CreditCard,
  '/app/website': Globe2,
  '/app/services': BriefcaseBusiness,
};

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const workspaceNavigation = [
    { href: '/app', label: 'Dashboard', visible: true },
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
    const Icon = iconMap[item.href] ?? LayoutDashboard;
    return (
      <Link
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
        className={active ? 'sidebar-nav-link sidebar-nav-link-active' : 'sidebar-nav-link'}
        href={item.href}
        key={item.href}
        title={sidebarCollapsed ? item.label : undefined}
      >
        <span className="sidebar-nav-icon" aria-hidden="true"><Icon size={18} strokeWidth={2.2} /></span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className={sidebarCollapsed ? 'app-shell sidebar-is-collapsed' : 'app-shell'}>
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="sidebar-brand-row">
          <Link className="sidebar-brand" href="/app" aria-label="DOYBIZ home">
            <span className="sidebar-brand-mark">d</span>
            <span>doybiz<span>.</span></span>
          </Link>
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed(value => !value)}
            title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <span aria-hidden="true">{sidebarCollapsed ? <PanelLeftOpen size={16} strokeWidth={2.2} /> : <PanelLeftClose size={16} strokeWidth={2.2} />}</span>
          </button>
        </div>

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
