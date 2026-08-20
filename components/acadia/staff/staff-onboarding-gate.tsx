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
import { useTranslation } from '@/hooks/useTranslation';

export function StaffOnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
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
  const blocked =
    isTeacherStaff &&
    onboardingStatus?.blocked === true;

  useEffect(() => {
    if (!sessionReady || exempt || onboardingLoading || blocked || !needsOnboarding) {
      return;
    }

    if (pathname !== '/staff/onboarding') {
      router.replace('/staff/onboarding');
    }
  }, [
    exempt,
    blocked,
    needsOnboarding,
    onboardingLoading,
    pathname,
    router,
    sessionReady,
  ]);

  if (
    isTeacherStaff &&
    !exempt &&
    !blocked &&
    (onboardingLoading || (needsOnboarding && pathname !== '/staff/onboarding'))
  ) {
    return <ScreenLoader />;
  }

  const blockedExempt = isStaffOnboardingExemptPath(pathname);

  if (isTeacherStaff && blocked && !blockedExempt) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold">{t('staff.accountBlockedTitle')}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {t('staff.accountBlockedDescription')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
