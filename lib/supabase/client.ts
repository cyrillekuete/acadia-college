import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseEnv,
  getSupabaseEnvOrNull,
  SUPABASE_CONFIG_ERROR,
} from '@/lib/supabase/env';
import {
  applyRememberMeToCookie,
  REMEMBER_ME_COOKIE,
  REMEMBER_ME_DISABLED,
  REMEMBER_ME_ENABLED,
  PERSISTENT_COOKIE_MAX_AGE,
  shouldPersistSessionCookie,
} from '@/lib/supabase/remember-me';

type BrowserCookie = {
  name: string;
  value: string;
  options: { maxAge?: number };
};

function serializeBrowserCookie(
  name: string,
  value: string,
  options: { maxAge?: number },
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  parts.push('Path=/');
  parts.push('SameSite=Lax');
  return parts.join('; ');
}

function readDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined') {
    return [];
  }
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      const name = separator === -1 ? part : part.slice(0, separator);
      const raw = separator === -1 ? '' : part.slice(separator + 1);
      let value = raw;
      try {
        value = decodeURIComponent(raw);
      } catch {
        // Keep the raw value when it is not valid percent-encoding.
      }
      return { name, value };
    });
}

function readRememberMeMarker(): string | null {
  const cookie = readDocumentCookies().find(
    (entry) => entry.name === REMEMBER_ME_COOKIE,
  );
  return cookie ? cookie.value : null;
}

/** True when the marker cookie says the session should stay persistent. */
export function isRememberMeEnabled(): boolean {
  return shouldPersistSessionCookie(readRememberMeMarker());
}

/**
 * Records the remember-me choice: persistent '1' when checked, session-scoped
 * '0' when unchecked. An absent marker means "choice unknown" (legacy/OAuth).
 */
function persistRememberMeMarker(rememberMe: boolean): void {
  document.cookie = serializeBrowserCookie(
    REMEMBER_ME_COOKIE,
    rememberMe ? REMEMBER_ME_ENABLED : REMEMBER_ME_DISABLED,
    rememberMe ? { maxAge: PERSISTENT_COOKIE_MAX_AGE } : {},
  );
}

function createPolicyCookieMethods(getRememberMe: () => boolean) {
  return {
    getAll() {
      return readDocumentCookies();
    },
    setAll(cookiesToSet: BrowserCookie[]) {
      const rememberMe = getRememberMe();
      for (const cookie of cookiesToSet) {
        if (cookie.name === REMEMBER_ME_COOKIE) {
          continue;
        }
        const policy = applyRememberMeToCookie(
          rememberMe,
          cookie.name,
          cookie.value,
          cookie.options,
        );
        const maxAge = policy ? policy.maxAge : cookie.options.maxAge;
        document.cookie = serializeBrowserCookie(cookie.name, cookie.value, {
          ...cookie.options,
          maxAge,
        });
      }
    },
  };
}

/** Browser client, or null when Supabase env vars are missing. */
export function createClientOrNull(): SupabaseClient | null {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return null;
  }
  if (typeof window === 'undefined') {
    return createBrowserClient(env.url, env.key);
  }
  return createBrowserClient(env.url, env.key, {
    cookies: createPolicyCookieMethods(isRememberMeEnabled),
  });
}

/** Browser client; throws {@link SUPABASE_CONFIG_ERROR} when env vars are missing. */
export function createClient(): SupabaseClient {
  const { url, key } = getSupabaseEnv();
  if (typeof window === 'undefined') {
    return createBrowserClient(url, key);
  }
  return createBrowserClient(url, key, {
    cookies: createPolicyCookieMethods(isRememberMeEnabled),
  });
}

/**
 * Browser client for sign-in only — honors “Remember me” by writing the
 * session cookies as browser-session cookies (unchecked) or persistent
 * cookies (checked). The marker cookie keeps the choice applied to later
 * token refreshes performed by the app-wide client.
 */
export function createSignInClient(rememberMe: boolean): SupabaseClient | null {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return null;
  }

  if (typeof window === 'undefined') {
    return createBrowserClient(env.url, env.key);
  }

  persistRememberMeMarker(rememberMe);

  return createBrowserClient(env.url, env.key, {
    // Fresh client per sign-in so the checkbox state is honored every time.
    isSingleton: false,
    cookies: createPolicyCookieMethods(() => rememberMe),
    // The throwaway sign-in client must not race the app-wide client's
    // token refresher once sign-in completes.
    auth: { autoRefreshToken: false },
  });
}

/**
 * Starts Supabase OAuth sign-in with the remember-me choice recorded in the
 * marker cookie beforehand. The choice then rides through the OAuth redirect
 * and /auth/callback applies the same policy to the session cookies it sets
 * (via the server client in lib/supabase/server.ts).
 */
export async function signInWithAcadiaOAuth(
  rememberMe: boolean,
): Promise<{ error: string | null }> {
  const supabase = createSignInClient(rememberMe);
  if (!supabase) {
    return { error: SUPABASE_CONFIG_ERROR };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error: error ? error.message : null };
}

/** For React Query `queryFn` — returns a client or throws a handled configuration error. */
export function requireBrowserClient(): SupabaseClient {
  const client = createClientOrNull();
  if (!client) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }
  return client;
}
