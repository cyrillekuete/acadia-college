import { z } from 'zod';
import { ATTENDANCE_STATUSES } from '@/lib/acadia/attendance';

export const attendanceSessionSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  subjectId: z.string().min(1, 'Subject is required.'),
  sessionDate: z.string().min(1, 'Session date is required.'),
  label: z.string().optional().or(z.literal('')),
  timetableSlotId: z.string().optional().or(z.literal('')),
});

export type AttendanceSessionFormValues = z.infer<
  typeof attendanceSessionSchema
>;

export const attendanceRecordEntrySchema = z.object({
  studentProfileId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
});

export type AttendanceRecordEntryValues = z.infer<
  typeof attendanceRecordEntrySchema
>;

export const attendanceEntryContextSchema = z.object({
  attendanceSessionId: z.string().min(1),
  records: z.array(attendanceRecordEntrySchema),
  notifyGuardians: z.boolean().optional(),
});

export type AttendanceEntryContextValues = z.infer<
  typeof attendanceEntryContextSchema
>;

export const attendanceReportFiltersSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  subjectId: z.string().optional().or(z.literal('')),
  fromDate: z.string().optional().or(z.literal('')),
  toDate: z.string().optional().or(z.literal('')),
});

export type AttendanceReportFiltersValues = z.infer<
  typeof attendanceReportFiltersSchema
>;
