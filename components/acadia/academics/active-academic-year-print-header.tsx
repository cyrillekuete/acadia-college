'use client';

import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';

/** Visible when printing reports; hidden on screen. */
export function ActiveAcademicYearPrintHeader() {
  const { activeYear, isViewingCurrentYear, currentYear } = useActiveAcademicYear();

  if (!activeYear) {
    return null;
  }

  return (
    <p className="hidden print:block text-sm text-foreground mb-4">
      Academic year: <strong>{activeYear.label}</strong>
      {!isViewingCurrentYear && currentYear ? (
        <span> (historical view; current year is {currentYear.label})</span>
      ) : null}
    </p>
  );
}
