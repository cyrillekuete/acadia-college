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
import { useTranslation } from '@/hooks/useTranslation';

const SUPPORTED_OTP_TYPES = new Set<string>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

function VerifyEmailContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(t('auth.verifying'));
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
            ? t('auth.verifyExpired')
            : t('auth.verifyFailed'),
        );
        return;
      }

      setError(null);
      setMessage(t('auth.verifySuccess'));
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    },
    [router, t],
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
      setError(t('auth.legacyVerifyLink'));
      return;
    }

    setMessage(null);
    setError(t('auth.invalidVerifyLink'));
  }, [searchParams, router, verifyWithOtp, t]);

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">{t('auth.emailVerification')}</h1>
      {error && (
        <>
          <Alert variant="destructive">
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>

          <Button asChild>
            <Link href="/signin">{t('auth.goToSignIn')}</Link>
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
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className="w-full space-y-6">
          <h1 className="text-2xl font-semibold">{t('auth.emailVerification')}</h1>
          <Alert>
            <AlertIcon>
              <LoaderCircleIcon className="size-4 animate-spin stroke-muted-foreground" />
            </AlertIcon>
            <AlertTitle>{t('auth.verifying')}</AlertTitle>
          </Alert>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
