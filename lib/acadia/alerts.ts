import type { AlertFormValues } from '@/lib/acadia/alert-schemas';
import { localDateTimeInputToIso } from '@/lib/acadia/dates';
import type { UiLocale } from '@/lib/acadia/locale';

export const ALERT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type AlertPriority = (typeof ALERT_PRIORITIES)[number];

export const ALERT_CHANNELS = ['whatsapp', 'in_app', 'email', 'sms', 'both'] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

export const ALERT_STATUSES = ['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const ALERT_SENT_EVENT = 'alert.sent' as const;

export const ALL_GUARDIANS_TARGET = 'all';

export type AlertTarget =
  | { kind: 'all' }
  | { kind: 'class'; classId: string }
  | { kind: 'group'; groupId: string };

export type GuardianStudentLinkRow = {
  guardianUserId: string;
  studentProfileId: string;
};

export type EnrollmentClassRow = {
  studentProfileId: string;
  classId: string;
};

export type AlertGroupMemberRow = {
  groupId: string;
  guardianUserId: string;
};

export type ResolvedAlertRecipient = {
  guardianUserId: string;
  studentProfileIds: string[];
};

const PRIORITY_LABELS: Record<AlertPriority, { en: string; fr: string }> = {
  low: { en: 'Low', fr: 'Basse' },
  normal: { en: 'Normal', fr: 'Normale' },
  high: { en: 'High', fr: 'Haute' },
  urgent: { en: 'Urgent', fr: 'Urgente' },
};

const CHANNEL_LABELS: Record<AlertChannel, { en: string; fr: string }> = {
  whatsapp: { en: 'WhatsApp', fr: 'WhatsApp' },
  in_app: { en: 'In-app', fr: 'Dans l’application' },
  email: { en: 'Email (coming soon)', fr: 'E-mail (bientôt)' },
  sms: { en: 'SMS (coming soon)', fr: 'SMS (bientôt)' },
  both: { en: 'Email + SMS (coming soon)', fr: 'E-mail + SMS (bientôt)' },
};

const STATUS_LABELS: Record<AlertStatus, { en: string; fr: string }> = {
  DRAFT: { en: 'Draft', fr: 'Brouillon' },
  SCHEDULED: { en: 'Scheduled', fr: 'Programmé' },
  SENT: { en: 'Sent', fr: 'Envoyé' },
  CANCELLED: { en: 'Cancelled', fr: 'Annulé' },
};

export function alertPriorityLabel(
  priority: string,
  locale: UiLocale = 'en',
): string {
  const labels = PRIORITY_LABELS[priority as AlertPriority];
  if (!labels) {
    return priority;
  }
  return locale === 'fr' ? labels.fr : labels.en;
}

export function alertChannelLabel(
  channel: string,
  locale: UiLocale = 'en',
): string {
  const labels = CHANNEL_LABELS[channel as AlertChannel];
  if (!labels) {
    return channel;
  }
  return locale === 'fr' ? labels.fr : labels.en;
}

export function alertStatusLabel(status: string, locale: UiLocale = 'en'): string {
  const labels = STATUS_LABELS[status as AlertStatus];
  if (!labels) {
    return status;
  }
  return locale === 'fr' ? labels.fr : labels.en;
}

export function alertTargetKey(target: AlertTarget): string {
  if (target.kind === 'all') {
    return ALL_GUARDIANS_TARGET;
  }
  if (target.kind === 'class') {
    return `class:${target.classId}`;
  }
  return `group:${target.groupId}`;
}

export function parseAlertTargetKey(raw: string | null | undefined): AlertTarget | null {
  const key = raw?.trim() ?? '';
  if (key === ALL_GUARDIANS_TARGET) {
    return { kind: 'all' };
  }
  if (key.startsWith('class:')) {
    const classId = key.slice('class:'.length).trim();
    return classId ? { kind: 'class', classId } : null;
  }
  if (key.startsWith('group:')) {
    const groupId = key.slice('group:'.length).trim();
    return groupId ? { kind: 'group', groupId } : null;
  }
  return null;
}

export function parseAlertTargetKeys(keys: readonly string[]): AlertTarget[] {
  const seen = new Set<string>();
  const targets: AlertTarget[] = [];
  for (const key of keys) {
    const target = parseAlertTargetKey(key);
    if (!target) {
      continue;
    }
    const normalized = alertTargetKey(target);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    targets.push(target);
  }
  return targets;
}

function addRecipient(
  byGuardian: Map<string, Set<string>>,
  guardianUserId: string,
  studentProfileId?: string,
) {
  const id = guardianUserId.trim();
  if (!id) {
    return;
  }
  const students = byGuardian.get(id) ?? new Set<string>();
  const studentId = studentProfileId?.trim();
  if (studentId) {
    students.add(studentId);
  }
  byGuardian.set(id, students);
}

export function resolveAlertRecipients(
  targets: readonly AlertTarget[],
  links: readonly GuardianStudentLinkRow[],
  enrollments: readonly EnrollmentClassRow[],
  groupMembers: readonly AlertGroupMemberRow[],
): ResolvedAlertRecipient[] {
  if (targets.length === 0) {
    return [];
  }

  const byGuardian = new Map<string, Set<string>>();
  const studentsByClass = new Map<string, string[]>();
  for (const row of enrollments) {
    const classId = row.classId.trim();
    const studentId = row.studentProfileId.trim();
    if (!classId || !studentId) {
      continue;
    }
    const list = studentsByClass.get(classId) ?? [];
    list.push(studentId);
    studentsByClass.set(classId, list);
  }

  const membersByGroup = new Map<string, string[]>();
  for (const row of groupMembers) {
    const groupId = row.groupId.trim();
    const guardianId = row.guardianUserId.trim();
    if (!groupId || !guardianId) {
      continue;
    }
    const list = membersByGroup.get(groupId) ?? [];
    list.push(guardianId);
    membersByGroup.set(groupId, list);
  }

  const includeAll = targets.some((target) => target.kind === 'all');
  if (includeAll) {
    for (const link of links) {
      addRecipient(byGuardian, link.guardianUserId, link.studentProfileId);
    }
  }

  for (const target of targets) {
    if (target.kind === 'class') {
      const studentIds = new Set(studentsByClass.get(target.classId) ?? []);
      for (const link of links) {
        if (studentIds.has(link.studentProfileId)) {
          addRecipient(byGuardian, link.guardianUserId, link.studentProfileId);
        }
      }
    }
    if (target.kind === 'group') {
      for (const guardianUserId of membersByGroup.get(target.groupId) ?? []) {
        const linked = links.filter((link) => link.guardianUserId === guardianUserId);
        if (linked.length === 0) {
          addRecipient(byGuardian, guardianUserId);
          continue;
        }
        for (const link of linked) {
          addRecipient(byGuardian, guardianUserId, link.studentProfileId);
        }
      }
    }
  }

  return [...byGuardian.entries()]
    .map(([guardianUserId, students]) => ({
      guardianUserId,
      studentProfileIds: [...students],
    }))
    .sort((a, b) => a.guardianUserId.localeCompare(b.guardianUserId));
}

export function deriveAlertStatusOnSave(
  values: Pick<AlertFormValues, 'sendNow' | 'scheduledAt'>,
  nowIso = new Date().toISOString(),
): AlertStatus {
  if (values.sendNow) {
    return 'SENT';
  }
  const scheduledIso = localDateTimeInputToIso(values.scheduledAt);
  if (scheduledIso && scheduledIso > nowIso) {
    return 'SCHEDULED';
  }
  return 'DRAFT';
}

export function alertRecipientStats(
  rows: readonly { readAt?: string | null }[],
): { total: number; read: number; unread: number } {
  const total = rows.length;
  const read = rows.filter((row) => Boolean(row.readAt)).length;
  return { total, read, unread: total - read };
}

