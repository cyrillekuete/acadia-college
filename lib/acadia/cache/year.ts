import { cookies } from 'next/headers';
import {
  ACTIVE_ACADEMIC_YEAR_COOKIE,
  parseActiveAcademicYearCookie,
} from '@/lib/acadia/active-academic-year-storage';
import { getCachedCurrentAcademicYear } from '@/lib/acadia/cache/queries';

export async function resolveRscAcademicYearId(
  tenantId: string,
): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_ACADEMIC_YEAR_COOKIE)?.value ?? null;
  const decoded = raw ? safeDecodeCookie(raw) : null;
  const fromCookie =
    parseActiveAcademicYearCookie(decoded, tenantId) ??
    parseActiveAcademicYearCookie(raw, tenantId);
  if (fromCookie) {
    return fromCookie;
  }
  const current = await getCachedCurrentAcademicYear(tenantId);
  return current?.id ?? null;
}

function safeDecodeCookie(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
