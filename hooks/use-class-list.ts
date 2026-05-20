'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type ClassListRow = {
  id: string;
  name: string;
  levelId: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  specialtyId: string | null;
  staffProfileId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  Level?: { name?: string; number?: number } | null;
  StaffProfile?: { User?: { name?: string | null } | null } | null;
  enrollmentCount: number;
  subjectCount: number;
};

export function useClassList(filters?: {
  subSystem?: AcademicSubSystem | null;
  branch?: AcademicBranch | null;
  levelId?: string | null;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: [
      'class-list',
      tenantId,
      filters?.subSystem ?? null,
      filters?.branch ?? null,
      filters?.levelId ?? null,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Class')
        .select(
          `
          id,
          name,
          levelId,
          subSystem,
          branch,
          specialtyId,
          staffProfileId,
          status,
          createdAt,
          Level:levelId ( name, number ),
          StaffProfile:staffProfileId ( User:userId ( name ) )
        `,
        )
        .eq('tenantId', tenantId!)
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

      const { data: classes, error } = await query;
      if (error) {
        throw error;
      }

      const rows = classes ?? [];
      if (rows.length === 0) {
        return [] as ClassListRow[];
      }

      const classIds = rows.map((r) => r.id as string);

      const [{ data: enrollments }, { data: classSubjects }] = await Promise.all([
        supabase
          .from('StudentEnrollment')
          .select('classId')
          .eq('tenantId', tenantId!)
          .in('classId', classIds),
        supabase
          .from('ClassSubject')
          .select('classId')
          .eq('tenantId', tenantId!)
          .in('classId', classIds),
      ]);

      const enrollmentByClass = new Map<string, number>();
      for (const row of enrollments ?? []) {
        const id = row.classId as string;
        if (id) {
          enrollmentByClass.set(id, (enrollmentByClass.get(id) ?? 0) + 1);
        }
      }

      const subjectsByClass = new Map<string, number>();
      for (const row of classSubjects ?? []) {
        const id = row.classId as string;
        subjectsByClass.set(id, (subjectsByClass.get(id) ?? 0) + 1);
      }

      return rows.map((row) => ({
        ...(row as Omit<ClassListRow, 'enrollmentCount' | 'subjectCount'>),
        enrollmentCount: enrollmentByClass.get(row.id as string) ?? 0,
        subjectCount: subjectsByClass.get(row.id as string) ?? 0,
      })) as ClassListRow[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export type ClassOption = {
  id: string;
  name: string;
  levelId: string;
  specialtyId: string | null;
};

export function useClassOptions(filters?: {
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
        .select('id, name, levelId, specialtyId')
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
      return (data ?? []) as ClassOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
