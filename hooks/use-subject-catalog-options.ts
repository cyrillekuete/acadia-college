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

export function useClassSubjectOptions(classId: string | null | undefined) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const resolvedClassId = classId?.trim() ?? '';

  return useQuery({
    queryKey: ['class-subject-options', tenantId, resolvedClassId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('ClassSubject')
        .select(
          `
          subjectId,
          Subject!ClassSubject_subjectId_tenantId_fkey ( id, code, nameEn )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('classId', resolvedClassId);

      if (error) {
        throw error;
      }

      const options: SubjectOption[] = [];
      for (const row of data ?? []) {
        const subject = Array.isArray(row.Subject) ? row.Subject[0] : row.Subject;
        if (!subject?.id) {
          continue;
        }
        options.push({
          id: subject.id as string,
          code: subject.code as string,
          nameEn: subject.nameEn as string,
        });
      }

      return options.sort((a, b) => a.code.localeCompare(b.code));
    },
    enabled:
      resolvedClassId.length > 0 &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useSubjectTeacherOptions(
  subjectId: string | null | undefined,
  academicYearId: string | null | undefined,
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const resolvedSubjectId = subjectId?.trim() ?? '';
  const resolvedYearId = academicYearId?.trim() ?? '';

  return useQuery({
    queryKey: [
      'subject-teacher-options',
      tenantId,
      resolvedSubjectId,
      resolvedYearId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SubjectAssignment')
        .select(
          `
          staffProfileId,
          StaffProfile!SubjectAssignment_staffProfileId_tenantId_fkey ( id, staffCode, User!StaffProfile_userId_tenantId_fkey ( name ) )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('subjectId', resolvedSubjectId)
        .eq('academicYearId', resolvedYearId);

      if (error) {
        throw error;
      }

      const options: StaffOption[] = [];
      for (const row of data ?? []) {
        const staff = Array.isArray(row.StaffProfile)
          ? row.StaffProfile[0]
          : row.StaffProfile;
        if (!staff?.id) {
          continue;
        }
        options.push({
          id: staff.id as string,
          staffCode: (staff.staffCode as string | null) ?? null,
          User: staff.User as StaffOption['User'],
        });
      }

      return options.sort((a, b) =>
        staffDisplayLabel(a).localeCompare(staffDisplayLabel(b)),
      );
    },
    enabled:
      resolvedSubjectId.length > 0 &&
      resolvedYearId.length > 0 &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
