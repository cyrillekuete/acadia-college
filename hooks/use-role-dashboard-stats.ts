'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchGuardianDashboardStats,
  fetchStaffDashboardStats,
  fetchStudentDashboardStats,
  type GuardianDashboardStats,
  type StaffDashboardStats,
  type StudentDashboardStats,
} from '@/lib/supabase/queries/role-dashboard';

function useRoleDashboardBase<T>(
  queryKey: string,
  entityId: string | null | undefined,
  queryFn: () => Promise<T>,
  extraEnabled = true,
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useQuery({
    queryKey: [queryKey, tenantId, activeYearId, entityId],
    queryFn,
    enabled:
      extraEnabled &&
      !!entityId &&
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useStaffDashboardStats() {
  const { data: linkedProfile } = useLinkedAcadiaProfile();
  const staffProfileId = linkedProfile?.staffProfileId ?? null;
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useRoleDashboardBase<StaffDashboardStats>(
    'staff-dashboard-stats',
    staffProfileId,
    async () => {
      const supabase = requireBrowserClient();
      return fetchStaffDashboardStats(
        supabase,
        tenantId!,
        activeYearId!,
        staffProfileId!,
      );
    },
    !!staffProfileId,
  );
}

export function useStudentDashboardStats() {
  const { data: linkedProfile } = useLinkedAcadiaProfile();
  const studentProfileId = linkedProfile?.studentProfileId ?? null;
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useRoleDashboardBase<StudentDashboardStats>(
    'student-dashboard-stats',
    studentProfileId,
    async () => {
      const supabase = requireBrowserClient();
      return fetchStudentDashboardStats(
        supabase,
        tenantId!,
        activeYearId!,
        studentProfileId!,
      );
    },
    !!studentProfileId,
  );
}

export function useGuardianDashboardStats() {
  const { data: session } = useAcadiaCollegeSession();
  const guardianUserId = session?.profile?.id ?? null;
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useRoleDashboardBase<GuardianDashboardStats>(
    'guardian-dashboard-stats',
    guardianUserId,
    async () => {
      const supabase = requireBrowserClient();
      return fetchGuardianDashboardStats(
        supabase,
        tenantId!,
        activeYearId!,
        guardianUserId!,
      );
    },
    !!guardianUserId,
  );
}
