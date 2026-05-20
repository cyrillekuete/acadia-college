'use client';

import { useCallback } from 'react';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';

/**
 * Returns true when the caller should proceed with a write.
 * Prompts when saving data to a non-current academic year.
 */
export function useAcademicYearWriteGuard() {
  const { isViewingCurrentYear, activeYear, currentYear } = useActiveAcademicYear();

  const confirmWrite = useCallback(async (): Promise<boolean> => {
    if (isViewingCurrentYear) {
      return true;
    }
    const viewing = activeYear?.label ?? 'the selected year';
    const current = currentYear?.label ?? 'the current year';
    return window.confirm(
      `You are viewing ${viewing}, not ${current}.\n\nNew or updated records will be saved to ${viewing}. Continue?`,
    );
  }, [isViewingCurrentYear, activeYear?.label, currentYear?.label]);

  return { confirmWrite, isViewingCurrentYear };
}
