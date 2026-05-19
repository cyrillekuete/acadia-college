'use client';

import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { validateAcadiaProfile } from '@/lib/auth/acadia-profile-gate';
import { createClientOrNull } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { fetchAcadiaUserProfile } from '@/lib/supabase/queries/user';
import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';

export type AcadiaGateFailure = {
  errorCode: string;
  message: string;
  shouldSignOut: boolean;
};

export type AcadiaCollegeSession = {
  authUser: User | null;
  profile: AcadiaUserProfile | null;
  roleSlug: string | null;
  tenantId: string | null;
  /** Profile query failed (network/RLS), distinct from a missing row. */
  profileLoadFailed: boolean;
  /** Set when the profile gate rejects the account (blocked, missing role, etc.). */
  gateFailure: AcadiaGateFailure | null;
};

export const EMPTY_ACADIA_SESSION: AcadiaCollegeSession = {
  authUser: null,
  profile: null,
  roleSlug: null,
  tenantId: null,
  profileLoadFailed: false,
  gateFailure: null,
};

/** Session fetch finished and user has a linked Acadia profile. */
export function isAcadiaSessionReady(
  isLoading: boolean,
  isError: boolean,
  session: AcadiaCollegeSession | undefined,
): boolean {
  return (
    !isLoading &&
    !isError &&
    !!session?.authUser &&
    !!session.profile &&
    !!session.roleSlug &&
    !!session.tenantId &&
    !session.profileLoadFailed &&
    !session.gateFailure
  );
}

/** Ready session with a tenant scope for tenant-scoped queries. */
export function hasAcadiaTenantContext(
  isLoading: boolean,
  isError: boolean,
  session: AcadiaCollegeSession | undefined,
): boolean {
  return isAcadiaSessionReady(isLoading, isError, session) && !!session?.tenantId;
}

/** Gate for React Query: session ready and `tenantId` is a non-empty string. */
export function isAcadiaTenantQueryEnabled(
  isLoading: boolean,
  isError: boolean,
  session: AcadiaCollegeSession | undefined,
  tenantId: string | null,
): boolean {
  return (
    isSupabaseConfigured() &&
    hasAcadiaTenantContext(isLoading, isError, session) &&
    tenantId !== null
  );
}

export function useAcadiaCollegeSession() {
  return useQuery({
    queryKey: ['acadia-college-session'],
    queryFn: async (): Promise<AcadiaCollegeSession> => {
      const supabase = createClientOrNull();
      if (!supabase) {
        return EMPTY_ACADIA_SESSION;
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return EMPTY_ACADIA_SESSION;
      }

      const fetchResult = await fetchAcadiaUserProfile(supabase, user.id);

      if (fetchResult.status === 'error') {
        return {
          authUser: user,
          profile: null,
          roleSlug: null,
          tenantId: null,
          profileLoadFailed: true,
          gateFailure: null,
        };
      }

      const profile =
        fetchResult.status === 'ok' ? fetchResult.profile : null;
      const gate = validateAcadiaProfile(profile);

      if (!gate.ok) {
        return {
          authUser: user,
          profile: profile ?? null,
          roleSlug: null,
          tenantId: profile?.tenantId ?? null,
          profileLoadFailed: false,
          gateFailure: {
            errorCode: gate.errorCode,
            message: gate.message,
            shouldSignOut: gate.shouldSignOut,
          },
        };
      }

      return {
        authUser: user,
        profile: gate.profile,
        roleSlug: gate.roleSlug,
        tenantId: gate.profile.tenantId,
        profileLoadFailed: false,
        gateFailure: null,
      };
    },
    staleTime: 60_000,
  });
}
