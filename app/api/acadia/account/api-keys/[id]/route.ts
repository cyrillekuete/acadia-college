import { NextResponse } from 'next/server';
import { canManageTenantApiKeys } from '@/lib/acadia/roles';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (!canManageTenantApiKeys(auth.ctx.roleSlug)) {
    return NextResponse.json(
      { message: 'You do not have permission to manage API keys.' },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ message: 'API key id is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: existing, error: loadError } = await supabase
    .from('TenantApiKey')
    .select('id, name, revokedAt')
    .eq('id', id)
    .eq('tenantId', auth.ctx.tenantId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json(
      { message: loadError.message ?? 'Unable to load API key.' },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json({ message: 'API key not found.' }, { status: 404 });
  }

  if (existing.revokedAt) {
    return NextResponse.json({ message: 'This API key is already revoked.' }, { status: 409 });
  }

  const { error } = await supabase
    .from('TenantApiKey')
    .update({ revokedAt: nowIso, updatedAt: nowIso })
    .eq('id', id)
    .eq('tenantId', auth.ctx.tenantId);

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Unable to revoke API key.' },
      { status: 500 },
    );
  }

  try {
    await appendSystemLog(supabase, {
      userId: auth.ctx.actorUserId,
      event: 'api_key.revoked',
      description: `Revoked API key ${existing.name}`,
      entityId: id,
      entityType: 'TenantApiKey',
      tenantId: auth.ctx.tenantId,
    });
  } catch (logError) {
    console.error('[api_key.revoked] system log failed', logError);
  }

  return NextResponse.json({ ok: true });
}
