'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchClassTeacherAssignments,
  fetchStaffTeachingAssignments,
} from '@/lib/supabase/queries/staff-class-assignments';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export function useClassTeacherAssignments(
  classId: string | null | undefined,
  academicYearId: string | null | undefined,
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const resolvedClassId = classId?.trim() ?? '';
  const resolvedYearId = academicYearId?.trim() ?? '';

  return useQuery({
    queryKey: ['class-teacher-assignments', tenantId, resolvedClassId, resolvedYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchClassTeacherAssignments(
        supabase,
        tenantId!,
        resolvedClassId,
        resolvedYearId,
      );
    },
    enabled:
      resolvedClassId.length > 0 &&
      resolvedYearId.length > 0 &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useStaffTeachingAssignments(
  staffProfileId: string | null | undefined,
  academicYearId: string | null | undefined,
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const resolvedStaffId = staffProfileId?.trim() ?? '';
  const resolvedYearId = academicYearId?.trim() ?? '';

  return useQuery({
    queryKey: ['staff-teaching-assignments', tenantId, resolvedStaffId, resolvedYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchStaffTeachingAssignments(
        supabase,
        tenantId!,
        resolvedStaffId,
        resolvedYearId,
      );
    },
    enabled:
      resolvedStaffId.length > 0 &&
      resolvedYearId.length > 0 &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
