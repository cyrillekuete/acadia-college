import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALERT_CHANNELS } from '@/lib/acadia/alerts';
import { alertSchema } from '@/lib/acadia/alert-schemas';
import {
  pickGuardianRoleId,
  buildGuardianUserInsert,
  buildGuardianStudentLinkInsert,
} from '@/lib/acadia/provision-guardian';
import {
  buildWhatsAppTemplatePayload,
  parseWhatsAppWebhookPayload,
  sanitizeWhatsAppTemplateParam,
  verifyWhatsAppWebhookSignature,
  whatsappTemplateLanguage,
  WHATSAPP_TEMPLATE_PARAM_MAX,
} from '@/lib/acadia/whatsapp';
import { canSendWhatsAppMessages } from '@/lib/acadia/roles';
import {
  assertWhatsAppMessageDispatch,
  parseWhatsAppLanguage,
} from '@/lib/acadia/whatsapp-dispatch';
import { formatWhatsAppSendToast } from '@/lib/acadia/whatsapp-types';

describe('ALERT_CHANNELS', () => {
  it('includes whatsapp as a first-class channel', () => {
    expect(ALERT_CHANNELS).toContain('whatsapp');
    expect(
      alertSchema.safeParse({
        titleEn: 'Meeting',
        titleFr: 'Réunion',
        priority: 'normal',
        channel: 'whatsapp',
        targetKeys: ['all'],
        sendNow: true,
      }).success,
    ).toBe(true);
  });
});

describe('WhatsApp template payload', () => {
  it('uses title and truncated body with locale language', () => {
    const payload = buildWhatsAppTemplatePayload({
      to: '237677123456',
      templateName: 'acadia_school_notice',
      language: 'fr',
      title: '  Meeting  ',
      body: 'Please attend.\nTomorrow.',
    });
    expect(payload.to).toBe('237677123456');
    expect(payload.template.name).toBe('acadia_school_notice');
    expect(payload.template.language.code).toBe('fr');
    expect(payload.template.components[0]?.parameters).toEqual([
      { type: 'text', text: 'Meeting' },
      { type: 'text', text: 'Please attend. Tomorrow.' },
    ]);
    expect(whatsappTemplateLanguage('en')).toBe('en');
    expect(whatsappTemplateLanguage('fr')).toBe('fr');
    expect(parseWhatsAppLanguage('fr')).toBe('fr');
    expect(parseWhatsAppLanguage('de')).toBe('en');
  });

  it('falls back empty params and truncates long body', () => {
    expect(sanitizeWhatsAppTemplateParam('   ')).toBe('.');
    const long = 'x'.repeat(WHATSAPP_TEMPLATE_PARAM_MAX + 40);
    const sanitized = sanitizeWhatsAppTemplateParam(long);
    expect(sanitized.length).toBe(WHATSAPP_TEMPLATE_PARAM_MAX);
    expect(sanitized.endsWith('…')).toBe(true);
  });
});

describe('WhatsApp webhook', () => {
  const secret = 'test-app-secret';
  const body = '{"object":"whatsapp_business_account"}';

  it('accepts a valid sha256 signature', () => {
    const digest = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWhatsAppWebhookSignature(body, `sha256=${digest}`, secret)).toBe(
      true,
    );
  });

  it('rejects an invalid secret', () => {
    const digest = createHmac('sha256', secret).update(body).digest('hex');
    expect(
      verifyWhatsAppWebhookSignature(body, `sha256=${digest}`, 'wrong-secret'),
    ).toBe(false);
    expect(verifyWhatsAppWebhookSignature(body, 'sha256=deadbeef', secret)).toBe(
      false,
    );
    expect(verifyWhatsAppWebhookSignature(body, null, secret)).toBe(false);
  });

  it('parses delivery statuses from Graph payloads', () => {
    expect(
      parseWhatsAppWebhookPayload({
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    { id: 'wamid.1', status: 'delivered' },
                    {
                      id: 'wamid.2',
                      status: 'failed',
                      errors: [{ title: 'Undeliverable' }],
                    },
                    { id: 'wamid.3', status: 'unknown' },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { messageId: 'wamid.1', status: 'delivered' },
      { messageId: 'wamid.2', status: 'failed', error: 'Undeliverable' },
    ]);
  });
});

describe('provision guardian helpers', () => {
  it('prefers parent over guardian role ids', () => {
    expect(
      pickGuardianRoleId([
        { id: 'g', slug: 'guardian' },
        { id: 'p', slug: 'parent' },
      ]),
    ).toBe('p');
    expect(pickGuardianRoleId([{ id: 'g', slug: 'guardian' }])).toBe('g');
    expect(pickGuardianRoleId([])).toBeNull();
  });

  it('builds PascalCase User and GuardianStudentLink rows', () => {
    const user = buildGuardianUserInsert({
      parentAuthId: 'parent-1',
      email: 'Parent@School.cm',
      name: 'Ada Parent',
      roleId: 'role-parent',
      tenantId: 'tenant-1',
      actorUserId: 'admin-1',
      now: '2026-08-17T00:00:00.000Z',
    });
    expect(user).toMatchObject({
      id: 'parent-1',
      email: 'parent@school.cm',
      name: 'Ada Parent',
      roleId: 'role-parent',
      tenantId: 'tenant-1',
      status: 'ACTIVE',
    });

    const link = buildGuardianStudentLinkInsert({
      tenantId: 'tenant-1',
      parentAuthId: 'parent-1',
      studentProfileId: 'student-1',
      relationshipLabel: 'mother',
      now: '2026-08-17T00:00:00.000Z',
    });
    expect(link.guardianUserId).toBe('parent-1');
    expect(link.studentProfileId).toBe('student-1');
    expect(link.relationshipLabel).toBe('mother');
    expect(link.id.startsWith('gsl-')).toBe(true);
  });

  it('links parents during student provisioning', () => {
    const source = readFileSync(
      join(process.cwd(), 'lib/acadia/provision-accounts.ts'),
      'utf8',
    );
    expect(source).toMatch(/provisionGuardianProfileAndLink/);
  });
});

describe('WhatsApp send toast', () => {
  it('summarizes sent, skipped, and failed counts', () => {
    expect(formatWhatsAppSendToast({ sent: 4, failed: 1, skipped: 2 })).toBe(
      'Sent to 4 parent(s) on WhatsApp. 2 had no number. 1 failed.',
    );
  });
});

describe('canSendWhatsAppMessages', () => {
  it('allows staff and administrators only', () => {
    expect(canSendWhatsAppMessages('admin')).toBe(true);
    expect(canSendWhatsAppMessages('teacher')).toBe(true);
    expect(canSendWhatsAppMessages('bursar')).toBe(true);
    expect(canSendWhatsAppMessages('student')).toBe(false);
    expect(canSendWhatsAppMessages('guardian')).toBe(false);
    expect(canSendWhatsAppMessages('parent')).toBe(false);
  });

  it('gates the 1:1 WhatsApp API on staff permission', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/api/acadia/whatsapp/messages/route.ts'),
      'utf8',
    );
    expect(source).toMatch(/canSendWhatsAppMessages/);
    expect(source).toMatch(/status: 403/);
  });
});

describe('assertWhatsAppMessageDispatch', () => {
  const allowed = {
    actorUserId: 'staff-1',
    senderUserId: 'staff-1',
    recipientIsGuardian: true,
    recipientIsThreadMember: true,
  };

  it('allows the sender to WhatsApp a parent in the thread', () => {
    expect(() => assertWhatsAppMessageDispatch(allowed)).not.toThrow();
  });

  it('rejects sending for someone else\'s message', () => {
    expect(() =>
      assertWhatsAppMessageDispatch({ ...allowed, actorUserId: 'student-1' }),
    ).toThrow('You can only send WhatsApp for your own messages.');
  });

  it('rejects non-parent recipients', () => {
    expect(() =>
      assertWhatsAppMessageDispatch({ ...allowed, recipientIsGuardian: false }),
    ).toThrow('WhatsApp can only be sent to parents.');
  });

  it('rejects a parent who is not in the conversation', () => {
    expect(() =>
      assertWhatsAppMessageDispatch({
        ...allowed,
        recipientIsThreadMember: false,
      }),
    ).toThrow('Recipient is not in this conversation.');
  });
});
