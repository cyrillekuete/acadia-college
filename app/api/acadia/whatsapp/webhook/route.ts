import { NextResponse } from 'next/server';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import {
  parseWhatsAppWebhookPayload,
  verifyWhatsAppWebhookSignature,
} from '@/lib/acadia/whatsapp';
import { applyWhatsAppStatusEvents } from '@/lib/acadia/whatsapp-dispatch';

export async function GET(request: Request) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? '';
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() ?? '';
  if (!appSecret) {
    return NextResponse.json({ message: 'WhatsApp webhook is not configured.' }, { status: 503 });
  }
  if (!isAdminClientConfigured()) {
    return NextResponse.json({ message: 'Server is not configured.' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifyWhatsAppWebhookSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ message: 'Invalid signature.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const events = parseWhatsAppWebhookPayload(payload);
  if (events.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  try {
    const admin = createAdminClient();
    const updated = await applyWhatsAppStatusEvents(admin, events);
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to apply WhatsApp statuses.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
