/**
 * Creates PascalCase User + StudentProfile + StudentEnrollment for the year-scoped registry.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveClassForEnrollment } from '@/lib/acadia/class-assignment';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { UserStatus } from '@/app/models/user';

export type ProvisionStudentProfileInput = {
  authUserId: string;
  email: string;
  name: string;
  registrationNumber: string;
  tenantId: string;
  actorUserId: string;
  specialtyId: string;
  levelId: string;
  academicYearId: string;
  classId?: string | null;
  country?: string | null;
};

export type ProvisionStudentProfileResult =
  | {
      ok: true;
      studentProfileId: string;
      enrollmentId: string;
      classId: string | null;
    }
  | { ok: false; message: string; status: number };

export async function provisionStudentProfileAndEnrollment(
  supabase: SupabaseClient,
  input: ProvisionStudentProfileInput,
): Promise<ProvisionStudentProfileResult> {
  const now = new Date().toISOString();

  const { data: studentRole, error: roleError } = await supabase
    .from('UserRole')
    .select('id')
    .eq('slug', 'student')
    .maybeSingle();

  if (roleError || !studentRole?.id) {
    return {
      ok: false,
      message: 'Student role is not configured.',
      status: 500,
    };
  }

  const { data: existingUser } = await supabase
    .from('User')
    .select('id')
    .eq('id', input.authUserId)
    .maybeSingle();

  if (!existingUser?.id) {
    const { error: userInsertError } = await supabase.from('User').insert({
      id: input.authUserId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      roleId: studentRole.id,
      tenantId: input.tenantId,
      status: UserStatus.ACTIVE,
      country: input.country?.trim() || null,
      invitedByUserId: input.actorUserId,
      createdAt: now,
      updatedAt: now,
      isTrashed: false,
      isProtected: false,
    });

    if (userInsertError) {
      return {
        ok: false,
        message: userInsertError.message ?? 'Failed to create user profile.',
        status: 400,
      };
    }
  }

  const studentProfileId = generateAcadiaId('student');

  const { error: profileError } = await supabase.from('StudentProfile').insert({
    id: studentProfileId,
    tenantId: input.tenantId,
    userId: input.authUserId,
    registrationNumber: input.registrationNumber.trim(),
    specialtyId: input.specialtyId,
    currentLevelId: input.levelId,
    isActive: true,
    alumniDirectoryOptIn: false,
    updatedAt: now,
  });

  if (profileError) {
    await rollbackPascalUser(supabase, input.authUserId, false);
    return {
      ok: false,
      message: profileError.message ?? 'Failed to create student profile.',
      status: 400,
    };
  }

  let classId = input.classId?.trim() || null;
  if (!classId) {
    const resolution = await resolveClassForEnrollment(
      supabase,
      input.tenantId,
      input.levelId,
      input.specialtyId,
    );
    if (resolution.status === 'resolved') {
      classId = resolution.classId;
    }
  }

  const enrollmentId = generateAcadiaId('enr');
  const { error: enrollmentError } = await supabase
    .from('StudentEnrollment')
    .insert({
      id: enrollmentId,
      tenantId: input.tenantId,
      studentProfileId,
      academicYearId: input.academicYearId,
      specialtyId: input.specialtyId,
      levelId: input.levelId,
      classId,
      status: 'ENROLLED',
      applicationId: null,
      createdAt: now,
      updatedAt: now,
    });

  if (enrollmentError) {
    await supabase
      .from('StudentProfile')
      .delete()
      .eq('id', studentProfileId)
      .eq('tenantId', input.tenantId);
    await rollbackPascalUser(supabase, input.authUserId, true);
    return {
      ok: false,
      message: enrollmentError.message ?? 'Failed to create student enrollment.',
      status: 400,
    };
  }

  return {
    ok: true,
    studentProfileId,
    enrollmentId,
    classId,
  };
}

async function rollbackPascalUser(
  supabase: SupabaseClient,
  userId: string,
  deleteUserRow: boolean,
) {
  if (deleteUserRow) {
    await supabase.from('User').delete().eq('id', userId);
  }
}
