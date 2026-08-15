'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  announcementNotificationEvent,
  buildMessageReceivedNotification,
  deriveAnnouncementStatusOnSave,
  filterUsersByAnnouncementAudience,
  shouldDeliverInAppNotification,
} from '@/lib/acadia/communication';
import type {
  AnnouncementFormValues,
  DirectMessageFormValues,
  GroupThreadFormValues,
  MessageReplyFormValues,
  NotificationPreferenceFormValues,
} from '@/lib/acadia/communication-schemas';
import { localDateTimeInputToIso } from '@/lib/acadia/dates';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import type { AnnouncementAudience } from '@/lib/acadia/communication';

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

      return threadId;
    },
    onSuccess: (threadId) => {
      invalidateCommunicationQueries(queryClient);
      toast.success('Message sent.');
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

  const saveAnnouncement = useMutation({
    mutationFn: async ({
      values,
      announcementId,
    }: {
      values: AnnouncementFormValues;
      announcementId?: string;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const id = announcementId ?? generateAcadiaId('ann');
      const status = deriveAnnouncementStatusOnSave(values, now);
      const publishedAt =
        status === 'PUBLISHED' ? now : null;
      const publishAt = values.publishNow
        ? now
        : localDateTimeInputToIso(values.publishAt);

      const row = {
        kind: values.kind,
        titleEn: values.titleEn.trim(),
        titleFr: values.titleFr.trim(),
        bodyEn: values.bodyEn?.trim() || null,
        bodyFr: values.bodyFr?.trim() || null,
        audience: values.audience,
        status,
        eventStartsAt: localDateTimeInputToIso(values.eventStartsAt),
        eventEndsAt: localDateTimeInputToIso(values.eventEndsAt),
        eventLocation: values.eventLocation?.trim() || null,
        publishAt,
        publishedAt,
        updatedAt: now,
      };

      if (announcementId) {
        const { error } = await supabase
          .from('SchoolAnnouncement')
          .update(row)
          .eq('id', announcementId)
          .eq('tenantId', tenantId);
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from('SchoolAnnouncement').insert({
          id,
          tenantId,
          ...row,
          createdByUserId: userId,
          createdAt: now,
        });
        if (error) {
          throw error;
        }
      }

      if (status === 'PUBLISHED') {
        await deliverAnnouncementNotifications(supabase, {
          tenantId,
          announcementId: id,
          kind: values.kind,
          titleEn: row.titleEn,
          titleFr: row.titleFr,
          bodyEn: row.bodyEn,
          bodyFr: row.bodyFr,
          audience: values.audience,
          eventStartsAt: row.eventStartsAt,
          eventLocation: row.eventLocation,
        });
      }

      await appendSystemLog(supabase, {
        userId,
        event: status === 'PUBLISHED' ? 'announcement.published' : 'announcement.created',
        entityId: id,
        entityType: 'SchoolAnnouncement',
      });

      return id;
    },
    onSuccess: () => {
      invalidateCommunicationQueries(queryClient);
      toast.success('Announcement saved.');
      router.push('/announcements');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const publishAnnouncementNow = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: row, error: fetchError } = await supabase
        .from('SchoolAnnouncement')
        .select(
          'id, kind, titleEn, titleFr, bodyEn, bodyFr, audience, eventStartsAt, eventLocation',
        )
        .eq('id', announcementId)
        .eq('tenantId', tenantId)
        .single();

      if (fetchError || !row) {
        throw fetchError ?? new Error('Announcement not found.');
      }

      const { error } = await supabase
        .from('SchoolAnnouncement')
        .update({
          status: 'PUBLISHED',
          publishedAt: now,
          publishAt: now,
          updatedAt: now,
        })
        .eq('id', announcementId)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }

      await deliverAnnouncementNotifications(supabase, {
        tenantId,
        announcementId,
        kind: row.kind as 'BROADCAST' | 'EVENT',
        titleEn: row.titleEn as string,
        titleFr: row.titleFr as string,
        bodyEn: row.bodyEn as string | null,
        bodyFr: row.bodyFr as string | null,
        audience: row.audience as AnnouncementAudience,
        eventStartsAt: row.eventStartsAt as string | null,
        eventLocation: row.eventLocation as string | null,
      });

      await appendSystemLog(supabase, {
        userId,
        event: 'announcement.published',
        entityId: announcementId,
        entityType: 'SchoolAnnouncement',
      });
    },
    onSuccess: () => {
      invalidateCommunicationQueries(queryClient);
      toast.success('Announcement published.');
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
    saveAnnouncement,
    publishAnnouncementNow,
  };
}

async function deliverAnnouncementNotifications(
  supabase: ReturnType<typeof requireBrowserClient>,
  input: {
    tenantId: string;
    announcementId: string;
    kind: 'BROADCAST' | 'EVENT';
    titleEn: string;
    titleFr: string;
    bodyEn: string | null;
    bodyFr: string | null;
    audience: AnnouncementAudience;
    eventStartsAt: string | null;
    eventLocation: string | null;
  },
): Promise<number> {
  const { data: users, error: userError } = await supabase
    .from('User')
    .select(
      `
      id,
      UserRole:roleId ( slug )
    `,
    )
    .eq('tenantId', input.tenantId)
    .eq('status', 'ACTIVE')
    .eq('isTrashed', false);

  if (userError) {
    console.error('[deliverAnnouncement]', userError.message);
    return 0;
  }

  const recipients = filterUsersByAnnouncementAudience(
    (users ?? []).map((user) => {
      const role = user.UserRole as { slug?: string } | null;
      return {
        id: user.id as string,
        roleSlug: role?.slug ?? null,
      };
    }),
    input.audience,
  );

  if (recipients.length === 0) {
    return 0;
  }

  const event = announcementNotificationEvent(input.kind);
  const recipientIds = recipients.map((r) => r.id);

  const { data: preferences, error: prefError } = await supabase
    .from('NotificationPreference')
    .select('userId, inApp')
    .eq('tenantId', input.tenantId)
    .eq('event', event)
    .in('userId', recipientIds);

  if (prefError) {
    console.error('[deliverAnnouncement] preferences', prefError.message);
  }

  const prefByUser = new Map(
    (preferences ?? []).map((p) => [p.userId as string, { inApp: p.inApp as boolean }]),
  );

  const now = new Date().toISOString();
  const eventSuffix =
    input.kind === 'EVENT' && input.eventStartsAt
      ? ` Event on ${input.eventStartsAt.slice(0, 10)}${input.eventLocation ? ` at ${input.eventLocation}` : ''}.`
      : '';

  const rows = recipientIds
    .filter((userId) => shouldDeliverInAppNotification(prefByUser, userId, event))
    .map((userId) => ({
      id: generateAcadiaId('notif'),
      tenantId: input.tenantId,
      userId,
      event,
      titleEn: input.titleEn,
      titleFr: input.titleFr,
      bodyEn: input.bodyEn ?? eventSuffix.trim(),
      bodyFr: input.bodyFr ?? eventSuffix.trim(),
      data: { announcementId: input.announcementId, kind: input.kind },
      createdAt: now,
    }));

  if (rows.length === 0) {
    return 0;
  }

  const { error: insertError } = await supabase.from('Notification').insert(rows);
  if (insertError) {
    console.error('[deliverAnnouncement] insert', insertError.message);
    return 0;
  }
  return rows.length;
}
