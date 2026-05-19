'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff } from '@/lib/icons';
import { useForm } from 'react-hook-form';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoaderCircleIcon } from '@/lib/icons';
import { createClientOrNull } from '@/lib/supabase/client';
import { SUPABASE_CONFIG_ERROR } from '@/lib/supabase/env';
import {
  ChangePasswordSchemaType,
  getChangePasswordSchema,
} from '../forms/change-password-schema';

export default function Page() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] =
    useState(false);

  const form = useForm<ChangePasswordSchemaType>({
    resolver: zodResolver(getChangePasswordSchema()),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const supabase = createClientOrNull();
      if (!supabase) {
        if (!cancelled) {
          setError(SUPABASE_CONFIG_ERROR);
          setCheckingSession(false);
        }
        return;
      }

      const {
        data: { user },
        error: sessionError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (sessionError || !user) {
        setError(
          'Your reset link is invalid or has expired. Request a new password reset email.',
        );
        setHasRecoverySession(false);
      } else {
        setHasRecoverySession(true);
      }

      setCheckingSession(false);
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: ChangePasswordSchemaType) {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = createClientOrNull();
      if (!supabase) {
        setError(SUPABASE_CONFIG_ERROR);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (updateError) {
        setError(
          updateError.message.includes('same')
            ? 'Choose a password that is different from your current one.'
            : 'Unable to update your password. Request a new reset link and try again.',
        );
        return;
      }

      await supabase.auth.signOut();
      setSuccessMessage('Password updated. Redirecting to sign in…');
      setTimeout(() => router.push('/signin'), 2000);
    } catch {
      setError('An error occurred while resetting the password.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-4"
      >
        <div className="text-center space-y-1 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        {checkingSession && (
          <Alert>
            <AlertIcon>
              <LoaderCircleIcon className="size-4 animate-spin" />
            </AlertIcon>
            <AlertTitle>Verifying your reset link…</AlertTitle>
          </Alert>
        )}

        {error && !checkingSession && (
          <div className="space-y-4 text-center">
            <Alert variant="destructive">
              <AlertIcon>
                <AlertCircle />
              </AlertIcon>
              <AlertTitle>{error}</AlertTitle>
            </Alert>
            <Button asChild>
              <Link href="/reset-password">Request a new reset link</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/signin">Back to sign in</Link>
            </Button>
          </div>
        )}

        {successMessage && (
          <Alert>
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>{successMessage}</AlertTitle>
          </Alert>
        )}

        {hasRecoverySession &&
          !successMessage &&
          !checkingSession &&
          !error && (
            <>
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={passwordVisible ? 'text' : 'password'}
                          placeholder="Enter new password"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        mode="icon"
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={
                            passwordConfirmationVisible ? 'text' : 'password'
                          }
                          placeholder="Confirm new password"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        mode="icon"
                        onClick={() =>
                          setPasswordConfirmationVisible(
                            !passwordConfirmationVisible,
                          )
                        }
                        className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                        aria-label={
                          passwordConfirmationVisible
                            ? 'Hide password confirmation'
                            : 'Show password confirmation'
                        }
                      >
                        {passwordConfirmationVisible ? (
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

              <Button type="submit" disabled={isProcessing} className="w-full">
                {isProcessing && (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                )}
                Update password
              </Button>
            </>
          )}
      </form>
    </Form>
  );
}
