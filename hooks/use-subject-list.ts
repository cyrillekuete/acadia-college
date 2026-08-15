'use client';

import { useQuery } from '@tanstack/react-query';
import { type CatalogFilters } from '@/lib/acadia/education-system';
import { requireBrowserClient } from '@/lib/supabase/client';
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
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const isDefaultFilters = !filters.subSystem && !filters.branch;

  return useQuery({
    queryKey: ['subject-list', tenantId, filters.subSystem, filters.branch],
    queryFn: async (): Promise<SubjectListRowView[]> => {
      const supabase = requireBrowserClient();
      return fetchSubjectList(supabase, tenantId!, filters);
    },
    initialData: isDefaultFilters ? initialData : undefined,
    staleTime: 60_000,
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
