import {
  type AcademicYearStructure,
  buildSequenceDistribution,
  DEFAULT_ACADEMIC_STRUCTURE,
} from '@/lib/acadia/academic-calendar';
import type {
  ExamSessionFormValues,
  SubjectMarkEntryValues,
} from '@/lib/acadia/assessment-schemas';

export const MAX_MARK_SCORE = 20;
export const PASSING_AVERAGE = 10;

export const EXAM_SESSION_TYPES = [
  'NORMAL',
  'RESIT',
  'GCE',
  'BEPC',
  'PROBATOIRE',
  'BACCALAUREAT',
] as const;

export type ExamSessionType = (typeof EXAM_SESSION_TYPES)[number];

const EXAM_TYPE_LABELS: Record<ExamSessionType, string> = {
  NORMAL: 'Sequence exam',
  RESIT: 'Resit',
  GCE: 'GCE',
  BEPC: 'BEPC',
  PROBATOIRE: 'Probatoire',
  BACCALAUREAT: 'Baccalauréat',
};

export function examSessionTypeLabel(type: string): string {
  return EXAM_TYPE_LABELS[type as ExamSessionType] ?? type;
}

export function isMajorExamType(type: string): boolean {
  return type === 'GCE' || type === 'BEPC' || type === 'PROBATOIRE' || type === 'BACCALAUREAT';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Cameroon sequence mark: average of CA and exam when both are present (/20 each). */
export function computeTotalScore(
  caScore: number | null | undefined,
  examScore: number | null | undefined,
): number | null {
  const hasCa = caScore != null && !Number.isNaN(caScore);
  const hasExam = examScore != null && !Number.isNaN(examScore);
  if (!hasCa && !hasExam) {
    return null;
  }
  if (hasCa && hasExam) {
    return round2((caScore + examScore) / 2);
  }
  return round2(hasCa ? caScore! : examScore!);
}

export function isPassingScore(score: number | null | undefined): boolean {
  return score != null && !Number.isNaN(score) && score >= PASSING_AVERAGE;
}

export function averageScores(scores: (number | null | undefined)[]): number | null {
  const valid = scores.filter(
    (s): s is number => s != null && !Number.isNaN(s),
  );
  if (valid.length === 0) {
    return null;
  }
  const sum = valid.reduce((acc, s) => acc + s, 0);
  return round2(sum / valid.length);
}

export type StudentAverage = {
  studentProfileId: string;
  average: number;
  rank: number;
  courseCount: number;
};

export function rankStudents(
  entries: { studentProfileId: string; average: number; courseCount?: number }[],
): StudentAverage[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.average !== a.average) {
      return b.average - a.average;
    }
    return a.studentProfileId.localeCompare(b.studentProfileId);
  });

  let rank = 0;
  let previousAverage: number | null = null;

  return sorted.map((entry, index) => {
    if (previousAverage === null || entry.average !== previousAverage) {
      rank = index + 1;
      previousAverage = entry.average;
    }
    return {
      studentProfileId: entry.studentProfileId,
      average: entry.average,
      rank,
      courseCount: entry.courseCount ?? 0,
    };
  });
}

export type SubjectMarkSnapshot = {
  studentProfileId: string;
  subjectId: string;
  totalScore: number | null;
  sequenceId?: string | null;
  termId?: string | null;
};

/** Group marks by student and compute per-student subject averages. */
export function computeStudentSubjectAverages(
  marks: SubjectMarkSnapshot[],
): Map<string, number> {
  const byStudent = new Map<string, number[]>();

  for (const mark of marks) {
    if (mark.totalScore == null || Number.isNaN(mark.totalScore)) {
      continue;
    }
    const list = byStudent.get(mark.studentProfileId) ?? [];
    list.push(mark.totalScore);
    byStudent.set(mark.studentProfileId, list);
  }

  const averages = new Map<string, number>();
  Array.from(byStudent.entries()).forEach(([studentId, scores]) => {
    const avg = averageScores(scores);
    if (avg != null) {
      averages.set(studentId, avg);
    }
  });
  return averages;
}

export function computeTermAverageFromSequences(
  sequenceAverages: { sequenceNumber: number; average: number }[],
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): number | null {
  const { termNumberBySequence } = buildSequenceDistribution(structure);
  const byTerm = new Map<number, number[]>();
  for (const row of sequenceAverages) {
    const termNumber = termNumberBySequence.get(row.sequenceNumber);
    if (termNumber == null) {
      continue;
    }
    const list = byTerm.get(termNumber) ?? [];
    list.push(row.average);
    byTerm.set(termNumber, list);
  }
  const all = Array.from(byTerm.values()).flat();
  return averageScores(all);
}

/** Per-term average from sequence-level scores using the year's distribution. */
export function computePerTermAveragesFromSequences(
  sequenceAverages: { sequenceNumber: number; average: number }[],
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): Map<number, number> {
  const { termNumberBySequence } = buildSequenceDistribution(structure);
  const byTerm = new Map<number, number[]>();

  for (const row of sequenceAverages) {
    const termNumber = termNumberBySequence.get(row.sequenceNumber);
    if (termNumber == null) {
      continue;
    }
    const list = byTerm.get(termNumber) ?? [];
    list.push(row.average);
    byTerm.set(termNumber, list);
  }

  const result = new Map<number, number>();
  Array.from(byTerm.entries()).forEach(([termNumber, scores]) => {
    const avg = averageScores(scores);
    if (avg != null) {
      result.set(termNumber, avg);
    }
  });
  return result;
}

export function computeAnnualAverage(termAverages: (number | null)[]): number | null {
  return averageScores(termAverages);
}

export function buildExamSessionRow(
  tenantId: string,
  id: string,
  values: ExamSessionFormValues,
  now: string,
) {
  return {
    id,
    tenantId,
    academicYearId: values.academicYearId,
    subjectId: values.subjectId,
    termId: values.termId,
    sequenceId: values.sequenceId?.trim() ? values.sequenceId : null,
    type: values.type,
    startsOn: values.startsOn,
    endsOn: values.endsOn,
    updatedAt: now,
  };
}

export function buildSubjectMarkRow(
  tenantId: string,
  id: string,
  input: {
    examSessionId: string;
    studentProfileId: string;
    subjectId: string;
    values: SubjectMarkEntryValues;
    enteredByUserId: string;
  },
  now: string,
) {
  const caScore = input.values.caScore ?? null;
  const examScore = input.values.examScore ?? null;
  return {
    id,
    tenantId,
    examSessionId: input.examSessionId,
    studentProfileId: input.studentProfileId,
    subjectId: input.subjectId,
    caScore,
    examScore,
    totalScore: computeTotalScore(caScore, examScore),
    isResitEligible: input.values.isResitEligible ?? false,
    enteredByUserId: input.enteredByUserId,
    updatedAt: now,
  };
}

export function canEditExamSession(finalizedAt: string | null | undefined): boolean {
  return !finalizedAt;
}

export function formatMarkScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(2);
}
