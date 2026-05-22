'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchSubjectIdsForLevel } from '@/lib/supabase/queries/subject-levels';
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
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  levelId: string;
  academicYearId: string | null;
  termId: string | null;
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
      filters.subSystem,
      filters.branch,
      filters.academicYearId ?? null,
    ],
    queryFn: async (): Promise<SubjectForClassOption[]> => {
      const supabase = requireBrowserClient();
      const linkedIds = await fetchSubjectIdsForLevel(supabase, tenantId!, levelId);

      let query = supabase
        .from('Subject')
        .select(
          `
          id,
          code,
          nameEn,
          subSystem,
          branch,
          levelId,
          academicYearId,
          termId,
          Term!Subject_semesterId_tenantId_fkey ( academicYearId )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('subSystem', filters.subSystem)
        .eq('branch', filters.branch)
        .is('deactivatedAt', null)
        .order('code', { ascending: true });

      if (linkedIds.length > 0) {
        const primaryFilter = `levelId.eq.${levelId}`;
        const linkedFilter = `id.in.(${linkedIds.join(',')})`;
        query = query.or(`${primaryFilter},${linkedFilter}`);
      } else {
        query = query.eq('levelId', levelId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const seen = new Set<string>();

      return (data ?? [])
        .filter((row) => {
          const subject = row as SubjectRow;
          const id = subject.id as string;
          if (seen.has(id)) {
            return false;
          }
          if (!subjectMatchesAcademicYear(subject, filters.academicYearId)) {
            return false;
          }
          const matchesLevel =
            subject.levelId === levelId || linkedIds.includes(id);
          if (!matchesLevel) {
            return false;
          }
          seen.add(id);
          return true;
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
