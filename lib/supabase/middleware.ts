import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  buildRequestPath,
  buildSignInUrl,
  requiresSupabaseSession,
} from '@/lib/auth/routes';
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && requiresSupabaseSession(pathname)) {
    const nextPath = buildRequestPath(pathname, search);
    const signInUrl = new URL(buildSignInUrl(nextPath), request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (user && (pathname === '/signin' || pathname === '/signup')) {
    const home = new URL('/', request.url);
    return NextResponse.redirect(home);
  }

  return supabaseResponse;
}
