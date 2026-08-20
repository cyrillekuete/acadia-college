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

export const STAFF_ROLE_SLUGS = ['teacher', 'lecturer', 'staff'] as const;

export type ResolveStaffRoleResult =
  | { ok: true; roleId: string }
  | { ok: false; reason: 'invalid' | 'missing' };

export async function resolveStaffRoleId(
  supabase: SupabaseClient,
  preferredRoleId?: string,
): Promise<ResolveStaffRoleResult> {
  const preferred = preferredRoleId?.trim();
  if (preferred) {
    const { data, error } = await supabase
      .from('UserRole')
      .select('id, slug')
      .eq('id', preferred)
      .eq('isTrashed', false)
      .maybeSingle();

    if (error || !data?.id) {
      return { ok: false, reason: 'invalid' };
    }

    const slug = String(data.slug ?? '').toLowerCase();
    if (!(STAFF_ROLE_SLUGS as readonly string[]).includes(slug)) {
      return { ok: false, reason: 'invalid' };
    }

    return { ok: true, roleId: data.id as string };
  }

  const { data, error } = await supabase
    .from('UserRole')
    .select('id, slug')
    .eq('isTrashed', false)
    .in('slug', [...STAFF_ROLE_SLUGS]);

  if (error || !data?.length) {
    return { ok: false, reason: 'missing' };
  }

  const bySlug = new Map(data.map((row) => [row.slug as string, row.id as string]));
  for (const slug of STAFF_ROLE_SLUGS) {
    const id = bySlug.get(slug);
    if (id) {
      return { ok: true, roleId: id };
    }
  }

  return { ok: false, reason: 'missing' };
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function isStaffCodeTaken(
  supabase: SupabaseClient,
  tenantId: string,
  staffCode: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('StaffProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('staffCode', staffCode)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function resolveUniqueStaffCode(
  supabase: SupabaseClient,
  tenantId: string,
  preferred?: string,
): Promise<{ ok: true; staffCode: string } | { ok: false; message: string }> {
  const custom = emptyToNull(preferred);
  if (custom) {
    if (await isStaffCodeTaken(supabase, tenantId, custom)) {
      return {
        ok: false,
        message: 'This staff code is already in use.',
      };
    }
    return { ok: true, staffCode: custom };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateStaffCode();
    if (!(await isStaffCodeTaken(supabase, tenantId, candidate))) {
      return { ok: true, staffCode: candidate };
    }
  }

  return {
    ok: false,
    message: 'Unable to generate a unique staff code. Try again.',
  };
}

async function rollbackStaff(
  admin: ReturnType<typeof createAdminClient>,
  authId: string,
  tenantId: string,
) {
  const steps: Array<{ label: string; run: () => Promise<{ error: unknown }> }> = [
    {
      label: 'StaffClassSubjectAssignment',
      run: async () =>
        admin
          .from('StaffClassSubjectAssignment')
          .delete()
          .eq('staffProfileId', authId)
          .eq('tenantId', tenantId),
    },
    {
      label: 'StaffClassAssignment',
      run: async () =>
        admin
          .from('StaffClassAssignment')
          .delete()
          .eq('staffProfileId', authId)
          .eq('tenantId', tenantId),
    },
    {
      label: 'SubjectAssignment',
      run: async () =>
        admin
          .from('SubjectAssignment')
          .delete()
          .eq('staffProfileId', authId)
          .eq('tenantId', tenantId),
    },
    {
      label: 'StaffProfile',
      run: async () => admin.from('StaffProfile').delete().eq('id', authId),
    },
    {
      label: 'User',
      run: async () => admin.from('User').delete().eq('id', authId),
    },
  ];

  for (const step of steps) {
    const { error } = await step.run();
    if (error) {
      console.error(`[provision-staff] rollback ${step.label} failed`, error);
    }
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(authId);
  if (authDeleteError) {
    console.error('[provision-staff] rollback auth user failed', authDeleteError);
  }
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

async function isLoginEmailTaken(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('User')
    .select('id')
    .eq('email', email)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function provisionStaff(
  _sessionClient: SupabaseClient,
  input: StaffCreateInput,
  tenantId: string,
  actorUserId: string,
): Promise<ProvisionStaffResult> {
  // Service-role writes bypass RLS so bursar/FD registry actors can provision
  // after requireRegistryApi (user-scoped inserts would fail SQL admin checks).
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const temporaryPassword = generateTemporaryPassword();
  const displayName = formatStaffDisplayName(input.title, firstName, lastName);
  const personalEmail = input.personalEmail.trim().toLowerCase();

  const roleResult = await resolveStaffRoleId(admin, input.roleId);
  if (!roleResult.ok) {
    if (roleResult.reason === 'invalid') {
      return {
        ok: false,
        message: 'Selected role is not a staff or teacher role.',
        status: 400,
      };
    }
    return {
      ok: false,
      message: 'No teacher/staff role is configured. Contact an administrator.',
      status: 500,
    };
  }
  const roleId = roleResult.roleId;

  const codeResult = await resolveUniqueStaffCode(admin, tenantId, input.staffCode);
  if (!codeResult.ok) {
    return { ok: false, message: codeResult.message, status: 400 };
  }
  const staffCode = codeResult.staffCode;

  const takenEmails = new Set<string>();
  let loginEmail: string;
  try {
    loginEmail = await resolveStaffSystemEmail({
      firstName,
      lastName,
      isEmailTaken: async (email) => {
        if (takenEmails.has(email)) {
          return true;
        }
        return isLoginEmailTaken(admin, email);
      },
    });
  } catch {
    return {
      ok: false,
      message: 'Unable to generate a unique login email for this teacher.',
      status: 400,
    };
  }

  let authId: string | null = null;
  for (let emailAttempt = 0; emailAttempt < 2; emailAttempt++) {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { name: displayName },
    });

    if (!authError && authData.user) {
      authId = authData.user.id;
      break;
    }

    const alreadyExists =
      authError?.message?.includes('already been registered') ||
      authError?.message?.includes('already exists');

    if (!alreadyExists || emailAttempt === 1) {
      const message = alreadyExists
        ? 'A user with this login email already exists.'
        : (authError?.message ?? 'Failed to create auth account.');
      return { ok: false, message, status: 400 };
    }

    takenEmails.add(loginEmail);
    try {
      loginEmail = await resolveStaffSystemEmail({
        firstName,
        lastName,
        isEmailTaken: async (email) => {
          if (takenEmails.has(email)) {
            return true;
          }
          return isLoginEmailTaken(admin, email);
        },
      });
    } catch {
      return {
        ok: false,
        message: 'Unable to generate a unique login email for this teacher.',
        status: 400,
      };
    }
  }

  if (!authId) {
    return { ok: false, message: 'Failed to create auth account.', status: 400 };
  }

  const { error: userError } = await admin.from('User').insert({
    id: authId,
    email: loginEmail,
    name: displayName,
    roleId,
    tenantId,
    status: UserStatus.ACTIVE,
    invitedByUserId: actorUserId,
    emailVerifiedAt: now,
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

  const { error: staffError } = await admin.from('StaffProfile').insert({
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
    await rollbackStaff(admin, authId, tenantId);
    return {
      ok: false,
      message: staffError.message ?? 'Failed to create staff profile.',
      status: 400,
    };
  }

  const subjectResult = await insertSubjectAssignments(
    admin,
    tenantId,
    authId,
    input.academicYearId,
    input.subjectIds,
    now,
  );
  if (!subjectResult.ok) {
    await rollbackStaff(admin, authId, tenantId);
    return { ok: false, message: subjectResult.message, status: 400 };
  }

  const classResult = await insertClassAssignments(
    admin,
    tenantId,
    authId,
    input.academicYearId,
    input.classIds,
    now,
  );
  if (!classResult.ok) {
    await rollbackStaff(admin, authId, tenantId);
    return { ok: false, message: classResult.message, status: 400 };
  }

  const classSubjectResult = await insertClassSubjectAssignmentsForStaff(
    admin,
    tenantId,
    authId,
    input.academicYearId,
    input.classIds,
    input.subjectIds,
    now,
  );
  if (!classSubjectResult.ok) {
    await rollbackStaff(admin, authId, tenantId);
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
