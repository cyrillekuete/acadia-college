import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UiLocale } from '@/lib/acadia/locale';

export type { WhatsAppSendResult } from '@/lib/acadia/whatsapp-types';
export {
  emptyWhatsAppSendResult,
  formatWhatsAppSendToast,
} from '@/lib/acadia/whatsapp-types';

export const WHATSAPP_TEMPLATE_PARAM_MAX = 1024;
export const WHATSAPP_SEND_CHUNK_SIZE = 8;
export const WHATSAPP_GRAPH_VERSION_DEFAULT = 'v21.0';

export const WHATSAPP_OUTBOUND_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'skipped',
] as const;
export type WhatsAppOutboundStatus = (typeof WHATSAPP_OUTBOUND_STATUSES)[number];

export type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  graphVersion: string;
  verifyToken: string;
  appSecret: string;
};

export type WhatsAppStatusEvent = {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
};

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? '';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? '';
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim() ?? '';
  if (!phoneNumberId || !accessToken || !templateName) {
    return null;
  }
  return {
    phoneNumberId,
    accessToken,
    templateName,
    graphVersion:
      process.env.WHATSAPP_GRAPH_VERSION?.trim() || WHATSAPP_GRAPH_VERSION_DEFAULT,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? '',
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() ?? '',
  };
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppConfig() !== null;
}

export function sanitizeWhatsAppTemplateParam(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return '.';
  }
  if (collapsed.length <= WHATSAPP_TEMPLATE_PARAM_MAX) {
    return collapsed;
  }
  return collapsed.slice(0, WHATSAPP_TEMPLATE_PARAM_MAX - 1).trimEnd() + '…';
}

export function whatsappTemplateLanguage(locale: UiLocale): 'en' | 'fr' {
  return locale === 'fr' ? 'fr' : 'en';
}

/**
 * Cloud API template body: *{{1}}* then {{2}} (title, body).
 * Create matching UTILITY templates named WHATSAPP_TEMPLATE_NAME in en and fr.
 */
export function buildWhatsAppTemplatePayload(input: {
  to: string;
  templateName: string;
  language: 'en' | 'fr';
  title: string;
  body: string;
}): {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
} {
  return {
    messaging_product: 'whatsapp',
    to: input.to,
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.language },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: sanitizeWhatsAppTemplateParam(input.title) },
            { type: 'text', text: sanitizeWhatsAppTemplateParam(input.body) },
          ],
        },
      ],
    },
  };
}

export type WhatsAppGraphSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export async function sendWhatsAppTemplateMessage(
  input: {
    to: string;
    title: string;
    body: string;
    language: 'en' | 'fr';
  },
  config: WhatsAppConfig = getWhatsAppConfig() ?? missingConfig(),
  fetcher: typeof fetch = fetch,
): Promise<WhatsAppGraphSendResult> {
  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
  const payload = buildWhatsAppTemplatePayload({
    to: input.to,
    templateName: config.templateName,
    language: input.language,
    title: input.title,
    body: input.body,
  });

  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'WhatsApp request failed.',
    };
  }

  const json = (await response.json().catch(() => null)) as
    | {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      }
    | null;

  const messageId = json?.messages?.[0]?.id?.trim();
  if (response.ok && messageId) {
    return { ok: true, messageId };
  }

  const graphError = json?.error?.message?.trim();
  return {
    ok: false,
    error:
      graphError ||
      `WhatsApp API returned ${response.status}.`,
  };
}

function missingConfig(): WhatsAppConfig {
  throw new Error('WhatsApp is not configured on this server.');
}

export async function mapInChunks<T, R>(
  items: readonly T[],
  chunkSize: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const size = Math.max(1, chunkSize);
  const results: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    const chunk = items.slice(index, index + size);
    results.push(...(await Promise.all(chunk.map(mapper))));
  }
  return results;
}

export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string,
): boolean {
  const secret = appSecret.trim();
  const header = signatureHeader?.trim() ?? '';
  if (!secret || !header.toLowerCase().startsWith('sha256=')) {
    return false;
  }
  const receivedHex = header.slice('sha256='.length).trim();
  if (!/^[0-9a-f]+$/i.test(receivedHex) || receivedHex.length % 2 !== 0) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(receivedHex, 'hex');
  if (received.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(received, expected);
}

export function parseWhatsAppWebhookPayload(payload: unknown): WhatsAppStatusEvent[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          statuses?: Array<{
            id?: string;
            status?: string;
            errors?: Array<{ title?: string; message?: string }>;
          }>;
        };
      }>;
    }>;
  };
  const events: WhatsAppStatusEvent[] = [];
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const messageId = status.id?.trim();
        const mapped = mapGraphStatus(status.status);
        if (!messageId || !mapped) {
          continue;
        }
        const error =
          status.errors
            ?.map((item) => item.title || item.message)
            .filter((item): item is string => Boolean(item?.trim()))
            .join('; ') || undefined;
        events.push({ messageId, status: mapped, error });
      }
    }
  }
  return events;
}

export function mapGraphStatus(
  status: string | undefined,
): WhatsAppStatusEvent['status'] | null {
  const value = status?.trim().toLowerCase();
  if (value === 'sent' || value === 'delivered' || value === 'read' || value === 'failed') {
    return value;
  }
  return null;
}
