import { describe, expect, it } from 'vitest';
import {
  checkEnrollmentWindow,
  checkExamPeriodWindow,
  checkMarkEntryWindow,
  isWithinCalendarWindow,
  milestonesOnDate,
  resolveEnrollmentWindow,
  todayDateOnly,
} from '@/lib/acadia/calendar-milestones';

describe('todayDateOnly', () => {
  it('uses the local calendar date, not UTC', () => {
    expect(todayDateOnly(new Date(2026, 0, 15, 0, 30, 0))).toBe('2026-01-15');
  });
});

describe('isWithinCalendarWindow', () => {
  it('allows when no bounds are configured', () => {
    expect(isWithinCalendarWindow(null, null, '2026-03-15')).toEqual({
      allowed: true,
      opensOn: null,
      closesOn: null,
    });
  });

  it('blocks before open date', () => {
    const result = isWithinCalendarWindow('2026-04-01', '2026-06-01', '2026-03-15');
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('2026-04-01');
  });

  it('blocks after close date', () => {
    const result = isWithinCalendarWindow('2026-01-01', '2026-02-01', '2026-03-15');
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('2026-02-01');
  });

  it('allows inside the window', () => {
    expect(
      isWithinCalendarWindow('2026-01-01', '2026-12-31', '2026-06-01').allowed,
    ).toBe(true);
  });

  it('blocks inverted date bounds', () => {
    const result = isWithinCalendarWindow('2026-06-01', '2026-01-01', '2026-03-15');
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Invalid window configuration');
  });
});

describe('resolveEnrollmentWindow', () => {
  it('prefers milestone dates over year-level fields', () => {
    const bounds = resolveEnrollmentWindow(
      [
        { kind: 'ENROLLMENT_OPEN', onDate: '2026-02-01' },
        { kind: 'ENROLLMENT_CLOSE', onDate: '2026-03-01' },
      ],
      { enrollmentOpensAt: '2026-01-01', enrollmentClosesAt: '2026-04-01' },
    );
    expect(bounds).toEqual({ opensOn: '2026-02-01', closesOn: '2026-03-01' });
  });

  it('falls back to academic year enrollment dates', () => {
    const bounds = resolveEnrollmentWindow([], {
      enrollmentOpensAt: '2026-05-01T00:00:00Z',
      enrollmentClosesAt: '2026-05-31',
    });
    expect(bounds).toEqual({ opensOn: '2026-05-01', closesOn: '2026-05-31' });
  });
});

describe('feature window checks', () => {
  it('checks mark entry using milestone kinds', () => {
    const result = checkMarkEntryWindow(
      [
        { kind: 'MARK_ENTRY_OPEN', onDate: '2026-01-10' },
        { kind: 'MARK_ENTRY_CLOSE', onDate: '2026-01-20' },
      ],
      '2026-01-15',
    );
    expect(result.allowed).toBe(true);
  });

  it('checks exam period using milestone kinds', () => {
    const result = checkExamPeriodWindow(
      [
        { kind: 'EXAM_PERIOD_START', onDate: '2026-06-01' },
        { kind: 'EXAM_PERIOD_END', onDate: '2026-06-15' },
      ],
      '2026-05-01',
    );
    expect(result.allowed).toBe(false);
  });

  it('checks enrollment with combined sources', () => {
    const result = checkEnrollmentWindow(
      [],
      {
        enrollmentOpensAt: '2026-01-01',
        enrollmentClosesAt: '2026-12-31',
      },
      '2026-06-01',
    );
    expect(result.allowed).toBe(true);
  });
});

describe('milestonesOnDate', () => {
  it('returns milestones for a given day', () => {
    expect(
      milestonesOnDate(
        [
          { kind: 'INSTRUCTION_START', onDate: '2026-09-01' },
          { kind: 'EXAM_PERIOD_START', onDate: '2026-09-01' },
          { kind: 'EXAM_PERIOD_END', onDate: '2026-09-30' },
        ],
        '2026-09-01',
      ),
    ).toHaveLength(2);
  });
});
