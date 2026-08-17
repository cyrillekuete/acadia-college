import { NextResponse } from 'next/server';
import { canManageAlerts } from '@/lib/acadia/roles';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { isAdminClientConfigured, createAdminClient } from '@/lib/supabase/admin';
import {
  dispatchAlertWhatsApp,
  parseWhatsAppLanguage,
} from '@/lib/acadia/whatsapp-dispatch';
import { isWhatsAppConfigured } from '@/lib/acadia/whatsapp';

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  if (!canManageAlerts(auth.ctx.roleSlug)) {
    return NextResponse.json(
      { message: 'You do not have permission to send guardian alerts.' },
      { status: 403 },
    );
  }
  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'WhatsApp sending is not configured on this server.' },
      { status: 503 },
    );
  }
  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      { message: 'WhatsApp is not configured on this server.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const alertId =
    body && typeof body === 'object' && 'alertId' in body
      ? String((body as { alertId?: unknown }).alertId ?? '').trim()
      : '';
  if (!alertId) {
    return NextResponse.json({ message: 'Alert id is required.' }, { status: 400 });
  }

  const language = parseWhatsAppLanguage(
    body && typeof body === 'object' && 'language' in body
      ? (body as { language?: unknown }).language
      : undefined,
  );

  try {
    const admin = createAdminClient();
    const result = await dispatchAlertWhatsApp(admin, {
      tenantId: auth.ctx.tenantId,
      alertId,
      language,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to send WhatsApp alerts.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
