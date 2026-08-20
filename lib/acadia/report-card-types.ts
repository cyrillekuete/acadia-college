export type ReportCardTerm = `${number}` | 'annual';

export type ReportCardTemplateId = 'sequence' | 'yearSummary';

export type ReportCardCategory =
  | 'languages'
  | 'related_trade_subjects'
  | 'trade_subjects'
  | 'others';

export const REPORT_CARD_CATEGORIES: ReportCardCategory[] = [
  'languages',
  'related_trade_subjects',
  'trade_subjects',
  'others',
];

export type SubjectGrade = {
  subjectName: string;
  subjectId?: string;
  code?: string;
  coefficient: number;
  plannedCoefficient?: number;
  hasMark?: boolean;
  coefEligible?: boolean;
  category?: ReportCardCategory;
  groupingId?: string;
  groupingLabel?: string;
  groupingSortOrder?: number;
  sequences?: Record<string, number>;
  termAverages?: Record<string, number>;
  seq1?: number;
  seq2?: number;
  seq3?: number;
  seq4?: number;
  seq5?: number;
  seq6?: number;
  termAverage?: number;
  term1?: number;
  term2?: number;
  term3?: number;
  annualAverage?: number;
  grade?: string;
  rank?: number;
  remarks?: string;
};

export type StudentInfo = {
  id: string;
  studentId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  sex: string;
  dob: string;
  pob: string;
  class: string;
  className: string;
  classMaster?: string;
  enrollment: number;
  photoUrl?: string;
  speciality?: string;
};

export type AcademicInfo = {
  year: string;
  term: number | 'annual';
  orderNo: string;
};

export type StatsInfo = {
  classSize: number;
  evaluated?: number;
  unevaluated?: number;
  maxAvg: number;
  minAvg: number;
  passed: number;
  failed: number;
  passPercent: number;
  failPercent: number;
  passPercentOfClass?: number;
  classAvg: number;
  gceTradeSubjects?: number;
  gceRelatedTrade?: number;
  gceLanguageSubjects?: number;
  gceOtherSubjects?: number;
  gceSubjectsPassed?: number;
};

export type DisciplineInfo = {
  absences: number;
  suspensions: number;
  warnings: number;
};

export type HistoryInfo = {
  term1?: number;
  term2?: number;
  term3?: number;
  termAverages?: Record<string, number>;
  annualAvg?: number;
  rank1?: number;
  rank2?: number;
  rank3?: number;
  rank?: number;
  promotionAvg?: number | null;
  promotionStatus?: 'complete' | 'incomplete';
};

export type ReportCardTransferNote = {
  className: string;
  enrolledAt?: string | null;
};

export type ReportCardMarksStatus = {
  status: 'complete' | 'incomplete' | 'unevaluated';
  missingSubjectCount: number;
};

export type ReportCardBranding = {
  displayNameEn: string;
  displayNameFr: string;
  logoUrl: string | null;
  contactLine: string;
  regionEn: string;
  regionFr: string;
  principalName: string;
};

const FALLBACK_INSTITUTION_NAME = 'Acadia College';

/** Bulletin header names come from Institution Name (EN) / Name (FR), not PDF issuer. */
export function resolveReportCardInstitutionNames(tenant: {
  displayNameEn?: string | null;
  displayNameFr?: string | null;
} | null | undefined): Pick<ReportCardBranding, 'displayNameEn' | 'displayNameFr'> {
  const displayNameEn = tenant?.displayNameEn?.trim() || FALLBACK_INSTITUTION_NAME;
  const displayNameFr = tenant?.displayNameFr?.trim() || displayNameEn;
  return { displayNameEn, displayNameFr };
}

export type ReportCardQrInput = {
  studentProfileId: string;
  matricule: string;
  academicYear: string;
  term: AcademicInfo['term'];
};

/** Stable, system-generated bulletin QR unique to each student (and period). */
export function buildReportCardQrValue(input: ReportCardQrInput): string {
  const student = input.studentProfileId.trim() || input.matricule.trim();
  const matricule = input.matricule.trim() || student;
  const term = input.term === 'annual' ? 'annual' : Number(input.term);
  return JSON.stringify({
    kind: 'acadia-bulletin',
    student,
    matricule,
    year: input.academicYear.trim(),
    term,
  });
}

export type ReportCardData = {
  student: StudentInfo;
  academic: AcademicInfo;
  subjects: SubjectGrade[];
  totals: {
    coefficient: number;
    totalScore: number;
    average: number;
  };
  history: HistoryInfo;
  stats: StatsInfo;
  discipline: DisciplineInfo;
  branding: ReportCardBranding;
  watermarkUrl?: string;
  sequenceSlots?: number[];
  termSlots?: number[];
  templateId?: ReportCardTemplateId;
  preferFrenchNames?: boolean;
  transferredFrom?: ReportCardTransferNote | null;
  marksStatus?: ReportCardMarksStatus;
  missingSignatures?: Array<'classMaster' | 'principal'>;
};

export function parseReportCardTerm(raw: string | null | undefined): ReportCardTerm {
  if (raw === 'annual') {
    return 'annual';
  }
  const n = Number((raw ?? '').trim());
  if (Number.isInteger(n) && n >= 1 && n <= 12) {
    return String(n) as ReportCardTerm;
  }
  return 'annual';
}

export function reportCardTermNumber(term: ReportCardTerm): number {
  if (term === 'annual') return 3;
  const n = Number(term);
  return Number.isInteger(n) && n >= 1 ? n : 3;
}

export function isYearSummaryTerm(term: ReportCardTerm): boolean {
  return term === 'annual';
}
