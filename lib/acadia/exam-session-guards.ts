import { assertSequenceBelongsToYear, isDateWithinYearBounds } from '@/lib/acadia/academic-year-guards';

export const SEQUENCE_EXAM_TYPES = ['NORMAL', 'RESIT'] as const;
export const MAJOR_EXAM_TYPES = ['GCE', 'BEPC', 'PROBATOIRE', 'BACCALAUREAT'] as const;

export type ExamScheduleStatus = 'upcoming' | 'inProgress' | 'past';

export type ExamSessionDuplicateRow = {
  id: string;
  type: string;
  academicYearId: string;
  subjectId: string;
  sequenceId?: string | null;
};

export type ExamSessionIdentityFields = {
  subjectId: string;
  termId: string;
  sequenceId?: string | null;
  type: string;
};

export type ExamSessionDeleteBlockers = {
  marks: number;
  finalized: boolean;
};

export function requiresSequence(type: string): boolean {
  return type === 'NORMAL' || type === 'RESIT';
}

export function isMajorExamTypeValue(type: string): boolean {
  return (MAJOR_EXAM_TYPES as readonly string[]).includes(type);
}

export function examSessionDuplicateKey(row: {
  type: string;
  academicYearId: string;
  subjectId: string;
  sequenceId?: string | null;
}): string {
  if (isMajorExamTypeValue(row.type)) {
    return `${row.type}::${row.academicYearId}::${row.subjectId}`;
  }
  return `${row.type}::${row.academicYearId}::${row.subjectId}::${row.sequenceId?.trim() || ''}`;
}

export function findDuplicateExamSession(
  candidate: ExamSessionDuplicateRow,
  existing: ExamSessionDuplicateRow[],
  ignoreId?: string | null,
): ExamSessionDuplicateRow | null {
  const key = examSessionDuplicateKey(candidate);
  return (
    existing.find((row) => {
      if (ignoreId && row.id === ignoreId) {
        return false;
      }
      return examSessionDuplicateKey(row) === key;
    }) ?? null
  );
}

export function assertExamSessionUnique(input: {
  candidate: ExamSessionDuplicateRow;
  existing: ExamSessionDuplicateRow[];
  ignoreId?: string | null;
}): void {
  const duplicate = findDuplicateExamSession(
    input.candidate,
    input.existing,
    input.ignoreId,
  );
  if (duplicate) {
    throw new Error(
      'An exam session of this type already exists for this subject.',
    );
  }
}

export function assertExamSessionPlacement(input: {
  academicYearId: string;
  termId: string;
  termAcademicYearId: string;
  type: string;
  sequenceId?: string | null;
  sequenceTermId?: string | null;
  sequenceAcademicYearId?: string | null;
}): void {
  if (input.termAcademicYearId !== input.academicYearId) {
    throw new Error('Term must belong to the selected academic year.');
  }

  const sequenceId = input.sequenceId?.trim() || '';
  if (requiresSequence(input.type) && !sequenceId) {
    throw new Error('Sequence is required for sequence and resit exams.');
  }
  if (!sequenceId) {
    return;
  }
  if (!input.sequenceTermId || input.sequenceTermId !== input.termId) {
    throw new Error('Sequence must belong to the selected term.');
  }
  assertSequenceBelongsToYear({
    sequenceAcademicYearId: input.sequenceAcademicYearId ?? '',
    termAcademicYearId: input.termAcademicYearId,
  });
}

export function assertExamSessionDates(input: {
  startsOn: string;
  endsOn: string;
  yearStartsOn?: string | null;
  yearEndsOn?: string | null;
  examPeriodOpensOn?: string | null;
  examPeriodClosesOn?: string | null;
}): void {
  if (input.endsOn < input.startsOn) {
    throw new Error('End date must be on or after the start date.');
  }

  if (input.yearStartsOn && input.yearEndsOn) {
    const startInYear = isDateWithinYearBounds(
      input.startsOn,
      input.yearStartsOn,
      input.yearEndsOn,
    );
    const endInYear = isDateWithinYearBounds(
      input.endsOn,
      input.yearStartsOn,
      input.yearEndsOn,
    );
    if (!startInYear || !endInYear) {
      throw new Error(
        `Dates must fall within the academic year (${input.yearStartsOn}–${input.yearEndsOn}).`,
      );
    }
  }

  const opensOn = input.examPeriodOpensOn?.trim() || null;
  const closesOn = input.examPeriodClosesOn?.trim() || null;
  if (!opensOn && !closesOn) {
    return;
  }
  if (opensOn && input.startsOn < opensOn) {
    throw new Error(
      `Dates must fall within the exam period (${opensOn}–${closesOn ?? '…'}).`,
    );
  }
  if (closesOn && input.endsOn > closesOn) {
    throw new Error(
      `Dates must fall within the exam period (${opensOn ?? '…'}–${closesOn}).`,
    );
  }
}

export function examSessionIdentityChanged(
  current: ExamSessionIdentityFields,
  next: ExamSessionIdentityFields,
): boolean {
  return (
    current.subjectId !== next.subjectId ||
    current.termId !== next.termId ||
    (current.sequenceId?.trim() || '') !== (next.sequenceId?.trim() || '') ||
    current.type !== next.type
  );
}

export function assertExamSessionUpdateAllowed(input: {
  finalizedAt: string | null | undefined;
  markCount: number;
  current: ExamSessionIdentityFields;
  next: ExamSessionIdentityFields;
}): void {
  if (input.finalizedAt) {
    throw new Error('This exam session is finalized and cannot be edited.');
  }
  if (input.markCount > 0 && examSessionIdentityChanged(input.current, input.next)) {
    throw new Error(
      'Subject, term, sequence, and type cannot change after marks have been entered.',
    );
  }
}

export function hasExamSessionDeleteBlockers(
  blockers: ExamSessionDeleteBlockers,
): boolean {
  return blockers.finalized || blockers.marks > 0;
}

export function formatExamSessionDeleteBlockers(
  blockers: ExamSessionDeleteBlockers,
): string[] {
  const lines: string[] = [];
  if (blockers.finalized) {
    lines.push('the session is finalized');
  }
  if (blockers.marks > 0) {
    lines.push(`${blockers.marks} mark(s)`);
  }
  return lines;
}

export function buildExamSessionDeleteBlockedMessage(
  blockers: ExamSessionDeleteBlockers,
): string {
  const lines = formatExamSessionDeleteBlockers(blockers);
  if (lines.length === 0) {
    return 'This exam session cannot be deleted.';
  }
  return `This exam session cannot be deleted until these are removed:\n• ${lines.join('\n• ')}`;
}

export function examScheduleStatus(
  startsOn: string,
  endsOn: string,
  today: string,
): ExamScheduleStatus {
  if (today < startsOn) {
    return 'upcoming';
  }
  if (today > endsOn) {
    return 'past';
  }
  return 'inProgress';
}
