const AUTH_CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  oauth: 'Sign-in was cancelled or denied.',
  missing_code: 'Sign-in could not be completed. Please try again.',
  config: 'Authentication is not configured. Contact an administrator.',
  exchange: 'Sign-in session could not be established. Please try again.',
  profile_missing:
    'Your account is not linked to an Acadia College profile. Contact an administrator.',
  profile_query:
    'Could not load your Acadia College profile. Check your connection and try again.',
  profile_trashed: 'This account has been deactivated. Contact an administrator.',
  profile_blocked: 'This account has been blocked. Contact an administrator.',
  profile_inactive:
    'This account is not active yet. Contact an administrator if you need access.',
  profile_suspended:
    'This account has been suspended. Contact an administrator.',
  profile_status: 'This account cannot sign in. Contact an administrator.',
  profile_no_tenant:
    'Your account is not assigned to an institution. Contact an administrator.',
  profile_role:
    'Your account is not linked to a valid Acadia College role. Contact an administrator.',
  profile_dashboard:
    'Your role is not configured for dashboard access. Contact an administrator.',
};

export function buildSignInErrorRedirectUrl(
  origin: string,
  code: string,
  description?: string,
): string {
  const params = new URLSearchParams({ error: code });
  if (description) {
    params.set('error_description', description);
  }
  return `${origin}/signin?${params.toString()}`;
}

export function buildSignInErrorPath(code: string): string {
  return `/signin?${new URLSearchParams({ error: code }).toString()}`;
}

export function getAuthCallbackErrorMessage(
  code: string,
  description?: string | null,
): string {
  const mapped = AUTH_CALLBACK_ERROR_MESSAGES[code];
  if (mapped) {
    return mapped;
  }

  const trimmed = description?.trim();
  if (trimmed) {
    return trimmed;
  }

  return 'Sign-in failed. Please try again.';
}
