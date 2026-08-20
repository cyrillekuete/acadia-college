import { describe, expect, it } from 'vitest';
import { rankStudents } from '@/lib/acadia/assessment';
import {
  buildReportCardData,
  buildSubjectSequenceScores,
  computeWeightedTotals,
  countGcePasses,
  getSequenceSlotsForTerm,
  groupSubjectsForReportCard,
  resolveReportCardGrouping,
  subjectTypeToCategory,
  type ReportCardBundle,
  type ReportCardMarkRow,
  type ReportCardSubjectDef,
} from '@/lib/acadia/report-card';
import {
  decideReportCardAccess,
  teacherCanAccessStudentClass,
} from '@/lib/acadia/report-card-access';
import {
  buildReportCardPdfFilename,
  buildReportCardOrderNo,
  calculateGrade,
  formatReportMark,
  getGradeRemarks,
  hasGceSubjectCode,
  isNegativeRemark,
  sanitizeReportCardFilenamePart,
} from '@/lib/acadia/report-card-grading';
import {
  buildReportCardQrValue,
  resolveReportCardInstitutionNames,
  type ReportCardBranding,
  type SubjectGrade,
} from '@/lib/acadia/report-card-types';

const branding: ReportCardBranding = {
  displayNameEn: 'Acadia College',
  displayNameFr: 'Collège Acadia',
  logoUrl: null,
  contactLine: 'Douala',
  regionEn: 'Regional Delegation of Littoral',
  regionFr: 'Délégation Régionale de Littoral',
  principalName: 'Principal',
};

describe('buildReportCardQrValue', () => {
  it('is unique per student and stable across renders', () => {
    const ada = {
      studentProfileId: 's1',
      matricule: 'AC-001',
      academicYear: '2025/2026',
      term: 1 as const,
    };
    const alan = { ...ada, studentProfileId: 's2', matricule: 'AC-002' };
    expect(buildReportCardQrValue(ada)).toBe(buildReportCardQrValue(ada));
    expect(buildReportCardQrValue(ada)).not.toBe(buildReportCardQrValue(alan));
    expect(JSON.parse(buildReportCardQrValue(ada))).toMatchObject({
      kind: 'acadia-bulletin',
      student: 's1',
      matricule: 'AC-001',
      year: '2025/2026',
      term: 1,
    });
  });
});

describe('resolveReportCardInstitutionNames', () => {
  it('uses institution Name (EN) and Name (FR)', () => {
    expect(
      resolveReportCardInstitutionNames({
        displayNameEn: 'Acadia College',
        displayNameFr: 'Collège Acadia',
      }),
    ).toEqual({
      displayNameEn: 'Acadia College',
      displayNameFr: 'Collège Acadia',
    });
  });

  it('falls back French name to Name (EN) when Name (FR) is blank', () => {
    expect(
      resolveReportCardInstitutionNames({
        displayNameEn: '  Acadia College  ',
        displayNameFr: '  ',
      }),
    ).toEqual({
      displayNameEn: 'Acadia College',
      displayNameFr: 'Acadia College',
    });
  });
});

const math: ReportCardSubjectDef = {
  subjectId: 'math',
  nameEn: 'Mathematics',
  code: 'MATH',
  coefficient: 4,
  subjectType: 'OTHERS',
  requiredSubBranchIds: [],
};

const english: ReportCardSubjectDef = {
  subjectId: 'eng',
  nameEn: 'English',
  code: 'ENG',
  coefficient: 3,
  subjectType: 'LANGUAGES',
  requiredSubBranchIds: [],
};

function mark(
  studentProfileId: string,
  subjectId: string,
  sequenceNumber: number,
  totalScore: number,
): ReportCardMarkRow {
  return {
    studentProfileId,
    subjectId,
    subjectSubBranchId: null,
    totalScore,
    sequenceNumber,
    subjectCoefficient: subjectId === 'math' ? 4 : 3,
    subBranchCoefficient: null,
  };
}

describe('report-card grading', () => {
  it('maps the Cameroon 0–20 letter scale', () => {
    expect(calculateGrade(17)).toBe('A');
    expect(calculateGrade(14)).toBe('B');
    expect(calculateGrade(10)).toBe('C');
    expect(calculateGrade(7)).toBe('D');
    expect(calculateGrade(6.9)).toBe('U');
    expect(getGradeRemarks('A')).toBe('Excellent');
    expect(getGradeRemarks('U')).toBe('Very weak');
    expect(isNegativeRemark('Failed')).toBe(true);
    expect(isNegativeRemark('Pass')).toBe(false);
  });

  it('detects GCE codes and sanitizes filenames', () => {
    expect(hasGceSubjectCode('  MATH ')).toBe(true);
    expect(hasGceSubjectCode('')).toBe(false);
    expect(sanitizeReportCardFilenamePart('Jean Dupont')).toBe('Jean_Dupont');
    expect(
      buildReportCardPdfFilename({
        studentName: 'Jean Dupont',
        year: '2025/2026',
        term: '1',
      }),
    ).toBe('ReportCard_Jean_Dupont_2025_2026_Term1.pdf');
    expect(
      buildReportCardPdfFilename({
        studentName: 'Jean',
        year: '2026',
        term: 'annual',
      }),
    ).toBe('ReportCard_Jean_2026_Annual.pdf');
  });
});

describe('sequence slots and categories', () => {
  it('maps default 6 sequences to three terms', () => {
    expect(getSequenceSlotsForTerm(1)).toEqual([1, 2]);
    expect(getSequenceSlotsForTerm(2)).toEqual([3, 4]);
    expect(getSequenceSlotsForTerm(3)).toEqual([5, 6]);
  });

  it('maps subject types to bulletin categories', () => {
    expect(subjectTypeToCategory('LANGUAGES')).toBe('languages');
    expect(subjectTypeToCategory('TRADE_SUBJECTS')).toBe('trade_subjects');
    expect(subjectTypeToCategory('RELATED_TRADE_SUBJECTS')).toBe(
      'related_trade_subjects',
    );
    expect(subjectTypeToCategory('OTHERS')).toBe('others');
  });
});

describe('report-card subject groupings', () => {
  it('prefers the class grouping over the subject default', () => {
    expect(
      resolveReportCardGrouping(
        { id: 'class-g', nameEn: 'Other Subjects', sortOrder: 2 },
        { id: 'subj-g', nameEn: 'Core', sortOrder: 1 },
      ),
    ).toEqual({
      groupingId: 'class-g',
      groupingLabel: 'Other Subjects',
      groupingLabelFr: 'Other Subjects',
      groupingSortOrder: 2,
    });
  });

  it('falls back to the subject grouping when the class has none', () => {
    expect(
      resolveReportCardGrouping(null, {
        id: 'subj-g',
        nameEn: 'Languages',
        sortOrder: 0,
      }),
    ).toEqual({
      groupingId: 'subj-g',
      groupingLabel: 'Languages',
      groupingLabelFr: 'Languages',
      groupingSortOrder: 0,
    });
  });

  it('groups subjects by configured grouping instead of subject type', () => {
    const groups = groupSubjectsForReportCard([
      {
        subjectName: 'Chemistry',
        coefficient: 3,
        category: 'others',
        groupingId: 'other',
        groupingLabel: 'Other Subjects',
        groupingSortOrder: 2,
      },
      {
        subjectName: 'English',
        coefficient: 3,
        category: 'languages',
        groupingId: 'lang',
        groupingLabel: 'Languages',
        groupingSortOrder: 1,
      },
      {
        subjectName: 'Literature',
        coefficient: 2,
        category: 'languages',
        groupingId: 'other',
        groupingLabel: 'Other Subjects',
        groupingSortOrder: 2,
      },
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Languages', 'Other Subjects']);
    expect(groups[0]?.shortLabel).toBe('Languages');
    expect(groups[0]?.subjects.map((subject) => subject.subjectName)).toEqual(['English']);
    expect(groups[1]?.subjects.map((subject) => subject.subjectName)).toEqual([
      'Chemistry',
      'Literature',
    ]);
    expect(groups[1]?.remarkName).toBe('other subjects');
  });

  it('falls back to subject-type categories when no grouping is configured', () => {
    const groups = groupSubjectsForReportCard([
      { subjectName: 'Math', coefficient: 4, category: 'others' },
      { subjectName: 'English', coefficient: 3, category: 'languages' },
    ]);
    expect(groups.map((group) => group.shortLabel)).toEqual(['LANGUAGES', 'OTHER SUBJECTS']);
  });

  it('treats forceUngrouped as no grouping', () => {
    expect(
      resolveReportCardGrouping(
        { id: 'class-g', nameEn: 'Other Subjects', sortOrder: 2 },
        { id: 'subj-g', nameEn: 'Core', sortOrder: 1 },
        { forceUngrouped: true },
      ),
    ).toEqual({
      groupingId: null,
      groupingLabel: null,
      groupingLabelFr: null,
      groupingSortOrder: null,
    });
  });

  it('uses an ungrouped bucket when mixed with configured groupings', () => {
    const groups = groupSubjectsForReportCard([
      {
        subjectName: 'English',
        coefficient: 3,
        category: 'languages',
        groupingId: 'lang',
        groupingLabel: 'Languages',
        groupingSortOrder: 1,
      },
      { subjectName: 'Math', coefficient: 4, category: 'others' },
    ]);
    expect(groups.map((group) => group.label)).toEqual(['Languages', 'Ungrouped']);
  });
});

describe('subject sequence scores', () => {
  it('averages sequences into terms and a partial annual average', () => {
    const scores = buildSubjectSequenceScores(
      [
        mark('s1', 'math', 1, 12),
        mark('s1', 'math', 2, 14),
        mark('s1', 'math', 3, 10),
      ],
      math,
    );
    expect(scores.termAverages.term1).toBe(13);
    expect(scores.termAverages.term2).toBe(10);
    expect(scores.termAverages.term3).toBeUndefined();
    expect(scores.annualAverage).toBe(11.5);
  });
});

describe('weighted totals and GCE counts', () => {
  it('ignores subjects without a mark', () => {
    expect(
      computeWeightedTotals([
        { average: 12, plannedCoefficient: 4 },
        { average: null, plannedCoefficient: 3 },
      ]),
    ).toEqual({ coefficient: 4, totalScore: 48, average: 12 });
  });

  it('counts GCE passes by category', () => {
    const subjects: SubjectGrade[] = [
      {
        subjectName: 'Welding',
        code: 'WELD',
        coefficient: 2,
        category: 'trade_subjects',
        termAverage: 14,
        annualAverage: 14,
      },
      {
        subjectName: 'English',
        code: 'ENG',
        coefficient: 3,
        category: 'languages',
        termAverage: 8,
        annualAverage: 8,
      },
      {
        subjectName: 'PE',
        code: '',
        coefficient: 1,
        category: 'others',
        termAverage: 16,
        annualAverage: 16,
      },
    ];
    expect(countGcePasses(subjects, '1')).toEqual({
      gceTradeSubjects: 1,
      gceRelatedTrade: 0,
      gceLanguageSubjects: 0,
      gceOtherSubjects: 0,
      gceSubjectsPassed: 1,
    });
  });
});

describe('buildReportCardData', () => {
  it('ranks the class and fills term history', () => {
    const bundle: ReportCardBundle = {
      student: {
        studentProfileId: 's1',
        name: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        matricule: 'AC-001',
        sex: 'F',
        dob: '01/01/2010',
        pob: '—',
        speciality: 'Grammar',
      },
      classId: 'c1',
      className: 'Form 5 A',
      classMaster: 'Mr. Teacher',
      classSize: 2,
      academicYearLabel: '2025/2026',
      structure: {
        termsPerYear: 3,
        sequencesPerTerm: 2,
        sequencesPerYear: 6,
      },
      subjects: [math, english],
      marks: [
        mark('s1', 'math', 1, 16),
        mark('s1', 'math', 2, 18),
        mark('s1', 'eng', 1, 12),
        mark('s1', 'eng', 2, 12),
        mark('s2', 'math', 1, 8),
        mark('s2', 'math', 2, 8),
        mark('s2', 'eng', 1, 9),
        mark('s2', 'eng', 2, 9),
      ],
      branding,
    };

    const card = buildReportCardData(bundle, '1');
    expect(card.student.studentId).toBe('AC-001');
    expect(card.history.rank).toBe(1);
    expect(card.totals.average).toBeGreaterThan(10);
    expect(card.stats.classSize).toBe(2);
    expect(card.stats.passed).toBe(1);
    expect(card.stats.failed).toBe(1);
    expect(card.stats.failPercent).toBe(50);
    expect(card.subjects).toHaveLength(2);
    expect(rankStudents([{ studentProfileId: 's1', average: 14 }])[0]?.rank).toBe(1);
    expect(card.discipline).toEqual({ absences: 0, suspensions: 0, warnings: 0 });
  });

  it('carries configured grouping onto subject grades in sort order', () => {
    const bundle: ReportCardBundle = {
      student: {
        studentProfileId: 's1',
        name: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        matricule: 'AC-001',
        sex: 'F',
        dob: '01/01/2010',
        pob: '—',
        speciality: 'Grammar',
      },
      classId: 'c1',
      className: 'Form 5 A',
      classMaster: 'Mr. Teacher',
      classSize: 1,
      academicYearLabel: '2025/2026',
      structure: {
        termsPerYear: 3,
        sequencesPerTerm: 2,
        sequencesPerYear: 6,
      },
      subjects: [
        { ...math, groupingId: 'other', groupingLabel: 'Other Subjects', groupingSortOrder: 2 },
        { ...english, groupingId: 'lang', groupingLabel: 'Languages', groupingSortOrder: 1 },
      ],
      marks: [mark('s1', 'math', 1, 16), mark('s1', 'eng', 1, 12)],
      branding,
    };

    const card = buildReportCardData(bundle, '1');
    expect(card.subjects.map((subject) => subject.groupingLabel)).toEqual([
      'Languages',
      'Other Subjects',
    ]);
    expect(groupSubjectsForReportCard(card.subjects).map((group) => group.label)).toEqual([
      'Languages',
      'Other Subjects',
    ]);
  });

  it('maps stored term discipline and sums annual totals', () => {
    const bundle: ReportCardBundle = {
      student: {
        studentProfileId: 's1',
        name: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        matricule: 'AC-001',
        sex: 'F',
        dob: '01/01/2010',
        pob: '—',
        speciality: 'Grammar',
      },
      classId: 'c1',
      className: 'Form 5 A',
      classMaster: 'Mr. Teacher',
      classSize: 1,
      academicYearLabel: '2025/2026',
      structure: {
        termsPerYear: 3,
        sequencesPerTerm: 2,
        sequencesPerYear: 6,
      },
      subjects: [math],
      marks: [mark('s1', 'math', 1, 16), mark('s1', 'math', 2, 18)],
      branding,
      disciplineByTerm: [
        { termNumber: 1, absenceHours: 4, suspensions: 1, warnings: 0 },
        { termNumber: 2, absenceHours: 2, suspensions: 0, warnings: 1 },
        { termNumber: 3, absenceHours: 1, suspensions: 0, warnings: 0 },
      ],
    };

    expect(buildReportCardData(bundle, '1').discipline).toEqual({
      absences: 4,
      suspensions: 1,
      warnings: 0,
    });
    expect(buildReportCardData(bundle, '2').discipline).toEqual({
      absences: 2,
      suspensions: 0,
      warnings: 1,
    });
    expect(buildReportCardData(bundle, 'annual').discipline).toEqual({
      absences: 7,
      suspensions: 1,
      warnings: 1,
    });
  });

  it('sums discipline from more than one class in the same term', () => {
    const bundle: ReportCardBundle = {
      student: {
        studentProfileId: 's1',
        name: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        matricule: 'AC-001',
        sex: 'F',
        dob: '01/01/2010',
        pob: '—',
        speciality: 'Grammar',
      },
      classId: 'c2',
      className: 'Form 5 B',
      classMaster: 'Ms. Teacher',
      classSize: 1,
      academicYearLabel: '2025/2026',
      structure: {
        termsPerYear: 3,
        sequencesPerTerm: 2,
        sequencesPerYear: 6,
      },
      subjects: [math],
      marks: [mark('s1', 'math', 1, 16), mark('s1', 'math', 2, 18)],
      branding,
      disciplineByTerm: [
        { termNumber: 1, absenceHours: 4, suspensions: 1, warnings: 0 },
        { termNumber: 1, absenceHours: 2, suspensions: 0, warnings: 1 },
      ],
    };

    expect(buildReportCardData(bundle, '1').discipline).toEqual({
      absences: 6,
      suspensions: 1,
      warnings: 1,
    });
  });
});

describe('report-card notices and references', () => {
  it('prints 0/20 instead of a dash', () => {
    expect(formatReportMark(0)).toBe('0.0');
    expect(formatReportMark(null)).toBe('-');
  });

  it('builds a unique order number per student and term', () => {
    const ada = buildReportCardOrderNo({
      yearLabel: '2025/2026',
      matricule: 'AC-001',
      term: '1',
    });
    const alan = buildReportCardOrderNo({
      yearLabel: '2025/2026',
      matricule: 'AC-002',
      term: '1',
    });
    expect(ada).toBe('RC-2025_2026-AC-001-T1');
    expect(ada).not.toBe(alan);
  });

  it('uses French subject names and notes a class transfer', () => {
    const bundle: ReportCardBundle = {
      student: {
        studentProfileId: 's1',
        name: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        matricule: 'AC-001',
        sex: 'F',
        dob: '01/01/2010',
        pob: '—',
        speciality: 'Grammar',
      },
      classId: 'c1',
      className: 'Form 5 A',
      classMaster: '',
      classSize: 1,
      academicYearLabel: '2025/2026',
      structure: {
        termsPerYear: 3,
        sequencesPerTerm: 2,
        sequencesPerYear: 6,
      },
      subjects: [{ ...math, nameFr: 'Mathématiques' }],
      marks: [mark('s1', 'math', 1, 0)],
      branding: { ...branding, principalName: '' },
      preferFrenchNames: true,
      transferredFrom: { className: 'Form 5 B', enrolledAt: '2026-01-15' },
    };
    const card = buildReportCardData(bundle, '1');
    expect(card.subjects[0]?.subjectName).toBe('Mathématiques');
    expect(card.transferredFrom?.className).toBe('Form 5 B');
    expect(card.marksStatus?.status).toBe('complete');
    expect(card.missingSignatures).toEqual(['classMaster', 'principal']);
    expect(card.academic.orderNo).toContain('AC-001');
    expect(card.subjects[0]?.termAverage).toBe(0);
  });
});

describe('report-card access', () => {
  it('lets admins through and keeps students and guardians scoped', () => {
    expect(
      decideReportCardAccess({
        roleSlug: 'admin',
        studentProfileId: 'other-student',
      }),
    ).toBe(true);
    expect(
      decideReportCardAccess({
        roleSlug: 'student',
        studentProfileId: 's1',
        ownStudentProfileId: 's1',
      }),
    ).toBe(true);
    expect(
      decideReportCardAccess({
        roleSlug: 'student',
        studentProfileId: 'other-student',
        ownStudentProfileId: 's1',
      }),
    ).toBe(false);
    expect(
      decideReportCardAccess({
        roleSlug: 'parent',
        studentProfileId: 's1',
        guardianLinked: true,
      }),
    ).toBe(true);
    expect(
      decideReportCardAccess({
        roleSlug: 'parent',
        studentProfileId: 's1',
        guardianLinked: false,
      }),
    ).toBe(false);
  });

  it('denies teachers who are not assigned to the student class', () => {
    expect(
      decideReportCardAccess({
        roleSlug: 'teacher',
        studentProfileId: 's1',
        teacherAssignedClassIds: ['class-a'],
        studentClassId: 'class-b',
      }),
    ).toBe(false);
    expect(
      teacherCanAccessStudentClass({
        assignedClassIds: ['class-a'],
        studentClassId: 'class-b',
      }),
    ).toBe(false);
  });

  it('allows teachers assigned to the student class or acting as class master', () => {
    expect(
      decideReportCardAccess({
        roleSlug: 'teacher',
        studentProfileId: 's1',
        teacherAssignedClassIds: ['class-b', 'class-a'],
        studentClassId: 'class-a',
      }),
    ).toBe(true);
    expect(
      decideReportCardAccess({
        roleSlug: 'lecturer',
        studentProfileId: 's1',
        teacherAssignedClassIds: [],
        studentClassId: 'class-a',
        isClassMaster: true,
      }),
    ).toBe(true);
    expect(
      decideReportCardAccess({
        roleSlug: 'staff',
        studentProfileId: 's1',
        teacherAssignedClassIds: [],
        studentClassId: 'class-a',
      }),
    ).toBe(false);
    expect(
      teacherCanAccessStudentClass({
        assignedClassIds: [],
        studentClassId: null,
        isClassMaster: true,
      }),
    ).toBe(false);
  });
});
