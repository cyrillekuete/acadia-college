'use client';

import Link from 'next/link';
import { ArrowLeft } from '@/lib/icons';
import { ReactNode } from 'react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function getQueryErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Failed to load record.';
}

export function RecordDetailShell({
  title,
  description,
  backHref,
  backLabel,
  actions,
  isLoading,
  isError,
  error,
  children,
}: {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
  actions?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  children: ReactNode;
}) {
  return (
    <AcadiaPageShell title={title} description={description}>
      <div className="mb-5 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
        {actions}
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">{getQueryErrorMessage(error)}</p>
      ) : (
        children
      )}
    </AcadiaPageShell>
  );
}
