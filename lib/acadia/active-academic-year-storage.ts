import type { AcademicYearOption } from '@/lib/supabase/queries/academic-year-options';

export const ACTIVE_ACADEMIC_YEAR_COOKIE = 'acadia-active-year';
export const ACTIVE_ACADEMIC_YEAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function encodeActiveAcademicYearCookie(
  tenantId: string,
  yearId: string,
): string {
  return `${tenantId}:${yearId}`;
}

export function parseActiveAcademicYearCookie(
  value: string | null | undefined,
  tenantId: string,
): string | null {
  if (!value || !tenantId) {
    return null;
  }
  const separator = value.indexOf(':');
  if (separator <= 0) {
    return null;
  }
  const cookieTenantId = value.slice(0, separator);
  const yearId = value.slice(separator + 1);
  if (cookieTenantId !== tenantId || !yearId) {
    return null;
  }
  return yearId;
}

export function writeActiveAcademicYearCookie(
  tenantId: string,
  yearId: string | null,
): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (!yearId) {
    document.cookie = `${ACTIVE_ACADEMIC_YEAR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  const encoded = encodeURIComponent(
    encodeActiveAcademicYearCookie(tenantId, yearId),
  );
  document.cookie = `${ACTIVE_ACADEMIC_YEAR_COOKIE}=${encoded}; Path=/; Max-Age=${ACTIVE_ACADEMIC_YEAR_COOKIE_MAX_AGE}; SameSite=Lax`;
}

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
  if (storage) {
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
  writeActiveAcademicYearCookie(tenantId, yearId);
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
