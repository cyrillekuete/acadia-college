import type { UiLocale } from '@/lib/acadia/locale';
import type { WhatsAppSendResult } from '@/lib/acadia/whatsapp-types';

export async function fetchWhatsAppConfigured(): Promise<boolean> {
  const response = await fetch('/api/acadia/whatsapp/status', {
    method: 'GET',
    cache: 'no-store',
  });
  if (!response.ok) {
    return false;
  }
  const payload = (await response.json().catch(() => null)) as
    | { configured?: boolean }
    | null;
  return Boolean(payload?.configured);
}

export async function requestWhatsAppAlertSend(
  alertId: string,
  language: UiLocale,
): Promise<WhatsAppSendResult> {
  const response = await fetch('/api/acadia/whatsapp/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId, language }),
  });
  const payload = (await response.json().catch(() => null)) as
    | (WhatsAppSendResult & { message?: string })
    | null;
  if (!response.ok) {
    throw new Error(
      typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message
        : 'WhatsApp send failed.',
    );
  }
  return {
    sent: Number(payload?.sent) || 0,
    failed: Number(payload?.failed) || 0,
    skipped: Number(payload?.skipped) || 0,
  };
}

export async function requestWhatsAppMessageSend(
  messageId: string,
  recipientUserId: string,
  language: UiLocale,
): Promise<WhatsAppSendResult> {
  const response = await fetch('/api/acadia/whatsapp/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, recipientUserId, language }),
  });
  const payload = (await response.json().catch(() => null)) as
    | (WhatsAppSendResult & { message?: string })
    | null;
  if (!response.ok) {
    throw new Error(
      typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message
        : 'WhatsApp send failed.',
    );
  }
  return {
    sent: Number(payload?.sent) || 0,
    failed: Number(payload?.failed) || 0,
    skipped: Number(payload?.skipped) || 0,
  };
}
