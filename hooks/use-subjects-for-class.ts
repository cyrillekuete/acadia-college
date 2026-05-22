'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import {
  subjectMatchesClass,
  type ClassSubjectEligibilityClass,
  type ClassSubjectEligibilitySubject,
} from '@/lib/acadia/class-subject-eligibility';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchSubjectLevelIdsBatch,
} from '@/lib/supabase/queries/subject-levels';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type SubjectSubBranchOption = {
  id: string;
  name: string;
  nameFr: string | null;
};

export type SubjectForClassOption = {
  id: string;
  code: string;
  nameEn: string;
  hasSubBranches: boolean;
  subBranches: SubjectSubBranchOption[];
  groupingId: string | null;
  groupingNameEn: string | null;
};

type SubjectRow = {
  id: string;
  code: string;
  nameEn: string;
  hasSubBranches: boolean;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  levelId: string;
  groupingId: string | null;
  academicYearId: string | null;
  termId: string | null;
  deactivatedAt: string | null;
  Term?: ClassSubjectEligibilitySubject['Term'];
  SubjectGrouping?: { nameEn?: string | null } | { nameEn?: string | null }[] | null;
  SubjectSubBranch?: {
    id: string;
    name: string;
    nameFr: string | null;
    sortOrder: number;
  }[] | null;
};

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
      const classRow: ClassSubjectEligibilityClass = {
        id: '',
        levelId,
        subSystem: filters.subSystem,
        branch: filters.branch,
      };

      const { data, error } = await supabase
        .from('Subject')
        .select(
          `
          id,
          code,
          nameEn,
          hasSubBranches,
          subSystem,
          branch,
          levelId,
          groupingId,
          academicYearId,
          termId,
          deactivatedAt,
          Term!Subject_semesterId_tenantId_fkey ( academicYearId ),
          SubjectGrouping!Subject_groupingId_tenantId_fkey ( nameEn ),
          SubjectSubBranch ( id, name, nameFr, sortOrder )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('subSystem', filters.subSystem)
        .eq('branch', filters.branch)
        .is('deactivatedAt', null)
        .order('code', { ascending: true });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as SubjectRow[];
      const levelIdsBySubject = await fetchSubjectLevelIdsBatch(
        supabase,
        tenantId!,
        rows.map((row) => row.id),
      );

      const options: SubjectForClassOption[] = [];

      for (const subjectRow of rows) {
        const levelIds = levelIdsBySubject.get(subjectRow.id) ?? [];
        const subject: ClassSubjectEligibilitySubject = {
          id: subjectRow.id,
          subSystem: subjectRow.subSystem,
          branch: subjectRow.branch,
          levelId: subjectRow.levelId,
          levelIds: levelIds.length > 0 ? levelIds : [subjectRow.levelId],
          academicYearId: subjectRow.academicYearId,
          termId: subjectRow.termId,
          deactivatedAt: subjectRow.deactivatedAt,
          Term: subjectRow.Term,
        };

        if (
          !subjectMatchesClass(subject, classRow, {
            academicYearId: filters.academicYearId,
          })
        ) {
          continue;
        }

        const subBranches = Array.isArray(subjectRow.SubjectSubBranch)
          ? [...subjectRow.SubjectSubBranch].sort((a, b) => a.sortOrder - b.sortOrder)
          : [];

        const groupingRel = subjectRow.SubjectGrouping;
        const groupingNameEn = Array.isArray(groupingRel)
          ? groupingRel[0]?.nameEn ?? null
          : groupingRel?.nameEn ?? null;

        options.push({
          id: subjectRow.id,
          code: subjectRow.code,
          nameEn: subjectRow.nameEn,
          hasSubBranches: subjectRow.hasSubBranches && subBranches.length > 0,
          subBranches: subBranches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            nameFr: branch.nameFr,
          })),
          groupingId: subjectRow.groupingId ?? null,
          groupingNameEn: groupingNameEn?.trim() || null,
        });
      }

      return options;
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      levelId.length > 0,
  });
}
