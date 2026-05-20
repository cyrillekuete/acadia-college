import type { AcademicYearOption } from '@/hooks/use-academic-calendar-options';

export function activeAcademicYearStorageKey(
  tenantId: string,
  userId?: string | null,
): string {
  if (userId) {
    return `acadia:activeAcademicYear:${tenantId}:${userId}`;
  }
  return `acadia:activeAcademicYear:${tenantId}`;
}

function getBrowserStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function readStoredActiveAcademicYearId(
  tenantId: string,
  userId?: string | null,
): string | null {
  const storage = getBrowserStorage();
  if (!storage) {
    return null;
  }
  try {
    const scoped = storage.getItem(activeAcademicYearStorageKey(tenantId, userId));
    if (scoped) {
      return scoped;
    }
    if (userId) {
      return storage.getItem(activeAcademicYearStorageKey(tenantId));
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredActiveAcademicYearId(
  tenantId: string,
  yearId: string | null,
  userId?: string | null,
): void {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }
  try {
    const key = activeAcademicYearStorageKey(tenantId, userId);
    if (yearId) {
      storage.setItem(key, yearId);
    } else {
      storage.removeItem(key);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Pick the active viewing year from storage, current flag, or first available. */
export function resolveInitialActiveYearId(
  years: AcademicYearOption[],
  currentYearId: string | null,
  storedId: string | null,
): string | null {
  const yearIds = new Set(years.map((y) => y.id));
  if (storedId && yearIds.has(storedId)) {
    return storedId;
  }
  if (currentYearId && yearIds.has(currentYearId)) {
    return currentYearId;
  }
  if (years.length > 0) {
    return years[0]!.id;
  }
  return null;
}
