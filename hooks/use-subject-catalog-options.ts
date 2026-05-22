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

export type SubjectOption = {
  id: string;
  code: string;
  nameEn: string;
  subSystem?: string | null;
};

export function useStaffOptions(options?: { enabled?: boolean }) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const queryEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['staff-options', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StaffProfile')
        .select('id, staffCode, User!StaffProfile_userId_tenantId_fkey ( name )')
        .eq('tenantId', tenantId!)
        .eq('isActive', true)
        .order('id', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []) as StaffOption[];
    },
    enabled:
      queryEnabled && isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
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

export function useSubjectOptions(academicYearId?: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['subject-options', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const query = supabase
        .from('Subject')
        .select('id, code, nameEn, subSystem, termId, academicYearId, Term!Subject_semesterId_tenantId_fkey ( academicYearId )')
        .eq('tenantId', tenantId!)
        .is('deactivatedAt', null)
        .order('code', { ascending: true });

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      const rows = (data ?? []) as (SubjectOption & {
        termId: string | null;
        academicYearId: string | null;
        Term?: { academicYearId?: string } | { academicYearId?: string }[] | null;
      })[];

      if (!academicYearId) {
        return rows.map(({ id, code, nameEn, subSystem }) => ({
          id,
          code,
          nameEn,
          subSystem,
        }));
      }

      return rows
        .filter((row) => {
          if (!row.termId) {
            return row.academicYearId === academicYearId;
          }
          const term = Array.isArray(row.Term) ? row.Term[0] : row.Term;
          return term?.academicYearId === academicYearId;
        })
        .map(({ id, code, nameEn, subSystem }) => ({ id, code, nameEn, subSystem }));
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
