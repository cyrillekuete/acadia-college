'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenLoader } from '@/components/common/screen-loader';
import {
  ACADIA_DEFAULT_LANDING_PATH,
  getDashboardPathForRole,
} from '@/lib/auth/dashboard-routes';
import {
  isAcadiaSessionReady,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export default function Page() {
  const { replace } = useRouter();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const isReady = isAcadiaSessionReady(isLoading, isError, session);
  const roleSlug = session?.roleSlug ?? null;

  useEffect(() => {
    if (!isReady || !roleSlug) return;
    const destination =
      getDashboardPathForRole(roleSlug) ?? ACADIA_DEFAULT_LANDING_PATH;
    replace(destination);
  }, [isReady, roleSlug, replace]);

  return <ScreenLoader />;
}
