export type ReportCardTerm = `${number}` | 'annual';

export type ReportCardTemplateId = 'sequence' | 'yearSummary' | 'classicTerm';

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
  teacherName?: string;
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
  isRepeater?: boolean;
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
  /** Unjustified absences. Existing bulletins show this count. */
  absences: number;
  justifiedAbsences: number;
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
  /** Report-card crest only. No institution-logo fallback. */
  reportCardLogoUrl?: string | null;
  contactLine: string;
  ministryEn?: string;
  ministryFr?: string;
  regionEn: string;
  regionFr: string;
  /** Exact English regional line when configured. Empty means the classic bulletin uses regionName. */
  regionalDelegationEn?: string;
  regionName?: string;
  divisionalDelegation?: string;
  divisionalDelegationFr?: string;
  addressLine?: string;
  poBox?: string;
  phone?: string;
  principalName: string;
};

const FALLBACK_INSTITUTION_NAME = 'Acadia College';
const FALLBACK_REGION = 'Littoral';

export const DEFAULT_MINISTRY_NAME_EN = 'Ministry of Secondary Education';
export const DEFAULT_MINISTRY_NAME_FR = 'Ministère des Enseignements Secondaires';

export type ReportCardLetterheadSource = {
  ministryNameEn?: string | null;
  ministryNameFr?: string | null;
  regionalDelegationEn?: string | null;
  regionalDelegationFr?: string | null;
  divisionalDelegation?: string | null;
  divisionalDelegationFr?: string | null;
  region?: string | null;
  poBox?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  institutionPhone?: string | null;
};

export type ResolvedReportCardLetterhead = {
  ministryEn: string;
  ministryFr: string;
  regionEn: string;
  regionFr: string;
  regionalDelegationEn: string;
  regionName: string;
  divisionalDelegation: string;
  divisionalDelegationFr: string;
  addressLine: string;
  poBox: string;
  phone: string;
  contactLine: string;
};

/** Print a P.O. Box as entered, prefixing a bare number or code. */
export function formatPoBoxLine(poBox: string | null | undefined): string {
  const value = poBox?.trim() || '';
  if (!value) return '';
  if (/\b(p\.?\s*o\.?\s*box|b\.?\s*p\.?)\b/i.test(value)) return value;
  return `P.O. Box ${value}`;
}

export function resolveReportCardLetterhead(
  tenant: ReportCardLetterheadSource | null | undefined,
): ResolvedReportCardLetterhead {
  const regionName = tenant?.region?.trim() || '';
  const region = regionName || FALLBACK_REGION;
  const regionalDelegationEn = tenant?.regionalDelegationEn?.trim() || '';
  const regionalDelegationFr = tenant?.regionalDelegationFr?.trim() || '';
  const addressLine = [tenant?.addressLine1, tenant?.addressLine2, tenant?.city]
    .filter((part) => part && part.trim())
    .join(', ');
  const phone = tenant?.institutionPhone?.trim() || '';
  const poBox = formatPoBoxLine(tenant?.poBox);
  const contactLine = [poBox, addressLine, phone ? `Tel: ${phone}` : null]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    ministryEn: tenant?.ministryNameEn?.trim() || DEFAULT_MINISTRY_NAME_EN,
    ministryFr: tenant?.ministryNameFr?.trim() || DEFAULT_MINISTRY_NAME_FR,
    regionEn: regionalDelegationEn || `Regional Delegation of ${region}`,
    regionFr: regionalDelegationFr || `Délégation Régionale de ${region}`,
    regionalDelegationEn,
    regionName,
    divisionalDelegation: tenant?.divisionalDelegation?.trim() || '',
    divisionalDelegationFr: tenant?.divisionalDelegationFr?.trim() || '',
    addressLine,
    poBox,
    phone,
    contactLine,
  };
}

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
