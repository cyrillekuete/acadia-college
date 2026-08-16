/**
 * Wave 7G unit tests
 * Covers: attendance schemas, percentages, pattern detection
 */
import { describe, it, expect } from 'vitest';
import {
  ATTENDANCE_ROSTER_ENROLLMENT_STATUS,
  ATTENDANCE_STATUSES,
  computeAttendancePercentage,
  countAttendanceStatuses,
  detectAttendancePatterns,
  enrollmentBelongsOnAttendanceRoster,
  formatAttendancePercentage,
  patternFlagLabel,
  shouldNotifyGuardian,
  summarizeStudentAttendance,
} from '@/lib/acadia/attendance';
import {
  attendanceRecordEntrySchema,
  attendanceSessionSchema,
} from '@/lib/acadia/attendance-schemas';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { getQueryErrorMessage, isMissingRelationError } from '@/lib/acadia/query-errors';

describe('getQueryErrorMessage', () => {
  it('extracts message from Error and PostgREST-like objects', () => {
    expect(getQueryErrorMessage(new Error('Permission denied'))).toBe(
      'Permission denied',
    );
    expect(getQueryErrorMessage({ message: 'Invalid course' })).toBe(
      'Invalid course',
    );
    expect(getQueryErrorMessage(null)).toBe('Failed to load data.');
  });

  it('detects a missing PostgREST table', () => {
    expect(
      isMissingRelationError({
        code: 'PGRST205',
        message: "Could not find the table 'public.ReportCardTemplatePreference' in the schema cache",
      }),
    ).toBe(true);
    expect(isMissingRelationError({ code: '42501', message: 'permission denied' })).toBe(
      false,
    );
  });
});

describe('formatLocalDateInputValue', () => {
  it('uses local calendar components', () => {
    const date = new Date(2026, 4, 19, 12, 0, 0);
    expect(formatLocalDateInputValue(date)).toBe('2026-05-19');
  });

  it('avoids UTC day shift from toISOString when timezones diverge', () => {
    const lateLocal = new Date(2026, 4, 19, 23, 30, 0);
    const local = formatLocalDateInputValue(lateLocal);
    const utc = lateLocal.toISOString().slice(0, 10);
    expect(local).toBe('2026-05-19');
    if (utc !== local) {
      expect(utc).toBe('2026-05-20');
    }
  });
});

describe('attendanceSessionSchema', () => {
  it('requires year, subject, and session date', () => {
    expect(
      attendanceSessionSchema.safeParse({
        academicYearId: 'year-1',
        subjectId: 'subject-1',
        sessionDate: '2026-05-19',
      }).success,
    ).toBe(true);
  });
});

describe('attendanceRecordEntrySchema', () => {
  it('accepts valid status values', () => {
    for (const status of ATTENDANCE_STATUSES) {
      expect(
        attendanceRecordEntrySchema.safeParse({
          studentProfileId: 'student-1',
          status,
        }).success,
      ).toBe(true);
    }
  });
});

describe('computeAttendancePercentage', () => {
  it('counts present and late as attended', () => {
    expect(
      computeAttendancePercentage([
        'PRESENT',
        'LATE',
        'ABSENT',
        'EXCUSED',
      ]),
    ).toBe(66.7);
  });

  it('returns null when no countable sessions', () => {
    expect(computeAttendancePercentage(['EXCUSED'])).toBeNull();
  });
});

describe('detectAttendancePatterns', () => {
  it('flags students with high absences', () => {
    const summaries = summarizeStudentAttendance([
      { studentProfileId: 'a', status: 'ABSENT' },
      { studentProfileId: 'a', status: 'ABSENT' },
      { studentProfileId: 'a', status: 'ABSENT' },
      { studentProfileId: 'b', status: 'PRESENT' },
    ]);
    const patterns = detectAttendancePatterns(summaries);
    expect(patterns.some((p) => p.studentProfileId === 'a')).toBe(true);
    expect(patterns.find((p) => p.studentProfileId === 'a')?.flags).toContain(
      'high_absence',
    );
  });
});

describe('shouldNotifyGuardian', () => {
  it('notifies for absent and late only', () => {
    expect(shouldNotifyGuardian('ABSENT')).toBe(true);
    expect(shouldNotifyGuardian('LATE')).toBe(true);
    expect(shouldNotifyGuardian('PRESENT')).toBe(false);
    expect(shouldNotifyGuardian('EXCUSED')).toBe(false);
  });
});

describe('countAttendanceStatuses', () => {
  it('aggregates status counts', () => {
    const totals = countAttendanceStatuses([
      'PRESENT',
      'ABSENT',
      'LATE',
      'EXCUSED',
    ]);
    expect(totals).toEqual({
      present: 1,
      absent: 1,
      late: 1,
      excused: 1,
      total: 4,
    });
  });
});

describe('formatAttendancePercentage', () => {
  it('formats rate with one decimal', () => {
    expect(formatAttendancePercentage(92.5)).toBe('92.5%');
    expect(formatAttendancePercentage(null)).toBe('—');
  });
});

describe('patternFlagLabel', () => {
  it('returns human-readable labels', () => {
    expect(patternFlagLabel('low_attendance')).toBe('Low attendance rate');
  });
});

describe('attendance roster enrollment status', () => {
  it('includes ENROLLED students and excludes ACTIVE/WITHDRAWN', () => {
    const statuses = ['ENROLLED', 'ACTIVE', 'WITHDRAWN', null];
    expect(statuses.filter(enrollmentBelongsOnAttendanceRoster)).toEqual([
      'ENROLLED',
    ]);
    expect(ATTENDANCE_ROSTER_ENROLLMENT_STATUS).toBe('ENROLLED');
  });
});
