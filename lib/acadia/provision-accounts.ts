/**
 * Server-only helpers for provisioning student and parent accounts.
 * Uses the Supabase Admin client (service-role key) to create auth users
 * and to write snake_case `users` / `students` / `parents` rows. The
 * authenticated session role is not granted on `public.users`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeMatriculeNumber } from '@/lib/acadia/student-ids';
import { generateTemporaryPassword } from '@/lib/acadia/generate-temporary-password';
import { generateStudentId, generateParentCode } from '@/lib/acadia/ids';
import { normalizePhoneForLookup } from '@/lib/acadia/phone';
import type { StudentCreateInput } from '@/lib/acadia/student-create-schemas';
import { toAcademicBranch, toAcademicSubSystem } from '@/lib/acadia/catalog-maps';
import {
  provisionStudentProfileAndEnrollment,
  type ProvisionStudentProfileInput,
} from '@/lib/acadia/provision-student-profile';
import { provisionGuardianProfileAndLink } from '@/lib/acadia/provision-guardian';

export function buildParentSystemAuthEmail(
  tenantId: string,
  normalizedPhone: string,
): string {
  return `parent.${tenantId}.${normalizedPhone}@guardian.acadia.local`;
}

export type ProvisionResult =
  | {
      ok: true;
      /** Public registration number (AC-YYYY-######), not the legacy STU- id. */
      studentId: string;
      studentUuid: string;
      studentProfileId: string;
      enrollmentId: string;
      studentLoginEmail: string;
      studentTemporaryPassword: string;
      parentCode: string;
      parentUuid: string;
      parentLoginEmail: string;
      parentTemporaryPassword: string | null;
      newParentAuthCreated: boolean;
    }
  | { ok: false; message: string; status: number };

/**
 * End-to-end student + parent provisioning:
 *
 * 1. Create auth user for student with a temporary password.
 * 2. Insert `users` row (role=student) via the service-role client.
 * 3. Insert `students` row.
 * 4. Insert `user_profiles` row linking users ↔ students.
 * 5. Insert optional emergency_contacts / medical_info.
 * 6. Create or link parent:
 *    6a. If parent email exists in `users` with role=parent → reuse auth id.
 *    6b. If not found → create auth user + `users` row for parent with a
 *        temporary password.
 *    6c. If email exists but role≠parent → error 400.
 *    In all success cases: insert new `parents` row with student_id.
 * 7. Create PascalCase User for the parent (if missing) and GuardianStudentLink.
 * Rollback: delete PascalCase User/profile rows, then legacy rows, then auth.
 */
export async function provisionStudentAndParent(
  supabase: SupabaseClient,
  input: StudentCreateInput,
  tenantId: string,
  actorUserId: string,
  registrationNumber: string,
): Promise<ProvisionResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const studentEmail = input.email.trim().toLowerCase();
  const parentEmailRaw = input.parent_email.trim()
    ? input.parent_email.trim().toLowerCase()
    : '';
  const parentPhone = input.parent_phone.trim();
  const parentPhoneNormalized = normalizePhoneForLookup(parentPhone);
  const studentTemporaryPassword = generateTemporaryPassword();

  // -- Step 1: Create student auth user --
  const { data: studentAuthData, error: studentAuthError } =
    await admin.auth.admin.createUser({
      email: studentEmail,
      password: studentTemporaryPassword,
      email_confirm: true,
      user_metadata: {
        name: `${input.first_name.trim()} ${input.last_name.trim()}`,
      },
    });

  if (studentAuthError || !studentAuthData.user) {
    const msg =
      studentAuthError?.message?.includes('already been registered') ||
      studentAuthError?.message?.includes('already exists')
        ? 'A user with this student email already exists.'
        : (studentAuthError?.message ?? 'Failed to create student auth account.');
    return { ok: false, message: msg, status: 400 };
  }

  const studentAuthId = studentAuthData.user.id;

  // -- Step 2: Insert users row for student --
  // Service role is required: `public.users` is not granted to the authenticated
  // session role, and `created_by` cannot reference PascalCase `User` ids.
  const { error: studentUserError } = await admin.from('users').insert({
    id: studentAuthId,
    email: studentEmail,
    name: `${input.first_name.trim()} ${input.last_name.trim()}`,
    role: 'student',
    status: 'active',
    phone: input.phone ?? null,
    address: input.address ?? null,
    date_of_birth: input.date_of_birth ?? null,
    gender: input.gender ?? null,
    tenant_id: tenantId,
    created_at: now,
    updated_at: now,
  });

  if (studentUserError) {
    await admin.auth.admin.deleteUser(studentAuthId);
    return {
      ok: false,
      message: studentUserError.message ?? 'Failed to create student user row.',
      status: 400,
    };
  }

  // -- Step 3: Insert students row --
  const studentId = generateStudentId();
  const matriculeNumber = normalizeMatriculeNumber(input.matricule_number);

  const { error: studentInsertError } = await admin.from('students').insert({
    student_id: studentId,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    middle_name: input.middle_name?.trim() ?? null,
    email: studentEmail,
    phone: input.phone ?? null,
    date_of_birth: input.date_of_birth ?? null,
    gender: input.gender ?? null,
    place_of_birth: input.place_of_birth ?? null,
    nationality: input.nationality ?? 'Cameroonian',
    religion: input.religion ?? null,
    address: input.address ?? null,
    country: input.country ?? 'Cameroon',
    city: input.city ?? null,
    region: input.region ?? null,
    subsystem: input.subsystem ?? null,
    branch: input.branch ?? null,
    class_id: input.class_id ?? null,
    class_name: input.class_name ?? null,
    previous_school: input.previous_school ?? null,
    previous_class: input.previous_class ?? null,
    is_new_student: input.is_new_student ?? true,
    academic_year: input.academic_year ?? null,
    enrollment_date: input.enrollment_date ?? new Date().toISOString().slice(0, 10),
    matricule_number: matriculeNumber,
    enrollment_status: 'active',
    status: 'active',
    tenant_id: tenantId,
    created_at: now,
    updated_at: now,
  });

  if (studentInsertError) {
    await admin.from('users').delete().eq('id', studentAuthId);
    await admin.auth.admin.deleteUser(studentAuthId);
    return {
      ok: false,
      message: studentInsertError.message ?? 'Failed to insert student record.',
      status: 400,
    };
  }

  // -- Step 4: user_profiles row --
  const { error: userProfileError } = await admin.from('user_profiles').insert({
    user_id: studentAuthId,
    role_specific_id: studentId,
    subsystem: input.subsystem ?? null,
    branch: input.branch ?? null,
    class_name: input.class_name ?? null,
    blood_group: input.blood_group ?? null,
    allergies: input.allergies ?? null,
    medical_conditions: input.medical_conditions ?? null,
    emergency_contact_name: input.emergency_contact_name ?? null,
    emergency_contact_phone: input.emergency_contact_phone ?? null,
    emergency_contact_relationship: input.emergency_contact_relationship ?? null,
    created_at: now,
    updated_at: now,
  });

  if (userProfileError) {
    await rollbackStudent(admin, studentAuthId, studentId);
    return {
      ok: false,
      message: userProfileError.message ?? 'Failed to create student profile.',
      status: 400,
    };
  }

  // -- Step 5: optional emergency_contacts / medical_info --
  const { data: studentRow, error: studentRowError } = await admin
    .from('students')
    .select('id')
    .eq('student_id', studentId)
    .maybeSingle();

  if (studentRowError || !studentRow?.id) {
    await rollbackStudent(admin, studentAuthId, studentId);
    return {
      ok: false,
      message:
        studentRowError?.message ??
        'Failed to resolve student record after creation.',
      status: 400,
    };
  }

  const studentUuid = studentRow.id as string;

  if (input.emergency_contact_name && input.emergency_contact_phone) {
    const { error: emergencyContactError } = await admin
      .from('emergency_contacts')
      .insert({
        student_id: studentUuid,
        name: input.emergency_contact_name,
        phone: input.emergency_contact_phone,
        relationship: input.emergency_contact_relationship ?? null,
        created_at: now,
      });

    if (emergencyContactError) {
      await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message:
          emergencyContactError.message ?? 'Failed to save emergency contact.',
        status: 400,
      };
    }
  }

  if (input.blood_group || input.allergies || input.medical_conditions) {
    const { error: medicalInfoError } = await admin.from('medical_info').insert({
      student_id: studentUuid,
      blood_group: input.blood_group ?? null,
      allergies: input.allergies ?? null,
      medical_conditions: input.medical_conditions ?? null,
      created_at: now,
    });

    if (medicalInfoError) {
      await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message: medicalInfoError.message ?? 'Failed to save medical information.',
        status: 400,
      };
    }
  }

  // -- Step 6: Create or link parent --
  const parentCode = generateParentCode();
  let parentAuthId: string;
  let parentLoginEmail: string;
  let parentTemporaryPassword: string | null = null;
  let newParentAuthCreated = false;

  let existingParentUser: { id: string; role: string; email: string } | null =
    null;

  if (parentEmailRaw) {
    const { data, error: existingParentUserError } = await admin
      .from('users')
      .select('id, role, email')
      .eq('email', parentEmailRaw)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingParentUserError) {
      await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message:
          existingParentUserError.message ??
          'Failed to look up existing parent account.',
        status: 500,
      };
    }

    if (data) {
      existingParentUser = {
        id: data.id as string,
        role: data.role as string,
        email: (data.email as string | null)?.trim().toLowerCase() ?? '',
      };
    }
  } else {
    const { data: parentCandidates, error: parentPhoneLookupError } =
      await admin
        .from('users')
        .select('id, role, phone, email')
        .eq('role', 'parent')
        .eq('tenant_id', tenantId)
        .not('phone', 'is', null);

    if (parentPhoneLookupError) {
      await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message:
          parentPhoneLookupError.message ??
          'Failed to look up existing parent account.',
        status: 500,
      };
    }

    const match = parentCandidates?.find(
      (row) =>
        row.phone &&
        normalizePhoneForLookup(row.phone) === parentPhoneNormalized,
    );
    if (match) {
      existingParentUser = {
        id: match.id as string,
        role: match.role as string,
        email: (match.email as string | null)?.trim().toLowerCase() ?? '',
      };
    }
  }

  if (existingParentUser) {
    if (existingParentUser.role !== 'parent') {
      await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message:
          'The parent email belongs to a non-parent account. Use a different email.',
        status: 400,
      };
    }
    parentAuthId = existingParentUser.id;
    parentLoginEmail =
      existingParentUser.email ||
      parentEmailRaw ||
      buildParentSystemAuthEmail(tenantId, parentPhoneNormalized);
  } else {
    parentLoginEmail =
      parentEmailRaw ||
      buildParentSystemAuthEmail(tenantId, parentPhoneNormalized);
    parentTemporaryPassword = generateTemporaryPassword();

    const { data: parentAuthData, error: parentAuthError } =
      await admin.auth.admin.createUser({
        email: parentLoginEmail,
        password: parentTemporaryPassword,
        email_confirm: true,
        user_metadata: { name: input.parent_name.trim() },
      });

    if (parentAuthError || !parentAuthData.user) {
      await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
      const msg =
        parentAuthError?.message?.includes('already been registered') ||
        parentAuthError?.message?.includes('already exists')
          ? parentEmailRaw
            ? 'A user with this parent email already exists.'
            : 'A parent account with this phone number already exists.'
          : (parentAuthError?.message ?? 'Failed to create parent auth account.');
      return { ok: false, message: msg, status: 400 };
    }

    parentAuthId = parentAuthData.user.id;
    newParentAuthCreated = true;

    const { error: parentUserError } = await admin.from('users').insert({
      id: parentAuthId,
      email: parentLoginEmail,
      name: input.parent_name.trim(),
      role: 'parent',
      status: 'active',
      phone: parentPhone,
      address: input.parent_address ?? null,
      tenant_id: tenantId,
      created_at: now,
      updated_at: now,
    });

    if (parentUserError) {
      await admin.auth.admin.deleteUser(parentAuthId);
      await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message: parentUserError.message ?? 'Failed to create parent user row.',
        status: 400,
      };
    }
  }

  // Insert parents row (always new — links parent → this specific student)
  const { error: parentInsertError } = await admin.from('parents').insert({
    parent_code: parentCode,
    name: input.parent_name.trim(),
    email: parentEmailRaw || null,
    phone: parentPhone,
    address: input.parent_address ?? null,
    occupation: input.parent_occupation ?? null,
    relationship: input.parent_relationship,
    student_id: studentId,
    tenant_id: tenantId,
    created_at: now,
    updated_at: now,
  });

  if (parentInsertError) {
    if (newParentAuthCreated) {
      await admin.from('users').delete().eq('id', parentAuthId);
      await admin.auth.admin.deleteUser(parentAuthId);
    }
    await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
    return {
      ok: false,
      message: parentInsertError.message ?? 'Failed to insert parent record.',
      status: 400,
    };
  }

  const profileInput: ProvisionStudentProfileInput = {
    authUserId: studentAuthId,
    email: studentEmail,
    name: `${input.first_name.trim()} ${input.last_name.trim()}`,
    registrationNumber,
    matriculeNumber,
    tenantId,
    actorUserId,
    subSystem: toAcademicSubSystem(input.subsystem) ?? 'ENGLISH',
    branch: toAcademicBranch(input.branch) ?? 'GRAMMAR',
    levelId: input.level_id,
    academicYearId: input.academic_year_id,
    classId: input.class_id ?? null,
    country: input.country ?? null,
  };

  const profileResult = await provisionStudentProfileAndEnrollment(
    supabase,
    profileInput,
  );

  if (!profileResult.ok) {
    await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
    await rollbackParentLink(admin, {
      parentAuthId,
      parentCode,
      newParentAuthCreated,
    });
    return {
      ok: false,
      message: profileResult.message,
      status: profileResult.status,
    };
  }

  const guardianResult = await provisionGuardianProfileAndLink(admin, {
    tenantId,
    actorUserId,
    parentAuthId,
    parentEmail: parentLoginEmail,
    parentName: input.parent_name.trim(),
    studentProfileId: profileResult.studentProfileId,
    relationshipLabel: input.parent_relationship,
  });

  if (!guardianResult.ok) {
    await rollbackStudent(admin, studentAuthId, studentId, studentUuid);
    await rollbackParentLink(admin, {
      parentAuthId,
      parentCode,
      newParentAuthCreated,
      studentProfileId: profileResult.studentProfileId,
      createdParentUser: guardianResult.createdUser,
    });
    return {
      ok: false,
      message: guardianResult.message,
      status: guardianResult.status,
    };
  }

  return {
    ok: true,
    studentId: registrationNumber,
    studentUuid,
    studentProfileId: profileResult.studentProfileId,
    enrollmentId: profileResult.enrollmentId,
    studentLoginEmail: studentEmail,
    studentTemporaryPassword,
    parentCode,
    parentUuid: parentAuthId,
    parentLoginEmail,
    parentTemporaryPassword,
    newParentAuthCreated,
  };
}

async function rollbackStudent(
  admin: SupabaseClient,
  studentAuthId: string,
  studentId: string,
  studentUuid?: string,
) {
  if (studentUuid) {
    await admin.from('emergency_contacts').delete().eq('student_id', studentUuid);
    await admin.from('medical_info').delete().eq('student_id', studentUuid);
    await admin.from('class_students').delete().eq('student_id', studentUuid);
  }
  await admin.from('user_profiles').delete().eq('user_id', studentAuthId);
  await admin.from('students').delete().eq('student_id', studentId);

  const { data: profiles } = await admin
    .from('StudentProfile')
    .select('id')
    .eq('userId', studentAuthId);
  const profileIds = (profiles ?? [])
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));
  if (profileIds.length > 0) {
    await admin.from('GuardianStudentLink').delete().in('studentProfileId', profileIds);
    await admin.from('StudentEnrollment').delete().in('studentProfileId', profileIds);
    await admin.from('StudentProfile').delete().in('id', profileIds);
  }
  await admin.from('User').delete().eq('id', studentAuthId);

  await admin.from('users').delete().eq('id', studentAuthId);
  await admin.auth.admin.deleteUser(studentAuthId);
}

async function rollbackParentLink(
  admin: SupabaseClient,
  input: {
    parentAuthId: string;
    parentCode: string;
    newParentAuthCreated: boolean;
    studentProfileId?: string;
    createdParentUser?: boolean;
  },
) {
  if (input.studentProfileId) {
    await admin
      .from('GuardianStudentLink')
      .delete()
      .eq('guardianUserId', input.parentAuthId)
      .eq('studentProfileId', input.studentProfileId);
  }
  await admin.from('parents').delete().eq('parent_code', input.parentCode);
  if (input.newParentAuthCreated) {
    await admin.from('User').delete().eq('id', input.parentAuthId);
    await admin.from('users').delete().eq('id', input.parentAuthId);
    await admin.auth.admin.deleteUser(input.parentAuthId);
    return;
  }
  if (input.createdParentUser) {
    await admin.from('User').delete().eq('id', input.parentAuthId);
  }
}
