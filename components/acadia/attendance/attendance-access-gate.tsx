'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  canViewAttendance,
  canViewAttendanceAnalytics,
  canViewAttendanceReports,
} from '@/lib/acadia/roles';
import {
  ACADIA_DEFAULT_LANDING_PATH,
  getDashboardPathForRole,
} from '@/lib/auth/dashboard-routes';

function pathAllowed(pathname: string, roleSlug: string | null | undefined): boolean {
  if (!canViewAttendance(roleSlug)) {
    return false;
  }
  if (pathname.startsWith('/attendance/analytics')) {
    return canViewAttendanceAnalytics(roleSlug);
  }
  if (pathname.startsWith('/attendance/reports')) {
    return canViewAttendanceReports(roleSlug);
  }
  return true;
}

export function AttendanceAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const allowed = pathAllowed(pathname, session?.roleSlug);

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
