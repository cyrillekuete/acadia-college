/**
 * Wave 7E unit tests
 * Covers: subject schemas, subject helpers, timetable utilities
 */
import { describe, it, expect } from 'vitest';
import { subjectTypeLabel, subBranchNameFr, resolveSubBranchCoefficient } from '@/lib/acadia/subject-catalog';
import {
  buildSubjectRow,
  canEditSubject,
  rowMatchesSubjectListFilters,
} from '@/lib/acadia/subject';
import {
  subjectAssignmentSchema,
  subjectMaterialSchema,
  subjectSchema,
  timetableSlotSchema,
} from '@/lib/acadia/subject-schemas';
import {
  dayOfWeekLabel,
  formatTimeRange,
  minutesToTimeString,
  timeStringToMinutes,
} from '@/lib/acadia/timetable';

const baseSubjectValues = {
  code: 'MATH101',
  nameEn: 'Mathematics',
  academicYearId: 'year-1',
  subSystem: 'ENGLISH' as const,
  branch: 'GRAMMAR' as const,
  levelIds: ['level-1'],
  coefficient: 2,
  groupingId: '',
  hasSubBranches: false,
  subBranches: [],
};

describe('subjectSchema', () => {
  it('requires catalog placement fields', () => {
    const result = subjectSchema.safeParse(baseSubjectValues);
    expect(result.success).toBe(true);
  });

  it('requires sub-branches when hasSubBranches is true', () => {
    const result = subjectSchema.safeParse({
      ...baseSubjectValues,
      coefficient: 1,
      hasSubBranches: true,
      subBranches: [],
    });
    expect(result.success).toBe(false);
  });

  it('does not require a term id', () => {
    const result = subjectSchema.safeParse(baseSubjectValues);
    expect(result.success).toBe(true);
  });

  it('rejects invalid subject code', () => {
    const result = subjectSchema.safeParse({
      ...baseSubjectValues,
      code: '',
      coefficient: 1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts sub-branches without custom coefficients', () => {
    const result = subjectSchema.safeParse({
      ...baseSubjectValues,
      hasSubBranches: true,
      subBranches: [{ name: 'Pure Maths', hasCustomCoefficient: false }],
    });
    expect(result.success).toBe(true);
  });

  it('requires coefficient when sub-branch custom coefficient is enabled', () => {
    const result = subjectSchema.safeParse({
      ...baseSubjectValues,
      hasSubBranches: true,
      subBranches: [{ name: 'Pure Maths', hasCustomCoefficient: true }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts sub-branches with custom coefficients', () => {
    const result = subjectSchema.safeParse({
      ...baseSubjectValues,
      hasSubBranches: true,
      subBranches: [{ name: 'Pure Maths', hasCustomCoefficient: true, coefficient: 2 }],
    });
    expect(result.success).toBe(true);
  });
});

describe('subjectTypeLabel', () => {
  it('returns human-readable labels', () => {
    expect(subjectTypeLabel('LANGUAGES')).toBe('Languages');
    expect(subjectTypeLabel('TRADE_SUBJECTS')).toBe('Trade subjects');
  });
});

describe('resolveSubBranchCoefficient', () => {
  it('inherits subject coefficient when sub-branch coefficient is null', () => {
    expect(resolveSubBranchCoefficient({ coefficient: null }, 3)).toBe(3);
    expect(resolveSubBranchCoefficient({}, 3)).toBe(3);
  });

  it('uses custom sub-branch coefficient when set', () => {
    expect(resolveSubBranchCoefficient({ coefficient: 2 }, 3)).toBe(2);
  });
});

describe('subBranchNameFr', () => {
  it('falls back to English name when French is blank', () => {
    expect(subBranchNameFr({ name: 'Pure Maths', nameFr: '' })).toBe('Pure Maths');
    expect(subBranchNameFr({ name: 'Pure Maths' })).toBe('Pure Maths');
  });

  it('uses French name when provided', () => {
    expect(subBranchNameFr({ name: 'Pure Maths', nameFr: 'Maths pures' })).toBe(
      'Maths pures',
    );
  });
});

describe('rowMatchesSubjectListFilters', () => {
  const row = {
    deactivatedAt: null,
    groupingId: 'grp-1',
    levelIds: ['level-1'],
    termId: 'term-1',
  };

  it('filters by active status by default', () => {
    expect(
      rowMatchesSubjectListFilters(row, {
        status: 'active',
        groupingId: null,
        levelId: null,
        termId: null,
      }),
    ).toBe(true);
    expect(
      rowMatchesSubjectListFilters(
        { ...row, deactivatedAt: '2026-01-01T00:00:00.000Z' },
        {
          status: 'active',
          groupingId: null,
          levelId: null,
          termId: null,
        },
      ),
    ).toBe(false);
  });

  it('filters by grouping, level, and term', () => {
    expect(
      rowMatchesSubjectListFilters(row, {
        status: 'all',
        groupingId: 'grp-1',
        levelId: 'level-1',
        termId: 'term-1',
      }),
    ).toBe(true);
    expect(
      rowMatchesSubjectListFilters(row, {
        status: 'all',
        groupingId: 'grp-2',
        levelId: null,
        termId: null,
      }),
    ).toBe(false);
  });

  it('includes all-terms subjects when filtering by term', () => {
    expect(
      rowMatchesSubjectListFilters(
        { ...row, termId: null },
        {
          status: 'all',
          groupingId: null,
          levelId: null,
          termId: 'term-1',
        },
      ),
    ).toBe(true);
  });
});

describe('subjectAssignmentSchema', () => {
  it('requires teacher and academic year', () => {
    expect(
      subjectAssignmentSchema.safeParse({
        academicYearId: 'year-1',
        staffProfileId: 'staff-1',
        isLead: true,
        teachesPrimaryHome: true,
      }).success,
    ).toBe(true);
  });
});

describe('timetableSlotSchema', () => {
  it('requires end time after start time', () => {
    expect(
      timetableSlotSchema.safeParse({
        academicYearId: 'year-1',
        classId: 'class-1',
        subjectId: 'subject-1',
        staffProfileId: 'staff-1',
        roomId: 'room-1',
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '09:00',
      }).success,
    ).toBe(false);
    expect(
      timetableSlotSchema.safeParse({
        academicYearId: 'year-1',
        classId: 'class-1',
        subjectId: 'subject-1',
        staffProfileId: 'staff-1',
        roomId: 'room-1',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:30',
      }).success,
    ).toBe(true);
  });
});

describe('subjectMaterialSchema', () => {
  it('requires bilingual titles and due date', () => {
    expect(
      subjectMaterialSchema.safeParse({
        academicYearId: 'year-1',
        titleEn: 'Chapter 1',
        titleFr: 'Chapitre 1',
        dueAt: '2026-09-01T12:00',
        maxScore: 20,
        isPublished: true,
      }).success,
    ).toBe(true);
  });
});

describe('buildSubjectRow', () => {
  it('normalizes code and maps catalog fields', () => {
    const row = buildSubjectRow(
      'tenant-1',
      'subject-1',
      {
        code: ' math101 ',
        nameEn: 'Math',
        academicYearId: 'year-1',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        levelIds: ['level-1'],
        coefficient: 3,
        groupingId: 'grp-1',
        hasSubBranches: true,
        subBranches: [{ name: 'Pure Maths', hasCustomCoefficient: true, coefficient: 2 }],
      },
      '2026-05-19T00:00:00.000Z',
      'RELATED_TRADE_SUBJECTS',
    );
    expect(row.code).toBe('MATH101');
    expect(row.nameFr).toBe('Math');
    expect(row.credits).toBe(1);
    expect(row.hours).toBe(1);
    expect(row.termId).toBeNull();
    expect(row.academicYearId).toBe('year-1');
    expect(row.subjectType).toBe('RELATED_TRADE_SUBJECTS');
    expect(row.coefficient).toBe(3);
    expect(row.groupingId).toBe('grp-1');
    expect(row.hasSubBranches).toBe(true);
    expect(row.levelId).toBe('level-1');
    expect(row.deactivatedAt).toBeNull();
  });

  it('defaults subject type to OTHERS', () => {
    const row = buildSubjectRow(
      'tenant-1',
      'subject-1',
      baseSubjectValues,
      '2026-05-19T00:00:00.000Z',
    );
    expect(row.subjectType).toBe('OTHERS');
  });
});

describe('canEditSubject', () => {
  it('returns false when deactivated', () => {
    expect(canEditSubject('2026-01-01T00:00:00.000Z')).toBe(false);
    expect(canEditSubject(null)).toBe(true);
  });
});

describe('timetable helpers', () => {
  it('converts minutes and formats ranges', () => {
    expect(minutesToTimeString(510)).toBe('08:30');
    expect(timeStringToMinutes('08:30')).toBe(510);
    expect(formatTimeRange(480, 540)).toBe('08:00 – 09:00');
    expect(dayOfWeekLabel(3)).toBe('Wednesday');
    expect(dayOfWeekLabel(undefined)).toBe('—');
  });
});
