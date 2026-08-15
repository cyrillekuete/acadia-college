'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchLevelList,
  type LevelListRow,
} from '@/lib/supabase/queries/level-list';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type { LevelListRow };

export function useLevelList(
  filters?: {
    subSystem?: AcademicSubSystem | null;
    branch?: AcademicBranch | null;
  },
  initialData?: LevelListRow[],
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const isDefaultFilters = !filters?.subSystem && !filters?.branch;

  return useQuery({
    queryKey: [
      'level-list',
      tenantId,
      filters?.subSystem ?? null,
      filters?.branch ?? null,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchLevelList(supabase, tenantId!, filters);
    },
    initialData: isDefaultFilters ? initialData : undefined,
    staleTime: 60_000,
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
