import type { AcademicYearStructure } from '@/lib/acadia/academic-calendar';
import { computeYearAverageForPromotionFromMarks } from '@/lib/acadia/promotion';
import {
  buildSubjectSequenceScores,
  type ReportCardMarkRow,
  type ReportCardSubjectDef,
} from '@/lib/acadia/report-card';
import {
  parseReportCardTerm,
  type ReportCardTerm,
} from '@/lib/acadia/report-card-types';

export type PeriodMarkStatus = 'complete' | 'incomplete' | 'unevaluated';

export type MarksPeriod =
  | { kind: 'sequence'; sequenceNumber: number }
  | { kind: 'term'; term: string }
  | { kind: 'annual' };

export type PeriodMarkStatusResult = {
  status: PeriodMarkStatus;
  missingSubjectIds: string[];
  scoredSubjectIds: string[];
};

function sequenceScore(
  scores: ReturnType<typeof buildSubjectSequenceScores>,
  sequenceNumber: number,
): number | null {
  const key = `seq${sequenceNumber}` as keyof typeof scores.sequences;
  const value = scores.sequences[key];
  return typeof value === 'number' ? value : null;
}

function termScore(
  scores: ReturnType<typeof buildSubjectSequenceScores>,
  term: Exclude<ReportCardTerm, 'annual'>,
): number | null {
  const key = `term${term}` as keyof typeof scores.termAverages;
  const value = scores.termAverages[key];
  return typeof value === 'number' ? value : null;
}

export function classReportPeriodToTerm(
  period: MarksPeriod,
): ReportCardTerm | { sequenceNumber: number } {
  if (period.kind === 'annual') {
    return 'annual';
  }
  if (period.kind === 'term') {
    return parseReportCardTerm(period.term);
  }
  return { sequenceNumber: period.sequenceNumber };
}

export function missingSubjectsForPeriod(
  subjects: ReportCardSubjectDef[],
  marks: ReportCardMarkRow[],
  studentProfileId: string,
  period: MarksPeriod,
  structure: AcademicYearStructure,
): PeriodMarkStatusResult {
  const studentMarks = marks.filter((mark) => mark.studentProfileId === studentProfileId);
  const missingSubjectIds: string[] = [];
  const scoredSubjectIds: string[] = [];

  for (const subject of subjects) {
    const scores = buildSubjectSequenceScores(studentMarks, subject, structure);
    let average: number | null = null;
    if (period.kind === 'sequence') {
      average = sequenceScore(scores, period.sequenceNumber);
    } else if (period.kind === 'annual') {
      average = scores.annualAverage;
    } else {
      average = termScore(scores, parseReportCardTerm(period.term));
    }
    if (average == null) {
      missingSubjectIds.push(subject.subjectId);
    } else {
      scoredSubjectIds.push(subject.subjectId);
    }
  }

  let status: PeriodMarkStatus = 'complete';
  if (subjects.length === 0 || scoredSubjectIds.length === 0) {
    status = 'unevaluated';
  } else if (missingSubjectIds.length > 0) {
    status = 'incomplete';
  }

  return { status, missingSubjectIds, scoredSubjectIds };
}

export function promotionAverageForStudent(
  subjects: ReportCardSubjectDef[],
  marks: ReportCardMarkRow[],
  studentProfileId: string,
  structure: AcademicYearStructure,
): { average: number | null; status: 'complete' | 'incomplete' } {
  return computeYearAverageForPromotionFromMarks(
    marks,
    studentProfileId,
    subjects.map((subject) => ({
      subjectId: subject.subjectId,
      subBranchIds: subject.requiredSubBranchIds,
    })),
    structure,
  );
}
