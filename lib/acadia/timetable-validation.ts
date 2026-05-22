import { dayOfWeekLabel, formatTimeRange } from '@/lib/acadia/timetable';

export type TimetableSlotInterval = {
  id?: string;
  classId?: string | null;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
};

export type TimetableSlotConflictKind = 'teacher' | 'room' | 'class';

export type TimetableSlotConflict = {
  kind: TimetableSlotConflictKind;
  existingSlotId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
};

/** True when two half-open minute ranges [start, end) overlap. */
export function timeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

export function findTimetableSlotConflicts(
  existing: TimetableSlotInterval[],
  candidate: TimetableSlotInterval,
  excludeSlotId?: string,
): TimetableSlotConflict[] {
  const conflicts: TimetableSlotConflict[] = [];

  for (const slot of existing) {
    if (excludeSlotId && slot.id === excludeSlotId) {
      continue;
    }
    if (slot.dayOfWeek !== candidate.dayOfWeek) {
      continue;
    }
    if (
      !timeRangesOverlap(
        candidate.startMinutes,
        candidate.endMinutes,
        slot.startMinutes,
        slot.endMinutes,
      )
    ) {
      continue;
    }

    if (slot.staffProfileId === candidate.staffProfileId) {
      conflicts.push({
        kind: 'teacher',
        existingSlotId: slot.id ?? '',
        dayOfWeek: slot.dayOfWeek,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
      });
    }

    if (slot.roomId === candidate.roomId) {
      conflicts.push({
        kind: 'room',
        existingSlotId: slot.id ?? '',
        dayOfWeek: slot.dayOfWeek,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
      });
    }

    const candidateClassId = candidate.classId?.trim();
    const slotClassId = slot.classId?.trim();
    if (
      candidateClassId &&
      slotClassId &&
      candidateClassId === slotClassId
    ) {
      conflicts.push({
        kind: 'class',
        existingSlotId: slot.id ?? '',
        dayOfWeek: slot.dayOfWeek,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
      });
    }
  }

  return conflicts;
}

export function formatTimetableConflictMessage(
  conflict: TimetableSlotConflict,
): string {
  const when = `${dayOfWeekLabel(conflict.dayOfWeek)} ${formatTimeRange(
    conflict.startMinutes,
    conflict.endMinutes,
  )}`;

  switch (conflict.kind) {
    case 'teacher':
      return `This teacher already has a slot on ${when}.`;
    case 'room':
      return `This room is already booked on ${when}.`;
    case 'class':
      return `This class already has a slot on ${when}.`;
  }
}

export function normalizeTimetableClassId(
  classId: string | null | undefined,
): string | null {
  const trimmed = classId?.trim();
  return trimmed ? trimmed : null;
}

export function groupTimetableSlotsByDay<
  T extends { dayOfWeek: number; startMinutes: number },
>(slots: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const slot of slots) {
    const list = map.get(slot.dayOfWeek) ?? [];
    list.push(slot);
    map.set(slot.dayOfWeek, list);
  }
  for (const [day, list] of map) {
    list.sort((a, b) => a.startMinutes - b.startMinutes);
    map.set(day, list);
  }
  return map;
}
