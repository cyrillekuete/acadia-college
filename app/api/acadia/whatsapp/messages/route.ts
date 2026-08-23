import { NextResponse } from 'next/server';
import { canSendWhatsAppMessages } from '@/lib/acadia/roles';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { isAdminClientConfigured, createAdminClient } from '@/lib/supabase/admin';
import {
  dispatchMessageWhatsApp,
  parseWhatsAppLanguage,
} from '@/lib/acadia/whatsapp-dispatch';
import { isWhatsAppConfigured } from '@/lib/acadia/whatsapp';

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  if (!canSendWhatsAppMessages(auth.ctx.roleSlug)) {
    return NextResponse.json(
      { message: 'You do not have permission to send WhatsApp messages.' },
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

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const messageId = String(record.messageId ?? '').trim();
  const recipientUserId = String(record.recipientUserId ?? '').trim();
  if (!messageId || !recipientUserId) {
    return NextResponse.json(
      { message: 'Message id and recipient are required.' },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const result = await dispatchMessageWhatsApp(admin, {
      tenantId: auth.ctx.tenantId,
      actorUserId: auth.ctx.actorUserId,
      messageId,
      recipientUserId,
      language: parseWhatsAppLanguage(record.language),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to send WhatsApp message.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
