import { describe, expect, it } from 'vitest';
import { UserStatus } from '@/app/models/user';
import { validateAcadiaProfile } from '@/lib/auth/acadia-profile-gate';
import {
  buildRecoveryErrorRedirectUrl,
  getAuthCallbackErrorMessage,
  getRecoveryErrorMessage,
  isPasswordRecoveryCallback,
} from '@/lib/auth/auth-callback-errors';
import {
  buildPasswordRecoveryRedirectUrl,
  getAppOrigin,
} from '@/lib/auth/app-origin';
import { getSafeRedirectPath } from '@/lib/auth/safe-redirect-path';
import { normalizeSignInError } from '@/lib/auth/sign-in-errors';
import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';

function activeProfile(
  overrides: Partial<AcadiaUserProfile> = {},
): AcadiaUserProfile {
  return {
    id: 'user-1',
    email: 'student@acadia-college.edu',
    name: 'Test Student',
    tenantId: 'tenant-1',
    status: UserStatus.ACTIVE,
    roleId: 'role-1',
    isTrashed: false,
    UserRole: { slug: 'student', name: 'Student', isTrashed: false },
    ...overrides,
  };
}

describe('validateAcadiaProfile', () => {
  it('passes for an active student with tenant and role', () => {
    const result = validateAcadiaProfile(activeProfile());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dashboardPath).toBe('/dashboard/student');
    }
  });

  it('fails when profile query failed without signing out', () => {
    const result = validateAcadiaProfile(null, { queryFailed: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('profile_query');
      expect(result.shouldSignOut).toBe(false);
    }
  });

  it('fails and signs out when profile is missing', () => {
    const result = validateAcadiaProfile(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('profile_missing');
      expect(result.shouldSignOut).toBe(true);
    }
  });

  it('fails for blocked and inactive accounts', () => {
    const blocked = validateAcadiaProfile(
      activeProfile({ status: UserStatus.BLOCKED }),
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.errorCode).toBe('profile_blocked');
    }

    const inactive = validateAcadiaProfile(
      activeProfile({ status: UserStatus.INACTIVE }),
    );
    expect(inactive.ok).toBe(false);
    if (!inactive.ok) {
      expect(inactive.errorCode).toBe('profile_inactive');
    }
  });

  it('fails when role is unknown', () => {
    const result = validateAcadiaProfile(
      activeProfile({ UserRole: { slug: 'unknown', name: 'Unknown' } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('profile_role');
    }
  });
});

describe('getSafeRedirectPath', () => {
  it('allows same-origin relative paths', () => {
    expect(getSafeRedirectPath('/classes', '/')).toBe('/classes');
  });

  it('blocks open redirects', () => {
    expect(getSafeRedirectPath('//evil.com', '/')).toBe('/');
    expect(getSafeRedirectPath('https://evil.com', '/')).toBe('/');
    expect(getSafeRedirectPath('/\\evil', '/')).toBe('/');
  });

  it('returns fallback for empty input', () => {
    expect(getSafeRedirectPath(null, '/dashboard/admin')).toBe(
      '/dashboard/admin',
    );
  });
});

describe('normalizeSignInError', () => {
  it('maps invalid credentials', () => {
    expect(
      normalizeSignInError(new Error('Invalid login credentials')),
    ).toBe('Incorrect email or password.');
  });

  it('maps rate limits', () => {
    expect(normalizeSignInError(new Error('Too many requests'))).toContain(
      'Too many sign-in attempts',
    );
  });

  it('maps unconfirmed email', () => {
    expect(normalizeSignInError(new Error('Email not confirmed'))).toContain(
      'confirm your email',
    );
  });
});

describe('password recovery callback helpers', () => {
  it('detects recovery callback from next param', () => {
    expect(isPasswordRecoveryCallback('/change-password')).toBe(true);
    expect(isPasswordRecoveryCallback('/dashboard/admin')).toBe(false);
    expect(isPasswordRecoveryCallback('//evil')).toBe(false);
  });

  it('builds recovery error redirect URL', () => {
    expect(buildRecoveryErrorRedirectUrl('https://app.test', 'recovery_expired')).toBe(
      'https://app.test/change-password?error=recovery_expired',
    );
  });

  it('returns recovery-specific messages', () => {
    expect(getRecoveryErrorMessage('recovery_expired')).toContain('expired');
    expect(getRecoveryErrorMessage('exchange')).toBeNull();
  });

  it('maps recovery errors in sign-in callback messages', () => {
    expect(getAuthCallbackErrorMessage('recovery_exchange')).toContain(
      'reset link',
    );
  });
});

describe('app origin helpers', () => {
  it('builds password recovery redirect with encoded next path', () => {
    const url = buildPasswordRecoveryRedirectUrl('https://college.test');
    expect(url).toBe(
      'https://college.test/auth/callback?next=%2Fchange-password',
    );
  });

  it('prefers NEXT_PUBLIC_APP_URL for origin', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://prod.acadia.test/';
    expect(getAppOrigin()).toBe('https://prod.acadia.test');
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});
