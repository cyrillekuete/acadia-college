/**
 * Remember-me cookie policy, shared by browser and server Supabase clients.
 *
 * The user's choice is recorded in an `acadia-remember-me` marker cookie:
 *   '1'     → checked: session cookies stay persistent (400d, library default)
 *   '0'     → unchecked: session cookies become browser-session cookies
 *   absent  → legacy sessions (and OAuth before the choice is known):
 *             keep today's persistent behavior
 *
 * Session-cookie writes with an empty value or Max-Age 0 are always left as
 * removals so sign-out and chunk cleanup keep working.
 */

/** The library's hardcoded persistent lifetime; preserved when remembering. */
export const PERSISTENT_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/** Marks the user's last remember-me choice so later refreshes honor it. */
export const REMEMBER_ME_COOKIE = 'acadia-remember-me';

/** Marker value written when the user checks Remember me. */
export const REMEMBER_ME_ENABLED = '1';

/** Marker value written when the user leaves Remember me unchecked. */
export const REMEMBER_ME_DISABLED = '0';

/**
 * Remember-me policy for one session-cookie write.
 * - removals (empty value or Max-Age 0) stay removals so sign-out still works;
 * - unchecked sign-ins become browser-session cookies (no Max-Age);
 * - checked sign-ins keep the library's persistent lifetime.
 */
export function resolveSignInCookieMaxAge(
  rememberMe: boolean,
  value: string,
  options: { maxAge?: number },
): number | undefined {
  if (!value || options.maxAge === 0) {
    return 0;
  }
  if (!rememberMe) {
    return undefined;
  }
  return options.maxAge;
}

/** Only an explicit persistent marker ('1') re-persists sessions on refresh. */
export function shouldPersistSessionCookie(
  marker: string | null | undefined,
): boolean {
  return marker === REMEMBER_ME_ENABLED;
}

/**
 * Resolves the marker value for a remember-me choice.
 * Tri-state on read: absent (null) → fall back to persistent behavior.
 */
export function resolveRememberMeMarker(
  rememberMe: boolean | null,
): string | null {
  if (rememberMe === null) {
    return null;
  }
  return rememberMe ? REMEMBER_ME_ENABLED : REMEMBER_ME_DISABLED;
}

/**
 * Applies the remember-me policy to one cookie write, returning the options
 * to persist (or null to keep the caller's original options untouched).
 */
export function applyRememberMeToCookie(
  rememberMe: boolean,
  name: string,
  value: string,
  options: { maxAge?: number },
): { maxAge?: number } | null {
  if (name === REMEMBER_ME_COOKIE) {
    return null;
  }
  return { maxAge: resolveSignInCookieMaxAge(rememberMe, value, options) };
}
