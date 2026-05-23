'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { isStaffOrTeacher, isAdmin } from '@/lib/acadia/roles';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchStudentsForTeacher,
  type TeacherStudentsResult,
} from '@/lib/supabase/queries/teacher-students';

const EMPTY_RESULT: TeacherStudentsResult = {
  students: [],
  scope: { classIds: [], subjectIds: [], pairs: [] },
};

export function useTeacherStudents() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const roleSlug = session?.roleSlug ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const {
    data: linkedProfile,
    isLoading: profileLoading,
  } = useLinkedAcadiaProfile();

  const isTeacherView =
    isStaffOrTeacher(roleSlug) && !isAdmin(roleSlug);
  const staffProfileId = linkedProfile?.staffProfileId ?? null;

  return useQuery({
    queryKey: ['teacher-students', tenantId, activeYearId, staffProfileId],
    queryFn: async (): Promise<TeacherStudentsResult> => {
      if (!tenantId || !activeYearId || !staffProfileId) {
        return EMPTY_RESULT;
      }
      const supabase = requireBrowserClient();
      return fetchStudentsForTeacher(
        supabase,
        tenantId,
        activeYearId,
        staffProfileId,
      );
    },
    enabled:
      isTeacherView &&
      !!activeYearId &&
      !!staffProfileId &&
      !profileLoading &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });
}
