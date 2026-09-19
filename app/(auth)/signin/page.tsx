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
import { createSignInClient, signInWithAcadiaOAuth } from '@/lib/supabase/client';
import {
  getConfiguredSupabaseProjectMismatch,
  getSupabaseEnvOrNull,
  SUPABASE_CONFIG_ERROR,
} from '@/lib/supabase/env';
import { useTranslation } from '@/hooks/useTranslation';
import { getSigninSchema, SigninSchemaType } from '../forms/signin-schema';

export default function Page() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOAuthProcessing, setIsOAuthProcessing] = useState(false);
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
          setError(resolveJson.message ?? t('auth.invalidIdentifier'));
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
        setError(t('auth.signInFailed'));
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
          : t('auth.unexpectedError'),
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function onGoogleSignIn() {
    setIsOAuthProcessing(true);
    setError(null);

    try {
      const rememberMe = form.getValues('rememberMe') ?? false;
      const { error: oauthError } = await signInWithAcadiaOAuth(rememberMe);
      if (oauthError) {
        setError(oauthError);
        setIsOAuthProcessing(false);
      }
      // On success the browser redirects to Google; no further UI updates.
    } catch (err) {
      setError(
        err instanceof Error
          ? normalizeSignInError(err)
          : t('auth.unexpectedError'),
      );
      setIsOAuthProcessing(false);
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
            {t('auth.signInTitle')}
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
              <FormLabel>{t('auth.identifier')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.identifierPlaceholder')}
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
                <FormLabel>{t('auth.password')}</FormLabel>
                <Link
                  href="/reset-password"
                  className="text-sm font-semibold text-foreground hover:text-primary"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <FormControl>
                  <Input
                    placeholder={t('auth.passwordPlaceholder')}
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
                    passwordVisible ? t('auth.hidePassword') : t('auth.showPassword')
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
                  {t('auth.rememberMe')}
                </label>
              </>
            )}
          />
        </div>

        <Button type="submit" disabled={isProcessing} className="w-full">
          {isProcessing ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : null}
          {t('auth.signIn')}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{t('auth.or')}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isOAuthProcessing}
          onClick={onGoogleSignIn}
        >
          {isOAuthProcessing ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {t('auth.continueWithGoogle')}
        </Button>
      </form>
    </Form>
  );
}
