import { resolveRscAcademicYearId } from '@/lib/acadia/cache/year';
import {
  requireSessionRsc,
  type SessionApiContext,
} from '@/lib/acadia/require-session-rsc';

export type CachedPageContext = SessionApiContext & {
  yearId: string | null;
};

export async function getCachedPageContext(): Promise<CachedPageContext | null> {
  const session = await requireSessionRsc();
  if (!session) {
    return null;
  }
  const yearId = await resolveRscAcademicYearId(session.tenantId);
  return { ...session, yearId };
}

export async function loadCachedValue<T>(
  loader: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await loader();
  } catch {
    return undefined;
  }
}
