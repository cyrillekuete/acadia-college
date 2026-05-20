'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchCurrentAcademicYear } from '@/lib/supabase/queries/academic-year';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type AcademicYearOption = {
  id: string;
  label: string;
  isCurrent: boolean;
};

export type TermOption = {
  id: string;
  number: number;
  academicYearId: string;
};

export type LevelOption = {
  id: string;
  number: number;
  name: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  labelEn: string | null;
  labelFr: string | null;
};

export function useCurrentAcademicYearOption() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['current-academic-year', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const year = await fetchCurrentAcademicYear(supabase, tenantId!);
      if (!year) {
        return null;
      }
      return {
        id: year.id,
        label: year.label,
        isCurrent: year.isCurrent,
      } satisfies AcademicYearOption;
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useAcademicYearOptions() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['academic-year-options', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('id, label, isCurrent')
        .eq('tenantId', tenantId!)
        .order('startsOn', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []) as AcademicYearOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useTermOptions(academicYearId?: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['term-options', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Term')
        .select('id, number, academicYearId')
        .eq('tenantId', tenantId!)
        .order('number', { ascending: true });
      if (academicYearId) {
        query = query.eq('academicYearId', academicYearId);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data ?? []) as TermOption[];
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      (academicYearId === undefined ||
        (typeof academicYearId === 'string' && academicYearId.length > 0)),
  });
}

export function useLevelOptions(filters?: {
  subSystem?: AcademicSubSystem | null;
  branch?: AcademicBranch | null;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['level-options', tenantId, filters?.subSystem ?? null, filters?.branch ?? null],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Level')
        .select('id, number, name, subSystem, branch, labelEn, labelFr')
        .eq('tenantId', tenantId!)
        .order('sortOrder', { ascending: true })
        .order('number', { ascending: true });

      if (filters?.subSystem) {
        query = query.eq('subSystem', filters.subSystem);
      }
      if (filters?.branch) {
        query = query.eq('branch', filters.branch);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data ?? []) as LevelOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
