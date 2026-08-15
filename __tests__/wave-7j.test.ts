/**
 * Wave 7J unit tests
 * Covers: messaging helpers, notification preferences, announcement lifecycle
 */
import { describe, it, expect } from 'vitest';
import {
  announcementNotificationEvent,
  areAllInAppNotificationsPaused,
  deriveAnnouncementStatusOnSave,
  filterUsersByAnnouncementAudience,
  isAnnouncementVisible,
  isNotificationChannelEnabled,
  notificationEventLabel,
  notificationHref,
  preferenceForEvent,
  resolveAnnouncementLifecycleStatus,
  shouldDeliverInAppNotification,
  threadSubjectDisplay,
} from '@/lib/acadia/communication';
import {
  isoToLocalDateTimeInputValue,
  localDateTimeInputToIso,
} from '@/lib/acadia/dates';
import {
  announcementSchema,
  directMessageSchema,
  groupThreadSchema,
  messageReplySchema,
  notificationPreferenceSchema,
} from '@/lib/acadia/communication-schemas';

describe('threadSubjectDisplay', () => {
  it('prefers English subject then French fallback', () => {
    expect(
      threadSubjectDisplay({ subjectEn: 'Hello', subjectFr: 'Bonjour' }),
    ).toBe('Hello');
    expect(threadSubjectDisplay({ subjectFr: 'Bonjour' })).toBe('Bonjour');
    expect(threadSubjectDisplay({ kind: 'GROUP' })).toBe('Group conversation');
  });
});

describe('resolveAnnouncementLifecycleStatus', () => {
  it('promotes scheduled items when publish time has passed', () => {
    expect(
      resolveAnnouncementLifecycleStatus(
        { status: 'SCHEDULED', publishAt: '2020-01-01T00:00:00.000Z' },
        '2026-01-01T00:00:00.000Z',
      ),
    ).toBe('PUBLISHED');
  });

  it('keeps draft items as draft', () => {
    expect(
      resolveAnnouncementLifecycleStatus(
        { status: 'DRAFT', publishAt: '2030-01-01T00:00:00.000Z' },
        '2026-01-01T00:00:00.000Z',
      ),
    ).toBe('DRAFT');
  });
});

describe('isAnnouncementVisible', () => {
  it('returns true only for published announcements', () => {
    expect(
      isAnnouncementVisible({ status: 'PUBLISHED', publishedAt: '2026-01-01' }),
    ).toBe(true);
    expect(
      isAnnouncementVisible({ status: 'DRAFT', publishAt: '2030-01-01' }),
    ).toBe(false);
  });
});

describe('deriveAnnouncementStatusOnSave', () => {
  it('marks publish now as published', () => {
    expect(
      deriveAnnouncementStatusOnSave({ publishNow: true, publishAt: '' }),
    ).toBe('PUBLISHED');
  });

  it('schedules future publish dates', () => {
    const futureDate = new Date(Date.now() + 86_400_000);
    const future = isoToLocalDateTimeInputValue(futureDate.toISOString());
    expect(
      deriveAnnouncementStatusOnSave({ publishNow: false, publishAt: future }),
    ).toBe('SCHEDULED');
  });
});

describe('localDateTimeInputToIso', () => {
  it('interprets datetime-local as local wall time, not UTC', () => {
    const offsetMinutes = new Date(2026, 4, 19, 12, 0, 0).getTimezoneOffset();
    const iso = localDateTimeInputToIso('2026-05-19T07:30');
    expect(iso).not.toBeNull();
    const parsed = new Date(iso!);
    expect(parsed.getHours()).toBe(7);
    expect(parsed.getMinutes()).toBe(30);
    expect(parsed.getTimezoneOffset()).toBe(offsetMinutes);
  });

  it('round-trips through isoToLocalDateTimeInputValue', () => {
    const iso = localDateTimeInputToIso('2026-05-19T07:30')!;
    expect(isoToLocalDateTimeInputValue(iso)).toBe('2026-05-19T07:30');
  });

  it('does not shift when loading UTC ISO into datetime-local', () => {
    const stored = localDateTimeInputToIso('2026-05-19T07:30')!;
    expect(isoToLocalDateTimeInputValue(stored)).toBe('2026-05-19T07:30');
    expect(stored.slice(0, 16)).not.toBe('2026-05-19T07:30');
  });
});

describe('filterUsersByAnnouncementAudience', () => {
  const users = [
    { id: '1', roleSlug: 'teacher' },
    { id: '2', roleSlug: 'student' },
    { id: '3', roleSlug: 'guardian' },
  ];

  it('filters staff audience', () => {
    const result = filterUsersByAnnouncementAudience(users, 'STAFF');
    expect(result.map((u) => u.id)).toEqual(['1']);
  });

  it('returns everyone for ALL', () => {
    expect(filterUsersByAnnouncementAudience(users, 'ALL')).toHaveLength(3);
  });
});

describe('shouldDeliverInAppNotification', () => {
  it('defaults to true when preference missing', () => {
    expect(shouldDeliverInAppNotification(new Map(), 'u1', 'message.received')).toBe(
      true,
    );
  });

  it('respects explicit opt-out', () => {
    const prefs = new Map([['u1', { inApp: false }]]);
    expect(
      shouldDeliverInAppNotification(prefs, 'u1', 'message.received'),
    ).toBe(false);
  });
});

describe('announcementNotificationEvent', () => {
  it('maps kinds to notification events', () => {
    expect(announcementNotificationEvent('BROADCAST')).toBe('announcement.broadcast');
    expect(announcementNotificationEvent('EVENT')).toBe('announcement.event');
  });
});

describe('communication schemas', () => {
  it('validates direct message compose', () => {
    const parsed = directMessageSchema.parse({
      recipientUserId: 'user-1',
      subjectEn: 'Hello',
      body: 'Message body',
    });
    expect(parsed.subjectEn).toBe('Hello');
  });

  it('validates group thread with members', () => {
    const parsed = groupThreadSchema.parse({
      subjectEn: 'Parents meeting',
      groupScope: 'LEVEL',
      groupScopeId: 'lvl-1',
      memberUserIds: ['user-1', 'user-2'],
      body: 'Please join',
    });
    expect(parsed.memberUserIds).toHaveLength(2);
  });

  it('validates message reply', () => {
    expect(messageReplySchema.parse({ body: 'Thanks' }).body).toBe('Thanks');
  });

  it('validates notification preference', () => {
    const parsed = notificationPreferenceSchema.parse({
      event: 'attendance.absence',
      inApp: true,
      email: false,
    });
    expect(parsed.email).toBe(false);
  });

  it('requires event start for event announcements', () => {
    const result = announcementSchema.safeParse({
      kind: 'EVENT',
      titleEn: 'Sports day',
      titleFr: 'Journée sportive',
      audience: 'ALL',
      publishNow: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('notificationEventLabel', () => {
  it('returns English and French labels', () => {
    expect(notificationEventLabel('attendance.absence')).toBe(
      'Absence / late alerts',
    );
    expect(notificationEventLabel('attendance.absence', 'fr')).toBe(
      'Alertes d’absence / retard',
    );
  });

  it('falls back to the event key', () => {
    expect(notificationEventLabel('unknown.event')).toBe('unknown.event');
  });
});

describe('notificationHref', () => {
  it('uses a message thread id when present', () => {
    expect(notificationHref('message.received', { threadId: 'mth-1' })).toBe(
      '/messages/mth-1',
    );
    expect(notificationHref('message.received')).toBe('/messages');
  });

  it('maps school events to existing routes', () => {
    expect(notificationHref('announcement.broadcast')).toBe('/announcements');
    expect(notificationHref('announcement.event')).toBe('/announcements');
    expect(notificationHref('attendance.absence')).toBe('/attendance');
    expect(notificationHref('marks.published')).toBe('/marks');
    expect(notificationHref('fees.overdue')).toBe('/finance/fees');
    expect(notificationHref('unknown.event')).toBe('/account/notifications');
  });
});

describe('preference helpers', () => {
  it('defaults missing rows to on', () => {
    expect(preferenceForEvent([], 'message.received')).toEqual({
      inApp: true,
      email: true,
    });
    expect(isNotificationChannelEnabled([], 'email')).toBe(true);
    expect(areAllInAppNotificationsPaused([])).toBe(false);
  });

  it('treats a channel as enabled only when every event is on', () => {
    const prefs = [
      { event: 'attendance.absence', inApp: true, email: false },
    ];
    expect(isNotificationChannelEnabled(prefs, 'email')).toBe(false);
    expect(isNotificationChannelEnabled(prefs, 'inApp')).toBe(true);
  });

  it('detects a full in-app pause', () => {
    const prefs = [
      { event: 'attendance.absence', inApp: false, email: true },
      { event: 'announcement.broadcast', inApp: false, email: true },
      { event: 'announcement.event', inApp: false, email: true },
      { event: 'message.received', inApp: false, email: true },
      { event: 'marks.published', inApp: false, email: true },
      { event: 'fees.overdue', inApp: false, email: true },
    ];
    expect(areAllInAppNotificationsPaused(prefs)).toBe(true);
  });
});
