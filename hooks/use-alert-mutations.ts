'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { alertSchema, type AlertFormValues, type AlertGroupFormValues } from '@/lib/acadia/alert-schemas';
import {
  deliverAlertNotifications,
  insertAlertRecipients,
  resolveRecipientsForAlert,
} from '@/lib/acadia/alert-dispatch';
import {
  alertScheduleIssue,
  alertTargetsNeedAcademicYear,
  deriveAlertStatusOnSave,
  diffGroupMemberIds,
  filterAlertTargetsForTeacherScope,
  parseAlertTargetKeys,
  resolveAlertRecipients,
  type ResolvedAlertRecipient,
} from '@/lib/acadia/alerts';
import { localDateTimeInputToIso } from '@/lib/acadia/dates';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { getUiLocale } from '@/lib/acadia/locale';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { isGuardian } from '@/lib/acadia/roles';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  fetchWhatsAppConfigured,
  requestWhatsAppAlertSend,
} from '@/lib/acadia/whatsapp-request';
import { formatWhatsAppSendToast } from '@/lib/acadia/whatsapp-types';
import type { WhatsAppSendResult } from '@/lib/acadia/whatsapp-types';
import { fetchAlertAudience } from '@/lib/supabase/queries/alert-audience';
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

export type AlertTeacherScope = {
  canBroadcastAll: boolean;
  allowedClassIds: string[] | null;
};

export function useAlertMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.profile?.id ?? null;

  const saveAlert = useMutation({
    mutationFn: async ({
      values,
      academicYearId,
      teacherScope,
    }: {
      values: AlertFormValues;
      academicYearId: string | null;
      teacherScope?: AlertTeacherScope;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const parsed = alertSchema.safeParse(values);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Invalid announcement.');
      }
      const scheduleIssue = alertScheduleIssue(parsed.data);
      if (scheduleIssue) {
        throw new Error(scheduleIssue);
      }

      let targets = parseAlertTargetKeys(parsed.data.targetKeys);
      if (teacherScope) {
        targets = filterAlertTargetsForTeacherScope(targets, teacherScope);
      }
      if (targets.length === 0) {
        throw new Error('No guardians match the selected groups.');
      }
      if (alertTargetsNeedAcademicYear(targets) && !academicYearId) {
        throw new Error('Select an academic year before sending to a class or all guardians.');
      }

      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const alertId = generateAcadiaId('alrt');
      const status = deriveAlertStatusOnSave(parsed.data, now);
      const scheduledAt = parsed.data.sendNow
        ? null
        : localDateTimeInputToIso(parsed.data.scheduledAt);
      const sentAt = status === 'SENT' ? now : null;
      const audience = await fetchAlertAudience(supabase, tenantId, academicYearId);
      const recipients = resolveAlertRecipients(
        targets,
        audience.eligibleLinks,
        audience.enrollments,
        audience.activeGroupMembers,
      );

      if ((status === 'SENT' || status === 'SCHEDULED') && recipients.length === 0) {
        throw new Error('No guardians match the selected groups.');
      }

      if (status === 'SENT' && parsed.data.channel === 'whatsapp') {
        const configured = await fetchWhatsAppConfigured();
        if (!configured) {
          throw new Error('WhatsApp is not configured on this server.');
        }
      }

      const { error: alertError } = await supabase.from('SchoolAlert').insert({
        id: alertId,
        tenantId,
        titleEn: parsed.data.titleEn.trim(),
        titleFr: parsed.data.titleFr.trim(),
        bodyEn: parsed.data.bodyEn?.trim() || null,
        bodyFr: parsed.data.bodyFr?.trim() || null,
        priority: parsed.data.priority,
        channel: parsed.data.channel,
        status,
        scheduledAt,
        sentAt,
        targetKeys: parsed.data.targetKeys,
        academicYearId,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
      if (alertError) {
        throw alertError;
      }

      if (status === 'SENT') {
        const notificationIds = await deliverAlertNotifications(supabase, {
          tenantId,
          alertId,
          titleEn: parsed.data.titleEn.trim(),
          titleFr: parsed.data.titleFr.trim(),
          bodyEn: parsed.data.bodyEn?.trim() || null,
          bodyFr: parsed.data.bodyFr?.trim() || null,
          recipients,
        });
        await insertAlertRecipients(supabase, {
          tenantId,
          alertId,
          recipients,
          notificationIds,
          now,
        });
      }

      await appendSystemLog(supabase, {
        userId,
        event: status === 'SENT' ? 'alert.sent' : 'alert.created',
        entityId: alertId,
        entityType: 'SchoolAlert',
        meta: { status, recipientCount: recipients.length },
      });

      let whatsapp: WhatsAppSendResult | null = null;
      if (status === 'SENT' && parsed.data.channel === 'whatsapp') {
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
        .select(
          'id, titleEn, titleFr, bodyEn, bodyFr, status, channel, targetKeys, academicYearId',
        )
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

      const existing: ResolvedAlertRecipient[] = (existingRecipients ?? []).map((row) => ({
        guardianUserId: row.guardianUserId as string,
        studentProfileIds: (row.studentProfileIds as string[] | null) ?? [],
      }));

      const yearId =
        (alert.academicYearId as string | null) ?? academicYearId;
      const recipients = await resolveRecipientsForAlert(supabase, {
        tenantId,
        academicYearId: yearId,
        targetKeys: (alert.targetKeys as string[] | null) ?? [],
        existing,
      });

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
        await insertAlertRecipients(supabase, {
          tenantId,
          alertId,
          recipients,
          notificationIds,
          now,
        });
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
      const memberIds = [
        ...new Set(values.guardianUserIds.map((item) => item.trim()).filter(Boolean)),
      ];

      const { data: users, error: usersError } = await supabase
        .from('User')
        .select('id, status, isTrashed, UserRole:roleId ( slug )')
        .eq('tenantId', tenantId)
        .in('id', memberIds);
      if (usersError) {
        throw usersError;
      }
      const validIds = new Set(
        (users ?? [])
          .filter((row) => {
            const role = unwrapRelation<{ slug?: string }>(
              (row as { UserRole?: unknown }).UserRole,
            );
            return (
              isGuardian(role?.slug) &&
              row.status === 'ACTIVE' &&
              row.isTrashed !== true
            );
          })
          .map((row) => row.id as string),
      );
      const validMembers = memberIds.filter((memberId) => validIds.has(memberId));
      if (validMembers.length === 0) {
        throw new Error('Select at least one active guardian.');
      }

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

      const { data: existingMembers, error: existingError } = await supabase
        .from('SchoolAlertGroupMember')
        .select('guardianUserId')
        .eq('groupId', id)
        .eq('tenantId', tenantId);
      if (existingError) {
        throw existingError;
      }
      const { toInsert, toDelete } = diffGroupMemberIds(
        (existingMembers ?? []).map((row) => row.guardianUserId as string),
        validMembers,
      );

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('SchoolAlertGroupMember')
          .delete()
          .eq('groupId', id)
          .eq('tenantId', tenantId)
          .in('guardianUserId', toDelete);
        if (error) {
          throw error;
        }
      }
      if (toInsert.length > 0) {
        const { error } = await supabase.from('SchoolAlertGroupMember').insert(
          toInsert.map((guardianUserId) => ({
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
      const { data: alert, error: fetchError } = await supabase
        .from('SchoolAlert')
        .select('id, status')
        .eq('id', alertId)
        .eq('tenantId', tenantId)
        .maybeSingle();
      if (fetchError || !alert) {
        throw fetchError ?? new Error('Alert not found.');
      }

      if (alert.status === 'SENT' || alert.status === 'SCHEDULED') {
        const { error } = await supabase
          .from('SchoolAlert')
          .update({
            status: 'CANCELLED',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', alertId)
          .eq('tenantId', tenantId);
        if (error) {
          throw error;
        }
        return { cancelled: true };
      }

      const { error } = await supabase
        .from('SchoolAlert')
        .delete()
        .eq('id', alertId)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
      return { cancelled: false };
    },
    onSuccess: ({ cancelled }) => {
      invalidateAlertQueries(queryClient);
      toast.success(cancelled ? 'Announcement cancelled.' : 'Announcement deleted.');
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
