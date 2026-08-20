import { NextResponse } from 'next/server';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { canManageTenantApiKeys } from '@/lib/acadia/roles';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  expiryIsoFromDateInput,
  tenantApiKeyCreateSchema,
} from '@/lib/acadia/tenant-api-keys';
import { generateTenantApiKeyMaterial } from '@/lib/acadia/tenant-api-keys.server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = tenantApiKeyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  let expiresAt: string | null;
  try {
    expiresAt = expiryIsoFromDateInput(parsed.data.expiresOn);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Enter a valid expiry date.',
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const id = generateAcadiaId('apk');
  const material = generateTenantApiKeyMaterial();

  const { error } = await supabase.from('TenantApiKey').insert({
    id,
    tenantId: auth.ctx.tenantId,
    createdByUserId: auth.ctx.actorUserId,
    name: parsed.data.name,
    keyHash: material.keyHash,
    keyPrefix: material.keyPrefix,
    scopes: ['read'],
    expiresAt,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Unable to create API key.' },
      { status: 500 },
    );
  }

  try {
    await appendSystemLog(supabase, {
      userId: auth.ctx.actorUserId,
      event: 'api_key.created',
      description: `Created API key ${parsed.data.name}`,
      entityId: id,
      entityType: 'TenantApiKey',
      tenantId: auth.ctx.tenantId,
      meta: { keyPrefix: material.keyPrefix },
    });
  } catch (logError) {
    console.error('[api_key.created] system log failed', logError);
  }

  return NextResponse.json(
    {
      id,
      name: parsed.data.name,
      keyPrefix: material.keyPrefix,
      plaintext: material.plaintext,
    },
    { status: 201 },
  );
}
