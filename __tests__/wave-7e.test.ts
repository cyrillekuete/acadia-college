/**
 * Wave 7E unit tests
 * Covers: course schemas, course helpers, timetable utilities
 */
import { describe, it, expect } from 'vitest';
import { buildCourseRow, canEditCourse } from '@/lib/acadia/course';
import {
  courseAssignmentSchema,
  courseMaterialSchema,
  courseSchema,
  timetableSlotSchema,
} from '@/lib/acadia/course-schemas';
import {
  dayOfWeekLabel,
  formatTimeRange,
  minutesToTimeString,
  timeStringToMinutes,
} from '@/lib/acadia/timetable';

describe('courseSchema', () => {
  it('requires catalog placement and term', () => {
    const result = courseSchema.safeParse({
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
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid course code', () => {
    const result = courseSchema.safeParse({
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
    });
    expect(result.success).toBe(false);
  });
});

describe('courseAssignmentSchema', () => {
  it('requires teacher and academic year', () => {
    expect(
      courseAssignmentSchema.safeParse({
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
        courseId: 'course-1',
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
        courseId: 'course-1',
        staffProfileId: 'staff-1',
        roomId: 'room-1',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:30',
      }).success,
    ).toBe(true);
  });
});

describe('courseMaterialSchema', () => {
  it('requires bilingual titles and due date', () => {
    expect(
      courseMaterialSchema.safeParse({
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

describe('buildCourseRow', () => {
  it('normalizes code and maps catalog fields', () => {
    const row = buildCourseRow(
      'tenant-1',
      'course-1',
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
      },
      '2026-05-19T00:00:00.000Z',
    );
    expect(row.code).toBe('MATH101');
    expect(row.termId).toBe('term-1');
    expect(row.deactivatedAt).toBeNull();
  });
});

describe('canEditCourse', () => {
  it('returns false when deactivated', () => {
    expect(canEditCourse('2026-01-01T00:00:00.000Z')).toBe(false);
    expect(canEditCourse(null)).toBe(true);
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
