import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildSignInErrorRedirectUrl } from '@/lib/auth/auth-callback-errors';
import { resolveAcadiaProfileGate } from '@/lib/auth/complete-acadia-sign-in';
import {
  buildRequestPath,
  buildSignInUrl,
  requiresSupabaseSession,
} from '@/lib/auth/routes';
import { getSafeRedirectPath } from '@/lib/auth/safe-redirect-path';
import { getSupabaseUserOrClearStaleSession } from '@/lib/auth/stale-session';
import { getSupabaseEnvOrNull } from '@/lib/supabase/env';

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const user = await getSupabaseUserOrClearStaleSession(supabase);

  const { pathname, search } = request.nextUrl;
  const origin = request.nextUrl.origin;

  if (!user && requiresSupabaseSession(pathname)) {
    const nextPath = buildRequestPath(pathname, search);
    const signInUrl = new URL(buildSignInUrl(nextPath), request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (user) {
    const gate = await resolveAcadiaProfileGate(supabase, user.id);

    if (!gate.ok && gate.shouldSignOut) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        buildSignInErrorRedirectUrl(origin, gate.errorCode),
      );
    }

    if (pathname === '/signin' || pathname === '/signup') {
      if (gate.ok) {
        const nextParam = request.nextUrl.searchParams.get('next');
        const destination = getSafeRedirectPath(
          nextParam,
          gate.dashboardPath,
        );
        return NextResponse.redirect(new URL(destination, request.url));
      }

      if (!gate.ok && !gate.shouldSignOut) {
        return supabaseResponse;
      }
    }

    if (
      !gate.ok &&
      !gate.shouldSignOut &&
      requiresSupabaseSession(pathname)
    ) {
      return supabaseResponse;
    }

    if (
      !gate.ok &&
      gate.shouldSignOut &&
      requiresSupabaseSession(pathname)
    ) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        buildSignInErrorRedirectUrl(origin, gate.errorCode),
      );
    }
  }

  return supabaseResponse;
}
