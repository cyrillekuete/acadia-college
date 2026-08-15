'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { seededInitialData } from '@/lib/acadia/cache/tags';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchClassList,
  type ClassListRow,
} from '@/lib/supabase/queries/class-list';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type { ClassListRow };

export type CachedListSeed<T> = {
  data: T;
  yearId?: string | null;
};

export function useClassList(
  filters?: {
    subSystem?: AcademicSubSystem | null;
    branch?: AcademicBranch | null;
    levelId?: string | null;
  },
  seed?: CachedListSeed<ClassListRow[]>,
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const isDefaultFilters =
    !filters?.subSystem && !filters?.branch && !filters?.levelId;

  return useQuery({
    queryKey: [
      'class-list',
      tenantId,
      activeYearId,
      filters?.subSystem ?? null,
      filters?.branch ?? null,
      filters?.levelId ?? null,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchClassList(supabase, tenantId!, activeYearId, filters);
    },
    initialData: isDefaultFilters
      ? seededInitialData(seed?.data, seed?.yearId, activeYearId)
      : undefined,
    staleTime: 60_000,
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export type ClassOption = {
  id: string;
  name: string;
  levelId: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
};

export function useClassOptions(filters?: {
  subSystem?: AcademicSubSystem | null;
  branch?: AcademicBranch | null;
  levelId?: string | null;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: [
      'class-options',
      tenantId,
      filters?.subSystem ?? null,
      filters?.branch ?? null,
      filters?.levelId ?? null,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Class')
        .select('id, name, levelId, subSystem, branch')
        .eq('tenantId', tenantId!)
        .eq('status', 'ACTIVE')
        .order('name', { ascending: true });

      if (filters?.subSystem) {
        query = query.eq('subSystem', filters.subSystem);
      }
      if (filters?.branch) {
        query = query.eq('branch', filters.branch);
      }
      if (filters?.levelId) {
        query = query.eq('levelId', filters.levelId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data ?? []) as ClassOption[];
    },
    staleTime: 60_000,
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
