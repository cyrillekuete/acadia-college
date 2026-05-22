/**
 * PostgREST embed helpers for composite (tenant-scoped) foreign keys.
 * Use `Relation!foreignKeyName (fields)` instead of `Relation:columnId (fields)`
 * when the FK spans multiple columns (see database.types.ts Relationships).
 */

/** Build a PostgREST embed fragment: `Relation!fkName (fields)`. */
export function embed(relation: string, foreignKeyName: string, fields: string): string {
  const trimmed = fields.trim();
  return `${relation}!${foreignKeyName} (${trimmed})`;
}

/** FK constraint names from lib/supabase/database.types.ts — do not guess from column names. */
export const FK = {
  // StudentEnrollment
  StudentEnrollment_studentProfile: 'StudentEnrollment_studentProfileId_tenantId_fkey',
  StudentEnrollment_academicYear: 'StudentEnrollment_academicYearId_tenantId_fkey',
  StudentEnrollment_level: 'StudentEnrollment_levelId_tenantId_fkey',
  StudentEnrollment_class: 'StudentEnrollment_classId_tenantId_fkey',

  // SubjectMark
  SubjectMark_studentProfile: 'SubjectMark_studentProfileId_tenantId_fkey',
  SubjectMark_subject: 'SubjectMark_subjectId_tenantId_fkey',
  SubjectMark_examSession: 'SubjectMark_examSessionId_tenantId_fkey',

  // AttendanceRecord
  AttendanceRecord_studentProfile: 'AttendanceRecord_studentProfileId_tenantId_fkey',

  // AttendanceSession
  AttendanceSession_subject: 'AttendanceSession_subjectId_tenantId_fkey',
  AttendanceSession_academicYear: 'AttendanceSession_academicYearId_tenantId_fkey',

  // StudentFeeAccount
  StudentFeeAccount_studentProfile: 'StudentFeeAccount_studentProfileId_tenantId_fkey',
  StudentFeeAccount_academicYear: 'StudentFeeAccount_academicYearId_tenantId_fkey',

  // EnrollmentApplication
  EnrollmentApplication_studentProfile: 'EnrollmentApplication_studentProfileId_tenantId_fkey',
  EnrollmentApplication_academicYear: 'EnrollmentApplication_academicYearId_tenantId_fkey',
  EnrollmentApplication_level: 'EnrollmentApplication_levelId_tenantId_fkey',

  // CourseworkSubmission / CourseworkTask
  CourseworkSubmission_studentProfile: 'CourseworkSubmission_studentProfileId_tenantId_fkey',
  CourseworkSubmission_task: 'CourseworkSubmission_taskId_tenantId_fkey',
  CourseworkTask_subject: 'CourseworkTask_subjectId_tenantId_fkey',
  CourseworkTask_academicYear: 'CourseworkTask_academicYearId_tenantId_fkey',

  // TimetableSlot
  TimetableSlot_subject: 'TimetableSlot_subjectId_tenantId_fkey',
  TimetableSlot_staffProfile: 'TimetableSlot_staffProfileId_tenantId_fkey',
  TimetableSlot_room: 'TimetableSlot_roomId_tenantId_fkey',
  TimetableSlot_academicYear: 'TimetableSlot_academicYearId_tenantId_fkey',

  // ExamSession
  ExamSession_subject: 'ExamSession_subjectId_tenantId_fkey',
  ExamSession_academicYear: 'ExamSession_academicYearId_tenantId_fkey',
  ExamSession_term: 'ExamSession_semesterId_tenantId_fkey',

  // Subject
  Subject_level: 'Subject_levelId_tenantId_fkey',
  Subject_term: 'Subject_semesterId_tenantId_fkey',
  Subject_grouping: 'Subject_groupingId_tenantId_fkey',

  // StudentProfile (nested)
  StudentProfile_user: 'StudentProfile_userId_tenantId_fkey',

  // SubjectAssignment
  SubjectAssignment_staffProfile: 'SubjectAssignment_staffProfileId_tenantId_fkey',
  SubjectAssignment_academicYear: 'SubjectAssignment_academicYearId_tenantId_fkey',

  // StudentPromotionDecision
  StudentPromotionDecision_studentProfile: 'StudentPromotionDecision_studentProfileId_tenantId_fkey',
  StudentPromotionDecision_targetLevel: 'StudentPromotionDecision_targetLevelId_tenantId_fkey',
  StudentPromotionDecision_class: 'StudentPromotionDecision_classId_tenantId_fkey',

  // AcademicCalendarMilestone
  AcademicCalendarMilestone_academicYear: 'AcademicCalendarMilestone_academicYearId_tenantId_fkey',
  AcademicCalendarMilestone_term: 'AcademicCalendarMilestone_semesterId_tenantId_fkey',

  // Term (Semester)
  Term_level: 'Semester_levelId_tenantId_fkey',

  // StaffProfile
  StaffProfile_user: 'StaffProfile_userId_tenantId_fkey',
} as const;

/** Common nested User embed inside StudentProfile. */
export const STUDENT_PROFILE_USER = embed('User', FK.StudentProfile_user, 'name, email');

export const STUDENT_PROFILE_USER_NAME = embed('User', FK.StudentProfile_user, 'name');
