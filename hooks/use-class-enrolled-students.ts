'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchStudentsFromEnrollmentsForClassIds } from '@/lib/supabase/queries/students-list';

export function useClassEnrolledStudents(
  classId: string | null,
  options?: { includeWithdrawn?: boolean },
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const includeWithdrawn = options?.includeWithdrawn === true;

  return useQuery({
    queryKey: [
      'class-enrolled-students',
      tenantId,
      activeYearId,
      classId,
      includeWithdrawn,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchStudentsFromEnrollmentsForClassIds(
        supabase,
        tenantId!,
        activeYearId!,
        [classId!],
        { includeWithdrawn },
      );
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      Boolean(activeYearId && classId),
    staleTime: 30_000,
  });
}
