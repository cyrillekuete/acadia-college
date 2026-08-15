import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubjectType } from '@/lib/acadia/subject-catalog';
import type { AcademicBranch, AcademicSubSystem, CatalogFilters } from '@/lib/acadia/education-system';
import { rowMatchesCatalogFilters } from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';

export type SubjectSubBranchRow = {
  id: string;
  name: string;
  nameFr: string | null;
  coefficient: number | null;
  sortOrder: number;
};

export type SubjectListRow = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  subjectType: SubjectType;
  coefficient: number;
  hasSubBranches: boolean;
  deactivatedAt: string | null;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  levelId: string;
  levelIds: string[];
  academicYearId: string | null;
  termId: string | null;
  groupingId: string | null;
  Level?: { labelEn?: string | null; number?: number } | null;
  Term?: { number?: number; academicYearId?: string } | null;
  SubjectGrouping?: { id?: string; nameEn?: string; nameFr?: string } | null;
  SubjectSubBranch?: SubjectSubBranchRow[] | null;
  SubjectLevel?: {
    levelId: string;
    Level?: { labelEn?: string | null; number?: number; name?: string } | null;
  }[] | null;
};

export type SubjectListRowView = SubjectListRow & {
  Level: { labelEn?: string | null; number?: number } | null;
  Term: { number?: number; academicYearId?: string } | null;
  SubjectGrouping: { id?: string; nameEn?: string; nameFr?: string } | null;
  SubjectSubBranch: SubjectSubBranchRow[];
};

export async function fetchSubjectList(
  supabase: SupabaseClient,
  tenantId: string,
  filters?: CatalogFilters,
): Promise<SubjectListRowView[]> {
  const { data, error } = await supabase
    .from('Subject')
    .select(
      `
      id,
      code,
      nameEn,
      nameFr,
      subjectType,
      coefficient,
      hasSubBranches,
      deactivatedAt,
      subSystem,
      branch,
      levelId,
      academicYearId,
      termId,
      groupingId,
      Level!Subject_levelId_tenantId_fkey ( labelEn, number ),
      Term!Subject_semesterId_tenantId_fkey ( number, academicYearId ),
      SubjectGrouping!Subject_groupingId_tenantId_fkey ( id, nameEn, nameFr ),
      SubjectSubBranch ( id, name, nameFr, coefficient, sortOrder ),
      SubjectLevel (
        levelId,
        Level!SubjectLevel_levelId_tenantId_fkey ( labelEn, number )
      )
    `,
    )
    .eq('tenantId', tenantId)
    .order('nameEn', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as SubjectListRow[];
  const mapped = rows.map((row): SubjectListRowView => {
    const level = unwrapRelation<{ labelEn?: string | null; number?: number }>(
      row.Level,
    );
    const term = unwrapRelation<{ number?: number; academicYearId?: string }>(
      row.Term,
    );
    const grouping = unwrapRelation<{ id?: string; nameEn?: string; nameFr?: string }>(
      row.SubjectGrouping,
    );
    const subBranches = Array.isArray(row.SubjectSubBranch)
      ? [...row.SubjectSubBranch].sort((a, b) => a.sortOrder - b.sortOrder)
      : [];
    const subjectLevels = Array.isArray(row.SubjectLevel) ? row.SubjectLevel : [];
    const normalizedSubjectLevels = subjectLevels.map((sl) => ({
      levelId: sl.levelId,
      Level: unwrapRelation<{ labelEn?: string | null; number?: number; name?: string }>(
        sl.Level,
      ),
    }));
    const levelIds = normalizedSubjectLevels.map((sl) => sl.levelId);
    return {
      ...row,
      Level: level,
      Term: term,
      SubjectGrouping: grouping,
      SubjectSubBranch: subBranches,
      SubjectLevel: normalizedSubjectLevels,
      levelIds: levelIds.length > 0 ? levelIds : [row.levelId],
    };
  });

  if (!filters) {
    return mapped;
  }
  return mapped.filter((row) => rowMatchesCatalogFilters(row, filters));
}
