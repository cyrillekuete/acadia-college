'use client';

import { useMemo } from 'react';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { academicYearIdFilter, tableHasAcademicYearColumn } from '@/lib/acadia/academic-year-scope';

export function useAcademicYearTableFilters(table: string) {
  const { activeYearId, isLoading } = useActiveAcademicYear();

  const filters = useMemo(() => {
    if (!tableHasAcademicYearColumn(table)) {
      return [];
    }
    return academicYearIdFilter(activeYearId);
  }, [table, activeYearId]);

  const requiresYear = tableHasAcademicYearColumn(table);

  return {
    filters,
    activeYearId,
    isLoading,
    requiresYear,
    isReady: !requiresYear || (!!activeYearId && !isLoading),
  };
}
