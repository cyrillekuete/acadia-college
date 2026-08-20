import { NextResponse } from 'next/server';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { deactivateStaffProfile } from '@/lib/acadia/staff-lifecycle';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';

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

  const { id: profileId } = await context.params;
  if (!profileId?.trim()) {
    return NextResponse.json({ message: 'Staff id is required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await deactivateStaffProfile(admin, {
    tenantId: auth.ctx.tenantId,
    profileId: profileId.trim(),
    actorUserId: auth.ctx.actorUserId,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
