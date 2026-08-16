import { NextResponse } from 'next/server';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { studentCreateSchema } from '@/lib/acadia/student-create-schemas';
import { provisionStudentAndParent } from '@/lib/acadia/provision-accounts';
import {
  checkMatriculeAvailable,
  checkRegistrationNumberAvailable,
  checkRegistryStudentEmail,
} from '@/lib/acadia/registry-lookups';
import {
  generateRegistrationNumber,
  normalizeMatriculeNumber,
} from '@/lib/acadia/enrollment';
import { appendSystemLog } from '@/lib/acadia/system-log';

export async function POST(request: Request) {
  const auth = await requireRegistryApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'User provisioning is not configured on this server.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = studentCreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        message: first?.message ?? 'Invalid input.',
        field: first?.path?.[0] ?? undefined,
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const emailCheck = await checkRegistryStudentEmail(
    supabase,
    auth.ctx.tenantId,
    parsed.data.email,
  );
  if (!emailCheck.ok) {
    return NextResponse.json({ message: emailCheck.message }, { status: 400 });
  }

  const studentId = generateRegistrationNumber(
    parsed.data.academic_year ?? undefined,
  );
  const studentIdCheck = await checkRegistrationNumberAvailable(
    supabase,
    auth.ctx.tenantId,
    studentId,
  );
  if (!studentIdCheck.ok) {
    return NextResponse.json(
      { message: studentIdCheck.message, field: 'registrationNumber' },
      { status: 400 },
    );
  }

  const matricule = normalizeMatriculeNumber(parsed.data.matricule_number);
  if (matricule) {
    const matriculeCheck = await checkMatriculeAvailable(
      supabase,
      auth.ctx.tenantId,
      matricule,
    );
    if (!matriculeCheck.ok) {
      return NextResponse.json(
        { message: matriculeCheck.message, field: 'matricule_number' },
        { status: 400 },
      );
    }
  }

  const result = await provisionStudentAndParent(
    supabase,
    parsed.data,
    auth.ctx.tenantId,
    auth.ctx.actorUserId,
    studentId,
  );

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  // Audit log is best-effort; provisioning success must not depend on it.
  void appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'student.created',
    description: `Provisioned student ${studentId} and parent ${result.parentCode}`,
    entityId: result.studentProfileId,
    entityType: 'StudentProfile',
    meta: {
      studentId,
      parentCode: result.parentCode,
      newParentAuthCreated: result.newParentAuthCreated,
      enrollmentId: result.enrollmentId,
    },
  });

  return NextResponse.json(
    {
      studentId,
      studentUuid: result.studentUuid,
      studentProfileId: result.studentProfileId,
      studentLoginEmail: result.studentLoginEmail,
      studentTemporaryPassword: result.studentTemporaryPassword,
      parentCode: result.parentCode,
      parentLoginEmail: result.parentLoginEmail,
      parentTemporaryPassword: result.parentTemporaryPassword,
      newParentAuthCreated: result.newParentAuthCreated,
    },
    { status: 201 },
  );
}
