/**
 * Wave 7E unit tests
 * Covers: subject schemas, subject helpers, timetable utilities
 */
import { describe, it, expect } from 'vitest';
import { subjectTypeLabel } from '@/lib/acadia/subject-catalog';
import { buildSubjectRow, canEditSubject } from '@/lib/acadia/subject';
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

describe('subjectSchema', () => {
  it('requires catalog placement and term', () => {
    const result = subjectSchema.safeParse({
      code: 'MATH101',
      nameEn: 'Mathematics',
      nameFr: 'Mathématiques',
      credits: 3,
      hours: 45,
      academicYearId: 'year-1',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      specialtyId: 'spec-1',
      levelId: 'level-1',
      termId: 'term-1',
      subjectType: 'TRADE_SUBJECTS',
      coefficient: 2,
      groupingId: '',
      hasSubBranches: false,
      subBranches: [],
    });
    expect(result.success).toBe(true);
  });

  it('requires sub-branches when hasSubBranches is true', () => {
    const result = subjectSchema.safeParse({
      code: 'MATH101',
      nameEn: 'Mathematics',
      nameFr: 'Mathématiques',
      credits: 3,
      hours: 45,
      academicYearId: 'year-1',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      specialtyId: 'spec-1',
      levelId: 'level-1',
      termId: 'term-1',
      subjectType: 'OTHERS',
      coefficient: 1,
      groupingId: '',
      hasSubBranches: true,
      subBranches: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid subject code', () => {
    const result = subjectSchema.safeParse({
      code: '',
      nameEn: 'Mathematics',
      nameFr: 'Mathématiques',
      credits: 3,
      hours: 45,
      academicYearId: 'year-1',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      specialtyId: 'spec-1',
      levelId: 'level-1',
      termId: 'term-1',
      subjectType: 'OTHERS',
      coefficient: 1,
      groupingId: '',
      hasSubBranches: false,
      subBranches: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('subjectTypeLabel', () => {
  it('returns human-readable labels', () => {
    expect(subjectTypeLabel('LANGUAGES')).toBe('Languages');
    expect(subjectTypeLabel('TRADE_SUBJECTS')).toBe('Trade subjects');
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
        nameFr: 'Maths',
        credits: 4,
        hours: 60,
        academicYearId: 'year-1',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        specialtyId: 'spec-1',
        levelId: 'level-1',
        termId: 'term-1',
        subjectType: 'RELATED_TRADE_SUBJECTS',
        coefficient: 3,
        groupingId: 'grp-1',
        hasSubBranches: true,
        subBranches: [{ name: 'Pure Maths', coefficient: 2 }],
      },
      '2026-05-19T00:00:00.000Z',
    );
    expect(row.code).toBe('MATH101');
    expect(row.termId).toBe('term-1');
    expect(row.subjectType).toBe('RELATED_TRADE_SUBJECTS');
    expect(row.coefficient).toBe(3);
    expect(row.groupingId).toBe('grp-1');
    expect(row.hasSubBranches).toBe(true);
    expect(row.deactivatedAt).toBeNull();
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
