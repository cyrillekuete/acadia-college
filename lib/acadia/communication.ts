import type { AnnouncementFormValues } from '@/lib/acadia/communication-schemas';
import { localDateTimeInputToIso } from '@/lib/acadia/dates';
import type { UiLocale } from '@/lib/acadia/locale';
import { isGuardian, isStudent } from '@/lib/acadia/roles';

export const MESSAGE_THREAD_KINDS = ['DIRECT', 'GROUP'] as const;
export type MessageThreadKind = (typeof MESSAGE_THREAD_KINDS)[number];

export const MESSAGE_GROUP_SCOPES = ['DEPARTMENT', 'STREAM', 'LEVEL'] as const;
export type MessageGroupScope = (typeof MESSAGE_GROUP_SCOPES)[number];

export const ANNOUNCEMENT_KINDS = ['BROADCAST', 'EVENT'] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const ANNOUNCEMENT_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'CANCELLED',
] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_AUDIENCES = [
  'ALL',
  'STAFF',
  'STUDENTS',
  'GUARDIANS',
] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const NOTIFICATION_EVENTS = [
  'attendance.absence',
  'announcement.broadcast',
  'announcement.event',
  'message.received',
  'marks.published',
  'fees.overdue',
  'alert.sent',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const ANNOUNCEMENT_BROADCAST_EVENT = 'announcement.broadcast' as const;
export const ANNOUNCEMENT_EVENT_NOTIFICATION = 'announcement.event' as const;
export const MESSAGE_RECEIVED_EVENT = 'message.received' as const;
export const ALERT_SENT_NOTIFICATION = 'alert.sent' as const;

const GROUP_SCOPE_LABELS: Record<MessageGroupScope, string> = {
  DEPARTMENT: 'Department',
  STREAM: 'Academic stream',
  LEVEL: 'Level',
};

const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  CANCELLED: 'Cancelled',
};

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  ALL: 'Everyone',
  STAFF: 'Staff',
  STUDENTS: 'Students',
  GUARDIANS: 'Guardians',
};

export function messageGroupScopeLabel(scope: string): string {
  return GROUP_SCOPE_LABELS[scope as MessageGroupScope] ?? scope;
}

export function announcementStatusLabel(status: string): string {
  return ANNOUNCEMENT_STATUS_LABELS[status as AnnouncementStatus] ?? status;
}

export function announcementAudienceLabel(audience: string): string {
  return AUDIENCE_LABELS[audience as AnnouncementAudience] ?? audience;
}

export function threadSubjectDisplay(input: {
  subjectEn?: string | null;
  subjectFr?: string | null;
  kind?: string;
}): string {
  return (
    input.subjectEn?.trim() ||
    input.subjectFr?.trim() ||
    (input.kind === 'GROUP' ? 'Group conversation' : 'Conversation')
  );
}

export type AnnouncementLifecycleInput = {
  status: string;
  publishAt?: string | null;
  publishedAt?: string | null;
};

/** Effective status considering scheduled publish time. */
export function resolveAnnouncementLifecycleStatus(
  row: AnnouncementLifecycleInput,
  nowIso = new Date().toISOString(),
): AnnouncementStatus {
  if (row.status === 'PUBLISHED' || row.status === 'CANCELLED') {
    return row.status as AnnouncementStatus;
  }
  if (row.status === 'SCHEDULED' && row.publishAt && row.publishAt <= nowIso) {
    return 'PUBLISHED';
  }
  return row.status as AnnouncementStatus;
}

export function isAnnouncementVisible(
  row: AnnouncementLifecycleInput,
  nowIso = new Date().toISOString(),
): boolean {
  const effective = resolveAnnouncementLifecycleStatus(row, nowIso);
  return effective === 'PUBLISHED';
}

export function deriveAnnouncementStatusOnSave(
  values: Pick<AnnouncementFormValues, 'publishNow' | 'publishAt'>,
  nowIso = new Date().toISOString(),
): AnnouncementStatus {
  if (values.publishNow) {
    return 'PUBLISHED';
  }
  const publishIso = localDateTimeInputToIso(values.publishAt);
  if (publishIso && publishIso > nowIso) {
    return 'SCHEDULED';
  }
  return 'DRAFT';
}

export function announcementNotificationEvent(kind: AnnouncementKind): NotificationEvent {
  return kind === 'EVENT'
    ? ANNOUNCEMENT_EVENT_NOTIFICATION
    : ANNOUNCEMENT_BROADCAST_EVENT;
}

export function shouldDeliverInAppNotification(
  preferences: Map<string, { inApp: boolean }>,
  userId: string,
  event: string,
): boolean {
  const pref = preferences.get(userId);
  if (!pref) {
    return true;
  }
  return pref.inApp !== false;
}

export function filterUsersByAnnouncementAudience<
  T extends { id: string; roleSlug?: string | null },
>(users: T[], audience: AnnouncementAudience): T[] {
  if (audience === 'ALL') {
    return users;
  }
  return users.filter((user) => {
    const slug = user.roleSlug?.toLowerCase() ?? '';
    if (audience === 'STAFF') {
      return ['admin', 'super-admin', 'registrar', 'financial-director', 'lecturer', 'staff', 'teacher'].includes(slug);
    }
    if (audience === 'STUDENTS') {
      return slug === 'student';
    }
    if (audience === 'GUARDIANS') {
      return slug === 'guardian' || slug === 'parent';
    }
    return true;
  });
}

export function buildMessageReceivedNotification(
  input: {
    tenantId: string;
    recipientUserId: string;
    threadId: string;
    senderName: string;
    subject: string;
  },
  notificationId: string,
): {
  id: string;
  tenantId: string;
  userId: string;
  event: string;
  titleEn: string;
  titleFr: string;
  bodyEn: string;
  bodyFr: string;
  data: Record<string, unknown>;
} {
  return {
    id: notificationId,
    tenantId: input.tenantId,
    userId: input.recipientUserId,
    event: MESSAGE_RECEIVED_EVENT,
    titleEn: `New message: ${input.subject}`,
    titleFr: `Nouveau message : ${input.subject}`,
    bodyEn: `${input.senderName} sent you a message.`,
    bodyFr: `${input.senderName} vous a envoyé un message.`,
    data: { threadId: input.threadId },
  };
}

const NOTIFICATION_EVENT_LABELS: Record<
  NotificationEvent,
  { en: string; fr: string }
> = {
  'attendance.absence': {
    en: 'Absence / late alerts',
    fr: 'Alertes d’absence / retard',
  },
  'announcement.broadcast': {
    en: 'School announcements',
    fr: 'Annonces de l’établissement',
  },
  'announcement.event': {
    en: 'Event reminders',
    fr: 'Rappels d’événements',
  },
  'message.received': {
    en: 'New messages',
    fr: 'Nouveaux messages',
  },
  'marks.published': {
    en: 'Published marks',
    fr: 'Notes publiées',
  },
  'fees.overdue': {
    en: 'Overdue fees',
    fr: 'Frais en retard',
  },
  'alert.sent': {
    en: 'Guardian alerts',
    fr: 'Alertes aux tuteurs',
  },
};

export type NotificationChannel = 'email' | 'inApp';

export type NotificationPreferenceLike = {
  event: string;
  inApp: boolean;
  email: boolean;
};

export function notificationEventLabel(
  event: string,
  locale: UiLocale = 'en',
): string {
  const labels = NOTIFICATION_EVENT_LABELS[event as NotificationEvent];
  if (!labels) {
    return event;
  }
  return locale === 'fr' ? labels.fr : labels.en;
}

export function notificationHref(
  event: string,
  data?: Record<string, unknown> | null,
  roleSlug?: string | null,
): string {
  if (event === MESSAGE_RECEIVED_EVENT) {
    const threadId =
      data && typeof data.threadId === 'string' ? data.threadId.trim() : '';
    return threadId ? `/messages/${threadId}` : '/messages';
  }
  if (
    event === ANNOUNCEMENT_BROADCAST_EVENT ||
    event === ANNOUNCEMENT_EVENT_NOTIFICATION
  ) {
    return '/announcements';
  }
  if (event === 'attendance.absence') {
    return '/attendance';
  }
  if (event === 'marks.published') {
    return '/marks';
  }
  if (event === 'fees.overdue') {
    return isStudent(roleSlug) || isGuardian(roleSlug)
      ? '/finance/my-fees'
      : '/finance/fees';
  }
  if (event === ALERT_SENT_NOTIFICATION) {
    return '/announcements';
  }
  return '/account/notifications';
}

export function preferenceForEvent(
  preferences: NotificationPreferenceLike[],
  event: string,
): { inApp: boolean; email: boolean } {
  const row = preferences.find((item) => item.event === event);
  return {
    inApp: row?.inApp ?? true,
    email: row?.email ?? true,
  };
}

export function isNotificationChannelEnabled(
  preferences: NotificationPreferenceLike[],
  channel: NotificationChannel,
): boolean {
  return NOTIFICATION_EVENTS.every(
    (event) => preferenceForEvent(preferences, event)[channel],
  );
}

export function areAllInAppNotificationsPaused(
  preferences: NotificationPreferenceLike[],
): boolean {
  return NOTIFICATION_EVENTS.every(
    (event) => !preferenceForEvent(preferences, event).inApp,
  );
}
