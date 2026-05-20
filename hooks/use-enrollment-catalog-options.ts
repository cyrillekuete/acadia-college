'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type SpecialtyOption = {
  id: string;
  code: string;
  nameEn: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
};

export type LevelForSpecialtyOption = {
  id: string;
  number: number;
  name: string;
  labelEn: string | null;
  labelFr: string | null;
};

export function useSpecialtyOptions(
  subSystem?: AcademicSubSystem | null,
  branch?: AcademicBranch | null,
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['specialty-options', tenantId, subSystem, branch],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Specialty')
        .select('id, code, nameEn, subSystem, branch')
        .eq('tenantId', tenantId!)
        .order('nameEn', { ascending: true });
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
      return (data ?? []) as SpecialtyOption[];
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !!subSystem &&
      !!branch,
  });
}

/** Unified levels filtered by sub-system and branch (no longer per-specialty). */
export function useLevelsForSpecialty(
  specialtyId?: string | null,
  subSystem?: AcademicSubSystem | null,
  branch?: AcademicBranch | null,
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['level-for-specialty', tenantId, specialtyId, subSystem, branch],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let resolvedSubSystem = subSystem;
      let resolvedBranch = branch;

      if (specialtyId && (!resolvedSubSystem || !resolvedBranch)) {
        const { data: specialty, error: specialtyError } = await supabase
          .from('Specialty')
          .select('subSystem, branch')
          .eq('tenantId', tenantId!)
          .eq('id', specialtyId)
          .maybeSingle();
        if (specialtyError) {
          throw specialtyError;
        }
        resolvedSubSystem = specialty?.subSystem ?? resolvedSubSystem;
        resolvedBranch = specialty?.branch ?? resolvedBranch;
      }

      let query = supabase
        .from('Level')
        .select('id, number, name, labelEn, labelFr')
        .eq('tenantId', tenantId!)
        .order('number', { ascending: true });

      if (resolvedSubSystem) {
        query = query.eq('subSystem', resolvedSubSystem);
      }
      if (resolvedBranch) {
        query = query.eq('branch', resolvedBranch);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data ?? []) as LevelForSpecialtyOption[];
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      (!!specialtyId || (!!subSystem && !!branch)),
  });
}

export function useClassesForFilters(filters?: {
  subSystem?: AcademicSubSystem | null;
  branch?: AcademicBranch | null;
  specialtyId?: string | null;
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
      filters?.specialtyId ?? null,
      filters?.levelId ?? null,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Class')
        .select('id, name, levelId, specialtyId, subSystem, branch')
        .eq('tenantId', tenantId!)
        .eq('status', 'ACTIVE')
        .order('name', { ascending: true });

      if (filters?.subSystem) {
        query = query.eq('subSystem', filters.subSystem);
      }
      if (filters?.branch) {
        query = query.eq('branch', filters.branch);
      }
      if (filters?.specialtyId) {
        query = query.eq('specialtyId', filters.specialtyId);
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
