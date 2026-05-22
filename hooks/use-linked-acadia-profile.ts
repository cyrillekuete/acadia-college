'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchStaffProfileIdForUser,
  fetchStudentEnrollmentSummary,
  fetchStudentProfileIdForUser,
  type StudentEnrollmentSummary,
} from '@/lib/supabase/queries/profile-links';

export type LinkedAcadiaProfile = {
  staffProfileId: string | null;
  studentProfileId: string | null;
  enrollment: StudentEnrollmentSummary | null;
};

export function useLinkedAcadiaProfile(options?: {
  includeEnrollment?: boolean;
}) {
  const includeEnrollment = options?.includeEnrollment ?? false;
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.authUser?.id ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useQuery({
    queryKey: [
      'linked-acadia-profile',
      tenantId,
      userId,
      includeEnrollment ? activeYearId : null,
    ],
    queryFn: async (): Promise<LinkedAcadiaProfile> => {
      const supabase = requireBrowserClient();
      const [staffProfileId, studentProfileId] = await Promise.all([
        fetchStaffProfileIdForUser(supabase, tenantId!, userId!),
        fetchStudentProfileIdForUser(supabase, tenantId!, userId!),
      ]);

      let enrollment: StudentEnrollmentSummary | null = null;
      if (includeEnrollment && studentProfileId && activeYearId) {
        enrollment = await fetchStudentEnrollmentSummary(
          supabase,
          tenantId!,
          studentProfileId,
          activeYearId,
        );
      }

      return { staffProfileId, studentProfileId, enrollment };
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !!userId &&
      (!includeEnrollment || !!activeYearId),
  });
}
