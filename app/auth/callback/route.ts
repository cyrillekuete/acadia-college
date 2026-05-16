import { NextResponse } from 'next/server';
import {
  buildSignInErrorRedirectUrl,
} from '@/lib/auth/auth-callback-errors';
import { getSafeRedirectPath } from '@/lib/auth/safe-redirect-path';
import { createClientOrNull } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeRedirectPath(searchParams.get('next'), '/');

  const oauthError = searchParams.get('error');
  if (oauthError) {
    const description =
      searchParams.get('error_description') ?? oauthError;
    console.error('[auth/callback] OAuth provider error:', description);
    return NextResponse.redirect(
      buildSignInErrorRedirectUrl(origin, 'oauth', description),
    );
  }

  if (!code) {
    console.error('[auth/callback] Missing authorization code.');
    return NextResponse.redirect(
      buildSignInErrorRedirectUrl(
        origin,
        'missing_code',
        'No authorization code was provided.',
      ),
    );
  }

  const supabase = await createClientOrNull();
  if (!supabase) {
    console.error('[auth/callback] Supabase is not configured.');
    return NextResponse.redirect(
      buildSignInErrorRedirectUrl(
        origin,
        'config',
        'Authentication service is not configured.',
      ),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error(
      '[auth/callback] exchangeCodeForSession failed:',
      error.message,
    );
    return NextResponse.redirect(
      buildSignInErrorRedirectUrl(origin, 'exchange', error.message),
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
