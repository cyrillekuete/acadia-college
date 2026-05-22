'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type LevelCatalogOption = {
  id: string;
  number: number;
  name: string;
  labelEn: string | null;
  labelFr: string | null;
};

/** Levels for a sub-system + branch stream. */
export function useLevelsForStream(
  subSystem?: AcademicSubSystem | null,
  branch?: AcademicBranch | null,
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['level-for-stream', tenantId, subSystem, branch],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Level')
        .select('id, number, name, labelEn, labelFr')
        .eq('tenantId', tenantId!)
        .order('number', { ascending: true });

      if (subSystem) {
        query = query.eq('subSystem', subSystem);
      }
      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data ?? []) as LevelCatalogOption[];
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !!subSystem &&
      !!branch,
  });
}

export function useClassesForFilters(filters?: {
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
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useStudentProfileOptions(search?: string) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['student-profile-options', tenantId, search],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('StudentProfile')
        .select('id, registrationNumber, User!StudentProfile_userId_tenantId_fkey ( name, email )')
        .eq('tenantId', tenantId!)
        .eq('isActive', true)
        .order('registrationNumber', { ascending: true })
        .limit(50);
      if (search?.trim()) {
        query = query.ilike('registrationNumber', `%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
