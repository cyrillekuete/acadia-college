import type {
  ReportCardCategory,
  ReportCardData,
  ReportCardTerm,
  ReportCardTemplateId,
  SubjectGrade,
} from '@/lib/acadia/report-card-types';
import {
  buildSequenceDistribution,
  DEFAULT_ACADEMIC_STRUCTURE,
  type AcademicYearStructure,
} from '@/lib/acadia/academic-calendar';
import { calculateGrade, getGradeRemarks } from '@/lib/acadia/report-card-grading';

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
  if (raw === 'sequence' || raw === 'yearSummary' || raw === 'classicTerm') {
    return raw;
  }
  return null;
}

function templateForPeriod(
  raw: unknown,
  fallback: ReportCardTemplateId,
  period: ReportCardTerm,
): ReportCardTemplateId {
  const parsed = parseReportCardTemplateId(raw) ?? fallback;
  if (parsed === 'classicTerm' && period !== '1' && period !== '2') {
    return fallback;
  }
  return parsed;
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
    term1Template: templateForPeriod(
      input?.term1Template,
      DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term1Template,
      '1',
    ),
    term2Template: templateForPeriod(
      input?.term2Template,
      DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term2Template,
      '2',
    ),
    term3Template: templateForPeriod(
      input?.term3Template,
      DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.term3Template,
      '3',
    ),
    annualTemplate: templateForPeriod(
      input?.annualTemplate,
      DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE.annualTemplate,
      'annual',
    ),
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
  if (templateId === 'classicTerm') {
    return {
      ...DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE,
      term1Template: 'classicTerm',
      term2Template: 'classicTerm',
    };
  }
  return {
    term1Template: templateId,
    term2Template: templateId,
    term3Template: templateId,
    annualTemplate: templateId,
  };
}

/** Assign a layout without changing term 3 or annual when the layout is classic term. */
export function assignReportCardTemplate(
  current: ReportCardTemplatePreference,
  templateId: ReportCardTemplateId,
): ReportCardTemplatePreference {
  if (templateId === 'classicTerm') {
    return {
      ...current,
      term1Template: 'classicTerm',
      term2Template: 'classicTerm',
    };
  }
  return applyReportCardTemplateToAll(templateId);
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
  reportCardLogoUrl: null,
  contactLine: 'Douala',
  regionEn: 'Regional Delegation of Littoral',
  regionFr: 'Délégation Régionale de Littoral',
  regionName: 'Littoral',
  divisionalDelegation: 'Wouri',
  addressLine: 'P.O Box 100 Douala',
  phone: '677000000',
  principalName: 'Principal',
};

type SampleSubjectSeed = {
  subjectId: string;
  nameEn: string;
  nameFr: string;
  code: string;
  category: ReportCardCategory;
  groupEn: string;
  groupFr: string;
  groupOrder: number;
  coefficient: number;
  term1: number;
  term2: number;
  term3: number;
  rank: number;
  teacherEn: string;
  teacherFr: string;
};

const SAMPLE_SUBJECTS: SampleSubjectSeed[] = [
  {
    subjectId: 'eng',
    nameEn: 'English',
    nameFr: 'Anglais',
    code: 'ENG',
    category: 'languages',
    groupEn: 'Languages',
    groupFr: 'Langues',
    groupOrder: 1,
    coefficient: 3,
    term1: 15,
    term2: 14,
    term3: 16,
    rank: 4,
    teacherEn: 'Mrs. Ngo',
    teacherFr: 'Mme Ngo',
  },
  {
    subjectId: 'fre',
    nameEn: 'French',
    nameFr: 'Français',
    code: 'FRE',
    category: 'languages',
    groupEn: 'Languages',
    groupFr: 'Langues',
    groupOrder: 1,
    coefficient: 3,
    term1: 13,
    term2: 14,
    term3: 15,
    rank: 8,
    teacherEn: 'Mr. Essomba',
    teacherFr: 'M. Essomba',
  },
  {
    subjectId: 'math',
    nameEn: 'Mathematics',
    nameFr: 'Mathématiques',
    code: 'MATH',
    category: 'others',
    groupEn: 'Sciences',
    groupFr: 'Sciences',
    groupOrder: 2,
    coefficient: 5,
    term1: 16,
    term2: 17,
    term3: 15,
    rank: 2,
    teacherEn: 'Mrs. Fono',
    teacherFr: 'Mme Fono',
  },
  {
    subjectId: 'phy',
    nameEn: 'Physics',
    nameFr: 'Physique',
    code: 'PHY',
    category: 'others',
    groupEn: 'Sciences',
    groupFr: 'Sciences',
    groupOrder: 2,
    coefficient: 4,
    term1: 14,
    term2: 13,
    term3: 15,
    rank: 6,
    teacherEn: 'Mr. Tamba',
    teacherFr: 'M. Tamba',
  },
  {
    subjectId: 'che',
    nameEn: 'Chemistry',
    nameFr: 'Chimie',
    code: 'CHE',
    category: 'others',
    groupEn: 'Sciences',
    groupFr: 'Sciences',
    groupOrder: 2,
    coefficient: 3,
    term1: 12,
    term2: 14,
    term3: 13,
    rank: 12,
    teacherEn: 'Mrs. Fono',
    teacherFr: 'Mme Fono',
  },
  {
    subjectId: 'bio',
    nameEn: 'Biology',
    nameFr: 'Biologie',
    code: 'BIO',
    category: 'others',
    groupEn: 'Sciences',
    groupFr: 'Sciences',
    groupOrder: 2,
    coefficient: 2,
    term1: 15,
    term2: 16,
    term3: 15,
    rank: 5,
    teacherEn: 'Mr. Tamba',
    teacherFr: 'M. Tamba',
  },
  {
    subjectId: 'his',
    nameEn: 'History',
    nameFr: 'Histoire',
    code: 'HIS',
    category: 'others',
    groupEn: 'Humanities',
    groupFr: 'Sciences humaines',
    groupOrder: 3,
    coefficient: 2,
    term1: 14,
    term2: 13,
    term3: 14,
    rank: 9,
    teacherEn: 'Mrs. Diallo',
    teacherFr: 'Mme Diallo',
  },
  {
    subjectId: 'geo',
    nameEn: 'Geography',
    nameFr: 'Géographie',
    code: 'GEO',
    category: 'others',
    groupEn: 'Humanities',
    groupFr: 'Sciences humaines',
    groupOrder: 3,
    coefficient: 2,
    term1: 13,
    term2: 15,
    term3: 14,
    rank: 10,
    teacherEn: 'Mrs. Diallo',
    teacherFr: 'Mme Diallo',
  },
  {
    subjectId: 'cs',
    nameEn: 'Computer Science',
    nameFr: 'Informatique',
    code: 'CS',
    category: 'others',
    groupEn: 'Others',
    groupFr: 'Autres',
    groupOrder: 4,
    coefficient: 2,
    term1: 17,
    term2: 16,
    term3: 18,
    rank: 1,
    teacherEn: 'Mr. Kamga',
    teacherFr: 'M. Kamga',
  },
  {
    subjectId: 'pe',
    nameEn: 'Physical Education',
    nameFr: 'Éducation physique',
    code: 'PE',
    category: 'others',
    groupEn: 'Others',
    groupFr: 'Autres',
    groupOrder: 4,
    coefficient: 1,
    term1: 16,
    term2: 16,
    term3: 15,
    rank: 3,
    teacherEn: 'Mr. Kamga',
    teacherFr: 'M. Kamga',
  },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function seedTermMark(seed: SampleSubjectSeed, termNumber: number): number {
  if (termNumber === 1) return seed.term1;
  if (termNumber === 2) return seed.term2;
  return seed.term3;
}

function weightedTermSummary(
  seeds: SampleSubjectSeed[],
  pick: (seed: SampleSubjectSeed) => number,
): { coefficient: number; totalScore: number; average: number } {
  const coefficient = seeds.reduce((sum, seed) => sum + seed.coefficient, 0);
  const totalScore = seeds.reduce((sum, seed) => sum + seed.coefficient * pick(seed), 0);
  return {
    coefficient,
    totalScore: round2(totalScore),
    average: coefficient > 0 ? round2(totalScore / coefficient) : 0,
  };
}

function sampleRemark(grade: string, french: boolean): string {
  if (!french) return getGradeRemarks(grade);
  if (grade === 'A') return 'Excellent';
  if (grade === 'B') return 'Très bien';
  if (grade === 'C') return 'Passable';
  if (grade === 'D') return 'Échec';
  if (grade === 'U') return 'Très faible';
  return '';
}

function sequenceMarksForSeed(
  seed: SampleSubjectSeed,
  structure: AcademicYearStructure,
): Record<string, number> {
  const distribution = buildSequenceDistribution(structure);
  const sequences: Record<string, number> = {};
  for (let sequence = 1; sequence <= structure.sequencesPerYear; sequence += 1) {
    const termNumber = distribution.termNumberBySequence.get(sequence) ?? 1;
    const position = distribution.numberInTermBySequence.get(sequence) ?? 1;
    const delta = position % 2 === 0 ? 0.5 : -0.5;
    sequences[`seq${sequence}`] = Math.min(
      20,
      Math.max(0, round1(seedTermMark(seed, termNumber) + delta)),
    );
  }
  return sequences;
}

function sampleSubject(
  seed: SampleSubjectSeed,
  structure: AcademicYearStructure,
  period: ReportCardTerm,
  french: boolean,
): SubjectGrade {
  const sequences = sequenceMarksForSeed(seed, structure);
  const annualAverage = round2((seed.term1 + seed.term2 + seed.term3) / 3);
  const termAverage =
    period === '1'
      ? seed.term1
      : period === '2'
        ? seed.term2
        : period === 'annual'
          ? annualAverage
          : seed.term3;
  const grade = calculateGrade(termAverage);
  return {
    subjectId: seed.subjectId,
    subjectName: french ? seed.nameFr : seed.nameEn,
    code: seed.code,
    coefficient: seed.coefficient,
    hasMark: true,
    category: seed.category,
    groupingId: seed.groupEn.toLowerCase(),
    groupingLabel: french ? seed.groupFr : seed.groupEn,
    groupingSortOrder: seed.groupOrder,
    seq1: sequences.seq1,
    seq2: sequences.seq2,
    seq3: sequences.seq3,
    seq4: sequences.seq4,
    seq5: sequences.seq5,
    seq6: sequences.seq6,
    termAverage,
    term1: seed.term1,
    term2: seed.term2,
    term3: seed.term3,
    annualAverage,
    grade,
    rank: seed.rank,
    remarks: sampleRemark(grade, french),
    teacherName: french ? seed.teacherFr : seed.teacherEn,
    sequences,
    termAverages: { term1: seed.term1, term2: seed.term2, term3: seed.term3 },
  };
}

function previewPeriod(
  templateId: ReportCardTemplateId,
  period: ReportCardTerm | undefined,
): ReportCardTerm {
  return period ?? (templateId === 'yearSummary' ? 'annual' : '1');
}

function previewSequenceSlots(
  templateId: ReportCardTemplateId,
  period: ReportCardTerm,
  structure: AcademicYearStructure,
): number[] {
  const all = Array.from({ length: structure.sequencesPerYear }, (_, index) => index + 1);
  if (templateId === 'yearSummary' || period === 'annual') return all;
  const termNumber = Number(period);
  const distribution = buildSequenceDistribution(structure);
  const slots = all.filter(
    (sequence) => distribution.termNumberBySequence.get(sequence) === termNumber,
  );
  if (slots.length > 0) return slots;
  return Array.from({ length: structure.sequencesPerTerm }, (_, index) => index + 1);
}

export function sampleReportCardPreviewData(
  templateId: ReportCardTemplateId,
  options?: {
    structure?: AcademicYearStructure;
    french?: boolean;
    period?: ReportCardTerm;
  },
): ReportCardData {
  const structure = options?.structure ?? DEFAULT_ACADEMIC_STRUCTURE;
  const french = options?.french === true;
  const period = previewPeriod(templateId, options?.period);
  const subjects = SAMPLE_SUBJECTS.map((seed) =>
    sampleSubject(seed, structure, period, french),
  );
  const term1 = weightedTermSummary(SAMPLE_SUBJECTS, (seed) => seed.term1);
  const term2 = weightedTermSummary(SAMPLE_SUBJECTS, (seed) => seed.term2);
  const term3 = weightedTermSummary(SAMPLE_SUBJECTS, (seed) => seed.term3);
  const annualTotalScore = round2(
    SAMPLE_SUBJECTS.reduce(
      (sum, seed) => sum + seed.coefficient * round2((seed.term1 + seed.term2 + seed.term3) / 3),
      0,
    ),
  );
  const annual = {
    coefficient: term1.coefficient,
    totalScore: annualTotalScore,
    average: term1.coefficient > 0 ? round2(annualTotalScore / term1.coefficient) : 0,
  };
  const shown = period === '1' ? term1 : period === '2' ? term2 : period === 'annual' ? annual : term3;

  return {
    templateId,
    student: {
      id: 'preview',
      studentId: 'AC-001',
      name: 'Ada Lovelace',
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
      isRepeater: false,
    },
    academic: {
      year: '2025/2026',
      term: period === 'annual' ? 'annual' : Number(period),
      orderNo: 'REF-PREVIEW',
    },
    subjects,
    totals: {
      coefficient: shown.coefficient,
      totalScore: shown.totalScore,
      average: shown.average,
    },
    history: {
      term1: term1.average,
      term2: term2.average,
      term3: term3.average,
      annualAvg: annual.average,
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
    discipline: { absences: 1, justifiedAbsences: 2, suspensions: 0, warnings: 0 },
    branding: SAMPLE_BRANDING,
    sequenceSlots: previewSequenceSlots(templateId, period, structure),
    termSlots: Array.from({ length: structure.termsPerYear }, (_, index) => index + 1),
    preferFrenchNames: french,
  };
}
