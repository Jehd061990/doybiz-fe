'use client';

import type { ReactNode } from 'react';
import type { AuthUser } from '@/types/auth';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { canAccessModuleRoute } from '@/lib/auth/access';

interface BillingGateProps {
  ownerOnly?: boolean;
  children: (user: AuthUser) => ReactNode;
}

export function BillingGate({ ownerOnly = false, children }: BillingGateProps) {
  const { session, isLoading, error } = useAuthSession();

  if (isLoading) return <p className="management-state" role="status">Checking billing access…</p>;
  if (error || !session.authenticated || !session.user) {
    return <p className="management-error" role="alert">Your session could not be verified. Sign in again.</p>;
  }

  const user = session.user;
  if (!canAccessModuleRoute(user, 'BILLING')) {
    return <section className="management-state" role="alert">
      <h1>Billing unavailable</h1>
      <p>Billing access is not available for your account.</p>
    </section>;
  }
  if (ownerOnly && user.role !== 'OWNER') {
    return <section className="management-state" role="alert">
      <h1>Billing action unavailable</h1>
      <p>Only an organization owner can make this billing change.</p>
    </section>;
  }

  return children(user);
}

export function BillingStatus({ status }: { status: string }) {
  return <span className={`billing-status-badge billing-status-${status.toLowerCase()}`}>{status}</span>;
}

export function formatBillingAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatBillingDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}