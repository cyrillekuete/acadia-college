'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScreenLoader } from '@/components/common/screen-loader';
import {
  isAcadiaSessionReady,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useStaffOnboardingStatus } from '@/hooks/use-staff-onboarding';
import { isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';
import { isStaffOnboardingExemptPath } from '@/lib/acadia/staff-onboarding';

export function StaffOnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const roleSlug = session?.roleSlug ?? null;
  const isTeacherStaff =
    isStaffOrTeacher(roleSlug) && !isAdmin(roleSlug);
  const sessionReady = isAcadiaSessionReady(sessionLoading, isError, session);

  const { data: onboardingStatus, isLoading: onboardingLoading } =
    useStaffOnboardingStatus();

  const exempt = isStaffOnboardingExemptPath(pathname);
  const needsOnboarding =
    isTeacherStaff &&
    onboardingStatus?.needsOnboarding === true;

  useEffect(() => {
    if (!sessionReady || exempt || onboardingLoading || !needsOnboarding) {
      return;
    }

    if (pathname !== '/staff/onboarding') {
      router.replace('/staff/onboarding');
    }
  }, [
    exempt,
    needsOnboarding,
    onboardingLoading,
    pathname,
    router,
    sessionReady,
  ]);

  if (
    isTeacherStaff &&
    !exempt &&
    (onboardingLoading || (needsOnboarding && pathname !== '/staff/onboarding'))
  ) {
    return <ScreenLoader />;
  }

  return <>{children}</>;
}
