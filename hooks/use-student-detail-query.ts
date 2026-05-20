'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { fetchStudentDetail } from '@/lib/supabase/queries/student-detail';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';

export function useStudentDetailQuery(studentId: string | undefined) {
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useQuery({
    queryKey: ['student-detail', tenantId, studentId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const detail = await fetchStudentDetail(
        supabase,
        tenantId!,
        studentId!,
        activeYearId,
      );
      if (!detail) {
        throw new Error('Student not found.');
      }
      return detail;
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, isError, session, tenantId) &&
      !!studentId,
  });
}
