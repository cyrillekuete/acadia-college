import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseUserOrClearStaleSession } from '@/lib/auth/stale-session';
import { createClientOrNull } from '@/lib/supabase/client';

/**
 * Resolves the current Supabase Auth user in the browser.
 *
 * Sign-in sessions live entirely in the shared cookie jar — “Remember me”
 * only controls cookie lifetime, not storage backend — so the default
 * client sees every session.
 */
export async function getBrowserAuthSession(): Promise<{
  user: User;
  supabase: SupabaseClient;
} | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const supabase = createClientOrNull();
  if (!supabase) {
    return null;
  }

  const user = await getSupabaseUserOrClearStaleSession(supabase);

  if (user) {
    return { user, supabase };
  }

  return null;
}
