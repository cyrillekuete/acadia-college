import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClientOrNull, createSignInClient } from '@/lib/supabase/client';

/**
 * Resolves the current Supabase Auth user in the browser, checking the default
 * client plus both remember-me storage backends (localStorage / sessionStorage).
 */
export async function getBrowserAuthSession(): Promise<{
  user: User;
  supabase: SupabaseClient;
} | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const clients: SupabaseClient[] = [];
  const defaultClient = createClientOrNull();
  if (defaultClient) clients.push(defaultClient);

  const remembered = createSignInClient(true);
  if (remembered) clients.push(remembered);

  const sessionOnly = createSignInClient(false);
  if (sessionOnly) clients.push(sessionOnly);

  const seen = new Set<SupabaseClient>();
  for (const supabase of clients) {
    if (seen.has(supabase)) continue;
    seen.add(supabase);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return { user, supabase };
    }
  }

  return null;
}
