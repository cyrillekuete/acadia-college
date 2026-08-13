'use client';

import Link from 'next/link';
import { AlertCircle } from '@/lib/icons';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Self-service signup is disabled — accounts are provisioned by administrators
 * (or via enrollment approval). Supabase Auth is the only sign-in path.
 */
export default function SignupPage() {
  const { t } = useTranslation();

  return (
    <div className="block w-full space-y-5">
      <div className="space-y-1.5 pb-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('auth.signupTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.signupBody')}
        </p>
      </div>

      <Alert>
        <AlertIcon>
          <AlertCircle className="text-primary" />
        </AlertIcon>
        <AlertTitle className="text-accent-foreground">
          {t('auth.signupHint')}
        </AlertTitle>
      </Alert>

      <Button asChild className="w-full">
        <Link href="/signin">{t('auth.goToSignIn')}</Link>
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.needHelp')}
      </p>
    </div>
  );
}
