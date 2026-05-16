'use client';

import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function getQueryErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Failed to load data.';
}

export function AccountDataState({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyMessage,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(error)}</p>
    );
  }
  if (isEmpty) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyMessage ?? 'No records found.'}
      </p>
    );
  }
  return children;
}
