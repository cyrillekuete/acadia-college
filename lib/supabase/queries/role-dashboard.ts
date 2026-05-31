import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttendanceStatus } from '@/lib/acadia/attendance';
import {
  ATTENDANCE_NOTIFICATION_EVENT,
  computeAttendancePercentage,
} from '@/lib/acadia/attendance';
import { computeFeeAccountTotals } from '@/lib/acadia/finance';
import {
  countTimetableSlotsForDay,
  getTimetableDayOfWeek,
} from '@/lib/acadia/timetable';
import type { Database } from '@/lib/supabase/database.types';
import { fetchClassSubjectIds } from '@/lib/supabase/queries/class-subjects';
import {
  fetchTeacherTeachingScope,
  type TeacherTeachingScope,
} from '@/lib/supabase/queries/teacher-students';
import {
  fetchStudentEnrolledClassId,
  fetchTimetableSlotsForStudent,
} from '@/lib/supabase/queries/timetable';

type Client = SupabaseClient<Database>;

export type StaffDashboardStats = {
  assignedSubjectCount: number;
  pendingMarkCount: number;
};

export type StudentDashboardStats = {
  enrolledSubjectCount: number;
  todaysSessionCount: number;
  attendancePercent: number | null;
  feeBalanceMinor: number;
};

export type GuardianDashboardStats = {
  linkedStudentCount: number;
  attendanceAlertCount: number;
  recentMarkCount: number;
  outstandingFeesMinor: number;
};

type ExamSessionRef = { id: string; subjectId: string };

type MarkRef = {
  examSessionId: string;
  subjectId: string;
  studentProfileId: string;
};

type EnrollmentRef = { studentProfileId: string; classId: string };

/** Count mark entries still missing for a teacher's scoped classes and subjects. */
export function countPendingMarksFromScope(input: {
  scope: TeacherTeachingScope;
  examSessions: ExamSessionRef[];
  marks: MarkRef[];
  enrollments: EnrollmentRef[];
}): number {
  const { scope, examSessions, marks, enrollments } = input;

  if (scope.classIds.length === 0 || scope.subjectIds.length === 0) {
    return 0;
  }

  const markKeys = new Set(
    marks.map(
      (mark) =>
        `${mark.examSessionId}:${mark.subjectId}:${mark.studentProfileId}`,
    ),
  );

  const studentsByClass = new Map<string, string[]>();
  for (const enrollment of enrollments) {
    const list = studentsByClass.get(enrollment.classId) ?? [];
    list.push(enrollment.studentProfileId);
    studentsByClass.set(enrollment.classId, list);
  }

  const classesBySubject = new Map<string, string[]>();
  for (const pair of scope.pairs) {
    const list = classesBySubject.get(pair.subjectId) ?? [];
    if (!list.includes(pair.classId)) {
      list.push(pair.classId);
    }
    classesBySubject.set(pair.subjectId, list);
  }

  let pending = 0;
  for (const session of examSessions) {
    const classIds = classesBySubject.get(session.subjectId) ?? [];
    const studentIds = new Set<string>();
    for (const classId of classIds) {
      for (const studentProfileId of studentsByClass.get(classId) ?? []) {
        studentIds.add(studentProfileId);
      }
    }

    for (const studentProfileId of Array.from(studentIds)) {
      const key = `${session.id}:${session.subjectId}:${studentProfileId}`;
      if (!markKeys.has(key)) {
        pending += 1;
      }
    }
  }

  return pending;
}

/** Sum outstanding balances across fee accounts. */
export function sumOutstandingFeeBalances(
  accounts: Array<{
    totalAmountMinor: number;
    installments: Array<{
      amountMinor: number;
      status: string;
      paidAmountMinor?: number | null;
    }>;
  }>,
): number {
  return accounts.reduce((sum, account) => {
    const totals = computeFeeAccountTotals({
      totalAmountMinor: account.totalAmountMinor,
      installments: account.installments,
    });
    return sum + totals.balanceMinor;
  }, 0);
}

async function fetchPendingMarkCountForTeacher(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  scope: TeacherTeachingScope,
): Promise<number> {
  if (scope.subjectIds.length === 0 || scope.classIds.length === 0) {
    return 0;
  }

  const [sessionsResult, enrollmentsResult] = await Promise.all([
    supabase
      .from('ExamSession')
      .select('id, subjectId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .in('subjectId', scope.subjectIds),
    supabase
      .from('StudentEnrollment')
      .select('studentProfileId, classId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('status', 'ENROLLED')
      .in('classId', scope.classIds),
  ]);

  if (sessionsResult.error) {
    throw sessionsResult.error;
  }
  if (enrollmentsResult.error) {
    throw enrollmentsResult.error;
  }

  const examSessions = (sessionsResult.data ?? []) as ExamSessionRef[];
  if (examSessions.length === 0) {
    return 0;
  }

  const sessionIds = examSessions.map((session) => session.id);
  const { data: markRows, error: markError } = await supabase
    .from('SubjectMark')
    .select('examSessionId, subjectId, studentProfileId')
    .eq('tenantId', tenantId)
    .in('examSessionId', sessionIds);

  if (markError) {
    throw markError;
  }

  return countPendingMarksFromScope({
    scope,
    examSessions,
    marks: (markRows ?? []) as MarkRef[],
    enrollments: (enrollmentsResult.data ?? []) as EnrollmentRef[],
  });
}

async function fetchStudentAttendancePercent(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  studentProfileId: string,
): Promise<number | null> {
  const { data: records, error: recordError } = await supabase
    .from('AttendanceRecord')
    .select('status, AttendanceSession!inner(academicYearId)')
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('AttendanceSession.academicYearId', academicYearId);

  if (recordError) {
    throw recordError;
  }

  if (!records || records.length === 0) {
    return null;
  }

  const statuses = records.map((row) => row.status as AttendanceStatus);
  return computeAttendancePercentage(statuses);
}

async function fetchStudentFeeBalanceMinor(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  studentProfileId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('StudentFeeAccount')
    .select(
      'totalAmountMinor, StudentFeeInstallment ( amountMinor, status, paidAmountMinor )',
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('studentProfileId', studentProfileId);

  if (error) {
    throw error;
  }

  return sumOutstandingFeeBalances(
    (data ?? []).map((account) => ({
      totalAmountMinor: Number(account.totalAmountMinor ?? 0),
      installments: (account.StudentFeeInstallment ?? []) as Array<{
        amountMinor: number;
        status: string;
        paidAmountMinor: number | null;
      }>,
    })),
  );
}

async function fetchLinkedStudentProfileIds(
  supabase: Client,
  tenantId: string,
  guardianUserId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('GuardianStudentLink')
    .select('studentProfileId')
    .eq('tenantId', tenantId)
    .eq('guardianUserId', guardianUserId)
    .is('consentRevokedAt', null);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.studentProfileId as string);
}

async function fetchOutstandingFeesForStudents(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  studentProfileIds: string[],
): Promise<number> {
  if (studentProfileIds.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from('StudentFeeAccount')
    .select(
      'totalAmountMinor, StudentFeeInstallment ( amountMinor, status, paidAmountMinor )',
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .in('studentProfileId', studentProfileIds);

  if (error) {
    throw error;
  }

  return sumOutstandingFeeBalances(
    (data ?? []).map((account) => ({
      totalAmountMinor: Number(account.totalAmountMinor ?? 0),
      installments: (account.StudentFeeInstallment ?? []) as Array<{
        amountMinor: number;
        status: string;
        paidAmountMinor: number | null;
      }>,
    })),
  );
}

async function fetchRecentMarkCountForStudents(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  studentProfileIds: string[],
): Promise<number> {
  if (studentProfileIds.length === 0) {
    return 0;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const { count, error } = await supabase
    .from('SubjectMark')
    .select('*, ExamSession!inner(academicYearId)', {
      count: 'exact',
      head: true,
    })
    .eq('tenantId', tenantId)
    .in('studentProfileId', studentProfileIds)
    .eq('ExamSession.academicYearId', academicYearId)
    .gte('updatedAt', cutoffIso);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function fetchStaffDashboardStats(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<StaffDashboardStats> {
  const scope = await fetchTeacherTeachingScope(
    supabase,
    tenantId,
    academicYearId,
    staffProfileId,
  );

  const pendingMarkCount = await fetchPendingMarkCountForTeacher(
    supabase,
    tenantId,
    academicYearId,
    scope,
  );

  return {
    assignedSubjectCount: scope.subjectIds.length,
    pendingMarkCount,
  };
}

export async function fetchStudentDashboardStats(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  studentProfileId: string,
  options?: { dayOfWeek?: number },
): Promise<StudentDashboardStats> {
  const classId = await fetchStudentEnrolledClassId(
    supabase,
    tenantId,
    studentProfileId,
    academicYearId,
  );

  const dayOfWeek = options?.dayOfWeek ?? getTimetableDayOfWeek();

  const [
    enrolledSubjectCount,
    timetableSlots,
    attendancePercent,
    feeBalanceMinor,
  ] = await Promise.all([
    classId
      ? fetchClassSubjectIds(supabase, tenantId, classId).then(
          (ids) => ids.length,
        )
      : Promise.resolve(0),
    fetchTimetableSlotsForStudent(
      supabase,
      tenantId,
      studentProfileId,
      academicYearId,
    ),
    fetchStudentAttendancePercent(
      supabase,
      tenantId,
      academicYearId,
      studentProfileId,
    ),
    fetchStudentFeeBalanceMinor(
      supabase,
      tenantId,
      academicYearId,
      studentProfileId,
    ),
  ]);

  return {
    enrolledSubjectCount,
    todaysSessionCount: countTimetableSlotsForDay(timetableSlots, dayOfWeek),
    attendancePercent,
    feeBalanceMinor,
  };
}

export async function fetchGuardianDashboardStats(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  guardianUserId: string,
): Promise<GuardianDashboardStats> {
  const studentProfileIds = await fetchLinkedStudentProfileIds(
    supabase,
    tenantId,
    guardianUserId,
  );

  const [
    attendanceAlertCount,
    recentMarkCount,
    outstandingFeesMinor,
  ] = await Promise.all([
    supabase
      .from('Notification')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)
      .eq('userId', guardianUserId)
      .eq('event', ATTENDANCE_NOTIFICATION_EVENT)
      .is('readAt', null)
      .then(({ count, error }) => {
        if (error) {
          throw error;
        }
        return count ?? 0;
      }),
    fetchRecentMarkCountForStudents(
      supabase,
      tenantId,
      academicYearId,
      studentProfileIds,
    ),
    fetchOutstandingFeesForStudents(
      supabase,
      tenantId,
      academicYearId,
      studentProfileIds,
    ),
  ]);

  return {
    linkedStudentCount: studentProfileIds.length,
    attendanceAlertCount,
    recentMarkCount,
    outstandingFeesMinor,
  };
}
