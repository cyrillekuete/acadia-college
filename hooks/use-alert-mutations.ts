'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AlertFormValues, AlertGroupFormValues } from '@/lib/acadia/alert-schemas';
import {
  ALERT_SENT_EVENT,
  deriveAlertStatusOnSave,
  parseAlertTargetKeys,
  resolveAlertRecipients,
  type AlertGroupMemberRow,
  type EnrollmentClassRow,
  type GuardianStudentLinkRow,
  type ResolvedAlertRecipient,
} from '@/lib/acadia/alerts';
import { shouldDeliverInAppNotification } from '@/lib/acadia/communication';
import { localDateTimeInputToIso } from '@/lib/acadia/dates';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { getUiLocale } from '@/lib/acadia/locale';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  fetchWhatsAppConfigured,
  requestWhatsAppAlertSend,
} from '@/lib/acadia/whatsapp-request';
import { formatWhatsAppSendToast } from '@/lib/acadia/whatsapp-types';
import type { WhatsAppSendResult } from '@/lib/acadia/whatsapp-types';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateAlertQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['school-alerts'] });
  void queryClient.invalidateQueries({ queryKey: ['school-alert'] });
  void queryClient.invalidateQueries({ queryKey: ['school-alert-groups'] });
  void queryClient.invalidateQueries({ queryKey: ['alert-targets'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-notifications'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
}

async function fetchAlertAudience(
  supabase: ReturnType<typeof requireBrowserClient>,
  tenantId: string,
  academicYearId: string | null,
): Promise<{
  links: GuardianStudentLinkRow[];
  enrollments: EnrollmentClassRow[];
  groupMembers: AlertGroupMemberRow[];
}> {
  const [linksResult, enrollmentsResult, membersResult] = await Promise.all([
    supabase
      .from('GuardianStudentLink')
      .select('guardianUserId, studentProfileId')
      .eq('tenantId', tenantId)
      .is('consentRevokedAt', null),
    academicYearId
      ? supabase
          .from('StudentEnrollment')
          .select('studentProfileId, classId')
          .eq('tenantId', tenantId)
          .eq('academicYearId', academicYearId)
          .eq('status', 'ENROLLED')
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('SchoolAlertGroupMember')
      .select('groupId, guardianUserId')
      .eq('tenantId', tenantId),
  ]);

  if (linksResult.error) {
    throw linksResult.error;
  }
  if (enrollmentsResult.error) {
    throw enrollmentsResult.error;
  }
  if (membersResult.error) {
    throw membersResult.error;
  }

  return {
    links: (linksResult.data ?? []) as GuardianStudentLinkRow[],
    enrollments: (enrollmentsResult.data ?? []) as EnrollmentClassRow[],
    groupMembers: (membersResult.data ?? []) as AlertGroupMemberRow[],
  };
}

async function deliverAlertNotifications(
  supabase: ReturnType<typeof requireBrowserClient>,
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

export function useAlertMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.profile?.id ?? null;

  const saveAlert = useMutation({
    mutationFn: async ({
      values,
      academicYearId,
    }: {
      values: AlertFormValues;
      academicYearId: string | null;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const alertId = generateAcadiaId('alrt');
      const status = deriveAlertStatusOnSave(values, now);
      const scheduledAt = values.sendNow
        ? null
        : localDateTimeInputToIso(values.scheduledAt);
      const sentAt = status === 'SENT' ? now : null;
      const targets = parseAlertTargetKeys(values.targetKeys);
      const audience = await fetchAlertAudience(supabase, tenantId, academicYearId);
      const recipients = resolveAlertRecipients(
        targets,
        audience.links,
        audience.enrollments,
        audience.groupMembers,
      );

      if (status === 'SENT' && recipients.length === 0) {
        throw new Error('No guardians match the selected groups.');
      }

      if (status === 'SENT' && values.channel === 'whatsapp') {
        const configured = await fetchWhatsAppConfigured();
        if (!configured) {
          throw new Error('WhatsApp is not configured on this server.');
        }
      }

      const { error: alertError } = await supabase.from('SchoolAlert').insert({
        id: alertId,
        tenantId,
        titleEn: values.titleEn.trim(),
        titleFr: values.titleFr.trim(),
        bodyEn: values.bodyEn?.trim() || null,
        bodyFr: values.bodyFr?.trim() || null,
        priority: values.priority,
        channel: values.channel,
        status,
        scheduledAt,
        sentAt,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
      if (alertError) {
        throw alertError;
      }

      let notificationIds = new Map<string, string>();
      if (status === 'SENT') {
        notificationIds = await deliverAlertNotifications(supabase, {
          tenantId,
          alertId,
          titleEn: values.titleEn.trim(),
          titleFr: values.titleFr.trim(),
          bodyEn: values.bodyEn?.trim() || null,
          bodyFr: values.bodyFr?.trim() || null,
          recipients,
        });
      }

      if (recipients.length > 0) {
        const rows = recipients.map((recipient) => ({
          id: generateAcadiaId('alrc'),
          tenantId,
          alertId,
          guardianUserId: recipient.guardianUserId,
          studentProfileIds: recipient.studentProfileIds,
          notificationId: notificationIds.get(recipient.guardianUserId) ?? null,
          createdAt: now,
        }));
        const { error: recipientError } = await supabase
          .from('SchoolAlertRecipient')
          .insert(rows);
        if (recipientError) {
          throw recipientError;
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: status === 'SENT' ? 'alert.sent' : 'alert.created',
        entityId: alertId,
        entityType: 'SchoolAlert',
        meta: { status, recipientCount: recipients.length },
      });

      let whatsapp: WhatsAppSendResult | null = null;
      if (status === 'SENT' && values.channel === 'whatsapp') {
        whatsapp = await requestWhatsAppAlertSend(alertId, getUiLocale());
      }

      return { alertId, status, whatsapp };
    },
    onSuccess: ({ status, whatsapp }) => {
      invalidateAlertQueries(queryClient);
      if (whatsapp) {
        toast.success(formatWhatsAppSendToast(whatsapp));
        return;
      }
      toast.success(
        status === 'SENT'
          ? 'Announcement sent.'
          : status === 'SCHEDULED'
            ? 'Announcement scheduled.'
            : 'Announcement saved.',
      );
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const sendAlertNow = useMutation({
    mutationFn: async ({
      alertId,
      academicYearId,
    }: {
      alertId: string;
      academicYearId: string | null;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: alert, error: fetchError } = await supabase
        .from('SchoolAlert')
        .select('id, titleEn, titleFr, bodyEn, bodyFr, status, channel')
        .eq('id', alertId)
        .eq('tenantId', tenantId)
        .single();
      if (fetchError || !alert) {
        throw fetchError ?? new Error('Alert not found.');
      }
      if (alert.status === 'SENT' || alert.status === 'CANCELLED') {
        throw new Error('This alert cannot be sent.');
      }

      const { data: existingRecipients, error: existingError } = await supabase
        .from('SchoolAlertRecipient')
        .select('guardianUserId, studentProfileIds')
        .eq('tenantId', tenantId)
        .eq('alertId', alertId);
      if (existingError) {
        throw existingError;
      }

      let recipients: ResolvedAlertRecipient[] = (existingRecipients ?? []).map((row) => ({
        guardianUserId: row.guardianUserId as string,
        studentProfileIds: (row.studentProfileIds as string[] | null) ?? [],
      }));

      if (recipients.length === 0) {
        const audience = await fetchAlertAudience(supabase, tenantId, academicYearId);
        recipients = resolveAlertRecipients(
          [{ kind: 'all' }],
          audience.links,
          audience.enrollments,
          audience.groupMembers,
        );
      }

      if (recipients.length === 0) {
        throw new Error('No guardians to notify.');
      }

      if (alert.channel === 'whatsapp') {
        const configured = await fetchWhatsAppConfigured();
        if (!configured) {
          throw new Error('WhatsApp is not configured on this server.');
        }
      }

      const { error: updateError } = await supabase
        .from('SchoolAlert')
        .update({
          status: 'SENT',
          sentAt: now,
          updatedAt: now,
        })
        .eq('id', alertId)
        .eq('tenantId', tenantId);
      if (updateError) {
        throw updateError;
      }

      const notificationIds = await deliverAlertNotifications(supabase, {
        tenantId,
        alertId,
        titleEn: alert.titleEn as string,
        titleFr: alert.titleFr as string,
        bodyEn: (alert.bodyEn as string | null) ?? null,
        bodyFr: (alert.bodyFr as string | null) ?? null,
        recipients,
      });

      if ((existingRecipients ?? []).length === 0) {
        const rows = recipients.map((recipient) => ({
          id: generateAcadiaId('alrc'),
          tenantId,
          alertId,
          guardianUserId: recipient.guardianUserId,
          studentProfileIds: recipient.studentProfileIds,
          notificationId: notificationIds.get(recipient.guardianUserId) ?? null,
          createdAt: now,
        }));
        const { error: insertError } = await supabase
          .from('SchoolAlertRecipient')
          .insert(rows);
        if (insertError) {
          throw insertError;
        }
      } else {
        for (const recipient of recipients) {
          const notificationId = notificationIds.get(recipient.guardianUserId);
          if (!notificationId) {
            continue;
          }
          const { error } = await supabase
            .from('SchoolAlertRecipient')
            .update({ notificationId })
            .eq('alertId', alertId)
            .eq('guardianUserId', recipient.guardianUserId);
          if (error) {
            console.error('[sendAlertNow] recipient update', error.message);
          }
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'alert.sent',
        entityId: alertId,
        entityType: 'SchoolAlert',
      });

      let whatsapp: WhatsAppSendResult | null = null;
      if (alert.channel === 'whatsapp') {
        whatsapp = await requestWhatsAppAlertSend(alertId, getUiLocale());
      }
      return { whatsapp };
    },
    onSuccess: ({ whatsapp }) => {
      invalidateAlertQueries(queryClient);
      toast.success(
        whatsapp ? formatWhatsAppSendToast(whatsapp) : 'Announcement sent.',
      );
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const markAlertRead = useMutation({
    mutationFn: async (recipientId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { data: recipient, error: fetchError } = await supabase
        .from('SchoolAlertRecipient')
        .select('id, notificationId, readAt')
        .eq('id', recipientId)
        .eq('tenantId', tenantId)
        .eq('guardianUserId', userId)
        .maybeSingle();
      if (fetchError || !recipient) {
        throw fetchError ?? new Error('Alert not found.');
      }
      if (recipient.readAt) {
        return;
      }

      const { error } = await supabase
        .from('SchoolAlertRecipient')
        .update({ readAt: now })
        .eq('id', recipientId)
        .eq('tenantId', tenantId)
        .eq('guardianUserId', userId);
      if (error) {
        throw error;
      }

      if (recipient.notificationId) {
        const { error: notifError } = await supabase
          .from('Notification')
          .update({ readAt: now })
          .eq('id', recipient.notificationId)
          .eq('tenantId', tenantId)
          .eq('userId', userId);
        if (notifError) {
          console.error('[markAlertRead] notification', notifError.message);
        }
      }
    },
    onSuccess: () => {
      invalidateAlertQueries(queryClient);
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveAlertGroup = useMutation({
    mutationFn: async ({
      values,
      groupId,
    }: {
      values: AlertGroupFormValues;
      groupId?: string;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const id = groupId ?? generateAcadiaId('algrp');
      const memberIds = [...new Set(values.guardianUserIds.map((item) => item.trim()).filter(Boolean))];

      if (groupId) {
        const { error } = await supabase
          .from('SchoolAlertGroup')
          .update({
            name: values.name.trim(),
            description: values.description?.trim() || null,
            updatedAt: now,
          })
          .eq('id', groupId)
          .eq('tenantId', tenantId);
        if (error) {
          throw error;
        }
        const { error: deleteError } = await supabase
          .from('SchoolAlertGroupMember')
          .delete()
          .eq('groupId', groupId)
          .eq('tenantId', tenantId);
        if (deleteError) {
          throw deleteError;
        }
      } else {
        const { error } = await supabase.from('SchoolAlertGroup').insert({
          id,
          tenantId,
          name: values.name.trim(),
          description: values.description?.trim() || null,
          groupType: 'custom',
          createdByUserId: userId,
          createdAt: now,
          updatedAt: now,
        });
        if (error) {
          throw error;
        }
      }

      if (memberIds.length > 0) {
        const { error } = await supabase.from('SchoolAlertGroupMember').insert(
          memberIds.map((guardianUserId) => ({
            id: generateAcadiaId('algm'),
            tenantId,
            groupId: id,
            guardianUserId,
            createdAt: now,
          })),
        );
        if (error) {
          throw error;
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'alert.group_saved',
        entityId: id,
        entityType: 'SchoolAlertGroup',
      });

      return id;
    },
    onSuccess: () => {
      invalidateAlertQueries(queryClient);
      toast.success('Guardian group saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteAlert = useMutation({
    mutationFn: async (alertId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('SchoolAlert')
        .delete()
        .eq('id', alertId)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateAlertQueries(queryClient);
      toast.success('Announcement deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteAlertGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('SchoolAlertGroup')
        .delete()
        .eq('id', groupId)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateAlertQueries(queryClient);
      toast.success('Guardian group deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    saveAlert,
    sendAlertNow,
    markAlertRead,
    saveAlertGroup,
    deleteAlert,
    deleteAlertGroup,
  };
}
