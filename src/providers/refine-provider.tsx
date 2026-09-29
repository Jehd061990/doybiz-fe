'use client';

import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/nextjs-router/app';
import { Suspense, type ReactNode } from 'react';
import authProvider from './auth-provider';
import { apiDataProvider } from '@/lib/api/data-provider';

const resources = [
  { name: 'users' },
  { name: 'branches' },
  { name: 'billing' },
];

export function RefineProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="provider-loading" aria-label="Loading application" />}>
      <Refine
        authProvider={authProvider}
        dataProvider={apiDataProvider}
        routerProvider={routerProvider}
        resources={resources}
        options={{ warnWhenUnsavedChanges: true }}
      >
        {children}
      </Refine>
    </Suspense>
  );
}
