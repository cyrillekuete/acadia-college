import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getSignedInChangePasswordSchema } from '@/app/(auth)/forms/change-password-schema';
import { resolveFileTypeIcon } from '@/lib/acadia/file-type-icon';
import { notificationHref, preferenceForEvent } from '@/lib/acadia/communication';
import {
  mapUserRecentUploadRow,
  type UserRecentUploadRow,
} from '@/lib/supabase/queries/user-uploads';
import { resolveUserAvatarUrl, TENANT_ASSETS_BUCKET } from '@/lib/supabase/storage';

vi.mock('@/lib/supabase/env', () => ({
  getSupabaseEnvOrNull: () => ({
    url: 'https://proj.supabase.co',
    key: 'anon',
  }),
}));

describe('resolveFileTypeIcon', () => {
  it('maps common extensions', () => {
    expect(resolveFileTypeIcon('notes.pdf', null)).toBe('pdf.svg');
    expect(resolveFileTypeIcon('report.docx', null)).toBe('doc.svg');
    expect(resolveFileTypeIcon('bundle.zip', null)).toBe('zip.svg');
  });

  it('falls back to mime type then default icon', () => {
    expect(resolveFileTypeIcon(null, 'application/pdf')).toBe('pdf.svg');
    expect(resolveFileTypeIcon('unknown-file', 'application/octet-stream')).toBe(
      'text.svg',
    );
  });
});

describe('mapUserRecentUploadRow', () => {
  it('builds display fields from storage key and resolver', () => {
    const row: UserRecentUploadRow = {
      id: 'lm-1',
      titleEn: 'Term notes',
      titleFr: null,
      storageKey: 'tenant-1/materials/lm-1/notes.pdf',
      externalUrl: null,
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
      createdAt: '2026-05-23T12:00:00.000Z',
    };

    const item = mapUserRecentUploadRow(row, (key) =>
      key === row.storageKey ? 'https://cdn.test/notes.pdf' : null,
    );

    expect(item).toEqual({
      id: 'lm-1',
      title: 'Term notes',
      fileName: 'notes.pdf',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
      createdAt: '2026-05-23T12:00:00.000Z',
      href: 'https://cdn.test/notes.pdf',
    });
  });

  it('uses external URL when no storage key exists', () => {
    const row: UserRecentUploadRow = {
      id: 'lm-2',
      titleEn: 'Video link',
      titleFr: null,
      storageKey: null,
      externalUrl: 'https://example.com/video',
      fileSizeBytes: null,
      mimeType: null,
      createdAt: '2026-05-23T12:00:00.000Z',
    };

    const item = mapUserRecentUploadRow(row, () => null);
    expect(item.href).toBe('https://example.com/video');
    expect(item.fileName).toBeNull();
  });
});

describe('resolveUserAvatarUrl', () => {
  it('leaves public URLs and site paths unchanged', () => {
    expect(resolveUserAvatarUrl('https://cdn.test/a.png')).toBe(
      'https://cdn.test/a.png',
    );
    expect(resolveUserAvatarUrl('/media/avatars/300-2.png')).toBe(
      '/media/avatars/300-2.png',
    );
  });

  it('resolves tenant-assets storage keys to public URLs', () => {
    const key = 'tenant-1/users/user-1/avatar.png';
    expect(resolveUserAvatarUrl(key)).toBe(
      `https://proj.supabase.co/storage/v1/object/public/${TENANT_ASSETS_BUCKET}/${key}`,
    );
  });
});

describe('live My Account pages', () => {
  it('does not mount demo profile widgets', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'app/(protected)/account/home/user-profile/content.tsx',
      ),
      'utf8',
    );
    expect(source).not.toContain('CommunityBadges');
    expect(source).not.toContain('jasontt@studio.co');
    expect(source).not.toContain('Start Now');
    expect(source).toContain('AccountProfile');
  });

  it('requires the current password on the signed-in change schema', () => {
    const schema = getSignedInChangePasswordSchema();
    expect(
      schema.safeParse({
        newPassword: 'Password1!',
        confirmPassword: 'Password1!',
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        currentPassword: 'OldPassword1!',
        newPassword: 'Password1!',
        confirmPassword: 'Password1!',
      }).success,
    ).toBe(true);
  });

  it('blocks protected, mismatched, and last-admin self-delete', () => {
    const del = readFileSync(
      join(process.cwd(), 'app/api/acadia/account/delete/route.ts'),
      'utf8',
    );
    expect(del).toContain("status: 403");
    expect(del).toContain('Protected accounts cannot be deleted.');
    expect(del).toContain('Confirmation email does not match your account.');
    expect(del).toContain('status: 400');
    expect(del).toContain('LAST_ACTIVE_MANAGER_DELETE_MESSAGE');
    expect(del).toContain('status: 409');
  });

  it('defaults missing notification rows to on and routes fees by role', () => {
    expect(preferenceForEvent([], 'fees.overdue')).toEqual({
      inApp: true,
      email: true,
    });
    expect(notificationHref('fees.overdue', null, 'teacher')).toBe(
      '/finance/fees',
    );
    expect(notificationHref('fees.overdue', null, 'student')).toBe(
      '/finance/my-fees',
    );
  });

  it('replaces the API keys demo page with the tenant list', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/(protected)/account/api-keys/content.tsx'),
      'utf8',
    );
    expect(source).toContain('TenantApiKeysList');
    expect(source).not.toContain('ExternalServicesManageApi');
    expect(source).not.toContain('Webhooks');
  });

  it('strips Slack and mobile placeholders from notifications', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'app/(protected)/account/notifications/content.tsx',
      ),
      'utf8',
    );
    expect(source).not.toContain('slack');
    expect(source).not.toContain('Faq');
    expect(source).not.toContain('Engage');
    expect(source).toContain('whatsappChannelNote');
  });

  it('keeps institution edits open until mutateAsync succeeds', () => {
    const dialog = readFileSync(
      join(
        process.cwd(),
        'components/acadia/account/editable-settings-card.tsx',
      ),
      'utf8',
    );
    expect(dialog).toContain('await onSave');
    const cards = readFileSync(
      join(
        process.cwd(),
        'components/acadia/account/tenant-institution-cards.tsx',
      ),
      'utf8',
    );
    expect(cards).toContain('mutateAsync');
    expect(cards).not.toContain('logoStorageKey');
  });
});
