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
import { fetchClassMasterAccessibleClassIds } from '@/lib/supabase/queries/class-report';
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
      `classId, status, ${embed('Class', FK.StudentEnrollment_class, 'id, staffProfileId')}`,
    )
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('academicYearId', academicYearId);

  const requestedClassId = classId?.trim() ?? '';
  if (requestedClassId) {
    query = query.eq('classId', requestedClassId);
  }

  const { data, error } = await query.order('createdAt', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<EnrollmentAccessRow & { status?: string | null }>;
  const row =
    rows.find((entry) => entry.status === 'ENROLLED') ?? rows[0] ?? null;
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

export type ClassReportAccessDecision = {
  roleSlug: string;
  classId: string;
  staffProfileId?: string | null;
  classMasterStaffProfileId?: string | null;
  yearAssignedClassIds?: readonly string[] | null;
};

export function decideClassReportAccess(input: ClassReportAccessDecision): boolean {
  if (isAdmin(input.roleSlug)) {
    return true;
  }

  if (!isStaffOrTeacher(input.roleSlug)) {
    return false;
  }

  const classId = input.classId.trim();
  if (!classId) {
    return false;
  }

  const staffProfileId = input.staffProfileId?.trim() ?? '';
  if (!staffProfileId) {
    return false;
  }

  if (input.classMasterStaffProfileId?.trim() === staffProfileId) {
    return true;
  }

  return (input.yearAssignedClassIds ?? []).some((id) => id.trim() === classId);
}

export async function canAccessClassReport(
  supabase: SupabaseClient,
  ctx: SessionApiContext,
  classId: string,
  academicYearId?: string | null,
): Promise<boolean> {
  if (isAdmin(ctx.roleSlug)) {
    return true;
  }

  if (!isStaffOrTeacher(ctx.roleSlug)) {
    return false;
  }

  const trimmedClassId = classId.trim();
  if (!trimmedClassId) {
    return false;
  }

  const staffProfileId = await fetchStaffProfileIdForUser(
    supabase,
    ctx.tenantId,
    ctx.actorUserId,
  );
  if (!staffProfileId) {
    return false;
  }

  let yearId = academicYearId?.trim() || '';
  if (!yearId) {
    const current = await fetchCurrentAcademicYear(supabase, ctx.tenantId);
    yearId = current?.id ?? '';
  }
  if (!yearId) {
    return false;
  }

  const { data: classRow, error: classError } = await supabase
    .from('Class')
    .select('id, staffProfileId')
    .eq('tenantId', ctx.tenantId)
    .eq('id', trimmedClassId)
    .maybeSingle();

  if (classError) {
    throw classError;
  }
  if (!classRow?.id) {
    return false;
  }

  const assignedClassIds = await fetchClassMasterAccessibleClassIds(
    supabase,
    ctx.tenantId,
    yearId,
    staffProfileId,
  );

  return decideClassReportAccess({
    roleSlug: ctx.roleSlug,
    classId: trimmedClassId,
    staffProfileId,
    classMasterStaffProfileId: classRow.staffProfileId?.trim() || null,
    yearAssignedClassIds: assignedClassIds,
  });
}
