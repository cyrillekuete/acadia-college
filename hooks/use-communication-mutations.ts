'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  DirectMessageFormValues,
  GroupThreadFormValues,
  MessageReplyFormValues,
  NotificationPreferenceFormValues,
} from '@/lib/acadia/communication-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { getUiLocale } from '@/lib/acadia/locale';
import { assertNotSelfRecipient } from '@/lib/acadia/messages';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import { canSendWhatsAppMessages } from '@/lib/acadia/roles';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  fetchWhatsAppConfigured,
  requestWhatsAppMessageSend,
} from '@/lib/acadia/whatsapp-request';
import { formatWhatsAppSendToast } from '@/lib/acadia/whatsapp-types';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function asRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return {};
}

function requireRpcString(data: unknown, key: string): string {
  const value = asRecord(data)[key];
  if (typeof value !== 'string' || !value) {
    throw new Error('Unexpected server response.');
  }
  return value;
}

function invalidateCommunicationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['message-thread'] });
  void queryClient.invalidateQueries({ queryKey: ['tenant-user-options'] });
  void queryClient.invalidateQueries({ queryKey: ['announcements'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-notifications'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-notification-preferences'] });
}

export function useCommunicationMutations() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId;
  const userId = session?.profile?.id;
  const roleSlug = session?.roleSlug;

  const createDirectMessage = useMutation({
    mutationFn: async (values: DirectMessageFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      assertNotSelfRecipient(userId, values.recipientUserId);
      if (values.sendWhatsApp) {
        if (!canSendWhatsAppMessages(roleSlug)) {
          throw new Error('You do not have permission to send WhatsApp messages.');
        }
        const configured = await fetchWhatsAppConfigured();
        if (!configured) {
          throw new Error('WhatsApp is not configured on this server.');
        }
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase.rpc('acadia_create_direct_message', {
        p_tenant_id: tenantId,
        p_recipient_user_id: values.recipientUserId,
        p_subject_en: values.subjectEn.trim(),
        p_subject_fr: values.subjectFr?.trim() || values.subjectEn.trim(),
        p_body: values.body.trim(),
      });
      if (error) {
        throw error;
      }
      const threadId = requireRpcString(data, 'threadId');
      const messageId = requireRpcString(data, 'messageId');

      await appendSystemLog(supabase, {
        userId,
        event: 'message.thread_created',
        entityId: threadId,
        entityType: 'MessageThread',
        description: 'Direct message thread created',
      });

      let whatsappToast: string | null = null;
      if (values.sendWhatsApp) {
        const result = await requestWhatsAppMessageSend(
          messageId,
          values.recipientUserId,
          getUiLocale(),
        );
        whatsappToast = formatWhatsAppSendToast(result);
      }

      return { threadId, whatsappToast };
    },
    onSuccess: ({ threadId, whatsappToast }) => {
      invalidateCommunicationQueries(queryClient);
      toast.success(whatsappToast ?? 'Message sent.');
      router.push(`/messages/${threadId}`);
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const createGroupThread = useMutation({
    mutationFn: async (values: GroupThreadFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase.rpc('acadia_create_group_thread', {
        p_tenant_id: tenantId,
        p_subject_en: values.subjectEn.trim(),
        p_subject_fr: values.subjectFr?.trim() || values.subjectEn.trim(),
        p_group_scope: values.groupScope,
        p_group_scope_id: values.groupScopeId,
        p_member_user_ids: values.memberUserIds,
        p_body: values.body.trim(),
      });
      if (error) {
        throw error;
      }
      const threadId = requireRpcString(data, 'threadId');

      await appendSystemLog(supabase, {
        userId,
        event: 'message.thread_created',
        entityId: threadId,
        entityType: 'MessageThread',
        description: 'Group message thread created',
        meta: { groupScope: values.groupScope },
      });

      return threadId;
    },
    onSuccess: (threadId) => {
      invalidateCommunicationQueries(queryClient);
      toast.success('Group conversation created.');
      router.push(`/messages/${threadId}`);
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const replyToThread = useMutation({
    mutationFn: async ({
      threadId,
      values,
      subject,
    }: {
      threadId: string;
      values: MessageReplyFormValues;
      memberUserIds?: string[];
      subject: string;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase.rpc('acadia_reply_to_thread', {
        p_tenant_id: tenantId,
        p_thread_id: threadId,
        p_body: values.body.trim(),
        p_subject: subject,
      });
      if (error) {
        throw error;
      }
      const messageId = requireRpcString(data, 'messageId');

      await appendSystemLog(supabase, {
        userId,
        event: 'message.sent',
        entityId: threadId,
        entityType: 'MessageThread',
      });

      return messageId;
    },
    onSuccess: () => {
      invalidateCommunicationQueries(queryClient);
      toast.success('Reply sent.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const markThreadRead = useMutation({
    mutationFn: async (threadId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase.rpc('acadia_mark_thread_read', {
        p_tenant_id: tenantId,
        p_thread_id: threadId,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
      void queryClient.invalidateQueries({ queryKey: ['acadia-notifications'] });
    },
  });

  const updateGroupMembers = useMutation({
    mutationFn: async ({
      threadId,
      addUserIds = [],
      removeUserIds = [],
    }: {
      threadId: string;
      addUserIds?: string[];
      removeUserIds?: string[];
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase.rpc('acadia_update_group_members', {
        p_tenant_id: tenantId,
        p_thread_id: threadId,
        p_add_user_ids: addUserIds,
        p_remove_user_ids: removeUserIds,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCommunicationQueries(queryClient);
      toast.success('Group members updated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const upsertNotificationPreference = useMutation({
    mutationFn: async (values: NotificationPreferenceFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: existing, error: findError } = await supabase
        .from('NotificationPreference')
        .select('id')
        .eq('tenantId', tenantId)
        .eq('userId', userId)
        .eq('event', values.event)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (existing?.id) {
        const { error } = await supabase
          .from('NotificationPreference')
          .update({
            inApp: values.inApp,
            email: values.email,
            updatedAt: now,
          })
          .eq('id', existing.id);
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from('NotificationPreference').insert({
          id: generateAcadiaId('npref'),
          tenantId,
          userId,
          event: values.event,
          inApp: values.inApp,
          email: values.email,
          createdAt: now,
          updatedAt: now,
        });
        if (error) {
          throw error;
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'notification.preference_updated',
        meta: { event: values.event },
      });
    },
    onSuccess: () => {
      invalidateCommunicationQueries(queryClient);
      toast.success('Preference saved.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const upsertNotificationPreferences = useMutation({
    mutationFn: async (values: NotificationPreferenceFormValues[]) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      if (values.length === 0) {
        return;
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const events = values.map((item) => item.event);

      const { data: existing, error: findError } = await supabase
        .from('NotificationPreference')
        .select('id, event')
        .eq('tenantId', tenantId)
        .eq('userId', userId)
        .in('event', events);

      if (findError) {
        throw findError;
      }

      const existingByEvent = new Map(
        (existing ?? []).map((row) => [row.event as string, row.id as string]),
      );
      const toInsert = values
        .filter((item) => !existingByEvent.has(item.event))
        .map((item) => ({
          id: generateAcadiaId('npref'),
          tenantId,
          userId,
          event: item.event,
          inApp: item.inApp,
          email: item.email,
          createdAt: now,
          updatedAt: now,
        }));
      const toUpdate = values.filter((item) => existingByEvent.has(item.event));

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('NotificationPreference')
          .insert(toInsert);
        if (error) {
          throw error;
        }
      }

      for (const item of toUpdate) {
        const id = existingByEvent.get(item.event);
        if (!id) {
          continue;
        }
        const { error } = await supabase
          .from('NotificationPreference')
          .update({
            inApp: item.inApp,
            email: item.email,
            updatedAt: now,
          })
          .eq('id', id);
        if (error) {
          throw error;
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'notification.preference_updated',
        meta: { events },
      });
    },
    onSuccess: () => {
      invalidateCommunicationQueries(queryClient);
      toast.success('Preferences saved.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const markNotificationRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Notification')
        .update({ readAt: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('tenantId', tenantId)
        .eq('userId', userId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCommunicationQueries(queryClient);
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const markAllNotificationsRead = useMutation({
    mutationFn: async () => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Notification')
        .update({ readAt: new Date().toISOString() })
        .eq('tenantId', tenantId)
        .eq('userId', userId)
        .is('readAt', null);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCommunicationQueries(queryClient);
      toast.success('All notifications marked as read.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  return {
    createDirectMessage,
    createGroupThread,
    replyToThread,
    markThreadRead,
    updateGroupMembers,
    upsertNotificationPreference,
    upsertNotificationPreferences,
    markNotificationRead,
    markAllNotificationsRead,
  };
}
