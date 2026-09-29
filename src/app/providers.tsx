'use client';

import type { ReactNode } from 'react';
import { RefineProvider } from '@/providers/refine-provider';

export function Providers({ children }: { children: ReactNode }) {
  return <RefineProvider>{children}</RefineProvider>;
}
