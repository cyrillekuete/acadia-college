import {
  getDashboardPathForRole,
  isKnownAcadiaRole,
} from '@/lib/auth/dashboard-routes';
import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';
import { UserStatus } from '@/app/models/user';

export type AcadiaProfileGateFailure = {
  ok: false;
  message: string;
  errorCode: string;
  shouldSignOut: boolean;
};

export type AcadiaProfileGateSuccess = {
  ok: true;
  profile: AcadiaUserProfile;
  roleSlug: string;
  dashboardPath: string;
};

export type AcadiaProfileGateResult =
  | AcadiaProfileGateSuccess
  | AcadiaProfileGateFailure;

export function validateAcadiaProfile(
  profile: AcadiaUserProfile | null,
  options?: { queryFailed?: boolean },
): AcadiaProfileGateResult {
  if (options?.queryFailed) {
    return {
      ok: false,
      errorCode: 'profile_query',
      message:
        'Could not load your Acadia College profile. Check your connection and try again.',
      shouldSignOut: false,
    };
  }

  if (!profile) {
    return {
      ok: false,
      errorCode: 'profile_missing',
      message:
        'Your account is not linked to an Acadia College profile. Contact an administrator.',
      shouldSignOut: true,
    };
  }

  if (profile.isTrashed) {
    return {
      ok: false,
      errorCode: 'profile_trashed',
      message: 'This account has been deactivated. Contact an administrator.',
      shouldSignOut: true,
    };
  }

  if (profile.status === UserStatus.BLOCKED) {
    return {
      ok: false,
      errorCode: 'profile_blocked',
      message: 'This account has been blocked. Contact an administrator.',
      shouldSignOut: true,
    };
  }

  if (profile.status === UserStatus.INACTIVE) {
    return {
      ok: false,
      errorCode: 'profile_inactive',
      message:
        'This account is not active yet. Contact an administrator if you need access.',
      shouldSignOut: true,
    };
  }

  if (profile.status !== UserStatus.ACTIVE) {
    return {
      ok: false,
      errorCode: 'profile_status',
      message: 'This account cannot sign in. Contact an administrator.',
      shouldSignOut: true,
    };
  }

  if (!profile.tenantId) {
    return {
      ok: false,
      errorCode: 'profile_no_tenant',
      message:
        'Your account is not assigned to an institution. Contact an administrator.',
      shouldSignOut: true,
    };
  }

  const roleSlug = profile.UserRole?.slug ?? null;

  if (!roleSlug || profile.UserRole?.isTrashed || !isKnownAcadiaRole(roleSlug)) {
    return {
      ok: false,
      errorCode: 'profile_role',
      message:
        'Your account is not linked to a valid Acadia College role. Contact an administrator.',
      shouldSignOut: true,
    };
  }

  const dashboardPath = getDashboardPathForRole(roleSlug);
  if (!dashboardPath) {
    return {
      ok: false,
      errorCode: 'profile_dashboard',
      message:
        'Your role is not configured for dashboard access. Contact an administrator.',
      shouldSignOut: true,
    };
  }

  return {
    ok: true,
    profile,
    roleSlug,
    dashboardPath,
  };
}
