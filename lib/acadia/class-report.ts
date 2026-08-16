import {
  averageScores,
  isPassingScore,
  rankStudents,
} from '@/lib/acadia/assessment';
import { sanitizeReportCardFilenamePart } from '@/lib/acadia/report-card-grading';
import {
  studentPeriodAverage,
  studentSequenceAverage,
  type ReportCardMarkRow,
  type ReportCardSubjectDef,
} from '@/lib/acadia/report-card';
import type { AcademicYearStructure } from '@/lib/acadia/academic-calendar';
import type { ReportCardBranding, ReportCardTerm } from '@/lib/acadia/report-card-types';

export type ClassReportPeriodKind = 'sequence' | 'term' | 'annual';

export type ClassReportPeriod =
  | { kind: 'sequence'; sequenceNumber: number }
  | { kind: 'term'; term: Exclude<ReportCardTerm, 'annual'> }
  | { kind: 'annual' };

export type ClassReportStudent = {
  studentProfileId: string;
  name: string;
  matricule: string;
};

export type ClassReportRankedStudent = ClassReportStudent & {
  average: number;
  rank: number;
  passed: boolean;
};

export type ClassReportBundle = {
  classId: string;
  className: string;
  classMaster: string;
  academicYearLabel: string;
  structure: AcademicYearStructure;
  subjects: ReportCardSubjectDef[];
  marks: ReportCardMarkRow[];
  students: ClassReportStudent[];
  branding: ReportCardBranding;
};

export type ClassReportData = {
  classId: string;
  className: string;
  classMaster: string;
  academicYearLabel: string;
  period: ClassReportPeriod;
  periodLabelEn: string;
  periodLabelFr: string;
  generatedAt: string;
  topN: number;
  branding: ReportCardBranding;
  stats: {
    classSize: number;
    evaluated: number;
    unevaluated: number;
    classAvg: number | null;
    maxAvg: number | null;
    minAvg: number | null;
    passed: number;
    failed: number;
    passPercent: number;
    failPercent: number;
  };
  best: ClassReportRankedStudent[];
  worst: ClassReportRankedStudent[];
  top: ClassReportRankedStudent[];
  bottom: ClassReportRankedStudent[];
  ranked: ClassReportRankedStudent[];
  unevaluated: ClassReportStudent[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseClassReportTopN(raw: string | null | undefined): 5 | 10 {
  return raw?.trim() === '10' ? 10 : 5;
}

export function parseClassReportPeriod(input: {
  period?: string | null;
  sequenceNumber?: string | null;
  term?: string | null;
}): ClassReportPeriod | { error: string } {
  const kind = (input.period ?? '').trim().toLowerCase();
  if (kind === 'annual') {
    return { kind: 'annual' };
  }
  if (kind === 'term') {
    const term = (input.term ?? '').trim();
    if (term === '1' || term === '2' || term === '3') {
      return { kind: 'term', term };
    }
    return { error: 'Term is required (1, 2, or 3).' };
  }
  if (kind === 'sequence') {
    const n = Number(input.sequenceNumber);
    if (!Number.isInteger(n) || n < 1) {
      return { error: 'Sequence number is required.' };
    }
    return { kind: 'sequence', sequenceNumber: n };
  }
  return { error: 'Period must be sequence, term, or annual.' };
}

export function classReportPeriodsEqual(
  a: ClassReportPeriod,
  b: ClassReportPeriod,
): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === 'term' && b.kind === 'term') {
    return a.term === b.term;
  }
  if (a.kind === 'sequence' && b.kind === 'sequence') {
    return a.sequenceNumber === b.sequenceNumber;
  }
  return true;
}

export function classReportMatchesSelection(
  data: Pick<ClassReportData, 'classId' | 'period' | 'topN'>,
  selection: { classId: string; period: ClassReportPeriod; topN: number },
): boolean {
  return (
    data.classId === selection.classId &&
    data.topN === selection.topN &&
    classReportPeriodsEqual(data.period, selection.period)
  );
}

export function classReportPeriodLabel(period: ClassReportPeriod): {
  en: string;
  fr: string;
} {
  if (period.kind === 'annual') {
    return { en: 'Annual', fr: 'Annuel' };
  }
  if (period.kind === 'sequence') {
    return {
      en: `Sequence ${period.sequenceNumber}`,
      fr: `Séquence ${period.sequenceNumber}`,
    };
  }
  const terms: Record<'1' | '2' | '3', { en: string; fr: string }> = {
    '1': { en: 'First term', fr: 'Premier trimestre' },
    '2': { en: 'Second term', fr: 'Deuxième trimestre' },
    '3': { en: 'Third term', fr: 'Troisième trimestre' },
  };
  return terms[period.term];
}

export function classReportPeriodSlug(period: ClassReportPeriod): string {
  if (period.kind === 'annual') {
    return 'Annual';
  }
  if (period.kind === 'sequence') {
    return `Seq${period.sequenceNumber}`;
  }
  return `Term${period.term}`;
}

export function buildClassReportPdfFilename(options: {
  className: string;
  year: string;
  period: ClassReportPeriod;
}): string {
  const className = sanitizeReportCardFilenamePart(options.className);
  const year = sanitizeReportCardFilenamePart(options.year);
  const period = sanitizeReportCardFilenamePart(classReportPeriodSlug(options.period));
  return `ClassReport_${className}_${year}_${period}.pdf`;
}

function studentAverageForPeriod(
  bundle: ClassReportBundle,
  studentProfileId: string,
  period: ClassReportPeriod,
): number | null {
  if (period.kind === 'sequence') {
    return studentSequenceAverage(
      bundle.subjects,
      bundle.marks,
      studentProfileId,
      period.sequenceNumber,
      bundle.structure,
    );
  }
  const term: ReportCardTerm = period.kind === 'annual' ? 'annual' : period.term;
  return studentPeriodAverage(
    bundle.subjects,
    bundle.marks,
    studentProfileId,
    term,
    bundle.structure,
  );
}

export function buildClassReport(
  bundle: ClassReportBundle,
  period: ClassReportPeriod,
  options?: { topN?: number; generatedAt?: string },
): ClassReportData {
  const topN = options?.topN === 10 ? 10 : 5;
  const labels = classReportPeriodLabel(period);
  const byId = new Map(bundle.students.map((student) => [student.studentProfileId, student]));

  const averages = new Map<string, number>();
  for (const student of bundle.students) {
    const average = studentAverageForPeriod(bundle, student.studentProfileId, period);
    if (average != null) {
      averages.set(student.studentProfileId, average);
    }
  }

  const rankedEntries = rankStudents(
    Array.from(averages.entries()).map(([studentProfileId, average]) => ({
      studentProfileId,
      average,
    })),
  );

  const ranked: ClassReportRankedStudent[] = rankedEntries.map((row) => {
    const student = byId.get(row.studentProfileId);
    return {
      studentProfileId: row.studentProfileId,
      name: student?.name ?? 'Student',
      matricule: student?.matricule ?? '',
      average: row.average,
      rank: row.rank,
      passed: isPassingScore(row.average),
    };
  });

  const unevaluated = bundle.students
    .filter((student) => !averages.has(student.studentProfileId))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const values = ranked.map((row) => row.average);
  const passed = ranked.filter((row) => row.passed).length;
  const evaluated = ranked.length;
  const failed = evaluated - passed;
  const bestAverage = values[0];
  const worstAverage = values[values.length - 1];
  const sliceN = Math.min(topN, ranked.length);

  return {
    classId: bundle.classId,
    className: bundle.className,
    classMaster: bundle.classMaster,
    academicYearLabel: bundle.academicYearLabel,
    period,
    periodLabelEn: labels.en,
    periodLabelFr: labels.fr,
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
    topN,
    branding: bundle.branding,
    stats: {
      classSize: bundle.students.length,
      evaluated,
      unevaluated: unevaluated.length,
      classAvg: averageScores(values),
      maxAvg: values.length ? Math.max(...values) : null,
      minAvg: values.length ? Math.min(...values) : null,
      passed,
      failed,
      passPercent: evaluated ? round2((passed / evaluated) * 100) : 0,
      failPercent: evaluated ? round2((failed / evaluated) * 100) : 0,
    },
    best:
      bestAverage == null ? [] : ranked.filter((row) => row.average === bestAverage),
    worst:
      worstAverage == null ? [] : ranked.filter((row) => row.average === worstAverage),
    top: ranked.slice(0, sliceN),
    bottom: ranked.slice(ranked.length - sliceN),
    ranked,
    unevaluated,
  };
}
