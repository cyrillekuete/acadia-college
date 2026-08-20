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
  it('allows onboarding, profile, and security routes', () => {
    expect(isStaffOnboardingExemptPath('/staff/onboarding')).toBe(true);
    expect(isStaffOnboardingExemptPath('/account/home/user-profile')).toBe(true);
    expect(isStaffOnboardingExemptPath('/user-management/account/security')).toBe(
      true,
    );
    expect(isStaffOnboardingExemptPath('/change-password')).toBe(true);
  });

  it('does not exempt get-started or API keys', () => {
    expect(isStaffOnboardingExemptPath('/account/home/get-started')).toBe(false);
    expect(isStaffOnboardingExemptPath('/account/api-keys')).toBe(false);
    expect(isStaffOnboardingExemptPath('/account/home/company-profile')).toBe(
      false,
    );
  });

  it('blocks dashboard routes until onboarding completes', () => {
    expect(isStaffOnboardingExemptPath('/dashboard/staff')).toBe(false);
    expect(isStaffOnboardingExemptPath('/students')).toBe(false);
    expect(isStaffOnboardingExemptPath('/staff/onboarding-summary')).toBe(false);
    expect(isStaffOnboardingExemptPath('/user-management/users')).toBe(false);
  });

  it('documents self-update allowed onboarding columns', () => {
    // Must stay aligned with acadia_staff_profile_self_update_guard migration.
    const allowed = [
      'title',
      'firstName',
      'lastName',
      'personalEmail',
      'phone',
      'bio',
      'officeRoom',
      'officePhone',
      'emergencyContactName',
      'emergencyContactRelationship',
      'emergencyContactPhone',
      'onboardingCompletedAt',
      'updatedAt',
    ];
    expect(allowed).toContain('phone');
    expect(allowed).not.toContain('isActive');
    expect(allowed).not.toContain('monthlySalary');
    expect(allowed).not.toContain('staffCode');
  });
});
