import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ALERT_SENT_EVENT,
  parseAlertTargetKeys,
  recipientsForSendNow,
  resolveAlertRecipients,
  type ResolvedAlertRecipient,
} from '@/lib/acadia/alerts';
import { shouldDeliverInAppNotification } from '@/lib/acadia/communication';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { fetchAlertAudience } from '@/lib/supabase/queries/alert-audience';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient;

export type DueScheduledAlert = {
  id: string;
  tenantId: string;
  titleEn: string;
  titleFr: string;
  bodyEn: string | null;
  bodyFr: string | null;
  channel: string;
  status: string;
  targetKeys: string[] | null;
  academicYearId: string | null;
  createdByUserId: string;
};

export async function deliverAlertNotifications(
  supabase: Client,
  input: {
    tenantId: string;
    alertId: string;
    titleEn: string;
    titleFr: string;
    bodyEn: string | null;
    bodyFr: string | null;
    recipients: ResolvedAlertRecipient[];
  },
): Promise<Map<string, string>> {
  const notificationIds = new Map<string, string>();
  if (input.recipients.length === 0) {
    return notificationIds;
  }

  const recipientIds = input.recipients.map((row) => row.guardianUserId);
  const { data: preferences, error: prefError } = await supabase
    .from('NotificationPreference')
    .select('userId, inApp')
    .eq('tenantId', input.tenantId)
    .eq('event', ALERT_SENT_EVENT)
    .in('userId', recipientIds);

  if (prefError) {
    console.error('[deliverAlert] preferences', prefError.message);
  }

  const prefByUser = new Map(
    (preferences ?? []).map((row) => [
      row.userId as string,
      { inApp: row.inApp as boolean },
    ]),
  );

  const now = new Date().toISOString();
  const rows = input.recipients
    .filter((recipient) =>
      shouldDeliverInAppNotification(prefByUser, recipient.guardianUserId, ALERT_SENT_EVENT),
    )
    .map((recipient) => {
      const notificationId = generateAcadiaId('notif');
      notificationIds.set(recipient.guardianUserId, notificationId);
      return {
        id: notificationId,
        tenantId: input.tenantId,
        userId: recipient.guardianUserId,
        event: ALERT_SENT_EVENT,
        titleEn: input.titleEn,
        titleFr: input.titleFr,
        bodyEn: input.bodyEn,
        bodyFr: input.bodyFr,
        data: { alertId: input.alertId },
        createdAt: now,
      };
    });

  if (rows.length === 0) {
    return notificationIds;
  }

  const { error } = await supabase.from('Notification').insert(rows);
  if (error) {
    console.error('[deliverAlert] insert', error.message);
    return new Map();
  }
  return notificationIds;
}

export async function insertAlertRecipients(
  supabase: Client,
  input: {
    tenantId: string;
    alertId: string;
    recipients: ResolvedAlertRecipient[];
    notificationIds: Map<string, string>;
    now: string;
  },
): Promise<void> {
  if (input.recipients.length === 0) {
    return;
  }
  const rows = input.recipients.map((recipient) => ({
    id: generateAcadiaId('alrc'),
    tenantId: input.tenantId,
    alertId: input.alertId,
    guardianUserId: recipient.guardianUserId,
    studentProfileIds: recipient.studentProfileIds,
    notificationId: notificationIdsOrNull(input.notificationIds, recipient.guardianUserId),
    createdAt: input.now,
  }));
  const { error } = await supabase.from('SchoolAlertRecipient').insert(rows);
  if (error) {
    throw error;
  }
}

function notificationIdsOrNull(
  notificationIds: Map<string, string>,
  guardianUserId: string,
): string | null {
  return notificationIds.get(guardianUserId) ?? null;
}

export async function resolveRecipientsForAlert(
  supabase: Client,
  input: {
    tenantId: string;
    academicYearId: string | null;
    targetKeys: string[] | null;
    existing: ResolvedAlertRecipient[];
  },
): Promise<ResolvedAlertRecipient[]> {
  if (input.existing.length > 0) {
    return recipientsForSendNow({
      existing: input.existing,
      resolvedFromTargets: [],
    });
  }

  const targets = parseAlertTargetKeys(input.targetKeys ?? []);
  if (targets.length === 0) {
    return recipientsForSendNow({
      existing: [],
      resolvedFromTargets: [],
    });
  }

  const audience = await fetchAlertAudience(
    supabase,
    input.tenantId,
    input.academicYearId,
  );
  const resolved = resolveAlertRecipients(
    targets,
    audience.eligibleLinks,
    audience.enrollments,
    audience.activeGroupMembers,
  );
  return recipientsForSendNow({
    existing: [],
    resolvedFromTargets: resolved,
  });
}

export async function listDueScheduledAlerts(
  supabase: Client,
  nowIso = new Date().toISOString(),
): Promise<DueScheduledAlert[]> {
  const { data, error } = await supabase
    .from('SchoolAlert')
    .select(
      'id, tenantId, titleEn, titleFr, bodyEn, bodyFr, channel, status, targetKeys, academicYearId, createdByUserId',
    )
    .eq('status', 'SCHEDULED')
    .lte('scheduledAt', nowIso)
    .order('scheduledAt', { ascending: true })
    .limit(50);
  if (error) {
    throw error;
  }
  return (data ?? []) as DueScheduledAlert[];
}
