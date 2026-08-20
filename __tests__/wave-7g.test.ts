/**
 * Attendance edge-case unit tests
 */
import { describe, it, expect } from 'vitest';
import {
  ATTENDANCE_ROSTER_ENROLLMENT_STATUS,
  ATTENDANCE_STATUSES,
  buildAttendanceSessionRow,
  buildAttendanceSessionUpdateRow,
  buildAttendanceSummaryCsv,
  chunkIds,
  computeAttendancePercentage,
  computeWeightedAttendancePercentage,
  countAttendanceStatuses,
  detectAttendancePatterns,
  enrollmentBelongsOnAttendanceRoster,
  formatAttendancePercentage,
  isSessionDateInAcademicYear,
  normalizeReportDateRange,
  patternFlagLabel,
  shouldNotifyGuardian,
  summarizeStudentAttendance,
} from '@/lib/acadia/attendance';
import {
  attendanceRecordEntrySchema,
  attendanceReportFiltersSchema,
  attendanceSessionSchema,
} from '@/lib/acadia/attendance-schemas';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import {
  canViewAttendance,
  canViewAttendanceAnalytics,
  canViewAttendanceReports,
} from '@/lib/acadia/roles';
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
});

describe('attendanceSessionSchema', () => {
  it('requires year, class, subject, and session date', () => {
    expect(
      attendanceSessionSchema.safeParse({
        academicYearId: 'year-1',
        classId: 'class-1',
        subjectId: 'subject-1',
        sessionDate: '2026-05-19',
      }).success,
    ).toBe(true);
  });

  it('rejects missing classId', () => {
    expect(
      attendanceSessionSchema.safeParse({
        academicYearId: 'year-1',
        subjectId: 'subject-1',
        sessionDate: '2026-05-19',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid date format', () => {
    expect(
      attendanceSessionSchema.safeParse({
        academicYearId: 'year-1',
        classId: 'class-1',
        subjectId: 'subject-1',
        sessionDate: '19/05/2026',
      }).success,
    ).toBe(false);
  });
});

describe('attendanceReportFiltersSchema', () => {
  it('rejects inverted date ranges', () => {
    const result = attendanceReportFiltersSchema.safeParse({
      academicYearId: 'year-1',
      fromDate: '2026-06-01',
      toDate: '2026-05-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts ordered date ranges', () => {
    expect(
      attendanceReportFiltersSchema.safeParse({
        academicYearId: 'year-1',
        fromDate: '2026-05-01',
        toDate: '2026-06-01',
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

describe('isSessionDateInAcademicYear', () => {
  it('allows dates inside year bounds', () => {
    expect(
      isSessionDateInAcademicYear('2026-05-19', '2026-09-01', '2027-06-30'),
    ).toBe(false);
    expect(
      isSessionDateInAcademicYear('2026-10-19', '2026-09-01', '2027-06-30'),
    ).toBe(true);
  });

  it('rejects dates outside bounds', () => {
    expect(
      isSessionDateInAcademicYear('2026-08-31', '2026-09-01', '2027-06-30'),
    ).toBe(false);
    expect(
      isSessionDateInAcademicYear('2027-07-01', '2026-09-01', '2027-06-30'),
    ).toBe(false);
  });
});

describe('normalizeReportDateRange', () => {
  it('swaps inverted ranges', () => {
    expect(normalizeReportDateRange('2026-06-01', '2026-05-01')).toEqual({
      fromDate: '2026-05-01',
      toDate: '2026-06-01',
      inverted: true,
    });
  });
});

describe('chunkIds', () => {
  it('chunks ids for PostgREST .in() limits', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
    const chunks = chunkIds(ids, 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });
});

describe('session row builders', () => {
  it('includes classId on create and omits creator on update', () => {
    const values = {
      academicYearId: 'year-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      sessionDate: '2026-05-19',
      label: '',
      timetableSlotId: '',
    };
    const created = buildAttendanceSessionRow(
      'tenant-1',
      'att-1',
      values,
      'user-1',
      '2026-05-19T00:00:00.000Z',
    );
    expect(created.classId).toBe('class-1');
    expect(created.createdByUserId).toBe('user-1');

    const updated = buildAttendanceSessionUpdateRow(
      values,
      '2026-05-20T00:00:00.000Z',
    );
    expect(updated.classId).toBe('class-1');
    expect(updated).not.toHaveProperty('createdByUserId');
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

describe('computeWeightedAttendancePercentage', () => {
  it('matches overall mark-level rate', () => {
    expect(
      computeWeightedAttendancePercentage([
        'PRESENT',
        'PRESENT',
        'ABSENT',
        'ABSENT',
      ]),
    ).toBe(50);
  });
});

describe('detectAttendancePatterns', () => {
  it('requires minimum sessions before flagging absences', () => {
    const summaries = summarizeStudentAttendance([
      { studentProfileId: 'a', status: 'ABSENT' },
      { studentProfileId: 'a', status: 'ABSENT' },
      { studentProfileId: 'a', status: 'ABSENT' },
    ]);
    const patterns = detectAttendancePatterns(summaries);
    expect(patterns.some((p) => p.studentProfileId === 'a')).toBe(true);
  });

  it('does not flag high absences with fewer than 3 sessions', () => {
    const summaries = summarizeStudentAttendance([
      { studentProfileId: 'a', status: 'ABSENT' },
      { studentProfileId: 'a', status: 'ABSENT' },
    ]);
    expect(detectAttendancePatterns(summaries)).toHaveLength(0);
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

describe('buildAttendanceSummaryCsv', () => {
  it('escapes commas and quotes', () => {
    const csv = buildAttendanceSummaryCsv([
      {
        name: 'Doe, Jane',
        registrationNumber: 'STU-1',
        sessions: 2,
        present: 1,
        absent: 1,
        late: 0,
        excused: 0,
        percentage: 50,
      },
    ]);
    expect(csv).toContain('"Doe, Jane"');
    expect(csv).toContain('STU-1');
  });
});

describe('attendance role access', () => {
  it('gates reports and analytics by role', () => {
    expect(canViewAttendance('guardian')).toBe(true);
    expect(canViewAttendanceReports('guardian')).toBe(false);
    expect(canViewAttendanceAnalytics('staff')).toBe(false);
    expect(canViewAttendanceAnalytics('admin')).toBe(true);
    expect(canViewAttendanceReports('teacher')).toBe(true);
  });
});
