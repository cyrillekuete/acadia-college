import {
  canEditExamSession,
  type ExamSessionType,
} from '@/lib/acadia/assessment';
import {
  checkMarkEntryWindow,
  dateOnly,
  todayDateOnly,
  type MilestoneRecord,
} from '@/lib/acadia/calendar-milestones';
import {
  marksEntryContextSchema,
  subjectMarkEntrySchema,
  type MarksEntryContextValues,
  type SubjectMarkEntryValues,
} from '@/lib/acadia/assessment-schemas';

export type MarkEntryCalendarPolicy =
  | 'SESSION_DATES_ONLY'
  | 'CALENDAR_AND_SESSION';

export type ExamSessionMarkGate = {
  id: string;
  finalizedAt: string | null;
  startsOn: string | null;
  endsOn: string | null;
  academicYearId: string;
  type?: ExamSessionType | string | null;
};

/**
 * Validate marks payload with Zod. Throws on first invalid score/context.
 */
export function parseMarksEntryContext(
  input: unknown,
): MarksEntryContextValues {
  return marksEntryContextSchema.parse(input);
}

export function parseSubjectMarkEntry(
  input: unknown,
): SubjectMarkEntryValues {
  return subjectMarkEntrySchema.parse(input);
}

export function assertExamSessionEditableForMarks(
  session: Pick<ExamSessionMarkGate, 'finalizedAt'>,
): void {
  if (!canEditExamSession(session.finalizedAt)) {
    throw new Error('This exam session is finalized and marks cannot be changed.');
  }
}

export function assertMarkEntryCalendarAllowed(input: {
  milestones: MilestoneRecord[];
  policy: MarkEntryCalendarPolicy;
  session: Pick<ExamSessionMarkGate, 'startsOn' | 'endsOn'>;
  bypass: boolean;
  today?: string;
}): void {
  if (input.bypass) {
    return;
  }

  const today = input.today ?? todayDateOnly();
  const calendarWindow = checkMarkEntryWindow(input.milestones, today);
  if (!calendarWindow.allowed) {
    throw new Error(
      calendarWindow.message ??
        'Mark entry is closed for the current academic calendar window.',
    );
  }

  if (input.policy !== 'CALENDAR_AND_SESSION') {
    return;
  }

  const startsOn = dateOnly(input.session.startsOn);
  const endsOn = dateOnly(input.session.endsOn);
  if (startsOn && today < startsOn) {
    throw new Error('Mark entry is not open yet for this exam session.');
  }
  if (endsOn && today > endsOn) {
    throw new Error('Mark entry has closed for this exam session.');
  }
}

export function assertMarkNotStale(input: {
  existingUpdatedAt: string | null | undefined;
  expectedUpdatedAt: string | null | undefined;
}): void {
  if (!input.expectedUpdatedAt) {
    return;
  }
  if (!input.existingUpdatedAt) {
    return;
  }
  if (input.existingUpdatedAt !== input.expectedUpdatedAt) {
    throw new Error('Marks were updated elsewhere. Reload and try again.');
  }
}
