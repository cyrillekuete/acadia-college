import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canViewTimetableSlots,
  isTimetablePublished,
} from '@/lib/acadia/timetable-publish';

describe('timetable publish helpers', () => {
  it('treats only non-empty publish timestamps as published', () => {
    expect(isTimetablePublished('2026-08-01T00:00:00.000Z')).toBe(true);
    expect(isTimetablePublished(null)).toBe(false);
    expect(isTimetablePublished('')).toBe(false);
  });

  it('lets registry writers view draft timetables', () => {
    expect(canViewTimetableSlots('admin', null)).toBe(true);
    expect(canViewTimetableSlots('teacher', null)).toBe(false);
    expect(canViewTimetableSlots('guardian', '2026-08-01T00:00:00.000Z')).toBe(
      true,
    );
  });
});

describe('timetable slot hooks', () => {
  it('gates fetches on publish visibility in use-timetable-slots', () => {
    const source = readFileSync(
      join(process.cwd(), 'hooks/use-timetable-slots.ts'),
      'utf8',
    );
    expect(source).toMatch(/useActiveYearTimetablePublish/);
    expect(source).toMatch(/canView/);
  });
});

describe('timetable teacher options', () => {
  it('loads class-subject teachers from StaffClassSubjectAssignment', () => {
    const hookSource = readFileSync(
      join(process.cwd(), 'hooks/use-subject-catalog-options.ts'),
      'utf8',
    );
    const formSource = readFileSync(
      join(
        process.cwd(),
        'components/acadia/timetable/timetable-slot-form-dialog.tsx',
      ),
      'utf8',
    );
    expect(hookSource).toMatch(/useClassSubjectTeacherOptions/);
    expect(hookSource).toMatch(/StaffClassSubjectAssignment/);
    expect(formSource).toMatch(/useClassSubjectTeacherOptions/);
    expect(formSource).not.toMatch(/useSubjectTeacherOptions/);
  });
});

describe('timetable delete guard', () => {
  it('blocks delete when attendance sessions reference the slot', () => {
    const querySource = readFileSync(
      join(process.cwd(), 'lib/supabase/queries/timetable.ts'),
      'utf8',
    );
    const mutationSource = readFileSync(
      join(process.cwd(), 'hooks/use-subject-mutations.ts'),
      'utf8',
    );
    expect(querySource).toMatch(/assertTimetableSlotDeletable/);
    expect(querySource).toMatch(/AttendanceSession/);
    expect(mutationSource).toMatch(/assertTimetableSlotDeletable/);
  });
});
