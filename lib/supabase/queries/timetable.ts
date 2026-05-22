import type { SupabaseClient } from '@supabase/supabase-js';
import type { TimetableSlotFormValues } from '@/lib/acadia/subject-schemas';
import {
  findTimetableSlotConflicts,
  formatTimetableConflictMessage,
  normalizeTimetableClassId,
  type TimetableSlotInterval,
} from '@/lib/acadia/timetable-validation';
import { timeStringToMinutes } from '@/lib/acadia/timetable';
import { fetchClassSubjectIds } from '@/lib/supabase/queries/class-subjects';
import { embed, FK } from '@/lib/supabase/embed-selects';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

export const TIMETABLE_SLOT_LIST_SELECT = [
  'id',
  'tenantId',
  'academicYearId',
  'classId',
  'subjectId',
  'staffProfileId',
  'roomId',
  'dayOfWeek',
  'startMinutes',
  'endMinutes',
  'createdAt',
  'updatedAt',
  embed('Subject', FK.TimetableSlot_subject, 'code, nameEn'),
  embed('Class', FK.TimetableSlot_class, 'name, subSystem, branch'),
  embed(
    'StaffProfile',
    FK.TimetableSlot_staffProfile,
    'staffCode, User!StaffProfile_userId_tenantId_fkey ( name )',
  ),
  embed('Room', FK.TimetableSlot_room, 'code, nameEn'),
  embed('AcademicYear', FK.TimetableSlot_academicYear, 'label'),
].join(', ');

export type TimetableSlotListRow = {
  id: string;
  tenantId: string;
  academicYearId: string;
  classId: string | null;
  subjectId: string;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  createdAt: string;
  updatedAt: string;
  Subject?: { code?: string; nameEn?: string } | null;
  Class?: { name?: string; subSystem?: string; branch?: string } | null;
  StaffProfile?: {
    staffCode?: string;
    User?: { name?: string | null } | null;
  } | null;
  Room?: { code?: string; nameEn?: string } | null;
  AcademicYear?: { label?: string } | null;
};

function mapInterval(row: {
  id: string;
  classId?: string | null;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
}): TimetableSlotInterval {
  return {
    id: row.id,
    classId: row.classId ?? null,
    staffProfileId: row.staffProfileId,
    roomId: row.roomId,
    dayOfWeek: row.dayOfWeek,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
  };
}

function candidateFromFormValues(
  values: TimetableSlotFormValues,
  excludeSlotId?: string,
): TimetableSlotInterval {
  return {
    id: excludeSlotId,
    classId: normalizeTimetableClassId(values.classId),
    staffProfileId: values.staffProfileId,
    roomId: values.roomId,
    dayOfWeek: values.dayOfWeek,
    startMinutes: timeStringToMinutes(values.startTime),
    endMinutes: timeStringToMinutes(values.endTime),
  };
}

async function fetchTimetableSlotsForDay(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  dayOfWeek: number,
): Promise<TimetableSlotInterval[]> {
  const { data, error } = await supabase
    .from('TimetableSlot')
    .select('id, classId, staffProfileId, roomId, dayOfWeek, startMinutes, endMinutes')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('dayOfWeek', dayOfWeek);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapInterval);
}

async function isTeacherAssignedToSubject(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  subjectId: string,
  staffProfileId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('SubjectAssignment')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('subjectId', subjectId)
    .eq('staffProfileId', staffProfileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}

export async function assertTimetableSlotValid(
  supabase: Client,
  tenantId: string,
  values: TimetableSlotFormValues,
  excludeSlotId?: string,
): Promise<void> {
  const classId = normalizeTimetableClassId(values.classId);

  if (classId) {
    const classSubjectIds = await fetchClassSubjectIds(supabase, tenantId, classId);
    if (!classSubjectIds.includes(values.subjectId)) {
      throw new Error('This subject is not assigned to the selected class.');
    }

    const teacherAssigned = await isTeacherAssignedToSubject(
      supabase,
      tenantId,
      values.academicYearId,
      values.subjectId,
      values.staffProfileId,
    );
    if (!teacherAssigned) {
      throw new Error(
        'This teacher is not assigned to the selected subject for this academic year.',
      );
    }
  }

  const candidate = candidateFromFormValues(values, excludeSlotId);
  const sameDaySlots = await fetchTimetableSlotsForDay(
    supabase,
    tenantId,
    values.academicYearId,
    values.dayOfWeek,
  );
  const conflicts = findTimetableSlotConflicts(
    sameDaySlots,
    candidate,
    excludeSlotId,
  );

  if (conflicts.length > 0) {
    throw new Error(formatTimetableConflictMessage(conflicts[0]!));
  }
}

export async function fetchTimetableSlotsForClass(
  supabase: Client,
  tenantId: string,
  classId: string,
  academicYearId: string,
): Promise<TimetableSlotListRow[]> {
  const { data, error } = await supabase
    .from('TimetableSlot')
    .select(TIMETABLE_SLOT_LIST_SELECT)
    .eq('tenantId', tenantId)
    .eq('classId', classId)
    .eq('academicYearId', academicYearId)
    .order('dayOfWeek', { ascending: true })
    .order('startMinutes', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TimetableSlotListRow[];
}

export async function fetchTimetableSlotsForTeacher(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
  academicYearId: string,
): Promise<TimetableSlotListRow[]> {
  const { data, error } = await supabase
    .from('TimetableSlot')
    .select(TIMETABLE_SLOT_LIST_SELECT)
    .eq('tenantId', tenantId)
    .eq('staffProfileId', staffProfileId)
    .eq('academicYearId', academicYearId)
    .order('dayOfWeek', { ascending: true })
    .order('startMinutes', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TimetableSlotListRow[];
}

export async function fetchStudentEnrolledClassId(
  supabase: Client,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('StudentEnrollment')
    .select('classId')
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.classId as string | null | undefined) ?? null;
}

export async function fetchTimetableSlotsForStudent(
  supabase: Client,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
): Promise<TimetableSlotListRow[]> {
  const classId = await fetchStudentEnrolledClassId(
    supabase,
    tenantId,
    studentProfileId,
    academicYearId,
  );

  if (!classId) {
    return [];
  }

  return fetchTimetableSlotsForClass(
    supabase,
    tenantId,
    classId,
    academicYearId,
  );
}

export function buildTimetableSlotWritePayload(values: TimetableSlotFormValues) {
  return {
    academicYearId: values.academicYearId,
    classId: normalizeTimetableClassId(values.classId),
    subjectId: values.subjectId,
    staffProfileId: values.staffProfileId,
    roomId: values.roomId,
    dayOfWeek: values.dayOfWeek,
    startMinutes: timeStringToMinutes(values.startTime),
    endMinutes: timeStringToMinutes(values.endTime),
  };
}
