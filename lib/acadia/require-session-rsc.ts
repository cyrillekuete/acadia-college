import {
  requireSessionApi,
  type SessionApiContext,
} from '@/lib/acadia/require-session-api';

export type { SessionApiContext };

/** Session for RSC pages. Returns null when auth is not ready (client gate still applies). */
export async function requireSessionRsc(): Promise<SessionApiContext | null> {
  const result = await requireSessionApi();
  return result.ok ? result.ctx : null;
}
