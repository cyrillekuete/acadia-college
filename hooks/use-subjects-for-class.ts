'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type SubjectForClassOption = {
  id: string;
  code: string;
  nameEn: string;
};

type SubjectRow = {
  id: string;
  code: string;
  nameEn: string;
  specialtyId: string;
  academicYearId: string | null;
  termId: string | null;
  Specialty?: {
    subSystem?: AcademicSubSystem;
    branch?: AcademicBranch;
  } | null;
  Term?: { academicYearId?: string } | { academicYearId?: string }[] | null;
};

function subjectMatchesAcademicYear(
  row: SubjectRow,
  academicYearId: string | null | undefined,
): boolean {
  if (!academicYearId) {
    return true;
  }
  if (!row.termId) {
    return row.academicYearId === academicYearId;
  }
  const term = unwrapRelation<{ academicYearId?: string }>(row.Term);
  return term?.academicYearId === academicYearId;
}

export function useSubjectsForClass(filters: {
  levelId?: string;
  specialtyId?: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  academicYearId?: string | null;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const levelId = filters.levelId?.trim() ?? '';

  return useQuery({
    queryKey: [
      'subjects-for-class',
      tenantId,
      levelId,
      filters.specialtyId ?? null,
      filters.subSystem,
      filters.branch,
      filters.academicYearId ?? null,
    ],
    queryFn: async (): Promise<SubjectForClassOption[]> => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Subject')
        .select(
          `
          id,
          code,
          nameEn,
          specialtyId,
          academicYearId,
          termId,
          Specialty!Subject_specialtyId_tenantId_fkey ( subSystem, branch ),
          Term!Subject_semesterId_tenantId_fkey ( academicYearId )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('levelId', levelId)
        .is('deactivatedAt', null)
        .order('code', { ascending: true });

      if (error) {
        throw error;
      }

      const specialtyId = filters.specialtyId?.trim() || '';

      return (data ?? [])
        .filter((row) => {
          const subject = row as SubjectRow;
          if (!subjectMatchesAcademicYear(subject, filters.academicYearId)) {
            return false;
          }
          if (specialtyId) {
            return subject.specialtyId === specialtyId;
          }
          const specialty = unwrapRelation<{
            subSystem?: AcademicSubSystem;
            branch?: AcademicBranch;
          }>(subject.Specialty);
          return (
            specialty?.subSystem === filters.subSystem &&
            specialty?.branch === filters.branch
          );
        })
        .map((row) => ({
          id: row.id as string,
          code: row.code as string,
          nameEn: row.nameEn as string,
        }));
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      levelId.length > 0,
  });
}
