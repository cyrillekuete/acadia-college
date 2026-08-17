import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  acadiaEmailVerifiedAt,
  isAcadiaEmailVerified,
} from '@/lib/acadia/email-verified';
import { normalizeSignInError } from '@/lib/auth/sign-in-errors';

describe('isAcadiaEmailVerified', () => {
  it('treats every email as verified', () => {
    expect(isAcadiaEmailVerified()).toBe(true);
    expect(isAcadiaEmailVerified(null)).toBe(true);
    expect(isAcadiaEmailVerified(false)).toBe(true);
    expect(isAcadiaEmailVerified('2026-08-17T00:00:00.000Z')).toBe(true);
  });

  it('writes a timestamp for new User rows', () => {
    expect(acadiaEmailVerifiedAt('2026-08-17T00:00:00.000Z')).toBe(
      '2026-08-17T00:00:00.000Z',
    );
    expect(acadiaEmailVerifiedAt(new Date('2026-08-17T00:00:00.000Z'))).toBe(
      '2026-08-17T00:00:00.000Z',
    );
  });
});

describe('email confirmation policy', () => {
  it('does not ask users to confirm email on sign-in', () => {
    expect(normalizeSignInError(new Error('Email not confirmed'))).not.toContain(
      'confirm your email',
    );
  });

  it('disables confirmations in local Auth config', () => {
    const config = readFileSync(
      join(process.cwd(), 'supabase/config.toml'),
      'utf8',
    );
    expect(config).toMatch(/enable_confirmations\s*=\s*false/);
    expect(config).toMatch(/double_confirm_changes\s*=\s*false/);
  });

  it('creates Auth users already confirmed', () => {
    const files = [
      'lib/acadia/provision-accounts.ts',
      'lib/acadia/provision-staff.ts',
      'app/api/acadia/admin/users/route.ts',
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source).toMatch(/email_confirm:\s*true/);
    }
  });
});
