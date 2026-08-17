import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAcadiaId } from '@/lib/acadia/ids';
import type { UiLocale } from '@/lib/acadia/locale';
import { toWhatsAppRecipient } from '@/lib/acadia/phone';
import { isGuardian } from '@/lib/acadia/roles';
import {
  WHATSAPP_SEND_CHUNK_SIZE,
  getWhatsAppConfig,
  mapInChunks,
  sendWhatsAppTemplateMessage,
  whatsappTemplateLanguage,
} from '@/lib/acadia/whatsapp';
import {
  emptyWhatsAppSendResult,
  type WhatsAppSendResult,
} from '@/lib/acadia/whatsapp-types';

export function parseWhatsAppLanguage(raw: unknown): UiLocale {
  return raw === 'fr' ? 'fr' : 'en';
}

/** Shared preconditions for 1:1 WhatsApp dispatch. Throws on violation. */
export function assertWhatsAppMessageDispatch(input: {
  actorUserId: string;
  senderUserId: string;
  recipientIsGuardian: boolean;
  recipientIsThreadMember: boolean;
}): void {
  if (input.senderUserId !== input.actorUserId) {
    throw new Error('You can only send WhatsApp for your own messages.');
  }
  if (!input.recipientIsGuardian) {
    throw new Error('WhatsApp can only be sent to parents.');
  }
  if (!input.recipientIsThreadMember) {
    throw new Error('Recipient is not in this conversation.');
  }
}

export async function lookupUserPhones(
  admin: SupabaseClient,
  userIds: readonly string[],
): Promise<Map<string, string | null>> {
  const phones = new Map<string, string | null>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) {
    return phones;
  }
  const { data, error } = await admin.from('users').select('id, phone').in('id', ids);
  if (error) {
    throw error;
  }
  for (const row of data ?? []) {
    phones.set(row.id as string, (row.phone as string | null) ?? null);
  }
  return phones;
}

export async function dispatchAlertWhatsApp(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    alertId: string;
    language: UiLocale;
  },
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    throw new Error('WhatsApp is not configured on this server.');
  }

  const { data: alert, error: alertError } = await admin
    .from('SchoolAlert')
    .select('id, titleEn, titleFr, bodyEn, bodyFr, channel, status')
    .eq('id', input.alertId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  if (alertError) {
    throw alertError;
  }
  if (!alert) {
    throw new Error('Alert not found.');
  }
  if (alert.channel !== 'whatsapp') {
    return emptyWhatsAppSendResult();
  }
  if (alert.status !== 'SENT') {
    return emptyWhatsAppSendResult();
  }

  const { data: recipients, error: recipientError } = await admin
    .from('SchoolAlertRecipient')
    .select('id, guardianUserId')
    .eq('tenantId', input.tenantId)
    .eq('alertId', input.alertId);

  if (recipientError) {
    throw recipientError;
  }

  const rows = recipients ?? [];
  if (rows.length === 0) {
    return emptyWhatsAppSendResult();
  }

  const phones = await lookupUserPhones(
    admin,
    rows.map((row) => row.guardianUserId as string),
  );
  const title =
    input.language === 'fr'
      ? String(alert.titleFr || alert.titleEn || '')
      : String(alert.titleEn || alert.titleFr || '');
  const body =
    input.language === 'fr'
      ? String(alert.bodyFr || alert.bodyEn || '')
      : String(alert.bodyEn || alert.bodyFr || '');
  const language = whatsappTemplateLanguage(input.language);
  const result = emptyWhatsAppSendResult();

  await mapInChunks(rows, WHATSAPP_SEND_CHUNK_SIZE, async (row) => {
    const recipientId = row.id as string;
    const phone = toWhatsAppRecipient(phones.get(row.guardianUserId as string));
    if (!phone) {
      result.skipped += 1;
      await admin
        .from('SchoolAlertRecipient')
        .update({
          whatsappPhone: null,
          whatsappMessageId: null,
          whatsappStatus: 'skipped',
          whatsappError: 'No WhatsApp number on file.',
        })
        .eq('id', recipientId);
      return;
    }

    const sent = await sendWhatsAppTemplateMessage(
      { to: phone, title, body, language },
      config,
    );
    if (sent.ok) {
      result.sent += 1;
      await admin
        .from('SchoolAlertRecipient')
        .update({
          whatsappPhone: phone,
          whatsappMessageId: sent.messageId,
          whatsappStatus: 'sent',
          whatsappError: null,
        })
        .eq('id', recipientId);
      return;
    }

    result.failed += 1;
    await admin
      .from('SchoolAlertRecipient')
      .update({
        whatsappPhone: phone,
        whatsappMessageId: null,
        whatsappStatus: 'failed',
        whatsappError: sent.error,
      })
      .eq('id', recipientId);
  });

  return result;
}

export async function dispatchMessageWhatsApp(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    actorUserId: string;
    messageId: string;
    recipientUserId: string;
    language: UiLocale;
  },
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    throw new Error('WhatsApp is not configured on this server.');
  }

  const { data: message, error: messageError } = await admin
    .from('Message')
    .select('id, tenantId, senderUserId, body, threadId')
    .eq('id', input.messageId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  if (messageError) {
    throw messageError;
  }
  if (!message) {
    throw new Error('Message not found.');
  }
  const { data: recipient, error: recipientError } = await admin
    .from('User')
    .select('id, roleId')
    .eq('id', input.recipientUserId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  if (recipientError) {
    throw recipientError;
  }
  if (!recipient?.roleId) {
    throw new Error('Recipient not found.');
  }

  const { data: roleRow, error: roleError } = await admin
    .from('UserRole')
    .select('slug')
    .eq('id', recipient.roleId)
    .maybeSingle();
  if (roleError) {
    throw roleError;
  }

  const { data: member, error: memberError } = await admin
    .from('MessageThreadMember')
    .select('id')
    .eq('threadId', message.threadId)
    .eq('tenantId', input.tenantId)
    .eq('userId', input.recipientUserId)
    .maybeSingle();
  if (memberError) {
    throw memberError;
  }

  assertWhatsAppMessageDispatch({
    actorUserId: input.actorUserId,
    senderUserId: String(message.senderUserId ?? ''),
    recipientIsGuardian: isGuardian(roleRow?.slug),
    recipientIsThreadMember: Boolean(member?.id),
  });

  const { data: thread } = await admin
    .from('MessageThread')
    .select('subjectEn, subjectFr')
    .eq('id', message.threadId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  const phones = await lookupUserPhones(admin, [input.recipientUserId]);
  const phone = toWhatsAppRecipient(phones.get(input.recipientUserId));
  const now = new Date().toISOString();
  const outboundId = generateAcadiaId('waout');
  const title =
    input.language === 'fr'
      ? String(thread?.subjectFr || thread?.subjectEn || 'Acadia College')
      : String(thread?.subjectEn || thread?.subjectFr || 'Acadia College');
  const body = String(message.body ?? '');

  const { data: existingOutbound, error: existingError } = await admin
    .from('WhatsAppOutbound')
    .select('id')
    .eq('messageId', input.messageId)
    .eq('recipientUserId', input.recipientUserId)
    .maybeSingle();
  if (existingError) {
    throw existingError;
  }

  const outboundRow = {
    tenantId: input.tenantId,
    messageId: input.messageId,
    recipientUserId: input.recipientUserId,
    whatsappPhone: phone,
    whatsappMessageId: null as string | null,
    whatsappStatus: phone ? ('queued' as const) : ('skipped' as const),
    whatsappError: phone ? null : 'No WhatsApp number on file.',
    updatedAt: now,
  };

  if (existingOutbound?.id) {
    const { error: updateError } = await admin
      .from('WhatsAppOutbound')
      .update(outboundRow)
      .eq('id', existingOutbound.id);
    if (updateError) {
      throw updateError;
    }
  } else {
    const { error: insertError } = await admin.from('WhatsAppOutbound').insert({
      id: outboundId,
      createdAt: now,
      ...outboundRow,
    });
    if (insertError) {
      throw insertError;
    }
  }

  if (!phone) {
    return { sent: 0, failed: 0, skipped: 1 };
  }

  const sent = await sendWhatsAppTemplateMessage(
    {
      to: phone,
      title,
      body,
      language: whatsappTemplateLanguage(input.language),
    },
    config,
  );

  await admin
    .from('WhatsAppOutbound')
    .update({
      whatsappPhone: phone,
      whatsappMessageId: sent.ok ? sent.messageId : null,
      whatsappStatus: sent.ok ? 'sent' : 'failed',
      whatsappError: sent.ok ? null : sent.error,
      updatedAt: new Date().toISOString(),
    })
    .eq('messageId', input.messageId)
    .eq('recipientUserId', input.recipientUserId);

  if (sent.ok) {
    return { sent: 1, failed: 0, skipped: 0 };
  }
  return { sent: 0, failed: 1, skipped: 0 };
}

export async function applyWhatsAppStatusEvents(
  admin: SupabaseClient,
  events: readonly {
    messageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    error?: string;
  }[],
): Promise<number> {
  let updated = 0;
  for (const event of events) {
    const now = new Date().toISOString();
    const patch = {
      whatsappStatus: event.status,
      whatsappError: event.error ?? null,
    };

    const { data: alertRows, error: alertError } = await admin
      .from('SchoolAlertRecipient')
      .update(patch)
      .eq('whatsappMessageId', event.messageId)
      .select('id');
    if (alertError) {
      throw alertError;
    }
    updated += alertRows?.length ?? 0;

    const { data: outboundRows, error: outboundError } = await admin
      .from('WhatsAppOutbound')
      .update({ ...patch, updatedAt: now })
      .eq('whatsappMessageId', event.messageId)
      .select('id');
    if (outboundError) {
      throw outboundError;
    }
    updated += outboundRows?.length ?? 0;
  }
  return updated;
}
