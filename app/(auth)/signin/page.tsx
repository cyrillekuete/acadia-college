'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiErrorWarningFill } from '@remixicon/react';
import { AlertCircle, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
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
import { createClientOrNull } from '@/lib/supabase/client';
import { SUPABASE_CONFIG_ERROR } from '@/lib/supabase/env';
import { fetchAcadiaUserProfile } from '@/lib/supabase/queries/user';
import { getAuthCallbackErrorMessage } from '@/lib/auth/auth-callback-errors';
import {
  getDashboardPathForRole,
  isKnownAcadiaRole,
} from '@/lib/auth/dashboard-routes';
import { getSigninSchema, SigninSchemaType } from '../forms/signin-schema';

export default function Page() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('error');
    if (!code) return;

    setError(
      getAuthCallbackErrorMessage(code, params.get('error_description')),
    );

    params.delete('error');
    params.delete('error_description');
    const query = params.toString();
    const nextUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(values: SigninSchemaType) {
    setIsProcessing(true);
    setError(null);

    try {
      const supabase = createClientOrNull();
      if (!supabase) {
        setError(SUPABASE_CONFIG_ERROR);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.user) {
        setError('Sign-in failed. Please try again.');
        return;
      }

      const profile = await fetchAcadiaUserProfile(supabase, data.user.id);
      const roleSlug = profile?.UserRole?.slug ?? null;

      if (!profile || !roleSlug || !isKnownAcadiaRole(roleSlug)) {
        await supabase.auth.signOut();
        setError(
          'Your account is not linked to an Acadia College profile or role. Contact an administrator.',
        );
        return;
      }

      const dashboardPath = getDashboardPathForRole(roleSlug);
      if (!dashboardPath) {
        await supabase.auth.signOut();
        setError(
          'Your role is not configured for dashboard access. Contact an administrator.',
        );
        return;
      }

      router.push(dashboardPath);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
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

        <Alert size="sm" close={false}>
          <AlertIcon>
            <RiErrorWarningFill className="text-primary" />
          </AlertIcon>
          <AlertTitle className="text-accent-foreground">
            Dev accounts (password{' '}
            <span className="font-mono text-xs">Acadia2026!</span>): admin{' '}
            <span className="font-mono text-xs">admin@acadia-college.edu</span>
            , staff{' '}
            <span className="font-mono text-xs">staff@acadia-college.edu</span>,
            student{' '}
            <span className="font-mono text-xs">student@acadia-college.edu</span>
            . Role redirects after sign-in.
          </AlertTitle>
        </Alert>

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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@acadia.edu" type="email" {...field} />
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
                <Input
                  placeholder="Your password"
                  type={passwordVisible ? 'text' : 'password'}
                  {...field}
                />
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
