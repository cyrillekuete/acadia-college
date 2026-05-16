'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Toolbar = ({ children }: { children?: ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-5 pb-7.5">{children}</div>
);

export const ToolbarActions = ({ children }: { children?: ReactNode }) => (
  <div className="flex items-center gap-2.5">{children}</div>
);

export const ToolbarHeading = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <div className={cn('flex flex-col gap-1', className)}>{children}</div>
);

export const ToolbarPageTitle = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <h1 className={cn('text-xl font-medium text-foreground', className)}>{children}</h1>
);

export const ToolbarDescription = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
);
