'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from '@/lib/icons';
import { ScreenLoader } from '@/components/common/screen-loader';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { buildSignInErrorPath } from '@/lib/auth/auth-callback-errors';
import { buildRequestPath, buildSignInUrl } from '@/lib/auth/routes';
import {
  isAcadiaSessionReady,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useAcadiaSignOut } from '@/hooks/use-acadia-sign-out';
import { AcademicYearGate } from '@/components/acadia/academics/academic-year-gate';
import { AcademicYearProvider } from '@/components/acadia/academics/academic-year-provider';
import { SessionTimeoutGuard } from '@/components/acadia/session-timeout-guard';
import { Demo1Layout } from '../components/layouts/demo1/layout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isLoading, isError, refetch, isFetching } =
    useAcadiaCollegeSession();
  const { replace } = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const signOut = useAcadiaSignOut();

  const isAuthenticated = isAcadiaSessionReady(isLoading, isError, session);
  const mustSignOutForGate =
    !isLoading &&
    !isError &&
    !!session?.authUser &&
    !!session.gateFailure?.shouldSignOut;

  useEffect(() => {
    if (isLoading) return;

    if (isError || session?.profileLoadFailed) {
      return;
    }

    if (mustSignOutForGate && session?.gateFailure) {
      const errorPath = buildSignInErrorPath(session.gateFailure.errorCode);
      void signOut().then(() => {
        replace(errorPath);
      });
      return;
    }

    if (!isAuthenticated) {
      const next = buildRequestPath(pathname, searchParams.toString());
      replace(buildSignInUrl(next));
    }
  }, [
    isLoading,
    isError,
    isAuthenticated,
    mustSignOutForGate,
    session?.gateFailure,
    session?.profileLoadFailed,
    pathname,
    searchParams,
    replace,
    signOut,
  ]);

  if (isError || session?.profileLoadFailed) {
    return (
      <SessionErrorView
        onRetry={() => void refetch()}
        onSignOut={() => void signOut()}
        retrying={isFetching}
      />
    );
  }

  if (isLoading || mustSignOutForGate || !isAuthenticated) {
    return <ScreenLoader />;
  }

  return (
    <AcademicYearProvider>
      <Demo1Layout>
        <SessionTimeoutGuard />
        <AcademicYearGate>{children}</AcademicYearGate>
      </Demo1Layout>
    </AcademicYearProvider>
  );
}

function SessionErrorView({
  onRetry,
  onSignOut,
  retrying,
}: {
  onRetry: () => void;
  onSignOut: () => void;
  retrying: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertIcon>
            <AlertCircle />
          </AlertIcon>
          <AlertTitle>Could not load your session</AlertTitle>
        </Alert>
        <p className="text-sm text-muted-foreground">
          We could not load your Acadia College profile. Check your connection
          and try again.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={onRetry} disabled={retrying}>
            {retrying ? 'Retrying…' : 'Try again'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onSignOut}
            disabled={retrying}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
