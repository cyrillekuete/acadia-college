import { NextResponse } from 'next/server';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { provisionStaff } from '@/lib/acadia/provision-staff';
import { staffCreateSchema } from '@/lib/acadia/staff-create-schemas';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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

  const parsed = staffCreateSchema.safeParse(body);
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
  const result = await provisionStaff(
    supabase,
    parsed.data,
    auth.ctx.tenantId,
    auth.ctx.actorUserId,
  );

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'staff.created',
    description: `Provisioned staff ${result.staffCode}`,
    entityId: result.staffId,
    entityType: 'StaffProfile',
    meta: { staffCode: result.staffCode },
  });

  return NextResponse.json(
    { staffId: result.staffId, staffCode: result.staffCode },
    { status: 201 },
  );
}
