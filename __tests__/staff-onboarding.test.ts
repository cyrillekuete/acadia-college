import { describe, expect, it } from 'vitest';
import {
  isStaffOnboardingExemptPath,
  staffNeedsOnboarding,
} from '@/lib/acadia/staff-onboarding';

describe('staffNeedsOnboarding', () => {
  it('returns true when onboardingCompletedAt is null', () => {
    expect(staffNeedsOnboarding(null)).toBe(true);
    expect(staffNeedsOnboarding(undefined)).toBe(true);
  });

  it('returns false when onboarding is complete', () => {
    expect(staffNeedsOnboarding('2026-05-23T00:00:00.000Z')).toBe(false);
  });
});

describe('isStaffOnboardingExemptPath', () => {
  it('allows onboarding and account routes', () => {
    expect(isStaffOnboardingExemptPath('/staff/onboarding')).toBe(true);
    expect(isStaffOnboardingExemptPath('/account/home/user-profile')).toBe(true);
    expect(isStaffOnboardingExemptPath('/change-password')).toBe(true);
  });

  it('blocks dashboard routes until onboarding completes', () => {
    expect(isStaffOnboardingExemptPath('/dashboard/staff')).toBe(false);
    expect(isStaffOnboardingExemptPath('/students')).toBe(false);
    expect(isStaffOnboardingExemptPath('/staff/onboarding-summary')).toBe(false);
  });
});
