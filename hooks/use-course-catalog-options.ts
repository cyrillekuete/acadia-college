'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type StaffOption = {
  id: string;
  staffCode: string | null;
  User: { name: string | null } | { name: string | null }[] | null;
};

export type RoomOption = {
  id: string;
  code: string;
  nameEn: string;
};

export type CourseOption = {
  id: string;
  code: string;
  nameEn: string;
};

export function useStaffOptions() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['staff-options', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StaffProfile')
        .select('id, staffCode, User:userId ( name )')
        .eq('tenantId', tenantId!)
        .eq('isActive', true)
        .order('staffCode', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []) as StaffOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useRoomOptions() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['room-options', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Room')
        .select('id, code, nameEn')
        .eq('tenantId', tenantId!)
        .eq('isActive', true)
        .order('code', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []) as RoomOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useCourseOptions(academicYearId?: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['course-options', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Course')
        .select('id, code, nameEn, termId, Term:termId ( academicYearId )')
        .eq('tenantId', tenantId!)
        .is('deactivatedAt', null)
        .order('code', { ascending: true });

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      const rows = (data ?? []) as (CourseOption & {
        Term?: { academicYearId?: string } | { academicYearId?: string }[] | null;
      })[];

      if (!academicYearId) {
        return rows.map(({ id, code, nameEn }) => ({ id, code, nameEn }));
      }

      return rows
        .filter((row) => {
          const term = Array.isArray(row.Term) ? row.Term[0] : row.Term;
          return term?.academicYearId === academicYearId;
        })
        .map(({ id, code, nameEn }) => ({ id, code, nameEn }));
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function staffDisplayLabel(staff: StaffOption): string {
  const user = Array.isArray(staff.User) ? staff.User[0] : staff.User;
  const name = user?.name?.trim();
  if (name && staff.staffCode) {
    return `${name} (${staff.staffCode})`;
  }
  return name ?? staff.staffCode ?? staff.id;
}
