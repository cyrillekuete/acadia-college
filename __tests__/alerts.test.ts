import { describe, expect, it } from 'vitest';
import { getMenuForRole } from '@/config/menu.acadia';
import { alertSchema, alertGroupSchema } from '@/lib/acadia/alert-schemas';
import { ALERT_TEMPLATES, alertTemplateById } from '@/lib/acadia/alert-templates';
import {
  alertRecipientStats,
  alertScheduleIssue,
  alertTargetKey,
  alertTargetsNeedAcademicYear,
  deriveAlertStatusOnSave,
  eligibleGuardianLinks,
  filterAlertTargetsForTeacherScope,
  isAlertVisibleToGuardian,
  parseAlertTargetKey,
  parseAlertTargetKeys,
  recipientsForSendNow,
  resolveAlertRecipients,
  shouldSkipWhatsAppRecipient,
} from '@/lib/acadia/alerts';
import { notificationHref } from '@/lib/acadia/communication';
import { canBroadcastAllGuardians, canManageAlerts } from '@/lib/acadia/roles';
import { isoToLocalDateTimeInputValue } from '@/lib/acadia/dates';

describe('canManageAlerts', () => {
  it('allows admins and teachers', () => {
    expect(canManageAlerts('admin')).toBe(true);
    expect(canManageAlerts('teacher')).toBe(true);
    expect(canManageAlerts('financial-director')).toBe(true);
    expect(canBroadcastAllGuardians('admin')).toBe(true);
    expect(canBroadcastAllGuardians('teacher')).toBe(false);
  });

  it('denies students, guardians, and bursar', () => {
    expect(canManageAlerts('student')).toBe(false);
    expect(canManageAlerts('guardian')).toBe(false);
    expect(canManageAlerts('bursar')).toBe(false);
    expect(canBroadcastAllGuardians('bursar')).toBe(false);
  });
});

describe('alert targeting', () => {
  const links = [
    { guardianUserId: 'g1', studentProfileId: 's1' },
    { guardianUserId: 'g1', studentProfileId: 's2' },
    { guardianUserId: 'g2', studentProfileId: 's3' },
  ];
  const enrollments = [
    { studentProfileId: 's1', classId: 'c1' },
    { studentProfileId: 's2', classId: 'c1' },
    { studentProfileId: 's3', classId: 'c2' },
  ];
  const groupMembers = [{ groupId: 'grp1', guardianUserId: 'g2' }];

  it('parses target keys', () => {
    expect(parseAlertTargetKey('all')).toEqual({ kind: 'all' });
    expect(parseAlertTargetKey('class:c1')).toEqual({ kind: 'class', classId: 'c1' });
    expect(parseAlertTargetKey('group:grp1')).toEqual({ kind: 'group', groupId: 'grp1' });
    expect(parseAlertTargetKey('nope')).toBeNull();
    expect(alertTargetKey({ kind: 'class', classId: 'c1' })).toBe('class:c1');
  });

  it('dedupes a guardian with two children in the same class', () => {
    const recipients = resolveAlertRecipients(
      [{ kind: 'class', classId: 'c1' }],
      links,
      enrollments,
      groupMembers,
    );
    expect(recipients).toEqual([
      { guardianUserId: 'g1', studentProfileIds: ['s1', 's2'] },
    ]);
  });

  it('resolves all guardians and custom groups', () => {
    expect(
      resolveAlertRecipients([{ kind: 'all' }], links, enrollments, groupMembers),
    ).toHaveLength(2);
    expect(
      resolveAlertRecipients([{ kind: 'group', groupId: 'grp1' }], links, enrollments, groupMembers),
    ).toEqual([{ guardianUserId: 'g2', studentProfileIds: ['s3'] }]);
  });

  it('returns an empty list when no targets are selected', () => {
    expect(resolveAlertRecipients([], links, enrollments, groupMembers)).toEqual([]);
    expect(parseAlertTargetKeys(['all', 'all', 'class:c1'])).toEqual([
      { kind: 'all' },
      { kind: 'class', classId: 'c1' },
    ]);
  });
});

describe('alert lifecycle and schemas', () => {
  it('sends immediately or schedules a future time', () => {
    expect(deriveAlertStatusOnSave({ sendNow: true, scheduledAt: '' })).toBe('SENT');
    const future = isoToLocalDateTimeInputValue(
      new Date(Date.now() + 86_400_000).toISOString(),
    );
    expect(deriveAlertStatusOnSave({ sendNow: false, scheduledAt: future })).toBe(
      'SCHEDULED',
    );
    expect(deriveAlertStatusOnSave({ sendNow: false, scheduledAt: '' })).toBe('DRAFT');
  });

  it('rejects past and incomplete schedules', () => {
    expect(alertScheduleIssue({ sendNow: true, scheduledAt: '' })).toBeNull();
    expect(alertScheduleIssue({ sendNow: false, scheduledAt: '' })).toBe(
      'validation.publishOrSchedule',
    );
    expect(alertScheduleIssue({ sendNow: false, scheduledAt: '2026-05-19' })).toBe(
      'validation.scheduleDateAndTime',
    );
    const past = isoToLocalDateTimeInputValue(
      new Date(Date.now() - 86_400_000).toISOString(),
    );
    expect(alertScheduleIssue({ sendNow: false, scheduledAt: past })).toBe(
      'validation.scheduleInFuture',
    );
    expect(
      alertSchema.safeParse({
        titleEn: 'Fee reminder',
        titleFr: 'Rappel de frais',
        priority: 'high',
        channel: 'email',
        targetKeys: ['all'],
        sendNow: true,
      }).success,
    ).toBe(false);
  });

  it('counts read and unread recipients', () => {
    expect(
      alertRecipientStats([{ readAt: '2026-01-01' }, { readAt: null }, {}]),
    ).toEqual({ total: 3, read: 1, unread: 2 });
  });

  it('requires a target and bilingual titles', () => {
    expect(
      alertSchema.safeParse({
        titleEn: 'Fee reminder',
        titleFr: 'Rappel de frais',
        priority: 'high',
        channel: 'in_app',
        targetKeys: ['all'],
        sendNow: true,
      }).success,
    ).toBe(true);
    expect(
      alertSchema.safeParse({
        titleEn: 'Fee reminder',
        titleFr: 'Rappel de frais',
        priority: 'high',
        channel: 'in_app',
        targetKeys: [],
        sendNow: true,
      }).success,
    ).toBe(false);
  });

  it('requires at least one guardian in a custom group', () => {
    expect(
      alertGroupSchema.safeParse({
        name: 'Form 5 parents',
        guardianUserIds: ['g1'],
      }).success,
    ).toBe(true);
    expect(
      alertGroupSchema.safeParse({
        name: 'Form 5 parents',
        guardianUserIds: [],
      }).success,
    ).toBe(false);
  });
});

describe('alert templates and menu', () => {
  it('ships the five Pison-style templates', () => {
    expect(ALERT_TEMPLATES).toHaveLength(5);
    expect(alertTemplateById('fee-reminder')?.category).toBe('financial');
    expect(alertTemplateById('missing')).toBeNull();
  });

  it('adds announcements for staff and guardians, not students', () => {
    const adminAnnouncements = getMenuForRole('admin').find(
      (item) => item.titleKey === 'nav.announcements',
    );
    expect(adminAnnouncements?.path).toBe('/announcements');
    expect(adminAnnouncements?.children).toBeUndefined();
    expect(getMenuForRole('admin').some((item) => item.titleKey === 'nav.alerts')).toBe(
      false,
    );
    expect(
      getMenuForRole('teacher').some((item) => item.path === '/announcements'),
    ).toBe(true);
    expect(
      getMenuForRole('guardian').some((item) => item.path === '/announcements'),
    ).toBe(true);
    expect(getMenuForRole('student').some((item) => item.path === '/announcements')).toBe(
      false,
    );
    expect(getMenuForRole('student').some((item) => item.path === '/alerts')).toBe(false);
    expect(getMenuForRole('bursar').some((item) => item.path === '/announcements')).toBe(
      false,
    );
  });

  it('links the header notification to announcements', () => {
    expect(notificationHref('alert.sent', { alertId: 'alrt-9' })).toBe('/announcements');
  });
});

describe('guardian inbox visibility', () => {
  it('shows sent alerts only', () => {
    expect(isAlertVisibleToGuardian('SENT')).toBe(true);
    expect(isAlertVisibleToGuardian('SCHEDULED')).toBe(false);
    expect(isAlertVisibleToGuardian('DRAFT')).toBe(false);
    expect(isAlertVisibleToGuardian('CANCELLED')).toBe(false);
  });
});

describe('eligibleGuardianLinks', () => {
  const links = [
    { guardianUserId: 'g1', studentProfileId: 's1' },
    { guardianUserId: 'g2', studentProfileId: 's2' },
    { guardianUserId: 'g3', studentProfileId: 's3' },
  ];

  it('excludes withdrawn students and inactive guardians from all/class targeting', () => {
    const eligible = eligibleGuardianLinks(links, {
      activeGuardianIds: new Set(['g1', 'g2']),
      enrolledStudentIds: new Set(['s1']),
      activeStudentIds: new Set(['s1', 's2']),
    });
    expect(eligible).toEqual([{ guardianUserId: 'g1', studentProfileId: 's1' }]);
  });
});

describe('send now and teacher scope', () => {
  it('never expands empty recipients to all guardians', () => {
    expect(() =>
      recipientsForSendNow({ existing: [], resolvedFromTargets: [] }),
    ).toThrow('No guardians to notify.');
    expect(
      recipientsForSendNow({
        existing: [{ guardianUserId: 'g1', studentProfileIds: ['s1'] }],
        resolvedFromTargets: [],
      }),
    ).toEqual([{ guardianUserId: 'g1', studentProfileIds: ['s1'] }]);
  });

  it('strips school-wide and out-of-scope class targets for teachers', () => {
    expect(
      filterAlertTargetsForTeacherScope(
        [{ kind: 'all' }, { kind: 'class', classId: 'c1' }, { kind: 'class', classId: 'c2' }],
        { canBroadcastAll: false, allowedClassIds: ['c1'] },
      ),
    ).toEqual([{ kind: 'class', classId: 'c1' }]);
    expect(alertTargetsNeedAcademicYear([{ kind: 'group', groupId: 'g1' }])).toBe(false);
    expect(alertTargetsNeedAcademicYear([{ kind: 'class', classId: 'c1' }])).toBe(true);
  });
});

describe('WhatsApp skip', () => {
  it('skips recipients already marked sent, delivered, or read', () => {
    expect(shouldSkipWhatsAppRecipient('sent')).toBe(true);
    expect(shouldSkipWhatsAppRecipient('delivered')).toBe(true);
    expect(shouldSkipWhatsAppRecipient('read')).toBe(true);
    expect(shouldSkipWhatsAppRecipient('failed')).toBe(false);
    expect(shouldSkipWhatsAppRecipient(null)).toBe(false);
  });
});
