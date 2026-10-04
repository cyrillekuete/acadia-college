import { describe, expect, it } from 'vitest';
import {
  buildSystemLoginEmail,
  buildSystemLoginEmailLocalPart,
  resolveContactOrSystemLoginEmail,
  resolveSystemLoginEmail,
} from '@/lib/acadia/system-login-email';

describe('system login email generation', () => {
  it('uses first and final names and normalizes accents and punctuation', () => {
    expect(buildSystemLoginEmail('  Jean-Pierre Émile O’Connor  ')).toBe(
      'jean.pierre.o.connor@acadia.com',
    );
  });

  it('uses the only available name and falls back for empty names', () => {
    expect(buildSystemLoginEmailLocalPart('Sophie')).toBe('sophie');
    expect(buildSystemLoginEmailLocalPart('')).toBe('user');
  });

  it('uses numeric suffixes to find an unused email', async () => {
    const taken = new Set([
      'ada.lovelace@acadia.com',
      'ada.lovelace.2@acadia.com',
    ]);

    await expect(
      resolveSystemLoginEmail('Ada Lovelace', async (email) =>
        taken.has(email),
      ),
    ).resolves.toBe('ada.lovelace.3@acadia.com');
  });

  it('keeps supplied contact emails and generates an email when blank', async () => {
    const isTaken = async () => false;
    await expect(
      resolveContactOrSystemLoginEmail(
        ' Family@Example.org ',
        'Ada Lovelace',
        isTaken,
      ),
    ).resolves.toBe('family@example.org');
    await expect(
      resolveContactOrSystemLoginEmail('', 'Ada Lovelace', isTaken),
    ).resolves.toBe('ada.lovelace@acadia.com');
  });
});
