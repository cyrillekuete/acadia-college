import { DAY_OF_WEEK_LABELS } from '@/lib/acadia/timetable';
import { groupTimetableSlotsByDay } from '@/lib/acadia/timetable-validation';
import type { TimetableSlotListRow } from '@/lib/supabase/queries/timetable';
import { unwrapRelation } from '@/lib/acadia/record-display';

/** Default school week: Monday through Saturday. */
export const TIMETABLE_GRID_DAYS = [1, 2, 3, 4, 5, 6] as const;

export type TimetableGridSlot = {
  id: string;
  academicYearId: string;
  classId: string | null;
  subjectId: string;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  subjectCode: string | null;
  subjectName: string | null;
  teacherName: string | null;
  roomCode: string | null;
  className: string | null;
};

export function mapTimetableRowToGridSlot(
  row: TimetableSlotListRow,
): TimetableGridSlot {
  const subject = unwrapRelation<{ code?: string; nameEn?: string }>(row.Subject);
  const staff = unwrapRelation<{
    staffCode?: string;
    User?: unknown;
  }>(row.StaffProfile);
  const user = unwrapRelation<{ name?: string | null }>(staff?.User);
  const room = unwrapRelation<{ code?: string; nameEn?: string }>(row.Room);
  const classRow = unwrapRelation<{ name?: string }>(row.Class);

  const teacherName =
    user?.name?.trim() ?? staff?.staffCode?.trim() ?? null;

  return {
    id: row.id,
    academicYearId: row.academicYearId,
    classId: row.classId,
    subjectId: row.subjectId,
    staffProfileId: row.staffProfileId,
    roomId: row.roomId,
    dayOfWeek: row.dayOfWeek,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
    subjectCode: subject?.code ?? null,
    subjectName: subject?.nameEn ?? null,
    teacherName,
    roomCode: room?.code ?? room?.nameEn ?? null,
    className: classRow?.name ?? null,
  };
}

export function groupGridSlotsByDay(
  slots: TimetableGridSlot[],
  days: readonly number[] = TIMETABLE_GRID_DAYS,
): Map<number, TimetableGridSlot[]> {
  const grouped = groupTimetableSlotsByDay(slots);
  const result = new Map<number, TimetableGridSlot[]>();
  for (const day of days) {
    result.set(day, grouped.get(day) ?? []);
  }
  return result;
}

export function timetableGridDayLabel(day: number): string {
  return DAY_OF_WEEK_LABELS[day] ?? `Day ${day}`;
}

export function timetableGridSlotToRecord(
  slot: TimetableGridSlot,
): {
  id: string;
  academicYearId: string;
  classId: string | null;
  subjectId: string;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
} {
  return {
    id: slot.id,
    academicYearId: slot.academicYearId,
    classId: slot.classId,
    subjectId: slot.subjectId,
    staffProfileId: slot.staffProfileId,
    roomId: slot.roomId,
    dayOfWeek: slot.dayOfWeek,
    startMinutes: slot.startMinutes,
    endMinutes: slot.endMinutes,
  };
}
