export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export function dayOfWeekLabel(day: number | null | undefined): string {
  if (!day) {
    return '—';
  }
  return DAY_OF_WEEK_LABELS[day] ?? `Day ${day}`;
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeStringToMinutes(value: string): number {
  const [h, m] = value.split(':').map((part) => Number(part));
  return h * 60 + m;
}

export function formatTimeRange(startMinutes: number, endMinutes: number): string {
  return `${minutesToTimeString(startMinutes)} – ${minutesToTimeString(endMinutes)}`;
}

/** Timetable convention: 1 = Monday … 7 = Sunday (JS Date.getDay() is 0 = Sunday … 6 = Saturday). */
export function getTimetableDayOfWeek(date: Date = new Date()): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function countTimetableSlotsForDay(
  slots: readonly { dayOfWeek: number }[],
  dayOfWeek: number,
): number {
  return slots.filter((slot) => slot.dayOfWeek === dayOfWeek).length;
}
