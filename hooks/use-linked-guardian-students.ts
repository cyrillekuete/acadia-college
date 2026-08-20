'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchLinkedStudentsForGuardian,
  type LinkedGuardianStudent,
} from '@/lib/supabase/queries/profile-links';

export function useLinkedGuardianStudents(options?: { enabled?: boolean }) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.authUser?.id ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const queryEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['linked-guardian-students', tenantId, userId, activeYearId],
    queryFn: async (): Promise<LinkedGuardianStudent[]> => {
      const supabase = requireBrowserClient();
      return fetchLinkedStudentsForGuardian(
        supabase,
        tenantId!,
        userId!,
        activeYearId!,
      );
    },
    enabled:
      queryEnabled &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !!userId &&
      !!activeYearId,
  });
}
