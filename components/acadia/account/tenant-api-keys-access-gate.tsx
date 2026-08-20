'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canManageTenantApiKeys } from '@/lib/acadia/roles';
import {
  ACADIA_DEFAULT_LANDING_PATH,
  getDashboardPathForRole,
} from '@/lib/auth/dashboard-routes';

export function TenantApiKeysAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const allowed = canManageTenantApiKeys(session?.roleSlug);

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
