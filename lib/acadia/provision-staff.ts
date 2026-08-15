import type { SupabaseClient } from '@supabase/supabase-js';
import { UserStatus } from '@/app/models/user';
import { generateAcadiaId, generateStaffCode } from '@/lib/acadia/ids';
import { generateTemporaryPassword } from '@/lib/acadia/generate-temporary-password';
import {
  formatStaffDisplayName,
  resolveStaffSystemEmail,
} from '@/lib/acadia/staff-email';
import type { StaffCreateInput } from '@/lib/acadia/staff-create-schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertClassSubjectAssignmentsForStaff } from '@/lib/supabase/queries/staff-class-assignments';

export type ProvisionStaffResult =
  | {
      ok: true;
      staffId: string;
      staffCode: string;
      loginEmail: string;
      temporaryPassword: string;
    }
  | { ok: false; message: string; status: number };

const STAFF_ROLE_SLUGS = ['teacher', 'lecturer', 'staff'] as const;

async function resolveStaffRoleId(
  supabase: SupabaseClient,
  preferredRoleId?: string,
): Promise<string | null> {
  if (preferredRoleId?.trim()) {
    return preferredRoleId.trim();
  }

  const { data, error } = await supabase
    .from('UserRole')
    .select('id, slug')
    .eq('isTrashed', false)
    .in('slug', [...STAFF_ROLE_SLUGS]);

  if (error || !data?.length) {
    return null;
  }

  const bySlug = new Map(data.map((row) => [row.slug as string, row.id as string]));
  for (const slug of STAFF_ROLE_SLUGS) {
    const id = bySlug.get(slug);
    if (id) {
      return id;
    }
  }

  return (data[0]?.id as string) ?? null;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function rollbackStaff(
  supabase: SupabaseClient,
  admin: ReturnType<typeof createAdminClient>,
  authId: string,
  tenantId: string,
) {
  await supabase
    .from('StaffClassSubjectAssignment')
    .delete()
    .eq('staffProfileId', authId)
    .eq('tenantId', tenantId);
  await supabase
    .from('StaffClassAssignment')
    .delete()
    .eq('staffProfileId', authId)
    .eq('tenantId', tenantId);
  await supabase
    .from('SubjectAssignment')
    .delete()
    .eq('staffProfileId', authId)
    .eq('tenantId', tenantId);
  await supabase.from('StaffProfile').delete().eq('id', authId);
  await supabase.from('User').delete().eq('id', authId);
  await admin.auth.admin.deleteUser(authId);
}

async function insertSubjectAssignments(
  supabase: SupabaseClient,
  tenantId: string,
  staffProfileId: string,
  academicYearId: string,
  subjectIds: string[],
  now: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (subjectIds.length === 0) {
    return { ok: true };
  }

  const rows = subjectIds.map((subjectId) => ({
    id: generateAcadiaId('assign'),
    tenantId,
    subjectId,
    academicYearId,
    staffProfileId,
    isLead: false,
    teachesPrimaryHome: false,
    notes: null,
    createdAt: now,
    updatedAt: now,
  }));

  const { error } = await supabase.from('SubjectAssignment').insert(rows);
  if (error) {
    return {
      ok: false,
      message: error.message ?? 'Failed to assign subjects.',
    };
  }
  return { ok: true };
}

async function insertClassAssignments(
  supabase: SupabaseClient,
  tenantId: string,
  staffProfileId: string,
  academicYearId: string,
  classIds: string[],
  now: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (classIds.length === 0) {
    return { ok: true };
  }

  const rows = classIds.map((classId) => ({
    id: generateAcadiaId('staff-class'),
    tenantId,
    staffProfileId,
    classId,
    academicYearId,
    createdAt: now,
  }));

  const { error } = await supabase.from('StaffClassAssignment').insert(rows);
  if (error) {
    return {
      ok: false,
      message: error.message ?? 'Failed to assign classes.',
    };
  }
  return { ok: true };
}

export async function provisionStaff(
  supabase: SupabaseClient,
  input: StaffCreateInput,
  tenantId: string,
  actorUserId: string,
): Promise<ProvisionStaffResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const staffCode = emptyToNull(input.staffCode) ?? generateStaffCode();
  const temporaryPassword = generateTemporaryPassword();
  const displayName = formatStaffDisplayName(input.title, firstName, lastName);
  const personalEmail = input.personalEmail.trim().toLowerCase();

  const roleId = await resolveStaffRoleId(supabase, input.roleId);
  if (!roleId) {
    return {
      ok: false,
      message: 'No teacher/staff role is configured. Contact an administrator.',
      status: 500,
    };
  }

  let loginEmail: string;
  try {
    loginEmail = await resolveStaffSystemEmail({
      firstName,
      lastName,
      isEmailTaken: async (email) => {
        const { data } = await supabase
          .from('User')
          .select('id')
          .eq('email', email)
          .limit(1);
        return (data?.length ?? 0) > 0;
      },
    });
  } catch {
    return {
      ok: false,
      message: 'Unable to generate a unique login email for this teacher.',
      status: 400,
    };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name: displayName },
  });

  if (authError || !authData.user) {
    const message =
      authError?.message?.includes('already been registered') ||
      authError?.message?.includes('already exists')
        ? 'A user with this login email already exists.'
        : (authError?.message ?? 'Failed to create auth account.');
    return { ok: false, message, status: 400 };
  }

  const authId = authData.user.id;

  const { error: userError } = await supabase.from('User').insert({
    id: authId,
    email: loginEmail,
    name: displayName,
    roleId,
    tenantId,
    status: UserStatus.ACTIVE,
    invitedByUserId: actorUserId,
    createdAt: now,
    updatedAt: now,
    isTrashed: false,
    isProtected: false,
  });

  if (userError) {
    await admin.auth.admin.deleteUser(authId);
    return {
      ok: false,
      message: userError.message ?? 'Failed to create user profile.',
      status: 400,
    };
  }

  const { error: staffError } = await supabase.from('StaffProfile').insert({
    id: authId,
    userId: authId,
    tenantId,
    staffCode,
    title: input.title,
    firstName,
    lastName,
    dateOfBirth: emptyToNull(input.dateOfBirth),
    gender: input.gender ?? null,
    nationality: emptyToNull(input.nationality),
    idNumber: emptyToNull(input.idNumber),
    personalEmail,
    phone: emptyToNull(input.phone),
    address: emptyToNull(input.address),
    city: emptyToNull(input.city),
    region: emptyToNull(input.region),
    qualifications: emptyToNull(input.qualifications),
    teachingExperience: emptyToNull(input.teachingExperience),
    subSystem: input.subSystem,
    employmentType: input.employmentType,
    departmentId: emptyToNull(input.departmentId),
    hireDate: emptyToNull(input.hireDate),
    monthlySalary: input.monthlySalary ?? null,
    emergencyContactName: emptyToNull(input.emergencyContactName),
    emergencyContactRelationship: input.emergencyContactRelationship ?? null,
    emergencyContactPhone: emptyToNull(input.emergencyContactPhone),
    officePhone: emptyToNull(input.phone),
    onboardingCompletedAt: null,
    officeRoom: null,
    bio: emptyToNull(input.bio),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });

  if (staffError) {
    await rollbackStaff(supabase, admin, authId, tenantId);
    return {
      ok: false,
      message: staffError.message ?? 'Failed to create staff profile.',
      status: 400,
    };
  }

  const subjectResult = await insertSubjectAssignments(
    supabase,
    tenantId,
    authId,
    input.academicYearId,
    input.subjectIds,
    now,
  );
  if (!subjectResult.ok) {
    await rollbackStaff(supabase, admin, authId, tenantId);
    return { ok: false, message: subjectResult.message, status: 400 };
  }

  const classResult = await insertClassAssignments(
    supabase,
    tenantId,
    authId,
    input.academicYearId,
    input.classIds,
    now,
  );
  if (!classResult.ok) {
    await rollbackStaff(supabase, admin, authId, tenantId);
    return { ok: false, message: classResult.message, status: 400 };
  }

  const classSubjectResult = await insertClassSubjectAssignmentsForStaff(
    supabase,
    tenantId,
    authId,
    input.academicYearId,
    input.classIds,
    input.subjectIds,
    now,
  );
  if (!classSubjectResult.ok) {
    await rollbackStaff(supabase, admin, authId, tenantId);
    return { ok: false, message: classSubjectResult.message, status: 400 };
  }

  return {
    ok: true,
    staffId: authId,
    staffCode,
    loginEmail,
    temporaryPassword,
  };
}
