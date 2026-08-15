import {
  type AcademicYearStructure,
  buildSequenceDistribution,
  DEFAULT_ACADEMIC_STRUCTURE,
} from '@/lib/acadia/academic-calendar';
import {
  averageScores,
  collapseMarksToSubjectScore,
  rankStudents,
  weightedAverage,
} from '@/lib/acadia/assessment';
import {
  aggregateDiscipline,
  type ClassDisciplineRow,
} from '@/lib/acadia/class-discipline';
import { branchLabel } from '@/lib/acadia/education-system';
import {
  calculateGrade,
  getGradeRemarks,
  hasGceSubjectCode,
} from '@/lib/acadia/report-card-grading';
import {
  isYearSummaryTerm,
  REPORT_CARD_CATEGORIES,
  reportCardTermNumber,
  type ReportCardBranding,
  type ReportCardCategory,
  type ReportCardData,
  type ReportCardTerm,
  type SubjectGrade,
} from '@/lib/acadia/report-card-types';

export type ReportCardSubjectDef = {
  subjectId: string;
  nameEn: string;
  nameFr?: string | null;
  code: string;
  coefficient: number;
  subjectType: string;
  groupingLabel?: string | null;
  requiredSubBranchIds: string[];
};

export type ReportCardMarkRow = {
  studentProfileId: string;
  subjectId: string;
  subjectSubBranchId: string | null;
  totalScore: number | null;
  sequenceNumber: number | null;
  subjectCoefficient: number;
  subBranchCoefficient: number | null;
};

export type ReportCardStudentRow = {
  studentProfileId: string;
  name: string;
  firstName: string;
  lastName: string;
  matricule: string;
  sex: string;
  dob: string;
  pob: string;
  photoUrl?: string;
  speciality?: string;
};

export type ReportCardBundle = {
  student: ReportCardStudentRow;
  classId: string;
  className: string;
  classMaster: string;
  classSize: number;
  academicYearLabel: string;
  structure: AcademicYearStructure;
  subjects: ReportCardSubjectDef[];
  marks: ReportCardMarkRow[];
  branding: ReportCardBranding;
  disciplineByTerm?: ClassDisciplineRow[];
};

export function subjectTypeToCategory(subjectType: string | null | undefined): ReportCardCategory {
  switch (subjectType) {
    case 'LANGUAGES':
      return 'languages';
    case 'RELATED_TRADE_SUBJECTS':
      return 'related_trade_subjects';
    case 'TRADE_SUBJECTS':
      return 'trade_subjects';
    default:
      return 'others';
  }
}

export function getSequenceSlotsForTerm(
  term: 1 | 2 | 3,
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): number[] {
  const { termNumberBySequence } = buildSequenceDistribution(structure);
  return Array.from(termNumberBySequence.entries())
    .filter(([, termNumber]) => termNumber === term)
    .map(([sequenceNumber]) => sequenceNumber)
    .sort((a, b) => a - b);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sequenceKey(n: number): keyof NonNullable<SubjectGrade['sequences']> {
  return `seq${n}` as keyof NonNullable<SubjectGrade['sequences']>;
}

function collapseSequenceScore(
  marks: ReportCardMarkRow[],
  requiredSubBranchIds: string[],
): number | null {
  return collapseMarksToSubjectScore(
    marks.map((mark) => ({
      totalScore: mark.totalScore,
      subjectSubBranchId: mark.subjectSubBranchId,
      subjectCoefficient: mark.subjectCoefficient,
      subBranchCoefficient: mark.subBranchCoefficient,
    })),
    requiredSubBranchIds,
  );
}

export function buildSubjectSequenceScores(
  marks: ReportCardMarkRow[],
  subject: ReportCardSubjectDef,
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): {
  sequences: NonNullable<SubjectGrade['sequences']>;
  termAverages: NonNullable<SubjectGrade['termAverages']>;
  annualAverage: number | null;
} {
  const { termNumberBySequence } = buildSequenceDistribution(structure);
  const bySequence = new Map<number, ReportCardMarkRow[]>();
  for (const mark of marks) {
    if (mark.subjectId !== subject.subjectId || mark.sequenceNumber == null) {
      continue;
    }
    const list = bySequence.get(mark.sequenceNumber) ?? [];
    list.push(mark);
    bySequence.set(mark.sequenceNumber, list);
  }

  const sequences: NonNullable<SubjectGrade['sequences']> = {};
  const termScores = new Map<number, number[]>();

  for (const [sequenceNumber, rows] of bySequence.entries()) {
    const score = collapseSequenceScore(rows, subject.requiredSubBranchIds);
    if (score == null) {
      continue;
    }
    sequences[sequenceKey(sequenceNumber)] = score;
    const termNumber = termNumberBySequence.get(sequenceNumber);
    if (termNumber == null) {
      continue;
    }
    const list = termScores.get(termNumber) ?? [];
    list.push(score);
    termScores.set(termNumber, list);
  }

  const termAverages: NonNullable<SubjectGrade['termAverages']> = {};
  const term1 = averageScores(termScores.get(1) ?? []);
  const term2 = averageScores(termScores.get(2) ?? []);
  const term3 = averageScores(termScores.get(3) ?? []);
  if (term1 != null) termAverages.term1 = term1;
  if (term2 != null) termAverages.term2 = term2;
  if (term3 != null) termAverages.term3 = term3;

  return {
    sequences,
    termAverages,
    annualAverage: averageScores([term1, term2, term3]),
  };
}

function activeSubjectAverage(
  subject: Pick<
    SubjectGrade,
    'termAverages' | 'annualAverage' | 'termAverage' | 'term1' | 'term2' | 'term3'
  >,
  term: ReportCardTerm,
): number | null {
  if (isYearSummaryTerm(term)) {
    return subject.annualAverage ?? subject.termAverage ?? null;
  }
  if (term === '1') {
    return subject.termAverages?.term1 ?? subject.term1 ?? subject.termAverage ?? null;
  }
  if (term === '2') {
    return subject.termAverages?.term2 ?? subject.term2 ?? subject.termAverage ?? null;
  }
  return subject.termAverages?.term3 ?? subject.term3 ?? subject.termAverage ?? null;
}

export function computeWeightedTotals(
  subjects: Array<{
    average: number | null;
    plannedCoefficient: number;
  }>,
): { coefficient: number; totalScore: number; average: number } {
  const items = subjects
    .filter(
      (row): row is { average: number; plannedCoefficient: number } =>
        row.average != null && row.plannedCoefficient > 0,
    )
    .map((row) => ({
      score: row.average,
      coefficient: row.plannedCoefficient,
    }));
  const coefficient = items.reduce((sum, item) => sum + item.coefficient, 0);
  const totalScore = items.reduce((sum, item) => sum + item.score * item.coefficient, 0);
  return {
    coefficient: round2(coefficient),
    totalScore: round2(totalScore),
    average: weightedAverage(items) ?? 0,
  };
}

export function countGcePasses(subjects: SubjectGrade[], term: ReportCardTerm) {
  const isPassed = (subject: SubjectGrade) => {
    const avg = activeSubjectAverage(subject, term);
    return (
      (subject.coefficient ?? 0) > 0 &&
      hasGceSubjectCode(subject.code) &&
      avg != null &&
      avg >= 10
    );
  };

  const byCategory = (category: ReportCardCategory) =>
    subjects.filter((subject) => subject.category === category && isPassed(subject)).length;

  return {
    gceTradeSubjects: byCategory('trade_subjects'),
    gceRelatedTrade: byCategory('related_trade_subjects'),
    gceLanguageSubjects: byCategory('languages'),
    gceOtherSubjects: byCategory('others'),
    gceSubjectsPassed: subjects.filter(isPassed).length,
  };
}

function toSubjectGrade(
  subject: ReportCardSubjectDef,
  scores: ReturnType<typeof buildSubjectSequenceScores>,
  term: ReportCardTerm,
  rank?: number,
): SubjectGrade {
  const activeAvg = activeSubjectAverage(
    { termAverages: scores.termAverages, annualAverage: scores.annualAverage ?? undefined },
    term,
  );
  const hasMark = activeAvg != null;
  const planned = subject.coefficient > 0 ? subject.coefficient : 1;
  const coefficient = hasMark ? planned : 0;
  const grade = hasMark ? calculateGrade(activeAvg) : '';
  const remarks = hasMark ? getGradeRemarks(grade) : '';

  return {
    subjectName: subject.nameEn,
    subjectId: subject.subjectId,
    code: subject.code,
    coefficient,
    plannedCoefficient: planned,
    hasMark,
    coefEligible: hasMark,
    category: subjectTypeToCategory(subject.subjectType),
    groupingLabel: subject.groupingLabel?.trim() || undefined,
    sequences: scores.sequences,
    termAverages: scores.termAverages,
    seq1: scores.sequences.seq1,
    seq2: scores.sequences.seq2,
    seq3: scores.sequences.seq3,
    seq4: scores.sequences.seq4,
    seq5: scores.sequences.seq5,
    seq6: scores.sequences.seq6,
    term1: scores.termAverages.term1,
    term2: scores.termAverages.term2,
    term3: scores.termAverages.term3,
    termAverage: activeAvg ?? undefined,
    annualAverage: scores.annualAverage ?? undefined,
    grade,
    rank,
    remarks,
  };
}

export function studentPeriodAverage(
  subjects: ReportCardSubjectDef[],
  marks: ReportCardMarkRow[],
  studentProfileId: string,
  term: ReportCardTerm,
  structure: AcademicYearStructure,
): number | null {
  const studentMarks = marks.filter((mark) => mark.studentProfileId === studentProfileId);
  const rows = subjects.map((subject) => {
    const scores = buildSubjectSequenceScores(studentMarks, subject, structure);
    return {
      average: activeSubjectAverage(
        { termAverages: scores.termAverages, annualAverage: scores.annualAverage ?? undefined },
        term,
      ),
      plannedCoefficient: subject.coefficient > 0 ? subject.coefficient : 1,
    };
  });
  const totals = computeWeightedTotals(rows);
  return totals.coefficient > 0 ? totals.average : null;
}

export function studentSequenceAverage(
  subjects: ReportCardSubjectDef[],
  marks: ReportCardMarkRow[],
  studentProfileId: string,
  sequenceNumber: number,
  structure: AcademicYearStructure,
): number | null {
  const studentMarks = marks.filter((mark) => mark.studentProfileId === studentProfileId);
  const rows = subjects.map((subject) => {
    const scores = buildSubjectSequenceScores(studentMarks, subject, structure);
    return {
      average: scores.sequences[sequenceKey(sequenceNumber)] ?? null,
      plannedCoefficient: subject.coefficient > 0 ? subject.coefficient : 1,
    };
  });
  const totals = computeWeightedTotals(rows);
  return totals.coefficient > 0 ? totals.average : null;
}

export function buildReportCardData(
  bundle: ReportCardBundle,
  term: ReportCardTerm,
): ReportCardData {
  const structure = bundle.structure;
  const cohortIds = [...new Set(bundle.marks.map((mark) => mark.studentProfileId))];
  if (!cohortIds.includes(bundle.student.studentProfileId)) {
    cohortIds.push(bundle.student.studentProfileId);
  }

  const periodTerms: ReportCardTerm[] = ['1', '2', '3', 'annual'];
  const averagesByPeriod = new Map<ReportCardTerm, Map<string, number>>();
  for (const period of periodTerms) {
    const map = new Map<string, number>();
    for (const studentId of cohortIds) {
      const avg = studentPeriodAverage(
        bundle.subjects,
        bundle.marks,
        studentId,
        period,
        structure,
      );
      if (avg != null) {
        map.set(studentId, avg);
      }
    }
    averagesByPeriod.set(period, map);
  }

  const ranksByPeriod = new Map<ReportCardTerm, Map<string, number>>();
  for (const period of periodTerms) {
    const ranked = rankStudents(
      Array.from(averagesByPeriod.get(period)?.entries() ?? []).map(
        ([studentProfileId, average]) => ({ studentProfileId, average }),
      ),
    );
    ranksByPeriod.set(
      period,
      new Map(ranked.map((row) => [row.studentProfileId, row.rank])),
    );
  }

  const studentMarks = bundle.marks.filter(
    (mark) => mark.studentProfileId === bundle.student.studentProfileId,
  );

  const subjectRanks = new Map<string, number>();
  for (const subject of bundle.subjects) {
    const entries = cohortIds.flatMap((studentId) => {
      const scores = buildSubjectSequenceScores(
        bundle.marks.filter((mark) => mark.studentProfileId === studentId),
        subject,
        structure,
      );
      const average = activeSubjectAverage(
        { termAverages: scores.termAverages, annualAverage: scores.annualAverage ?? undefined },
        term,
      );
      return average == null ? [] : [{ studentProfileId: studentId, average }];
    });
    const ranked = rankStudents(entries);
    const mine = ranked.find((row) => row.studentProfileId === bundle.student.studentProfileId);
    if (mine) {
      subjectRanks.set(subject.subjectId, mine.rank);
    }
  }

  const subjects = bundle.subjects
    .map((subject) =>
      toSubjectGrade(
        subject,
        buildSubjectSequenceScores(studentMarks, subject, structure),
        term,
        subjectRanks.get(subject.subjectId),
      ),
    )
    .sort((a, b) => {
      const catA = REPORT_CARD_CATEGORIES.indexOf(a.category ?? 'others');
      const catB = REPORT_CARD_CATEGORIES.indexOf(b.category ?? 'others');
      if (catA !== catB) return catA - catB;
      return (a.subjectName ?? '').localeCompare(b.subjectName ?? '');
    });

  const totals = computeWeightedTotals(
    subjects.map((subject) => ({
      average: subject.termAverage ?? null,
      plannedCoefficient: subject.plannedCoefficient ?? subject.coefficient,
    })),
  );

  const periodAvgs = averagesByPeriod.get(term) ?? new Map();
  const values = Array.from(periodAvgs.values());
  const passedCount = values.filter((avg) => avg >= 10).length;
  const gce = countGcePasses(subjects, term);
  const studentId = bundle.student.studentProfileId;
  const academicTerm = term === 'annual' ? 'annual' : reportCardTermNumber(term);
  const sequenceSlots =
    term === 'annual' ? [] : getSequenceSlotsForTerm(reportCardTermNumber(term), structure);

  return {
    student: {
      id: bundle.student.studentProfileId,
      studentId: bundle.student.matricule,
      name: bundle.student.name,
      firstName: bundle.student.firstName,
      lastName: bundle.student.lastName,
      sex: bundle.student.sex || '—',
      dob: bundle.student.dob || '—',
      pob: bundle.student.pob || '—',
      class: bundle.className,
      className: bundle.className,
      classMaster: bundle.classMaster,
      enrollment: bundle.classSize,
      photoUrl: bundle.student.photoUrl,
      speciality: bundle.student.speciality || branchLabel(undefined),
    },
    academic: {
      year: bundle.academicYearLabel,
      term: academicTerm,
      orderNo: `REF-${new Date().getFullYear()}`,
    },
    subjects,
    totals,
    history: {
      term1: averagesByPeriod.get('1')?.get(studentId),
      term2: averagesByPeriod.get('2')?.get(studentId),
      term3: averagesByPeriod.get('3')?.get(studentId),
      annualAvg: averagesByPeriod.get('annual')?.get(studentId),
      rank1: ranksByPeriod.get('1')?.get(studentId),
      rank2: ranksByPeriod.get('2')?.get(studentId),
      rank3: ranksByPeriod.get('3')?.get(studentId),
      rank: ranksByPeriod.get(term)?.get(studentId),
    },
    stats: {
      classSize: bundle.classSize,
      maxAvg: values.length ? Math.max(...values) : 0,
      minAvg: values.length ? Math.min(...values) : 0,
      passed: passedCount,
      passPercent: values.length ? round2((passedCount / values.length) * 100) : 0,
      classAvg: averageScores(values) ?? 0,
      ...gce,
    },
    discipline: aggregateDiscipline(bundle.disciplineByTerm, term),
    branding: bundle.branding,
    watermarkUrl: bundle.branding.logoUrl ?? undefined,
    sequenceSlots,
  };
}

export function formatGceCount(value: number | undefined): string {
  const safeInt = Number.isFinite(value) ? Math.max(0, Math.trunc(value ?? 0)) : 0;
  return safeInt.toString().padStart(2, '0');
}

export function categoryShortLabel(category: string | undefined): string {
  switch (category) {
    case 'languages':
      return 'LANGUAGES';
    case 'related_trade_subjects':
      return 'R.T.S';
    case 'trade_subjects':
      return 'TRADE SUBJECTS';
    default:
      return 'OTHER SUBJECTS';
  }
}

export function categoryFullLabel(category: string | undefined): string {
  switch (category) {
    case 'languages':
      return 'LANGUAGES';
    case 'related_trade_subjects':
      return 'RELATED TRADE SUBJECTS';
    case 'trade_subjects':
      return 'TRADE SUBJECTS';
    default:
      return 'OTHER SUBJECTS';
  }
}

export function categoryRemarkName(category: string | undefined): string {
  switch (category) {
    case 'languages':
      return 'languages';
    case 'related_trade_subjects':
      return 'related trade subjects';
    case 'trade_subjects':
      return 'trade subjects';
    default:
      return 'other subjects';
  }
}

export { branchLabel };
