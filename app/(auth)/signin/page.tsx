'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiErrorWarningFill } from '@remixicon/react';
import { AlertCircle, Eye, EyeOff, LoaderCircleIcon } from '@/lib/icons';
import { useForm } from 'react-hook-form';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getAuthCallbackErrorMessage } from '@/lib/auth/auth-callback-errors';
import { completeAcadiaSignIn } from '@/lib/auth/complete-acadia-sign-in';
import { getSafeRedirectPath } from '@/lib/auth/safe-redirect-path';
import { normalizeSignInError } from '@/lib/auth/sign-in-errors';
import { checkSupabaseAuthReachable } from '@/lib/supabase/connectivity';
import { getBrowserAuthSession } from '@/lib/auth/browser-auth-session';
import { createSignInClient } from '@/lib/supabase/client';
import {
  getConfiguredSupabaseProjectMismatch,
  getSupabaseEnvOrNull,
  SUPABASE_CONFIG_ERROR,
} from '@/lib/supabase/env';
import { getSigninSchema, SigninSchemaType } from '../forms/signin-schema';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextDestination = getSafeRedirectPath(
    searchParams.get('next'),
    '',
  );

  useEffect(() => {
    const code = searchParams.get('error');
    if (!code) return;

    setError(
      getAuthCallbackErrorMessage(code, searchParams.get('error_description')),
    );
  }, [searchParams]);

  useEffect(() => {
    const mismatch = getConfiguredSupabaseProjectMismatch();
    if (mismatch) {
      setError(mismatch);
      return;
    }

    const env = getSupabaseEnvOrNull();
    if (!env) return;

    let cancelled = false;

    void checkSupabaseAuthReachable(env.url, env.key).then((result) => {
      if (cancelled || result.ok) return;
      setError(result.reason);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function redirectIfSignedIn() {
      const authSession = await getBrowserAuthSession();
      if (!authSession || cancelled) return;

      const { user, supabase } = authSession;

      const gate = await completeAcadiaSignIn(supabase, user.id);
      if (cancelled) return;

      if (!gate.ok) {
        if (gate.shouldSignOut) {
          await supabase.auth.signOut();
        }
        setError(gate.message);
        return;
      }

      router.replace(nextDestination || gate.dashboardPath);
    }

    void redirectIfSignedIn();

    return () => {
      cancelled = true;
    };
  }, [router, nextDestination]);

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(values: SigninSchemaType) {
    setIsProcessing(true);
    setError(null);

    try {
      const supabase = createSignInClient(values.rememberMe ?? false);
      if (!supabase) {
        setError(SUPABASE_CONFIG_ERROR);
        return;
      }

      let loginEmail = values.identifier.trim();
      if (!loginEmail.includes('@')) {
        const resolveRes = await fetch('/api/auth/resolve-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: loginEmail }),
        });
        const resolveJson = (await resolveRes.json()) as {
          email?: string;
          message?: string;
        };
        if (!resolveRes.ok || !resolveJson.email) {
          setError(resolveJson.message ?? 'Invalid email or Teacher ID.');
          return;
        }
        loginEmail = resolveJson.email;
      } else {
        loginEmail = loginEmail.toLowerCase();
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword(
        {
          email: loginEmail,
          password: values.password,
        },
      );

      if (signInError) {
        setError(normalizeSignInError(signInError));
        return;
      }

      if (!data.user) {
        setError('Sign-in failed. Please try again.');
        return;
      }

      const gate = await completeAcadiaSignIn(supabase, data.user.id);

      if (!gate.ok) {
        if (gate.shouldSignOut) {
          await supabase.auth.signOut();
        }
        setError(gate.message);
        return;
      }

      router.push(nextDestination || gate.dashboardPath);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? normalizeSignInError(err)
          : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-5"
      >
        <div className="space-y-1.5 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-center">
            Sign in to Acadia College
          </h1>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <Alert size="sm" close={false}>
            <AlertIcon>
              <RiErrorWarningFill className="text-primary" />
            </AlertIcon>
            <AlertTitle className="text-accent-foreground">
              Dev accounts (password{' '}
              <span className="font-mono text-xs">Acadia2026!</span>): admin{' '}
              <span className="font-mono text-xs">admin@acadia-college.edu</span>
              , staff{' '}
              <span className="font-mono text-xs">staff@acadia-college.edu</span>
              , student{' '}
              <span className="font-mono text-xs">
                student@acadia-college.edu
              </span>
              . Role redirects after sign-in.
            </AlertTitle>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email or Teacher ID</FormLabel>
              <FormControl>
                <Input
                  placeholder="you@acadia-college.edu or TCH-2026-12345"
                  autoComplete="username"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center gap-2.5">
                <FormLabel>Password</FormLabel>
                <Link
                  href="/reset-password"
                  className="text-sm font-semibold text-foreground hover:text-primary"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <FormControl>
                  <Input
                    placeholder="Your password"
                    type={passwordVisible ? 'text' : 'password'}
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                  aria-label={
                    passwordVisible ? 'Hide password' : 'Show password'
                  }
                >
                  {passwordVisible ? (
                    <EyeOff className="text-muted-foreground" />
                  ) : (
                    <Eye className="text-muted-foreground" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center space-x-2">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <>
                <Checkbox
                  id="remember-me"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                />
                <label
                  htmlFor="remember-me"
                  className="text-sm leading-none text-muted-foreground"
                >
                  Remember me
                </label>
              </>
            )}
          />
        </div>

        <Button type="submit" disabled={isProcessing} className="w-full">
          {isProcessing ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : null}
          Sign in
        </Button>
      </form>
    </Form>
  );
}
