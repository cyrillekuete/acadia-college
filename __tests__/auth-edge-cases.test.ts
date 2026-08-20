import { describe, expect, it, vi } from 'vitest';
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
import {
  clearStaleSupabaseSession,
  getSupabaseUserOrClearStaleSession,
  isStaleRefreshTokenError,
} from '@/lib/auth/stale-session';
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

  it('fails when role is unknown or trashed', () => {
    const unknown = validateAcadiaProfile(
      activeProfile({ UserRole: { slug: 'unknown', name: 'Unknown' } }),
    );
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.errorCode).toBe('profile_role');
    }

    const trashed = validateAcadiaProfile(
      activeProfile({
        UserRole: { slug: 'admin', name: 'Admin', isTrashed: true },
      }),
    );
    expect(trashed.ok).toBe(false);
    if (!trashed.ok) {
      expect(trashed.errorCode).toBe('profile_role');
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

describe('stale Supabase session helpers', () => {
  it('detects refresh_token_not_found by code', () => {
    expect(
      isStaleRefreshTokenError({
        code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      }),
    ).toBe(true);
  });

  it('detects invalid refresh token by message', () => {
    expect(
      isStaleRefreshTokenError(new Error('Invalid Refresh Token: Refresh Token Not Found')),
    ).toBe(true);
  });

  it('ignores unrelated auth errors', () => {
    expect(
      isStaleRefreshTokenError({
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      }),
    ).toBe(false);
  });

  it('clears stale sessions and returns null user', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: {
            code: 'refresh_token_not_found',
            message: 'Invalid Refresh Token: Refresh Token Not Found',
          },
        }),
        signOut,
      },
    };

    const user = await getSupabaseUserOrClearStaleSession(
      supabase as never,
    );

    expect(user).toBeNull();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('returns user when session is valid', async () => {
    const mockUser = { id: 'user-1' };
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
        signOut: vi.fn(),
      },
    };

    const user = await getSupabaseUserOrClearStaleSession(
      supabase as never,
    );

    expect(user).toBe(mockUser);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('swallows sign-out failures during stale cleanup', async () => {
    const supabase = {
      auth: {
        signOut: vi.fn().mockRejectedValue(new Error('sign out failed')),
      },
    };

    await expect(clearStaleSupabaseSession(supabase as never)).resolves.toBeUndefined();
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

  it('maps unconfirmed email without asking the user to verify', () => {
    expect(normalizeSignInError(new Error('Email not confirmed'))).toContain(
      'Contact an administrator',
    );
    expect(normalizeSignInError(new Error('Email not confirmed'))).not.toContain(
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
