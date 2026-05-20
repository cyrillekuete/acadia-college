'use client';

import Link from 'next/link';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { Button } from '@/components/ui/button';

export function CurrentAcademicYearBadge({ className }: { className?: string }) {
  const { activeYear, isConfigured, isLoading, isViewingCurrentYear, currentYear } =
    useActiveAcademicYear();

  if (isLoading) {
    return <p className={className ?? 'text-sm text-muted-foreground'}>Loading academic year…</p>;
  }

  if (!isConfigured || !activeYear) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">No academic year configured.</p>
        <Button variant="ghost" className="h-auto px-0" asChild>
          <Link href="/academics/years">Configure academic year</Link>
        </Button>
      </div>
    );
  }

  return (
    <p className={className ?? 'text-sm text-muted-foreground'}>
      Academic year:{' '}
      <span className="font-medium text-foreground">{activeYear.label}</span>
      {!isViewingCurrentYear && currentYear ? (
        <span className="text-muted-foreground">
          {' '}
          (viewing; current is {currentYear.label})
        </span>
      ) : null}
    </p>
  );
}
