'use client';

import Link from 'next/link';
import { AlertCircle } from '@/lib/icons';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Self-service signup is disabled — accounts are provisioned by administrators
 * (or via enrollment approval). Supabase Auth is the only sign-in path.
 */
export default function SignupPage() {
  return (
    <div className="block w-full space-y-5">
      <div className="space-y-1.5 pb-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Account registration
        </h1>
        <p className="text-sm text-muted-foreground">
          New Acadia College accounts are created by your school administrator
          or through the enrolment process.
        </p>
      </div>

      <Alert>
        <AlertIcon>
          <AlertCircle className="text-primary" />
        </AlertIcon>
        <AlertTitle className="text-accent-foreground">
          If you already have credentials, sign in with the email and password
          provided by your institution. Students and parents receive a password
          setup link by email when their account is created.
        </AlertTitle>
      </Alert>

      <Button asChild className="w-full">
        <Link href="/signin">Go to sign in</Link>
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Need help? Contact your school administrator.
      </p>
    </div>
  );
}
