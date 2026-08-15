import { NextResponse } from 'next/server';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { regenerateFamilyCredentials } from '@/lib/acadia/regenerate-family-credentials';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
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

  const { id: studentProfileId } = await context.params;
  if (!studentProfileId?.trim()) {
    return NextResponse.json({ message: 'Student id is required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await regenerateFamilyCredentials(
    admin,
    auth.ctx.tenantId,
    studentProfileId.trim(),
  );

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  const supabase = await createClient();
  void appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'student.credentials_downloaded',
    description: `Downloaded login credentials for student ${result.studentId}`,
    entityId: studentProfileId.trim(),
    entityType: 'StudentProfile',
    meta: {
      studentId: result.studentId,
      parentCode: result.parentCode,
      parentPasswordReset: result.parentTemporaryPassword !== null,
    },
  });

  return NextResponse.json({
    studentId: result.studentId,
    studentLoginEmail: result.studentLoginEmail,
    studentTemporaryPassword: result.studentTemporaryPassword,
    parentCode: result.parentCode,
    parentLoginEmail: result.parentLoginEmail,
    parentTemporaryPassword: result.parentTemporaryPassword,
  });
}
