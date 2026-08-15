import {
  isAdmin,
  isGuardian,
  isStaffOrTeacher,
  isStudent,
} from '@/lib/acadia/roles';
import type { SessionApiContext } from '@/lib/acadia/require-session-api';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { uniqueIds } from '@/lib/acadia/staff-class-assignments';
import { fetchCurrentAcademicYear } from '@/lib/supabase/queries/academic-year';
import {
  fetchStaffProfileIdForUser,
  fetchStudentProfileIdForUser,
} from '@/lib/supabase/queries/profile-links';
import { embed, FK } from '@/lib/supabase/embed-selects';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ReportCardAccessOptions = {
  academicYearId?: string | null;
  classId?: string | null;
};

export type ReportCardAccessDecision = {
  roleSlug: string;
  studentProfileId: string;
  ownStudentProfileId?: string | null;
  guardianLinked?: boolean;
  teacherAssignedClassIds?: readonly string[] | null;
  studentClassId?: string | null;
  isClassMaster?: boolean;
};

export function teacherCanAccessStudentClass(input: {
  assignedClassIds: readonly string[];
  studentClassId: string | null | undefined;
  isClassMaster?: boolean;
}): boolean {
  const studentClassId = input.studentClassId?.trim() ?? '';
  if (!studentClassId) {
    return false;
  }
  if (input.isClassMaster) {
    return true;
  }
  return input.assignedClassIds.some((id) => id.trim() === studentClassId);
}

export function decideReportCardAccess(input: ReportCardAccessDecision): boolean {
  if (isAdmin(input.roleSlug)) {
    return true;
  }

  if (isStaffOrTeacher(input.roleSlug)) {
    return teacherCanAccessStudentClass({
      assignedClassIds: input.teacherAssignedClassIds ?? [],
      studentClassId: input.studentClassId,
      isClassMaster: input.isClassMaster,
    });
  }

  if (isStudent(input.roleSlug)) {
    return Boolean(input.ownStudentProfileId) && input.ownStudentProfileId === input.studentProfileId;
  }

  if (isGuardian(input.roleSlug)) {
    return Boolean(input.guardianLinked);
  }

  return false;
}

type EnrollmentAccessRow = {
  classId: string | null;
  Class?: unknown;
};

async function fetchStudentClassForAccess(
  supabase: SupabaseClient,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
  classId?: string | null,
): Promise<{ classId: string; classMasterStaffProfileId: string | null } | null> {
  let query = supabase
    .from('StudentEnrollment')
    .select(
      `classId, ${embed('Class', FK.StudentEnrollment_class, 'id, staffProfileId')}`,
    )
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED');

  const requestedClassId = classId?.trim() ?? '';
  if (requestedClassId) {
    query = query.eq('classId', requestedClassId);
  }

  const { data, error } = await query
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as EnrollmentAccessRow | null;
  const enrolledClassId = row?.classId?.trim() ?? '';
  if (!enrolledClassId) {
    return null;
  }

  const classRow = unwrapRelation<{ id?: string; staffProfileId?: string | null }>(row?.Class);
  return {
    classId: enrolledClassId,
    classMasterStaffProfileId: classRow?.staffProfileId?.trim() || null,
  };
}

async function fetchStaffAssignedClassIds(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<string[]> {
  const [subjectResult, classResult] = await Promise.all([
    supabase
      .from('StaffClassSubjectAssignment')
      .select('classId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('staffProfileId', staffProfileId),
    supabase
      .from('StaffClassAssignment')
      .select('classId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('staffProfileId', staffProfileId),
  ]);

  if (subjectResult.error) {
    throw subjectResult.error;
  }
  if (classResult.error) {
    throw classResult.error;
  }

  return uniqueIds([
    ...((subjectResult.data ?? []) as Array<{ classId?: string | null }>).map(
      (row) => row.classId ?? '',
    ),
    ...((classResult.data ?? []) as Array<{ classId?: string | null }>).map(
      (row) => row.classId ?? '',
    ),
  ]);
}

export async function canAccessStudentReportCard(
  supabase: SupabaseClient,
  ctx: SessionApiContext,
  studentProfileId: string,
  options: ReportCardAccessOptions = {},
): Promise<boolean> {
  if (isAdmin(ctx.roleSlug)) {
    return true;
  }

  if (isStaffOrTeacher(ctx.roleSlug)) {
    const staffProfileId = await fetchStaffProfileIdForUser(
      supabase,
      ctx.tenantId,
      ctx.actorUserId,
    );
    if (!staffProfileId) {
      return false;
    }

    let yearId = options.academicYearId?.trim() || '';
    if (!yearId) {
      const current = await fetchCurrentAcademicYear(supabase, ctx.tenantId);
      yearId = current?.id ?? '';
    }
    if (!yearId) {
      return false;
    }

    const enrollment = await fetchStudentClassForAccess(
      supabase,
      ctx.tenantId,
      studentProfileId,
      yearId,
      options.classId,
    );
    if (!enrollment) {
      return false;
    }

    const assignedClassIds = await fetchStaffAssignedClassIds(
      supabase,
      ctx.tenantId,
      yearId,
      staffProfileId,
    );

    return decideReportCardAccess({
      roleSlug: ctx.roleSlug,
      studentProfileId,
      teacherAssignedClassIds: assignedClassIds,
      studentClassId: enrollment.classId,
      isClassMaster: enrollment.classMasterStaffProfileId === staffProfileId,
    });
  }

  if (isStudent(ctx.roleSlug)) {
    const ownId = await fetchStudentProfileIdForUser(supabase, ctx.tenantId, ctx.actorUserId);
    return decideReportCardAccess({
      roleSlug: ctx.roleSlug,
      studentProfileId,
      ownStudentProfileId: ownId,
    });
  }

  if (isGuardian(ctx.roleSlug)) {
    const { data, error } = await supabase
      .from('GuardianStudentLink')
      .select('studentProfileId')
      .eq('tenantId', ctx.tenantId)
      .eq('guardianUserId', ctx.actorUserId)
      .eq('studentProfileId', studentProfileId)
      .is('consentRevokedAt', null)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return decideReportCardAccess({
      roleSlug: ctx.roleSlug,
      studentProfileId,
      guardianLinked: Boolean(data?.studentProfileId),
    });
  }

  return false;
}
