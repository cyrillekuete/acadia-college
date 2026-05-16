'use client';

import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createClientOrNull } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { fetchAcadiaUserProfile } from '@/lib/supabase/queries/user';
import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';

export type AcadiaCollegeSession = {
  authUser: User | null;
  profile: AcadiaUserProfile | null;
  roleSlug: string | null;
  tenantId: string | null;
};

export const EMPTY_ACADIA_SESSION: AcadiaCollegeSession = {
  authUser: null,
  profile: null,
  roleSlug: null,
  tenantId: null,
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
    !!session.roleSlug
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

      const profile = await fetchAcadiaUserProfile(supabase, user.id);

      return {
        authUser: user,
        profile,
        roleSlug: profile?.UserRole?.slug ?? null,
        tenantId: profile?.tenantId ?? null,
      };
    },
    staleTime: 60_000,
  });
}
