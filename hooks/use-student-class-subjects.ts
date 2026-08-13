'use client';

import { useQuery } from '@tanstack/react-query';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchClassSubjectDisplayRows } from '@/lib/supabase/queries/class-subjects';

export function useStudentClassSubjects() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const profileQuery = useLinkedAcadiaProfile({ includeEnrollment: true });
  const classId = profileQuery.data?.enrollment?.classId ?? null;

  const subjectsQuery = useQuery({
    queryKey: ['student-class-subjects', tenantId, classId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchClassSubjectDisplayRows(supabase, tenantId!, classId!);
    },
    enabled:
      !!classId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  return {
    linkedProfile: profileQuery.data,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.isError,
    subjects: subjectsQuery.data ?? [],
    subjectsLoading: subjectsQuery.isLoading,
    subjectsError: subjectsQuery.isError,
    subjectsErrorValue: subjectsQuery.error,
  };
}
