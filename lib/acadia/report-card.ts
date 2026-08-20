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
  buildReportCardOrderNo,
  getGradeRemarks,
  hasGceSubjectCode,
} from '@/lib/acadia/report-card-grading';
import { computeYearAverageForPromotionFromMarks } from '@/lib/acadia/promotion';
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

export type ReportCardGroupingRef = {
  id?: string | null;
  nameEn?: string | null;
  nameFr?: string | null;
  sortOrder?: number | null;
};

export type ReportCardSubjectDef = {
  subjectId: string;
  nameEn: string;
  nameFr?: string | null;
  code: string;
  coefficient: number;
  subjectType: string;
  groupingId?: string | null;
  groupingLabel?: string | null;
  groupingLabelFr?: string | null;
  groupingSortOrder?: number | null;
  requiredSubBranchIds: string[];
};

export type ReportCardSubjectGroup = {
  key: string;
  label: string;
  shortLabel: string;
  remarkName: string;
  subjects: SubjectGrade[];
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
  preferFrenchNames?: boolean;
  transferredFrom?: { className: string; enrolledAt?: string | null } | null;
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
  term: number,
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
  for (const [termNumber, scores] of termScores.entries()) {
    const avg = averageScores(scores);
    if (avg != null) {
      termAverages[`term${termNumber}`] = avg;
    }
  }
  const orderedTermAverages = Array.from(
    { length: structure.termsPerYear },
    (_, index) => termAverages[`term${index + 1}`],
  );

  return {
    sequences,
    termAverages,
    annualAverage: averageScores(orderedTermAverages),
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
  const termKey = `term${term}`;
  const fromMap = subject.termAverages?.[termKey];
  if (typeof fromMap === 'number') {
    return fromMap;
  }
  if (term === '1') {
    return subject.term1 ?? subject.termAverage ?? null;
  }
  if (term === '2') {
    return subject.term2 ?? subject.termAverage ?? null;
  }
  if (term === '3') {
    return subject.term3 ?? subject.termAverage ?? null;
  }
  return subject.termAverage ?? null;
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
  preferFrench = false,
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
  const subjectName = preferFrench
    ? subject.nameFr?.trim() || subject.nameEn
    : subject.nameEn;

  return {
    subjectName,
    subjectId: subject.subjectId,
    code: subject.code,
    coefficient,
    plannedCoefficient: planned,
    hasMark,
    coefEligible: hasMark,
    category: subjectTypeToCategory(subject.subjectType),
    groupingId: subject.groupingId?.trim() || undefined,
    groupingLabel: preferFrench
      ? subject.groupingLabelFr?.trim() || subject.groupingLabel?.trim() || undefined
      : subject.groupingLabel?.trim() || subject.groupingLabelFr?.trim() || undefined,
    groupingSortOrder:
      typeof subject.groupingSortOrder === 'number' ? subject.groupingSortOrder : undefined,
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

  const periodTerms: ReportCardTerm[] = [
    ...Array.from({ length: Math.max(structure.termsPerYear, 3) }, (_, index) =>
      String(index + 1),
    ),
    'annual',
  ];
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
        bundle.preferFrenchNames === true,
      ),
    )
    .sort(compareReportCardSubjects);

  const totals = computeWeightedTotals(
    subjects.map((subject) => ({
      average: subject.termAverage ?? null,
      plannedCoefficient: subject.plannedCoefficient ?? subject.coefficient,
    })),
  );

  const periodAvgs = averagesByPeriod.get(term) ?? new Map();
  const values = Array.from(periodAvgs.values());
  const passedCount = values.filter((avg) => avg >= 10).length;
  const evaluatedCount = values.length;
  const failedCount = evaluatedCount - passedCount;
  const gce = countGcePasses(subjects, term);
  const studentId = bundle.student.studentProfileId;
  const academicTerm = term === 'annual' ? 'annual' : reportCardTermNumber(term);
  const sequenceSlots =
    term === 'annual'
      ? Array.from({ length: structure.sequencesPerYear }, (_, index) => index + 1)
      : getSequenceSlotsForTerm(reportCardTermNumber(term), structure);
  const missingSubjectCount = subjects.filter((subject) => !subject.hasMark).length;
  const scoredSubjectCount = subjects.length - missingSubjectCount;
  const marksStatus =
    subjects.length === 0 || scoredSubjectCount === 0
      ? 'unevaluated'
      : missingSubjectCount > 0
        ? 'incomplete'
        : 'complete';
  const promotion = computeYearAverageForPromotionFromMarks(
    bundle.marks,
    studentId,
    bundle.subjects.map((subject) => ({
      subjectId: subject.subjectId,
      subBranchIds: subject.requiredSubBranchIds,
    })),
    structure,
  );
  const missingSignatures: Array<'classMaster' | 'principal'> = [];
  if (!bundle.classMaster.trim()) missingSignatures.push('classMaster');
  if (!bundle.branding.principalName.trim()) missingSignatures.push('principal');

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
      orderNo: buildReportCardOrderNo({
        yearLabel: bundle.academicYearLabel,
        matricule: bundle.student.matricule,
        term,
        studentProfileId: studentId,
      }),
    },
    subjects,
    totals,
    history: {
      term1: averagesByPeriod.get('1')?.get(studentId),
      term2: averagesByPeriod.get('2')?.get(studentId),
      term3: averagesByPeriod.get('3')?.get(studentId),
      termAverages: Object.fromEntries(
        Array.from({ length: structure.termsPerYear }, (_, index) => {
          const key = String(index + 1);
          return [key, averagesByPeriod.get(key)?.get(studentId)] as const;
        }).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
      ),
      annualAvg: averagesByPeriod.get('annual')?.get(studentId),
      rank1: ranksByPeriod.get('1')?.get(studentId),
      rank2: ranksByPeriod.get('2')?.get(studentId),
      rank3: ranksByPeriod.get('3')?.get(studentId),
      rank: ranksByPeriod.get(term)?.get(studentId),
      promotionAvg: promotion.average,
      promotionStatus: promotion.status,
    },
    stats: {
      classSize: bundle.classSize,
      evaluated: evaluatedCount,
      unevaluated: Math.max(0, bundle.classSize - evaluatedCount),
      maxAvg: evaluatedCount ? Math.max(...values) : 0,
      minAvg: evaluatedCount ? Math.min(...values) : 0,
      passed: passedCount,
      failed: failedCount,
      passPercent: evaluatedCount ? round2((passedCount / evaluatedCount) * 100) : 0,
      failPercent: evaluatedCount ? round2((failedCount / evaluatedCount) * 100) : 0,
      passPercentOfClass: bundle.classSize
        ? round2((passedCount / bundle.classSize) * 100)
        : 0,
      classAvg: averageScores(values) ?? 0,
      ...gce,
    },
    discipline: aggregateDiscipline(bundle.disciplineByTerm, term),
    branding: bundle.branding,
    watermarkUrl: bundle.branding.logoUrl ?? undefined,
    sequenceSlots,
    termSlots: Array.from({ length: structure.termsPerYear }, (_, index) => index + 1),
    preferFrenchNames: bundle.preferFrenchNames === true,
    transferredFrom: bundle.transferredFrom ?? null,
    marksStatus: { status: marksStatus, missingSubjectCount },
    missingSignatures,
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

export function resolveReportCardGrouping(
  classGrouping?: ReportCardGroupingRef | null,
  subjectGrouping?: ReportCardGroupingRef | null,
  options?: { forceUngrouped?: boolean },
): {
  groupingId: string | null;
  groupingLabel: string | null;
  groupingLabelFr: string | null;
  groupingSortOrder: number | null;
} {
  if (options?.forceUngrouped) {
    return {
      groupingId: null,
      groupingLabel: null,
      groupingLabelFr: null,
      groupingSortOrder: null,
    };
  }
  const grouping = classGrouping ?? subjectGrouping;
  const groupingLabel = grouping?.nameEn?.trim() || grouping?.nameFr?.trim() || null;
  const groupingLabelFr = grouping?.nameFr?.trim() || grouping?.nameEn?.trim() || null;
  const groupingId = grouping?.id?.trim() || null;
  return {
    groupingId,
    groupingLabel,
    groupingLabelFr,
    groupingSortOrder: typeof grouping?.sortOrder === 'number' ? grouping.sortOrder : null,
  };
}

function hasConfiguredGrouping(subject: Pick<SubjectGrade, 'groupingId' | 'groupingLabel'>): boolean {
  return Boolean(subject.groupingId || subject.groupingLabel?.trim());
}

export function reportCardSubjectGroupKey(
  subject: SubjectGrade,
  useUngroupedFallback = false,
): string {
  if (subject.groupingId) {
    return `g:${subject.groupingId}`;
  }
  const label = subject.groupingLabel?.trim();
  if (label) {
    return `l:${label.toLowerCase()}`;
  }
  if (useUngroupedFallback) {
    return 'ungrouped';
  }
  return `c:${subject.category ?? 'others'}`;
}

function groupingSortMeta(subject: SubjectGrade): {
  configuredRank: number;
  sortOrder: number;
  label: string;
} {
  const configured = hasConfiguredGrouping(subject);
  const label = configured
    ? subject.groupingLabel?.trim() || categoryFullLabel(subject.category)
    : categoryFullLabel(subject.category);
  const categoryIndex = REPORT_CARD_CATEGORIES.indexOf(subject.category ?? 'others');
  return {
    configuredRank: configured ? 0 : 1,
    sortOrder: configured
      ? (subject.groupingSortOrder ?? 0)
      : categoryIndex < 0
        ? REPORT_CARD_CATEGORIES.length
        : categoryIndex,
    label,
  };
}

export function compareReportCardSubjects(a: SubjectGrade, b: SubjectGrade): number {
  const groupA = groupingSortMeta(a);
  const groupB = groupingSortMeta(b);
  if (groupA.configuredRank !== groupB.configuredRank) {
    return groupA.configuredRank - groupB.configuredRank;
  }
  if (groupA.sortOrder !== groupB.sortOrder) {
    return groupA.sortOrder - groupB.sortOrder;
  }
  const labelCompare = groupA.label.localeCompare(groupB.label);
  if (labelCompare !== 0) {
    return labelCompare;
  }
  return (a.subjectName ?? '').localeCompare(b.subjectName ?? '');
}

export function groupSubjectsForReportCard(subjects: SubjectGrade[]): ReportCardSubjectGroup[] {
  const groups = new Map<string, ReportCardSubjectGroup>();
  const anyConfigured = subjects.some((subject) => hasConfiguredGrouping(subject));

  for (const subject of subjects) {
    const key = reportCardSubjectGroupKey(subject, anyConfigured);
    const existing = groups.get(key);
    if (existing) {
      existing.subjects.push(subject);
      continue;
    }

    const configured = hasConfiguredGrouping(subject);
    const ungroupedFallback = anyConfigured && !configured;
    const label = configured
      ? subject.groupingLabel?.trim() || categoryFullLabel(subject.category)
      : ungroupedFallback
        ? 'Ungrouped'
        : categoryFullLabel(subject.category);
    const shortLabel = configured
      ? subject.groupingLabel?.trim() || categoryShortLabel(subject.category)
      : ungroupedFallback
        ? 'Ungrouped'
        : categoryShortLabel(subject.category);
    const remarkSource = configured
      ? subject.groupingLabel?.trim() || categoryRemarkName(subject.category)
      : ungroupedFallback
        ? 'ungrouped'
        : categoryRemarkName(subject.category);

    groups.set(key, {
      key,
      label,
      shortLabel,
      remarkName: remarkSource.toLowerCase(),
      subjects: [subject],
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const firstA = a.subjects[0];
    const firstB = b.subjects[0];
    if (!firstA || !firstB) {
      return a.label.localeCompare(b.label);
    }
    return compareReportCardSubjects(firstA, firstB);
  });
}

export { branchLabel };
