'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { AlertCircle } from '@/lib/icons';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoaderCircleIcon } from '@/lib/icons';
import { createClientOrNull } from '@/lib/supabase/client';
import { SUPABASE_CONFIG_ERROR } from '@/lib/supabase/env';

const SUPPORTED_OTP_TYPES = new Set<string>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>('Verifying…');
  const [error, setError] = useState<string | null>(null);

  const verifyWithOtp = useCallback(
    async (tokenHash: string, type: EmailOtpType) => {
      const supabase = createClientOrNull();
      if (!supabase) {
        setMessage(null);
        setError(SUPABASE_CONFIG_ERROR);
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (verifyError) {
        setMessage(null);
        setError(
          verifyError.message.includes('expired') ||
            verifyError.message.includes('invalid')
            ? 'This verification link is invalid or has expired. Request a new confirmation email from an administrator.'
            : 'Email verification failed. Please try again or contact an administrator.',
        );
        return;
      }

      setError(null);
      setMessage('Your email has been verified. Redirecting to sign in…');
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    },
    [router],
  );

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const params = new URLSearchParams({ code });
      const next = searchParams.get('next');
      if (next) {
        params.set('next', next);
      }
      router.replace(`/auth/callback?${params.toString()}`);
      return;
    }

    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    if (tokenHash && type && SUPPORTED_OTP_TYPES.has(type)) {
      void verifyWithOtp(tokenHash, type as EmailOtpType);
      return;
    }

    if (searchParams.get('token')) {
      setMessage(null);
      setError(
        'This verification link format is no longer supported. Ask an administrator to resend your confirmation email.',
      );
      return;
    }

    setMessage(null);
    setError('Invalid or missing verification link.');
  }, [searchParams, router, verifyWithOtp]);

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">Email Verification</h1>
      {error && (
        <>
          <Alert variant="destructive">
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>

          <Button asChild>
            <Link href="/signin">Go back to sign in</Link>
          </Button>
        </>
      )}

      {message && !error && (
        <Alert>
          <AlertIcon>
            <LoaderCircleIcon className="size-4 animate-spin stroke-muted-foreground" />
          </AlertIcon>
          <AlertTitle>{message}</AlertTitle>
        </Alert>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-6">
          <h1 className="text-2xl font-semibold">Email Verification</h1>
          <Alert>
            <AlertIcon>
              <LoaderCircleIcon className="size-4 animate-spin stroke-muted-foreground" />
            </AlertIcon>
            <AlertTitle>Verifying…</AlertTitle>
          </Alert>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
