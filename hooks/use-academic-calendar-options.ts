'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
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
};

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
      // undefined  → intentional "no filter, fetch all terms" (hook used without a year arg)
      // null       → "year not yet selected" — do not run
      // ''         → same as null — do not run
      // 'year-xyz' → run with filter
      (academicYearId === undefined ||
        (typeof academicYearId === 'string' && academicYearId.length > 0)),
  });
}

export function useLevelOptions() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['level-options', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Level')
        .select('id, number')
        .eq('tenantId', tenantId!)
        .order('number', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []) as LevelOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
