'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  buildMessageReceivedNotification,
  shouldDeliverInAppNotification,
} from '@/lib/acadia/communication';
import type {
  DirectMessageFormValues,
  GroupThreadFormValues,
  MessageReplyFormValues,
  NotificationPreferenceFormValues,
} from '@/lib/acadia/communication-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { getUiLocale } from '@/lib/acadia/locale';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  fetchWhatsAppConfigured,
  requestWhatsAppMessageSend,
} from '@/lib/acadia/whatsapp-request';
import { formatWhatsAppSendToast } from '@/lib/acadia/whatsapp-types';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
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

async function insertThreadMembers(
  supabase: ReturnType<typeof requireBrowserClient>,
  tenantId: string,
  threadId: string,
  userIds: string[],
): Promise<void> {
  const uniqueIds = Array.from(new Set(userIds));
  const rows = uniqueIds.map((userId) => ({
    id: generateAcadiaId('mtm'),
    tenantId,
    threadId,
    userId,
    joinedAt: new Date().toISOString(),
  }));
  const { error } = await supabase.from('MessageThreadMember').insert(rows);
  if (error) {
    throw error;
  }
}

async function notifyMessageRecipients(
  supabase: ReturnType<typeof requireBrowserClient>,
  input: {
    tenantId: string;
    threadId: string;
    senderUserId: string;
    senderName: string;
    subject: string;
    recipientUserIds: string[];
  },
): Promise<number> {
  const recipients = input.recipientUserIds.filter(
    (id) => id !== input.senderUserId,
  );
  if (recipients.length === 0) {
    return 0;
  }

  const { data: preferences, error: prefError } = await supabase
    .from('NotificationPreference')
    .select('userId, inApp')
    .eq('tenantId', input.tenantId)
    .eq('event', 'message.received')
    .in('userId', recipients);

  if (prefError) {
    console.error('[notifyMessageRecipients] preferences', prefError.message);
  }

  const prefByUser = new Map(
    (preferences ?? []).map((p) => [p.userId as string, { inApp: p.inApp as boolean }]),
  );

  const now = new Date().toISOString();
  const rows = recipients
    .filter((userId) =>
      shouldDeliverInAppNotification(prefByUser, userId, 'message.received'),
    )
    .map((recipientUserId) => ({
      ...buildMessageReceivedNotification(
        {
          tenantId: input.tenantId,
          recipientUserId,
          threadId: input.threadId,
          senderName: input.senderName,
          subject: input.subject,
        },
        generateAcadiaId('notif'),
      ),
      createdAt: now,
    }));

  if (rows.length === 0) {
    return 0;
  }

  const { error: insertError } = await supabase.from('Notification').insert(rows);
  if (insertError) {
    console.error('[notifyMessageRecipients] insert', insertError.message);
    return 0;
  }
  return rows.length;
}

export function useCommunicationMutations() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId;
  const userId = session?.profile?.id;
  const senderName = session?.profile?.name ?? 'Someone';

  const createDirectMessage = useMutation({
    mutationFn: async (values: DirectMessageFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      if (values.sendWhatsApp) {
        const configured = await fetchWhatsAppConfigured();
        if (!configured) {
          throw new Error('WhatsApp is not configured on this server.');
        }
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const threadId = generateAcadiaId('mth');
      const messageId = generateAcadiaId('msg');
      const subjectFr = values.subjectFr?.trim() || values.subjectEn;

      const { error: threadError } = await supabase.from('MessageThread').insert({
        id: threadId,
        tenantId,
        kind: 'DIRECT',
        subjectEn: values.subjectEn.trim(),
        subjectFr,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
      if (threadError) {
        throw threadError;
      }

      await insertThreadMembers(supabase, tenantId, threadId, [
        userId,
        values.recipientUserId,
      ]);

      const { error: messageError } = await supabase.from('Message').insert({
        id: messageId,
        tenantId,
        threadId,
        senderUserId: userId,
        body: values.body.trim(),
        createdAt: now,
      });
      if (messageError) {
        throw messageError;
      }

      await notifyMessageRecipients(supabase, {
        tenantId,
        threadId,
        senderUserId: userId,
        senderName,
        subject: values.subjectEn,
        recipientUserIds: [values.recipientUserId],
      });

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
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createGroupThread = useMutation({
    mutationFn: async (values: GroupThreadFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const threadId = generateAcadiaId('mth');
      const messageId = generateAcadiaId('msg');
      const subjectFr = values.subjectFr?.trim() || values.subjectEn;
      const members = Array.from(new Set([userId, ...values.memberUserIds]));

      const { error: threadError } = await supabase.from('MessageThread').insert({
        id: threadId,
        tenantId,
        kind: 'GROUP',
        subjectEn: values.subjectEn.trim(),
        subjectFr,
        groupScope: values.groupScope,
        groupScopeId: values.groupScopeId,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
      if (threadError) {
        throw threadError;
      }

      await insertThreadMembers(supabase, tenantId, threadId, members);

      const { error: messageError } = await supabase.from('Message').insert({
        id: messageId,
        tenantId,
        threadId,
        senderUserId: userId,
        body: values.body.trim(),
        createdAt: now,
      });
      if (messageError) {
        throw messageError;
      }

      await notifyMessageRecipients(supabase, {
        tenantId,
        threadId,
        senderUserId: userId,
        senderName,
        subject: values.subjectEn,
        recipientUserIds: members,
      });

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
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const replyToThread = useMutation({
    mutationFn: async ({
      threadId,
      values,
      memberUserIds,
      subject,
    }: {
      threadId: string;
      values: MessageReplyFormValues;
      memberUserIds: string[];
      subject: string;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const messageId = generateAcadiaId('msg');

      const { error: messageError } = await supabase.from('Message').insert({
        id: messageId,
        tenantId,
        threadId,
        senderUserId: userId,
        body: values.body.trim(),
        createdAt: now,
      });
      if (messageError) {
        throw messageError;
      }

      const { error: threadError } = await supabase
        .from('MessageThread')
        .update({ updatedAt: now })
        .eq('id', threadId)
        .eq('tenantId', tenantId);
      if (threadError) {
        throw threadError;
      }

      await notifyMessageRecipients(supabase, {
        tenantId,
        threadId,
        senderUserId: userId,
        senderName,
        subject,
        recipientUserIds: memberUserIds,
      });

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
    onError: (error) => toast.error(mutationErrorMessage(error)),
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
    onError: (error) => toast.error(mutationErrorMessage(error)),
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
    onError: (error) => toast.error(mutationErrorMessage(error)),
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
    onError: (error) => toast.error(mutationErrorMessage(error)),
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
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    createDirectMessage,
    createGroupThread,
    replyToThread,
    upsertNotificationPreference,
    upsertNotificationPreferences,
    markNotificationRead,
    markAllNotificationsRead,
  };
}
