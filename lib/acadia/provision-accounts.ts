/**
 * Server-only helpers for provisioning student and parent accounts.
 * Uses the Supabase Admin client (service-role key) to create auth users
 * and inserts rows into the new snake_case tables from database.sql.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateStudentId, generateParentCode } from '@/lib/acadia/ids';
import type { StudentCreateInput } from '@/lib/acadia/student-create-schemas';

export type ProvisionResult =
  | {
      ok: true;
      studentId: string;
      studentUuid: string;
      parentCode: string;
      parentUuid: string;
      newParentAuthCreated: boolean;
    }
  | { ok: false; message: string; status: number };

/**
 * End-to-end student + parent provisioning:
 *
 * 1. Create auth user for student.
 * 2. Insert `users` row (role=student).
 * 3. Insert `students` row.
 * 4. Insert `user_profiles` row linking users ↔ students.
 * 5. Insert optional emergency_contacts / medical_info.
 * 6. Create or link parent:
 *    6a. If parent email exists in `users` with role=parent → reuse auth id.
 *    6b. If not found → create auth user + `users` row for parent.
 *    6c. If email exists but role≠parent → error 400.
 *    In all success cases: insert new `parents` row with student_id.
 * 7. Send password-reset emails (so users set own passwords).
 * Rollback: delete rows in reverse on any failure.
 */
export async function provisionStudentAndParent(
  supabase: SupabaseClient,
  input: StudentCreateInput,
  tenantId: string,
  actorUserId: string,
): Promise<ProvisionResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const studentEmail = input.email.trim().toLowerCase();
  const parentEmail = input.parent_email.trim().toLowerCase();

  // -- Step 1: Create student auth user --
  const { data: studentAuthData, error: studentAuthError } =
    await admin.auth.admin.createUser({
      email: studentEmail,
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
  const { error: studentUserError } = await supabase.from('users').insert({
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
    created_by: actorUserId,
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

  const { error: studentInsertError } = await supabase.from('students').insert({
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
    matricule_number: input.matricule_number ?? null,
    enrollment_status: 'active',
    status: 'active',
    tenant_id: tenantId,
    created_at: now,
    updated_at: now,
  });

  if (studentInsertError) {
    await supabase.from('users').delete().eq('id', studentAuthId);
    await admin.auth.admin.deleteUser(studentAuthId);
    return {
      ok: false,
      message: studentInsertError.message ?? 'Failed to insert student record.',
      status: 400,
    };
  }

  // -- Step 4: user_profiles row --
  const { error: userProfileError } = await supabase.from('user_profiles').insert({
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
    await rollbackStudent(supabase, admin, studentAuthId, studentId);
    return {
      ok: false,
      message: userProfileError.message ?? 'Failed to create student profile.',
      status: 400,
    };
  }

  // -- Step 5: optional emergency_contacts / medical_info --
  const { data: studentRow, error: studentRowError } = await supabase
    .from('students')
    .select('id')
    .eq('student_id', studentId)
    .maybeSingle();

  if (studentRowError || !studentRow?.id) {
    await rollbackStudent(supabase, admin, studentAuthId, studentId);
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
    const { error: emergencyContactError } = await supabase
      .from('emergency_contacts')
      .insert({
        student_id: studentUuid,
        name: input.emergency_contact_name,
        phone: input.emergency_contact_phone,
        relationship: input.emergency_contact_relationship ?? null,
        created_at: now,
      });

    if (emergencyContactError) {
      await rollbackStudent(supabase, admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message:
          emergencyContactError.message ?? 'Failed to save emergency contact.',
        status: 400,
      };
    }
  }

  if (input.blood_group || input.allergies || input.medical_conditions) {
    const { error: medicalInfoError } = await supabase.from('medical_info').insert({
      student_id: studentUuid,
      blood_group: input.blood_group ?? null,
      allergies: input.allergies ?? null,
      medical_conditions: input.medical_conditions ?? null,
      created_at: now,
    });

    if (medicalInfoError) {
      await rollbackStudent(supabase, admin, studentAuthId, studentId, studentUuid);
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
  let newParentAuthCreated = false;

  const { data: existingParentUser, error: existingParentUserError } =
    await supabase
      .from('users')
      .select('id, role')
      .eq('email', parentEmail)
      .eq('tenant_id', tenantId)
      .maybeSingle();

  if (existingParentUserError) {
    await rollbackStudent(supabase, admin, studentAuthId, studentId, studentUuid);
    return {
      ok: false,
      message:
        existingParentUserError.message ??
        'Failed to look up existing parent account.',
      status: 500,
    };
  }

  if (existingParentUser) {
    if (existingParentUser.role !== 'parent') {
      // Rollback student
      await rollbackStudent(supabase, admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message:
          'The parent email belongs to a non-parent account. Use a different email.',
        status: 400,
      };
    }
    // 6a: reuse existing parent auth id
    parentAuthId = existingParentUser.id as string;
  } else {
    // 6b: create new parent auth user
    const { data: parentAuthData, error: parentAuthError } =
      await admin.auth.admin.createUser({
        email: parentEmail,
        email_confirm: true,
        user_metadata: { name: input.parent_name.trim() },
      });

    if (parentAuthError || !parentAuthData.user) {
      await rollbackStudent(supabase, admin, studentAuthId, studentId, studentUuid);
      const msg =
        parentAuthError?.message?.includes('already been registered') ||
        parentAuthError?.message?.includes('already exists')
          ? 'A user with this parent email already exists.'
          : (parentAuthError?.message ?? 'Failed to create parent auth account.');
      return { ok: false, message: msg, status: 400 };
    }

    parentAuthId = parentAuthData.user.id;
    newParentAuthCreated = true;

    const { error: parentUserError } = await supabase.from('users').insert({
      id: parentAuthId,
      email: parentEmail,
      name: input.parent_name.trim(),
      role: 'parent',
      status: 'active',
      phone: input.parent_phone ?? null,
      address: input.parent_address ?? null,
      tenant_id: tenantId,
      created_at: now,
      updated_at: now,
      created_by: actorUserId,
    });

    if (parentUserError) {
      await admin.auth.admin.deleteUser(parentAuthId);
      await rollbackStudent(supabase, admin, studentAuthId, studentId, studentUuid);
      return {
        ok: false,
        message: parentUserError.message ?? 'Failed to create parent user row.',
        status: 400,
      };
    }
  }

  // Insert parents row (always new — links parent → this specific student)
  const { error: parentInsertError } = await supabase.from('parents').insert({
    parent_code: parentCode,
    name: input.parent_name.trim(),
    email: parentEmail,
    phone: input.parent_phone ?? null,
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
      await supabase.from('users').delete().eq('id', parentAuthId);
      await admin.auth.admin.deleteUser(parentAuthId);
    }
    await rollbackStudent(supabase, admin, studentAuthId, studentId, studentUuid);
    return {
      ok: false,
      message: parentInsertError.message ?? 'Failed to insert parent record.',
      status: 400,
    };
  }

  // -- Step 7: Send password-reset (set-password) emails --
  // Errors here are non-fatal: records are already committed. Log and continue
  // so callers receive a success result and can resend the link separately.
  const { error: studentLinkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: studentEmail,
  });
  if (studentLinkError) {
    console.warn(
      '[provisionStudentAndParent] Failed to send student recovery link:',
      studentLinkError.message,
    );
  }

  if (newParentAuthCreated) {
    const { error: parentLinkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: parentEmail,
    });
    if (parentLinkError) {
      console.warn(
        '[provisionStudentAndParent] Failed to send parent recovery link:',
        parentLinkError.message,
      );
    }
  }

  return {
    ok: true,
    studentId,
    studentUuid,
    parentCode,
    parentUuid: parentAuthId,
    newParentAuthCreated,
  };
}

async function rollbackStudent(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  studentAuthId: string,
  studentId: string,
  studentUuid?: string,
) {
  if (studentUuid) {
    await supabase.from('emergency_contacts').delete().eq('student_id', studentUuid);
    await supabase.from('medical_info').delete().eq('student_id', studentUuid);
    await supabase.from('class_students').delete().eq('student_id', studentUuid);
  }
  await supabase.from('user_profiles').delete().eq('user_id', studentAuthId);
  await supabase.from('students').delete().eq('student_id', studentId);
  await supabase.from('users').delete().eq('id', studentAuthId);
  await admin.auth.admin.deleteUser(studentAuthId);
}
