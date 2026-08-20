export function staffNeedsOnboarding(
  onboardingCompletedAt: string | null | undefined,
): boolean {
  return onboardingCompletedAt == null;
}

export const STAFF_ONBOARDING_EXEMPT_PATH_PREFIXES = [
  '/staff/onboarding',
  '/change-password',
  '/account/home/user-profile',
  '/user-management/account',
] as const;

export function isStaffOnboardingExemptPath(pathname: string): boolean {
  return STAFF_ONBOARDING_EXEMPT_PATH_PREFIXES.some((prefix) => {
    if (prefix.endsWith('/')) {
      return pathname.startsWith(prefix);
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}
