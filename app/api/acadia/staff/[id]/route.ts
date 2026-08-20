import { NextResponse } from 'next/server';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { staffUpdateSchema } from '@/lib/acadia/staff-create-schemas';
import { updateStaffProfile } from '@/lib/acadia/staff-lifecycle';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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

  const { id: profileId } = await context.params;
  if (!profileId?.trim()) {
    return NextResponse.json({ message: 'Staff id is required.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = staffUpdateSchema.safeParse(body);
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

  const admin = createAdminClient();
  const result = await updateStaffProfile(admin, {
    tenantId: auth.ctx.tenantId,
    profileId: profileId.trim(),
    actorUserId: auth.ctx.actorUserId,
    values: parsed.data,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
