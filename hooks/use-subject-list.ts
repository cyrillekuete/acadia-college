'use client';

import { useQuery } from '@tanstack/react-query';
import { type CatalogFilters } from '@/lib/acadia/education-system';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  fetchSubjectList,
  type SubjectListRow,
  type SubjectListRowView,
  type SubjectSubBranchRow,
} from '@/lib/supabase/queries/subject-list';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type { SubjectListRow, SubjectListRowView, SubjectSubBranchRow };

export function useSubjectList(
  filters: CatalogFilters,
  initialData?: SubjectListRowView[],
  options?: { allYears?: boolean },
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const academicYearId = options?.allYears ? null : activeYearId;
  const isDefaultFilters = !filters.subSystem && !filters.branch && !options?.allYears;

  return useQuery({
    queryKey: [
      'subject-list',
      tenantId,
      filters.subSystem,
      filters.branch,
      academicYearId,
    ],
    queryFn: async (): Promise<SubjectListRowView[]> => {
      const supabase = requireBrowserClient();
      return fetchSubjectList(supabase, tenantId!, filters, {
        academicYearId: academicYearId ?? undefined,
      });
    },
    initialData: isDefaultFilters ? initialData : undefined,
    staleTime: 60_000,
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      (options?.allYears === true || !!academicYearId),
  });
}
