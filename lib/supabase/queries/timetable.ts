import type { SupabaseClient } from '@supabase/supabase-js';
import type { TimetableSlotFormValues } from '@/lib/acadia/subject-schemas';
import { pickPreferredEnrolledClassId } from '@/lib/acadia/student-enrollment';
import {
  findTimetableSlotConflicts,
  formatTimetableConflictMessages,
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

export type TimetableSlotWritePayload = {
  academicYearId: string;
  classId: string;
  subjectId: string;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
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

async function isTeacherAssignedToClassSubject(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  classId: string,
  subjectId: string,
  staffProfileId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('StaffClassSubjectAssignment')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('classId', classId)
    .eq('subjectId', subjectId)
    .eq('staffProfileId', staffProfileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}

async function assertRoomIsActive(
  supabase: Client,
  tenantId: string,
  roomId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('Room')
    .select('isActive')
    .eq('tenantId', tenantId)
    .eq('id', roomId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.isActive) {
    throw new Error('The selected room is inactive or no longer available.');
  }
}

async function assertSubjectIsActive(
  supabase: Client,
  tenantId: string,
  subjectId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('Subject')
    .select('deactivatedAt')
    .eq('tenantId', tenantId)
    .eq('id', subjectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.deactivatedAt) {
    throw new Error('The selected subject is deactivated or no longer available.');
  }
}

async function assertStaffProfileIsActive(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('StaffProfile')
    .select('isActive')
    .eq('tenantId', tenantId)
    .eq('id', staffProfileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.isActive) {
    throw new Error('The selected teacher is inactive or no longer available.');
  }
}

export async function assertTimetableSlotValid(
  supabase: Client,
  tenantId: string,
  values: TimetableSlotFormValues,
  excludeSlotId?: string,
): Promise<void> {
  const classId = normalizeTimetableClassId(values.classId);
  if (!classId) {
    throw new Error('A class is required for every timetable slot.');
  }

  await Promise.all([
    assertRoomIsActive(supabase, tenantId, values.roomId),
    assertSubjectIsActive(supabase, tenantId, values.subjectId),
    assertStaffProfileIsActive(supabase, tenantId, values.staffProfileId),
  ]);

  const classSubjectIds = await fetchClassSubjectIds(supabase, tenantId, classId);
  if (!classSubjectIds.includes(values.subjectId)) {
    throw new Error('This subject is not assigned to the selected class.');
  }

  const teacherAssigned = await isTeacherAssignedToClassSubject(
    supabase,
    tenantId,
    values.academicYearId,
    classId,
    values.subjectId,
    values.staffProfileId,
  );
  if (!teacherAssigned) {
    throw new Error(
      'This teacher is not assigned to the selected subject in this class.',
    );
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
    throw new Error(formatTimetableConflictMessages(conflicts));
  }
}

export async function assertTimetableSlotDeletable(
  supabase: Client,
  tenantId: string,
  slotId: string,
): Promise<void> {
  const { count, error } = await supabase
    .from('AttendanceSession')
    .select('id', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('timetableSlotId', slotId);

  if (error) {
    throw error;
  }

  if ((count ?? 0) > 0) {
    throw new Error(
      `Cannot delete: ${count} attendance session(s) reference this slot.`,
    );
  }
}

export async function writeTimetableSlot(
  supabase: Client,
  tenantId: string,
  payload: TimetableSlotWritePayload & { id: string; excludeSlotId?: string },
): Promise<void> {
  const { error } = await supabase.rpc('acadia_write_timetable_slot', {
    p_tenant_id: tenantId,
    p_slot_id: payload.id,
    p_exclude_slot_id: payload.excludeSlotId ?? null,
    p_academic_year_id: payload.academicYearId,
    p_class_id: payload.classId,
    p_subject_id: payload.subjectId,
    p_staff_profile_id: payload.staffProfileId,
    p_room_id: payload.roomId,
    p_day_of_week: payload.dayOfWeek,
    p_start_minutes: payload.startMinutes,
    p_end_minutes: payload.endMinutes,
  });

  if (error) {
    throw error;
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

  return (data ?? []) as unknown as TimetableSlotListRow[];
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

  return (data ?? []) as unknown as TimetableSlotListRow[];
}

export async function fetchStudentEnrolledClassId(
  supabase: Client,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('StudentEnrollment')
    .select('classId, createdAt')
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED')
    .order('createdAt', { ascending: false });

  if (error) {
    throw error;
  }

  return pickPreferredEnrolledClassId(data ?? []);
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

export function buildTimetableSlotWritePayload(
  values: TimetableSlotFormValues,
): TimetableSlotWritePayload {
  const classId = normalizeTimetableClassId(values.classId);
  if (!classId) {
    throw new Error('A class is required for every timetable slot.');
  }

  return {
    academicYearId: values.academicYearId,
    classId,
    subjectId: values.subjectId,
    staffProfileId: values.staffProfileId,
    roomId: values.roomId,
    dayOfWeek: values.dayOfWeek,
    startMinutes: timeStringToMinutes(values.startTime),
    endMinutes: timeStringToMinutes(values.endTime),
  };
}
