'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';
import type { StaffOnboardingInput } from '@/lib/acadia/staff-onboarding-schemas';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  completeStaffOnboarding,
  fetchStaffOnboardingStatus,
  type StaffOnboardingStatus,
} from '@/lib/supabase/queries/staff-onboarding';

export function useStaffOnboardingStatus() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.authUser?.id ?? null;
  const roleSlug = session?.roleSlug ?? null;
  const isTeacherStaff =
    isStaffOrTeacher(roleSlug) && !isAdmin(roleSlug);

  return useQuery<StaffOnboardingStatus>({
    queryKey: ['staff-onboarding-status', tenantId, userId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchStaffOnboardingStatus(supabase, tenantId!, userId!);
    },
    enabled:
      isTeacherStaff &&
      !!userId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useStaffOnboardingMutation() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useMutation({
    mutationFn: async (input: StaffOnboardingInput) => {
      const status = queryClient.getQueryData<StaffOnboardingStatus>([
        'staff-onboarding-status',
        tenantId,
        session?.authUser?.id,
      ]);
      const staffProfileId = status?.profile?.staffProfileId;
      if (!tenantId || !staffProfileId) {
        throw new Error('Staff profile not found.');
      }

      const supabase = requireBrowserClient();
      await completeStaffOnboarding(
        supabase,
        tenantId,
        staffProfileId,
        input,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-onboarding-status'] });
    },
  });
}
