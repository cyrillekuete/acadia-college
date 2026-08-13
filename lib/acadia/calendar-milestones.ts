import type { CalendarMilestoneKind } from '@/lib/acadia/calendar-schemas';
import { localizedText } from '@/lib/acadia/locale';

export type MilestoneRecord = {
  kind: CalendarMilestoneKind;
  onDate: string;
  termId?: string | null;
  labelEn?: string | null;
  labelFr?: string | null;
};

export type AcademicYearEnrollmentDates = {
  enrollmentOpensAt: string | null;
  enrollmentClosesAt: string | null;
};

export type CalendarWindowResult = {
  allowed: boolean;
  opensOn: string | null;
  closesOn: string | null;
  message?: string;
};

export function dateOnly(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  return value.trim().slice(0, 10);
}

export function todayDateOnly(reference = new Date()): string {
  return reference.toISOString().slice(0, 10);
}

export function earliestMilestoneDate(
  milestones: MilestoneRecord[],
  kinds: readonly CalendarMilestoneKind[],
): string | null {
  const dates = milestones
    .filter((row) => kinds.includes(row.kind))
    .map((row) => dateOnly(row.onDate))
    .filter((value): value is string => value != null);
  if (dates.length === 0) {
    return null;
  }
  return dates.sort()[0] ?? null;
}

export function latestMilestoneDate(
  milestones: MilestoneRecord[],
  kinds: readonly CalendarMilestoneKind[],
): string | null {
  const dates = milestones
    .filter((row) => kinds.includes(row.kind))
    .map((row) => dateOnly(row.onDate))
    .filter((value): value is string => value != null);
  if (dates.length === 0) {
    return null;
  }
  return dates.sort().at(-1) ?? null;
}

export function resolveEnrollmentWindow(
  milestones: MilestoneRecord[],
  yearDates: AcademicYearEnrollmentDates,
): { opensOn: string | null; closesOn: string | null } {
  return {
    opensOn:
      earliestMilestoneDate(milestones, ['ENROLLMENT_OPEN']) ??
      dateOnly(yearDates.enrollmentOpensAt),
    closesOn:
      latestMilestoneDate(milestones, ['ENROLLMENT_CLOSE']) ??
      dateOnly(yearDates.enrollmentClosesAt),
  };
}

export function resolveMarkEntryWindow(milestones: MilestoneRecord[]): {
  opensOn: string | null;
  closesOn: string | null;
} {
  return {
    opensOn: earliestMilestoneDate(milestones, ['MARK_ENTRY_OPEN']),
    closesOn: latestMilestoneDate(milestones, ['MARK_ENTRY_CLOSE']),
  };
}

export function resolveExamPeriodWindow(milestones: MilestoneRecord[]): {
  opensOn: string | null;
  closesOn: string | null;
} {
  return {
    opensOn: earliestMilestoneDate(milestones, ['EXAM_PERIOD_START']),
    closesOn: latestMilestoneDate(milestones, ['EXAM_PERIOD_END']),
  };
}

export function isWithinCalendarWindow(
  opensOn: string | null,
  closesOn: string | null,
  today: string = todayDateOnly(),
): CalendarWindowResult {
  if (!opensOn && !closesOn) {
    return { allowed: true, opensOn, closesOn };
  }

  if (opensOn && closesOn && opensOn > closesOn) {
    return {
      allowed: false,
      opensOn,
      closesOn,
      message: `Invalid window configuration: opens ${opensOn} after close ${closesOn}.`,
    };
  }

  if (opensOn && today < opensOn) {
    return {
      allowed: false,
      opensOn,
      closesOn,
      message: `This action opens on ${opensOn}.`,
    };
  }

  if (closesOn && today > closesOn) {
    return {
      allowed: false,
      opensOn,
      closesOn,
      message: `This action closed on ${closesOn}.`,
    };
  }

  return { allowed: true, opensOn, closesOn };
}

export function checkEnrollmentWindow(
  milestones: MilestoneRecord[],
  yearDates: AcademicYearEnrollmentDates,
  today?: string,
): CalendarWindowResult {
  const bounds = resolveEnrollmentWindow(milestones, yearDates);
  return isWithinCalendarWindow(bounds.opensOn, bounds.closesOn, today);
}

export function checkMarkEntryWindow(
  milestones: MilestoneRecord[],
  today?: string,
): CalendarWindowResult {
  const bounds = resolveMarkEntryWindow(milestones);
  return isWithinCalendarWindow(bounds.opensOn, bounds.closesOn, today);
}

export function checkExamPeriodWindow(
  milestones: MilestoneRecord[],
  today?: string,
): CalendarWindowResult {
  const bounds = resolveExamPeriodWindow(milestones);
  return isWithinCalendarWindow(bounds.opensOn, bounds.closesOn, today);
}

export function milestonesOnDate(
  milestones: MilestoneRecord[],
  day: string,
): MilestoneRecord[] {
  const target = dateOnly(day);
  if (!target) {
    return [];
  }
  return milestones.filter((row) => dateOnly(row.onDate) === target);
}

export function milestoneKindLabel(kind: CalendarMilestoneKind): string {
  return kind
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function milestoneDisplayLabel(row: MilestoneRecord): string {
  const custom = localizedText(row.labelEn, row.labelFr);
  return custom || milestoneKindLabel(row.kind);
}
