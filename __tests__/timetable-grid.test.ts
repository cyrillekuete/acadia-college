import { describe, expect, it } from 'vitest';
import {
  groupGridSlotsByDay,
  mapTimetableRowToGridSlot,
  TIMETABLE_GRID_DAYS,
  timetableGridSlotToRecord,
} from '@/lib/acadia/timetable-grid';
import type { TimetableSlotListRow } from '@/lib/supabase/queries/timetable';

function makeRow(overrides: Partial<TimetableSlotListRow> = {}): TimetableSlotListRow {
  return {
    id: 'slot-1',
    tenantId: 'tenant-1',
    academicYearId: 'year-1',
    classId: 'class-1',
    subjectId: 'sub-1',
    staffProfileId: 'staff-1',
    roomId: 'room-1',
    dayOfWeek: 2,
    startMinutes: 480,
    endMinutes: 540,
    Subject: { code: 'MATH', nameEn: 'Mathematics' },
    Class: { name: 'Form 5A' },
    StaffProfile: {
      staffCode: 'T001',
      User: { name: 'Jane Doe' },
    },
    Room: { code: 'R101' },
    ...overrides,
  };
}

describe('mapTimetableRowToGridSlot', () => {
  it('maps embedded relations to display fields', () => {
    const slot = mapTimetableRowToGridSlot(makeRow());
    expect(slot.subjectCode).toBe('MATH');
    expect(slot.subjectName).toBe('Mathematics');
    expect(slot.teacherName).toBe('Jane Doe');
    expect(slot.roomCode).toBe('R101');
    expect(slot.className).toBe('Form 5A');
  });
});

describe('groupGridSlotsByDay', () => {
  it('returns all grid days with empty arrays when no slots', () => {
    const grouped = groupGridSlotsByDay([]);
    for (const day of TIMETABLE_GRID_DAYS) {
      expect(grouped.get(day)).toEqual([]);
    }
  });

  it('sorts slots within each day by start time', () => {
    const slots = [
      mapTimetableRowToGridSlot(
        makeRow({ id: 'late', dayOfWeek: 1, startMinutes: 600, endMinutes: 660 }),
      ),
      mapTimetableRowToGridSlot(
        makeRow({ id: 'early', dayOfWeek: 1, startMinutes: 480, endMinutes: 540 }),
      ),
    ];
    const monday = groupGridSlotsByDay(slots).get(1)!;
    expect(monday.map((slot) => slot.id)).toEqual(['early', 'late']);
  });
});

describe('timetableGridSlotToRecord', () => {
  it('strips display-only fields for the form dialog', () => {
    const slot = mapTimetableRowToGridSlot(makeRow());
    expect(timetableGridSlotToRecord(slot)).toEqual({
      id: 'slot-1',
      academicYearId: 'year-1',
      classId: 'class-1',
      subjectId: 'sub-1',
      staffProfileId: 'staff-1',
      roomId: 'room-1',
      dayOfWeek: 2,
      startMinutes: 480,
      endMinutes: 540,
    });
  });
});
