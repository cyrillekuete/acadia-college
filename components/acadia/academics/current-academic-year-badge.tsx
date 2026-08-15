'use client';

import Link from 'next/link';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function CurrentAcademicYearBadge({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { activeYear, isConfigured, isLoading, isViewingCurrentYear, currentYear } =
    useActiveAcademicYear();

  const viewingHint =
    !isViewingCurrentYear && currentYear
      ? `viewing; current is ${currentYear.label}`
      : null;

  if (isLoading) {
    return (
      <div className={cn('min-w-[160px]', className)}>
        {label ? <p className="text-sm font-medium mb-1.5">{label}</p> : null}
        <Input disabled readOnly value="Loading academic year…" className="bg-muted" />
      </div>
    );
  }

  if (!isConfigured || !activeYear) {
    return (
      <div className={cn('min-w-[160px]', className)}>
        {label ? <p className="text-sm font-medium mb-1.5">{label}</p> : null}
        <Input disabled readOnly value="No academic year configured" className="bg-muted" />
        <Button variant="ghost" className="h-auto px-0" asChild>
          <Link href="/academics/years">Configure academic year</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('min-w-[160px]', className)}>
      {label ? <p className="text-sm font-medium mb-1.5">{label}</p> : null}
      <Input disabled readOnly value={activeYear.label} className="bg-muted" />
      {viewingHint ? (
        <p className="mt-1 text-xs text-muted-foreground">{viewingHint}</p>
      ) : null}
    </div>
  );
}
