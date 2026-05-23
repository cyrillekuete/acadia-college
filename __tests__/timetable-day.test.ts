import { describe, expect, it } from 'vitest';
import {
  countTimetableSlotsForDay,
  getTimetableDayOfWeek,
} from '@/lib/acadia/timetable';

describe('getTimetableDayOfWeek', () => {
  it('maps Monday to 1', () => {
    expect(getTimetableDayOfWeek(new Date('2026-05-18T12:00:00'))).toBe(1);
  });

  it('maps Sunday to 7', () => {
    expect(getTimetableDayOfWeek(new Date('2026-05-17T12:00:00'))).toBe(7);
  });

  it('maps Saturday to 6', () => {
    expect(getTimetableDayOfWeek(new Date('2026-05-16T12:00:00'))).toBe(6);
  });
});

describe('countTimetableSlotsForDay', () => {
  const slots = [
    { dayOfWeek: 1 },
    { dayOfWeek: 1 },
    { dayOfWeek: 3 },
    { dayOfWeek: 5 },
  ];

  it('counts slots for the requested day', () => {
    expect(countTimetableSlotsForDay(slots, 1)).toBe(2);
    expect(countTimetableSlotsForDay(slots, 3)).toBe(1);
  });

  it('returns 0 when no slots match', () => {
    expect(countTimetableSlotsForDay(slots, 7)).toBe(0);
    expect(countTimetableSlotsForDay([], 1)).toBe(0);
  });
});
