import { unwrapRelation } from '@/lib/acadia/record-display';
import { examSessionTypeLabel } from '@/lib/acadia/assessment';

export type ExamSessionListStatusFilter = 'all' | 'open' | 'finalized';

export type ExamSessionListFilters = {
  type: string;
  termId: string;
  status: ExamSessionListStatusFilter;
};

export const EMPTY_EXAM_SESSION_LIST_FILTERS: ExamSessionListFilters = {
  type: '',
  termId: '',
  status: 'all',
};

export type ExamSessionListRow = {
  id: string;
  type?: string;
  termId?: string;
  startsOn?: string;
  endsOn?: string;
  finalizedAt?: string | null;
  Subject?: unknown;
  Term?: unknown;
  AcademicSequence?: unknown;
} & Record<string, unknown>;

export function examSessionRowMatchesFilters(
  row: ExamSessionListRow,
  filters: ExamSessionListFilters,
): boolean {
  if (filters.type && row.type !== filters.type) {
    return false;
  }
  if (filters.termId && row.termId !== filters.termId) {
    return false;
  }
  if (filters.status === 'open' && row.finalizedAt) {
    return false;
  }
  if (filters.status === 'finalized' && !row.finalizedAt) {
    return false;
  }
  return true;
}

export function examSessionMatchesSearch(
  row: ExamSessionListRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const subject = unwrapRelation<{ code?: string; nameEn?: string }>(row.Subject);
  const haystack = [
    row.type,
    examSessionTypeLabel(String(row.type ?? '')),
    subject?.code,
    subject?.nameEn,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export const EXAM_SESSION_LIST_SELECT = `
  id,
  type,
  termId,
  sequenceId,
  startsOn,
  endsOn,
  finalizedAt,
  Subject!ExamSession_subjectId_tenantId_fkey ( code, nameEn ),
  Term!ExamSession_semesterId_tenantId_fkey ( number ),
  AcademicSequence:sequenceId ( number )
`;
