import { describe, expect, it } from 'vitest';
import { getMenuForRole } from '@/config/menu.acadia';
import {
  buildClassReport,
  parseClassReportPeriod,
  parseClassReportTopN,
  type ClassReportBundle,
} from '@/lib/acadia/class-report';
import {
  studentPeriodAverage,
  studentSequenceAverage,
  type ReportCardMarkRow,
  type ReportCardSubjectDef,
} from '@/lib/acadia/report-card';
import { decideClassReportAccess } from '@/lib/acadia/report-card-access';
import type { ReportCardBranding } from '@/lib/acadia/report-card-types';

const branding: ReportCardBranding = {
  displayNameEn: 'Acadia College',
  displayNameFr: 'Collège Acadia',
  logoUrl: null,
  contactLine: 'Douala',
  regionEn: 'Regional Delegation of Littoral',
  regionFr: 'Délégation Régionale de Littoral',
  principalName: 'Principal',
};

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

const structure = {
  termsPerYear: 3,
  sequencesPerTerm: 2,
  sequencesPerYear: 6,
};

function makeBundle(overrides?: Partial<ClassReportBundle>): ClassReportBundle {
  return {
    classId: 'c1',
    className: 'Form 5 A',
    classMaster: 'Mr. Teacher',
    academicYearLabel: '2025/2026',
    structure,
    subjects: [math, english],
    students: [
      { studentProfileId: 's1', name: 'Ada Lovelace', matricule: 'AC-001' },
      { studentProfileId: 's2', name: 'Alan Turing', matricule: 'AC-002' },
    ],
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
    ...overrides,
  };
}

describe('class-report period parsing', () => {
  it('accepts sequence, term, and annual', () => {
    expect(parseClassReportPeriod({ period: 'annual' })).toEqual({ kind: 'annual' });
    expect(parseClassReportPeriod({ period: 'term', term: '2' })).toEqual({
      kind: 'term',
      term: '2',
    });
    expect(
      parseClassReportPeriod({ period: 'sequence', sequenceNumber: '4' }),
    ).toEqual({ kind: 'sequence', sequenceNumber: 4 });
  });

  it('rejects incomplete periods', () => {
    expect(parseClassReportPeriod({ period: 'term' })).toEqual({
      error: 'Term is required (1, 2, or 3).',
    });
    expect(parseClassReportPeriod({ period: 'sequence' })).toEqual({
      error: 'Sequence number is required.',
    });
    expect(parseClassReportPeriod({ period: 'exam' })).toEqual({
      error: 'Period must be sequence, term, or annual.',
    });
  });

  it('defaults top N to 5 and accepts 10', () => {
    expect(parseClassReportTopN(undefined)).toBe(5);
    expect(parseClassReportTopN('10')).toBe(10);
    expect(parseClassReportTopN('3')).toBe(5);
  });
});

describe('buildClassReport', () => {
  it('ranks the class and matches bulletin term averages', () => {
    const bundle = makeBundle();
    const report = buildClassReport(bundle, { kind: 'term', term: '1' }, {
      generatedAt: '2026-08-15T00:00:00.000Z',
    });

    const ada = studentPeriodAverage(bundle.subjects, bundle.marks, 's1', '1', structure);
    const alan = studentPeriodAverage(bundle.subjects, bundle.marks, 's2', '1', structure);

    expect(report.ranked).toHaveLength(2);
    expect(report.ranked[0]?.studentProfileId).toBe('s1');
    expect(report.ranked[0]?.rank).toBe(1);
    expect(report.ranked[0]?.average).toBe(ada);
    expect(report.ranked[1]?.studentProfileId).toBe('s2');
    expect(report.ranked[1]?.average).toBe(alan);
    expect(report.best).toEqual([report.ranked[0]]);
    expect(report.worst).toEqual([report.ranked[1]]);
    expect(report.stats.passed).toBe(1);
    expect(report.stats.failed).toBe(1);
    expect(report.stats.passPercent).toBe(50);
    expect(report.stats.failPercent).toBe(50);
    expect(report.stats.classSize).toBe(2);
    expect(report.stats.evaluated).toBe(2);
  });

  it('computes sequence averages with the bulletin helper', () => {
    const bundle = makeBundle();
    const report = buildClassReport(bundle, { kind: 'sequence', sequenceNumber: 1 }, {
      generatedAt: '2026-08-15T00:00:00.000Z',
    });
    expect(report.ranked[0]?.average).toBe(
      studentSequenceAverage(bundle.subjects, bundle.marks, 's1', 1, structure),
    );
    expect(report.ranked[1]?.average).toBe(
      studentSequenceAverage(bundle.subjects, bundle.marks, 's2', 1, structure),
    );
  });

  it('computes annual averages with the bulletin helper', () => {
    const bundle = makeBundle();
    const report = buildClassReport(bundle, { kind: 'annual' }, {
      generatedAt: '2026-08-15T00:00:00.000Z',
    });
    expect(report.ranked[0]?.average).toBe(
      studentPeriodAverage(bundle.subjects, bundle.marks, 's1', 'annual', structure),
    );
  });

  it('lists all tied best and worst students', () => {
    const bundle = makeBundle({
      students: [
        { studentProfileId: 's1', name: 'Ada', matricule: '1' },
        { studentProfileId: 's2', name: 'Alan', matricule: '2' },
        { studentProfileId: 's3', name: 'Grace', matricule: '3' },
      ],
      marks: [
        mark('s1', 'math', 1, 16),
        mark('s1', 'eng', 1, 16),
        mark('s2', 'math', 1, 16),
        mark('s2', 'eng', 1, 16),
        mark('s3', 'math', 1, 8),
        mark('s3', 'eng', 1, 8),
      ],
    });
    const report = buildClassReport(bundle, { kind: 'term', term: '1' });
    expect(report.ranked[0]?.rank).toBe(1);
    expect(report.ranked[1]?.rank).toBe(1);
    expect(report.best.map((row) => row.studentProfileId).sort()).toEqual(['s1', 's2']);
    expect(report.worst).toHaveLength(1);
    expect(report.worst[0]?.studentProfileId).toBe('s3');
  });

  it('excludes unevaluated students from ranking and pass/fail percentages', () => {
    const bundle = makeBundle({
      students: [
        { studentProfileId: 's1', name: 'Ada Lovelace', matricule: 'AC-001' },
        { studentProfileId: 's2', name: 'Alan Turing', matricule: 'AC-002' },
        { studentProfileId: 's3', name: 'No Marks', matricule: 'AC-003' },
      ],
    });
    const report = buildClassReport(bundle, { kind: 'term', term: '1' });
    expect(report.stats.classSize).toBe(3);
    expect(report.stats.evaluated).toBe(2);
    expect(report.stats.unevaluated).toBe(1);
    expect(report.unevaluated).toEqual([
      { studentProfileId: 's3', name: 'No Marks', matricule: 'AC-003' },
    ]);
    expect(report.ranked).toHaveLength(2);
    expect(report.stats.passPercent).toBe(50);
  });

  it('returns the full ranked list when the class is smaller than N', () => {
    const bundle = makeBundle();
    const report = buildClassReport(bundle, { kind: 'term', term: '1' }, { topN: 5 });
    expect(report.top).toHaveLength(2);
    expect(report.bottom).toHaveLength(2);
    expect(report.top).toEqual(report.ranked);
  });

  it('slices top and bottom N when the class is larger', () => {
    const students = Array.from({ length: 8 }, (_, index) => ({
      studentProfileId: `s${index + 1}`,
      name: `Student ${index + 1}`,
      matricule: `AC-00${index + 1}`,
    }));
    const marks = students.flatMap((student, index) => [
      mark(student.studentProfileId, 'math', 1, 18 - index),
      mark(student.studentProfileId, 'eng', 1, 18 - index),
    ]);
    const report = buildClassReport(
      makeBundle({ students, marks }),
      { kind: 'term', term: '1' },
      { topN: 5 },
    );
    expect(report.top).toHaveLength(5);
    expect(report.bottom).toHaveLength(5);
    expect(report.top[0]?.studentProfileId).toBe('s1');
    expect(report.bottom[4]?.studentProfileId).toBe('s8');
  });
});

describe('class-report access', () => {
  it('lets admins through', () => {
    expect(
      decideClassReportAccess({
        roleSlug: 'admin',
        classId: 'class-a',
      }),
    ).toBe(true);
    expect(
      decideClassReportAccess({
        roleSlug: 'registrar',
        classId: 'class-a',
      }),
    ).toBe(true);
  });

  it('allows the class master on Class.staffProfileId', () => {
    expect(
      decideClassReportAccess({
        roleSlug: 'teacher',
        classId: 'class-a',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: 'staff-1',
        yearAssignedClassIds: [],
      }),
    ).toBe(true);
  });

  it('allows a year-scoped StaffClassAssignment', () => {
    expect(
      decideClassReportAccess({
        roleSlug: 'lecturer',
        classId: 'class-a',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: 'someone-else',
        yearAssignedClassIds: ['class-b', 'class-a'],
      }),
    ).toBe(true);
  });

  it('denies subject-only teachers and other class masters', () => {
    expect(
      decideClassReportAccess({
        roleSlug: 'teacher',
        classId: 'class-a',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: 'staff-2',
        yearAssignedClassIds: [],
      }),
    ).toBe(false);
    expect(
      decideClassReportAccess({
        roleSlug: 'staff',
        classId: 'class-a',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: 'staff-2',
        yearAssignedClassIds: ['class-b'],
      }),
    ).toBe(false);
  });

  it('denies students and guardians', () => {
    expect(
      decideClassReportAccess({
        roleSlug: 'student',
        classId: 'class-a',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: 'staff-1',
      }),
    ).toBe(false);
    expect(
      decideClassReportAccess({
        roleSlug: 'parent',
        classId: 'class-a',
      }),
    ).toBe(false);
  });
});

describe('class-report menu', () => {
  it('adds class report for admins and class masters', () => {
    const adminReports = getMenuForRole('admin').find((item) => item.titleKey === 'nav.reports');
    expect(adminReports?.children?.some((child) => child.path === '/reports/class')).toBe(true);
    expect(adminReports?.children?.some((child) => child.path === '/reports/absences')).toBe(
      true,
    );
    expect(getMenuForRole('teacher').some((item) => item.path === '/reports/class')).toBe(true);
    expect(getMenuForRole('teacher').some((item) => item.path === '/reports/absences')).toBe(
      true,
    );
  });
});
