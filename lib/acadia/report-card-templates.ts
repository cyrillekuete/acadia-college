import type {
  ReportCardData,
  ReportCardTerm,
  ReportCardTemplateId,
} from '@/lib/acadia/report-card-types';
import {
  DEFAULT_ACADEMIC_STRUCTURE,
  type AcademicYearStructure,
} from '@/lib/acadia/academic-calendar';

export type { ReportCardTemplateId };

export const REPORT_CARD_TEMPLATE_IDS = [
  'sequence',
  'yearSummary',
] as const satisfies readonly ReportCardTemplateId[];

export type ReportCardTemplatePreference = {
  term1Template: ReportCardTemplateId;
  term2Template: ReportCardTemplateId;
  term3Template: ReportCardTemplateId;
  annualTemplate: ReportCardTemplateId;
};

export const DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE: ReportCardTemplatePreference =
  {
    term1Template: 'sequence',
    term2Template: 'sequence',
    term3Template: 'yearSummary',
    annualTemplate: 'yearSummary',
  };

export function parseReportCardTemplateId(
  raw: unknown,
): ReportCardTemplateId | null {
  if (raw === 'sequence' || raw === 'yearSummary') {
    return raw;
  }
  return null;
}

export function reportCardTermFromAcademic(
  term: ReportCardData['academic']['term'],
): ReportCardTerm {
  if (term === 'annual') return 'annual';
  const n = Number(term);
  if (Number.isInteger(n) && n >= 1 && n <= 12) {
    return String(n) as ReportCardTerm;
  }
  return '1';
}

export function defaultReportCardTemplate(term: ReportCardTerm): ReportCardTemplateId {
  if (term === '1') return DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term1Template;
  if (term === '2') return DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term2Template;
  if (term === 'annual') return DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.annualTemplate;
  return DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term3Template;
}

export function normalizeReportCardTemplatePreference(
  input: Partial<ReportCardTemplatePreference> | null | undefined,
): ReportCardTemplatePreference {
  return {
    term1Template:
      parseReportCardTemplateId(input?.term1Template) ??
      DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term1Template,
    term2Template:
      parseReportCardTemplateId(input?.term2Template) ??
      DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term2Template,
    term3Template:
      parseReportCardTemplateId(input?.term3Template) ??
      DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term3Template,
    annualTemplate:
      parseReportCardTemplateId(input?.annualTemplate) ??
      DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.annualTemplate,
  };
}

export function resolveReportCardTemplate(
  preference: Partial<ReportCardTemplatePreference> | null | undefined,
  term: ReportCardTerm,
): ReportCardTemplateId {
  const normalized = normalizeReportCardTemplatePreference(preference);
  if (term === '1') return normalized.term1Template;
  if (term === '2') return normalized.term2Template;
  if (term === 'annual') return normalized.annualTemplate;
  return normalized.term3Template;
}

export function applyReportCardTemplateToAll(
  templateId: ReportCardTemplateId,
): ReportCardTemplatePreference {
  return {
    term1Template: templateId,
    term2Template: templateId,
    term3Template: templateId,
    annualTemplate: templateId,
  };
}

export function periodsUsingReportCardTemplate(
  preference: ReportCardTemplatePreference,
  templateId: ReportCardTemplateId,
): ReportCardTerm[] {
  const periods: ReportCardTerm[] = [];
  if (preference.term1Template === templateId) periods.push('1');
  if (preference.term2Template === templateId) periods.push('2');
  if (preference.term3Template === templateId) periods.push('3');
  if (preference.annualTemplate === templateId) periods.push('annual');
  return periods;
}

export function resolveReportCardLayout(
  data: Pick<ReportCardData, 'academic' | 'templateId'>,
): ReportCardTemplateId {
  const period = reportCardTermFromAcademic(data.academic.term);
  return parseReportCardTemplateId(data.templateId) ?? defaultReportCardTemplate(period);
}

const SAMPLE_BRANDING: ReportCardData['branding'] = {
  displayNameEn: 'Acadia College',
  displayNameFr: 'Collège Acadia',
  logoUrl: null,
  contactLine: 'Douala',
  regionEn: 'Regional Delegation of Littoral',
  regionFr: 'Délégation Régionale de Littoral',
  principalName: 'Principal',
};

function sampleSubject(overrides: Partial<ReportCardData['subjects'][number]> & {
  subjectName: string;
  subjectId: string;
}, sequenceCount = 6): ReportCardData['subjects'][number] {
  const sequences: Record<string, number> = {};
  for (let i = 1; i <= sequenceCount; i += 1) {
    sequences[`seq${i}`] = 12 + (i % 5);
  }
  return {
    coefficient: 3,
    hasMark: true,
    category: 'others',
    seq1: sequences.seq1,
    seq2: sequences.seq2,
    seq3: sequences.seq3,
    seq4: sequences.seq4,
    seq5: sequences.seq5,
    seq6: sequences.seq6,
    termAverage: 15,
    term1: 15,
    term2: 14,
    term3: 15,
    annualAverage: 14.7,
    grade: 'B',
    rank: 2,
    remarks: 'Very good',
    sequences,
    termAverages: { term1: 15, term2: 14, term3: 15 },
    ...overrides,
  };
}

export function sampleReportCardPreviewData(
  templateId: ReportCardTemplateId,
  options?: { structure?: AcademicYearStructure; french?: boolean },
): ReportCardData {
  const isYearSummary = templateId === 'yearSummary';
  const structure = options?.structure ?? DEFAULT_ACADEMIC_STRUCTURE;
  const french = options?.french === true;
  const sequenceSlots = Array.from(
    { length: isYearSummary ? structure.sequencesPerYear : structure.sequencesPerTerm },
    (_, index) => index + 1,
  );
  return {
    templateId,
    student: {
      id: 'preview',
      studentId: 'AC-001',
      name: french ? 'Ada Lovelace' : 'Ada Lovelace',
      firstName: 'Ada',
      lastName: 'Lovelace',
      sex: 'F',
      dob: '01/01/2010',
      pob: 'Douala',
      class: french ? 'Première A' : 'Form 5 A',
      className: french ? 'Première A' : 'Form 5 A',
      classMaster: french ? 'M. Enseignant' : 'Mr. Teacher',
      enrollment: 32,
      speciality: french ? 'Général' : 'Grammar',
    },
    academic: {
      year: '2025/2026',
      term: isYearSummary ? 'annual' : 1,
      orderNo: 'REF-PREVIEW',
    },
    subjects: [
      sampleSubject(
        {
          subjectId: 'eng',
          subjectName: french ? 'Anglais' : 'English',
          code: 'ENG',
          category: 'languages',
          groupingLabel: french ? 'Langues' : 'Languages',
          coefficient: 3,
        },
        structure.sequencesPerYear,
      ),
      sampleSubject(
        {
          subjectId: 'math',
          subjectName: french ? 'Mathématiques' : 'Mathematics',
          code: 'MATH',
          coefficient: 4,
          seq1: 16,
          seq2: 18,
          termAverage: 17,
          term1: 17,
          term2: 16,
          term3: 17,
          annualAverage: 16.7,
          grade: 'A',
          remarks: french ? 'Excellent' : 'Excellent',
        },
        structure.sequencesPerYear,
      ),
    ],
    totals: {
      coefficient: 7,
      totalScore: 113,
      average: 16.1,
    },
    history: {
      term1: 16.1,
      term2: 15.2,
      term3: 16.0,
      annualAvg: 15.8,
      rank1: 2,
      rank2: 3,
      rank3: 2,
      rank: 2,
    },
    stats: {
      classSize: 32,
      maxAvg: 18.2,
      minAvg: 8.4,
      passed: 28,
      failed: 4,
      passPercent: 87.5,
      failPercent: 12.5,
      classAvg: 13.4,
    },
    discipline: { absences: 2, suspensions: 0, warnings: 1 },
    branding: SAMPLE_BRANDING,
    sequenceSlots,
    termSlots: Array.from({ length: structure.termsPerYear }, (_, index) => index + 1),
    preferFrenchNames: french,
  };
}
