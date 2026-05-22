import { describe, expect, it } from 'vitest';
import {
  findTimetableSlotConflicts,
  formatTimetableConflictMessage,
  groupTimetableSlotsByDay,
  normalizeTimetableClassId,
  timeRangesOverlap,
  type TimetableSlotInterval,
} from '@/lib/acadia/timetable-validation';

const baseSlot = (
  overrides: Partial<TimetableSlotInterval> = {},
): TimetableSlotInterval => ({
  id: 'slot-1',
  classId: 'class-a',
  staffProfileId: 'teacher-1',
  roomId: 'room-1',
  dayOfWeek: 1,
  startMinutes: 8 * 60,
  endMinutes: 9 * 60,
  ...overrides,
});

describe('timeRangesOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(timeRangesOverlap(480, 540, 510, 570)).toBe(true);
  });

  it('treats back-to-back ranges as non-overlapping', () => {
    expect(timeRangesOverlap(480, 540, 540, 600)).toBe(false);
  });
});

describe('findTimetableSlotConflicts', () => {
  it('flags teacher, room, and class conflicts separately', () => {
    const existing = [baseSlot({ id: 'existing-1' })];
    const candidate = baseSlot({ id: 'candidate' });

    const conflicts = findTimetableSlotConflicts(existing, candidate);
    expect(conflicts.map((c) => c.kind).sort()).toEqual(['class', 'room', 'teacher']);
  });

  it('ignores the slot being edited', () => {
    const existing = [baseSlot({ id: 'slot-1' })];
    const candidate = baseSlot({ id: 'slot-1', startMinutes: 9 * 60, endMinutes: 10 * 60 });

    expect(findTimetableSlotConflicts(existing, candidate, 'slot-1')).toEqual([]);
  });

  it('skips class conflict when either slot has no classId', () => {
    const existing = [baseSlot({ id: 'existing-1', classId: null })];
    const candidate = baseSlot({ id: 'candidate', classId: 'class-a' });

    const conflicts = findTimetableSlotConflicts(existing, candidate);
    expect(conflicts.some((c) => c.kind === 'class')).toBe(false);
  });
});

describe('formatTimetableConflictMessage', () => {
  it('formats teacher conflicts', () => {
    expect(
      formatTimetableConflictMessage({
        kind: 'teacher',
        existingSlotId: 'slot-1',
        dayOfWeek: 1,
        startMinutes: 480,
        endMinutes: 540,
      }),
    ).toBe('This teacher already has a slot on Monday 08:00 – 09:00.');
  });
});

describe('normalizeTimetableClassId', () => {
  it('returns null for blank values', () => {
    expect(normalizeTimetableClassId('')).toBeNull();
    expect(normalizeTimetableClassId('   ')).toBeNull();
    expect(normalizeTimetableClassId(undefined)).toBeNull();
  });

  it('trims non-empty values', () => {
    expect(normalizeTimetableClassId(' class-1 ')).toBe('class-1');
  });
});

describe('groupTimetableSlotsByDay', () => {
  it('groups and sorts by start time within each day', () => {
    const grouped = groupTimetableSlotsByDay([
      { dayOfWeek: 2, startMinutes: 600, id: 'late' },
      { dayOfWeek: 1, startMinutes: 540, id: 'mon' },
      { dayOfWeek: 2, startMinutes: 480, id: 'early' },
    ]);

    expect([...grouped.keys()].sort((a, b) => a - b)).toEqual([1, 2]);
    expect(grouped.get(2)?.map((slot) => slot.id)).toEqual(['early', 'late']);
  });
});
