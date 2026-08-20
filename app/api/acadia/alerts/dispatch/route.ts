import { NextResponse } from 'next/server';
import {
  deliverAlertNotifications,
  insertAlertRecipients,
  listDueScheduledAlerts,
  resolveRecipientsForAlert,
  type DueScheduledAlert,
} from '@/lib/acadia/alert-dispatch';
import { canManageAlerts } from '@/lib/acadia/roles';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  dispatchAlertWhatsApp,
  parseWhatsAppLanguage,
} from '@/lib/acadia/whatsapp-dispatch';
import { isWhatsAppConfigured } from '@/lib/acadia/whatsapp';
import {
  createAdminClient,
  isAdminClientConfigured,
} from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const header = request.headers.get('authorization')?.trim() ?? '';
  return header === `Bearer ${secret}`;
}

async function markAlertSent(
  supabase: SupabaseClient,
  tenantId: string,
  alertId: string,
  now: string,
): Promise<void> {
  const { error } = await supabase
    .from('SchoolAlert')
    .update({
      status: 'SENT',
      sentAt: now,
      updatedAt: now,
    })
    .eq('id', alertId)
    .eq('tenantId', tenantId);
  if (error) {
    throw error;
  }
}

async function dispatchOne(
  admin: SupabaseClient,
  alert: DueScheduledAlert,
  language: 'en' | 'fr',
): Promise<{ alertId: string; recipientCount: number }> {
  const now = new Date().toISOString();
  const { data: existingRecipients, error: existingError } = await admin
    .from('SchoolAlertRecipient')
    .select('guardianUserId, studentProfileIds')
    .eq('tenantId', alert.tenantId)
    .eq('alertId', alert.id);
  if (existingError) {
    throw existingError;
  }

  const recipients = await resolveRecipientsForAlert(admin, {
    tenantId: alert.tenantId,
    academicYearId: alert.academicYearId,
    targetKeys: alert.targetKeys,
    existing: (existingRecipients ?? []).map((row) => ({
      guardianUserId: row.guardianUserId as string,
      studentProfileIds: (row.studentProfileIds as string[] | null) ?? [],
    })),
  });

  await markAlertSent(admin, alert.tenantId, alert.id, now);

  const notificationIds = await deliverAlertNotifications(admin, {
    tenantId: alert.tenantId,
    alertId: alert.id,
    titleEn: alert.titleEn,
    titleFr: alert.titleFr,
    bodyEn: alert.bodyEn,
    bodyFr: alert.bodyFr,
    recipients,
  });

  if ((existingRecipients ?? []).length === 0) {
    await insertAlertRecipients(admin, {
      tenantId: alert.tenantId,
      alertId: alert.id,
      recipients,
      notificationIds,
      now,
    });
  }

  if (alert.channel === 'whatsapp' && isWhatsAppConfigured()) {
    await dispatchAlertWhatsApp(admin, {
      tenantId: alert.tenantId,
      alertId: alert.id,
      language,
    });
  }

  await appendSystemLog(admin, {
    userId: alert.createdByUserId,
    event: 'alert.sent',
    entityId: alert.id,
    entityType: 'SchoolAlert',
    tenantId: alert.tenantId,
    meta: { source: 'dispatch', recipientCount: recipients.length },
  });

  return { alertId: alert.id, recipientCount: recipients.length };
}

async function handleCron(): Promise<NextResponse> {
  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'Admin client is not configured.' },
      { status: 503 },
    );
  }
  const admin = createAdminClient();
  const due = await listDueScheduledAlerts(admin);
  const results: Array<{ alertId: string; recipientCount: number } | { alertId: string; error: string }> =
    [];
  for (const alert of due) {
    try {
      results.push(await dispatchOne(admin, alert, 'en'));
    } catch (error) {
      results.push({
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Dispatch failed.',
      });
    }
  }
  return NextResponse.json({ dispatched: results.length, results });
}

export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }
  try {
    return await handleCron();
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Dispatch failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (isCronRequest(request)) {
    try {
      return await handleCron();
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Dispatch failed.';
      return NextResponse.json({ message }, { status: 500 });
    }
  }

  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  if (!canManageAlerts(auth.ctx.roleSlug)) {
    return NextResponse.json(
      { message: 'You do not have permission to send announcements.' },
      { status: 403 },
    );
  }
  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'Dispatch is not configured on this server.' },
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
    const { data: alert, error } = await admin
      .from('SchoolAlert')
      .select(
        'id, tenantId, titleEn, titleFr, bodyEn, bodyFr, channel, status, targetKeys, academicYearId, createdByUserId',
      )
      .eq('id', alertId)
      .eq('tenantId', auth.ctx.tenantId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!alert) {
      return NextResponse.json({ message: 'Alert not found.' }, { status: 404 });
    }
    if (alert.status === 'SENT' || alert.status === 'CANCELLED') {
      return NextResponse.json(
        { message: 'This alert cannot be sent.' },
        { status: 400 },
      );
    }

    const result = await dispatchOne(admin, alert as DueScheduledAlert, language);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Dispatch failed.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
