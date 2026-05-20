'use client';

import { AlertCircle } from '@/lib/icons';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function ViewingAcademicYearBanner() {
  const {
    activeYear,
    isViewingCurrentYear,
    resetToCurrentYear,
    currentYear,
    isLoading,
  } = useActiveAcademicYear();

  if (isLoading || isViewingCurrentYear || !activeYear) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50/80 px-4 py-2 dark:border-amber-900 dark:bg-amber-950/30">
      <Alert variant="warning" className="border-0 bg-transparent p-0">
        <AlertIcon>
          <AlertCircle />
        </AlertIcon>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <AlertTitle className="font-normal">
            Viewing <strong>{activeYear.label}</strong> (not the current
            academic year
            {currentYear ? `, ${currentYear.label}` : ''}). New records will be
            saved to this year.
          </AlertTitle>
          {currentYear ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={resetToCurrentYear}
            >
              Return to current year
            </Button>
          ) : null}
        </div>
      </Alert>
    </div>
  );
}
