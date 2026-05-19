import { NextResponse } from 'next/server';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { studentCreateSchema } from '@/lib/acadia/student-create-schemas';
import { provisionStudentAndParent } from '@/lib/acadia/provision-accounts';
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
  const result = await provisionStudentAndParent(
    supabase,
    parsed.data,
    auth.ctx.tenantId,
    auth.ctx.actorUserId,
  );

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  // Audit log is best-effort; provisioning success must not depend on it.
  void appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'student.created',
    description: `Provisioned student ${result.studentId} and parent ${result.parentCode}`,
    entityId: result.studentUuid,
    entityType: 'students',
    meta: {
      studentId: result.studentId,
      parentCode: result.parentCode,
      newParentAuthCreated: result.newParentAuthCreated,
    },
  });

  return NextResponse.json(
    {
      studentId: result.studentId,
      studentUuid: result.studentUuid,
      parentCode: result.parentCode,
      newParentAuthCreated: result.newParentAuthCreated,
    },
    { status: 201 },
  );
}
