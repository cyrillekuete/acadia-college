const AUTH_CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  oauth: 'Sign-in was cancelled or denied.',
  missing_code: 'Sign-in could not be completed. Please try again.',
  config: 'Authentication is not configured. Contact an administrator.',
  exchange: 'Sign-in session could not be established. Please try again.',
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

export function getAuthCallbackErrorMessage(
  code: string,
  description?: string | null,
): string {
  const trimmed = description?.trim();
  if (trimmed) {
    return trimmed;
  }
  return (
    AUTH_CALLBACK_ERROR_MESSAGES[code] ??
    'Sign-in failed. Please try again.'
  );
}
