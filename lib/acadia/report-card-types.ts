export type ReportCardTerm = '1' | '2' | '3' | 'annual';

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
  sequences?: {
    seq1?: number;
    seq2?: number;
    seq3?: number;
    seq4?: number;
    seq5?: number;
    seq6?: number;
  };
  termAverages?: {
    term1?: number;
    term2?: number;
    term3?: number;
  };
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
  term: number | 'annual' | 1 | 2 | 3;
  orderNo: string;
};

export type StatsInfo = {
  classSize: number;
  maxAvg: number;
  minAvg: number;
  passed: number;
  failed: number;
  passPercent: number;
  failPercent: number;
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
  annualAvg?: number;
  rank1?: number;
  rank2?: number;
  rank3?: number;
  rank?: number;
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
  templateId?: ReportCardTemplateId;
};

export function parseReportCardTerm(raw: string | null | undefined): ReportCardTerm {
  if (raw === '1' || raw === '2' || raw === '3' || raw === 'annual') {
    return raw;
  }
  return 'annual';
}

export function reportCardTermNumber(term: ReportCardTerm): 1 | 2 | 3 {
  if (term === '1') return 1;
  if (term === '2') return 2;
  return 3;
}

export function isYearSummaryTerm(term: ReportCardTerm): boolean {
  return term === 'annual' || term === '3';
}
