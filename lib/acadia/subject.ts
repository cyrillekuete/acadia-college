import type { SubjectType } from '@/lib/acadia/subject-catalog';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { SubjectFormValues } from '@/lib/acadia/subject-schemas';

/** Placeholder values for legacy DB columns not collected in the subject form. */
const DEFAULT_SUBJECT_CREDITS = 1;
const DEFAULT_SUBJECT_HOURS = 1;

export function buildSubjectRow(
  tenantId: string,
  id: string,
  values: SubjectFormValues,
  now: string,
  subjectType: SubjectType = 'OTHERS',
) {
  const groupingId = values.groupingId?.trim() || null;
  return {
    id,
    tenantId,
    code: values.code.trim().toUpperCase(),
    nameEn: values.nameEn.trim(),
    nameFr: (values.nameFr?.trim() || values.nameEn.trim()),
    credits: DEFAULT_SUBJECT_CREDITS,
    hours: DEFAULT_SUBJECT_HOURS,
    subSystem: values.subSystem,
    branch: values.branch,
    levelId: values.levelIds[0],
    academicYearId: values.academicYearId,
    termId: null as string | null,
    subjectType,
    coefficient: values.coefficient,
    groupingId,
    hasSubBranches: values.hasSubBranches,
    deactivatedAt: null as string | null,
    updatedAt: now,
  };
}

export type SubjectRecordInput = SubjectFormValues & {
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
};

export function canEditSubject(deactivatedAt: string | null | undefined): boolean {
  return !deactivatedAt;
}

export function normalizeGroupingId(groupingId: string | undefined | null): string | null {
  const trimmed = groupingId?.trim();
  return trimmed ? trimmed : null;
}

export const UNGROUPED_SUBJECT_FILTER = '__none__';

export type SubjectStatusFilter = 'active' | 'inactive' | 'all';

export type SubjectListFilters = {
  status: SubjectStatusFilter;
  groupingId: string | null;
  levelId: string | null;
  termId: string | null;
  allYears: boolean;
};

export const DEFAULT_SUBJECT_LIST_FILTERS: SubjectListFilters = {
  status: 'active',
  groupingId: null,
  levelId: null,
  termId: null,
  allYears: false,
};

export function rowMatchesSubjectListFilters(
  row: {
    deactivatedAt: string | null;
    groupingId?: string | null;
    levelId?: string;
    levelIds?: string[];
    termId?: string | null;
  },
  filters: SubjectListFilters,
): boolean {
  if (filters.status === 'active' && row.deactivatedAt) {
    return false;
  }
  if (filters.status === 'inactive' && !row.deactivatedAt) {
    return false;
  }
  if (filters.groupingId === UNGROUPED_SUBJECT_FILTER) {
    if (row.groupingId) {
      return false;
    }
  } else if (filters.groupingId && row.groupingId !== filters.groupingId) {
    return false;
  }
  if (filters.levelId && row.levelId !== filters.levelId) {
    const extra = row.levelIds ?? [];
    if (!extra.includes(filters.levelId)) {
      return false;
    }
  }
  if (filters.termId && row.termId != null && row.termId !== filters.termId) {
    return false;
  }
  return true;
}
