/** Tables with a direct `academicYearId` column (tenant-scoped lists). */
export const ACADEMIC_YEAR_SCOPED_TABLES = new Set([
  'AcademicCalendarMilestone',
  'AcademicSequence',
  'AttendanceSession',
  'ClassPromotionPolicy',
  'CourseworkTask',
  'ExamSession',
  'FinanceBudgetLine',
  'FinanceLedgerEntry',
  'ReportCardTemplatePreference',
  'StudentEnrollment',
  'StudentFeeAccount',
  'SchemeOfWork',
  'StudentPromotionDecision',
  'SubjectAssignment',
  'SubjectDiscussionThread',
  'TimetableSlot',
  'Transcript',
  'Term',
]);

export function tableHasAcademicYearColumn(table: string): boolean {
  return ACADEMIC_YEAR_SCOPED_TABLES.has(table);
}

export function academicYearIdFilter(
  academicYearId: string | null | undefined,
): { column: string; value: string }[] {
  if (!academicYearId) {
    return [];
  }
  return [{ column: 'academicYearId', value: academicYearId }];
}
