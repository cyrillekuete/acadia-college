'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  ACADIA_DEFAULT_LANDING_PATH,
  getDashboardPathForRole,
} from '@/lib/auth/dashboard-routes';

export function AccountAccessGate({
  allowed,
  children,
}: {
  allowed: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { data: session, isLoading } = useAcadiaCollegeSession();

  useEffect(() => {
    if (isLoading || !session) {
      return;
    }
    if (!allowed) {
      router.replace(
        getDashboardPathForRole(session.roleSlug) ?? ACADIA_DEFAULT_LANDING_PATH,
      );
    }
  }, [allowed, isLoading, router, session]);

  if (isLoading || !session || !allowed) {
    return <ScreenLoader />;
  }

  return children;
}
