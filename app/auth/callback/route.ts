import { NextResponse } from 'next/server';
import {
  buildRecoveryErrorRedirectUrl,
  buildSignInErrorRedirectUrl,
  isPasswordRecoveryCallback,
} from '@/lib/auth/auth-callback-errors';
import { completeAcadiaSignIn } from '@/lib/auth/complete-acadia-sign-in';
import { getSafeRedirectPath } from '@/lib/auth/safe-redirect-path';
import { createClientOrNull } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const isRecovery = isPasswordRecoveryCallback(nextParam);

  const oauthError = searchParams.get('error');
  if (oauthError) {
    const description =
      searchParams.get('error_description') ?? oauthError;
    console.error('[auth/callback] OAuth provider error:', description);
    if (isRecovery) {
      return NextResponse.redirect(
        buildRecoveryErrorRedirectUrl(origin, 'recovery_expired'),
      );
    }
    return NextResponse.redirect(
      buildSignInErrorRedirectUrl(origin, 'oauth', description),
    );
  }

  if (!code) {
    console.error('[auth/callback] Missing authorization code.');
    if (isRecovery) {
      return NextResponse.redirect(
        buildRecoveryErrorRedirectUrl(origin, 'recovery_expired'),
      );
    }
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
    if (isRecovery) {
      return NextResponse.redirect(
        buildRecoveryErrorRedirectUrl(origin, 'recovery_expired'),
      );
    }
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
    if (isRecovery) {
      return NextResponse.redirect(
        buildRecoveryErrorRedirectUrl(origin, 'recovery_exchange'),
      );
    }
    return NextResponse.redirect(
      buildSignInErrorRedirectUrl(origin, 'exchange', error.message),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isRecovery) {
      return NextResponse.redirect(
        buildRecoveryErrorRedirectUrl(origin, 'recovery_exchange'),
      );
    }
    return NextResponse.redirect(
      buildSignInErrorRedirectUrl(
        origin,
        'exchange',
        'Sign-in session could not be established.',
      ),
    );
  }

  const recoveryDestination = getSafeRedirectPath(nextParam, '');
  if (recoveryDestination === '/change-password') {
    return NextResponse.redirect(`${origin}/change-password`);
  }

  const gate = await completeAcadiaSignIn(supabase, user.id);
  if (!gate.ok) {
    if (gate.shouldSignOut) {
      await supabase.auth.signOut();
    }
    return NextResponse.redirect(
      buildSignInErrorRedirectUrl(origin, gate.errorCode, gate.message),
    );
  }

  const destination = getSafeRedirectPath(
    nextParam,
    gate.dashboardPath,
  );

  return NextResponse.redirect(`${origin}${destination}`);
}
