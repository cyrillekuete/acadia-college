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

export function useLevelsForSpecialty(specialtyId?: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['level-for-specialty', tenantId, specialtyId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Level')
        .select('id, number, labelEn, labelFr')
        .eq('tenantId', tenantId!)
        .eq('specialtyId', specialtyId!)
        .order('number', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []) as LevelForSpecialtyOption[];
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !!specialtyId,
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
        .select('id, registrationNumber, User:userId ( name, email )')
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
