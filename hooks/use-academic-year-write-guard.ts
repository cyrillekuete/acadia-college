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
    if (isViewingCurrentYear && activeYear?.isActive !== false) {
      return true;
    }
    const viewing = activeYear?.label ?? 'the selected year';
    const current = currentYear?.label ?? 'the current year';
    const closedNote =
      activeYear?.isActive === false
        ? `\n\n${viewing} is closed. Writes to a closed year should be exceptional.`
        : '';
    return window.confirm(
      `You are viewing ${viewing}, not ${current}.${closedNote}\n\nNew or updated records will be saved to ${viewing}. Continue?`,
    );
  }, [isViewingCurrentYear, activeYear?.label, activeYear?.isActive, currentYear?.label]);

  return { confirmWrite, isViewingCurrentYear };
}
