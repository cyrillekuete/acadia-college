import { describe, expect, it, vi } from 'vitest';
import { checkMatriculeAvailable } from '@/lib/acadia/registry-lookups';

function createSupabaseMock(options: {
  profileHit?: boolean;
  legacyHit?: boolean;
}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };

  chain.maybeSingle
    .mockResolvedValueOnce({
      data: options.profileHit ? { id: 'profile-1' } : null,
    })
    .mockResolvedValueOnce({
      data: options.legacyHit ? { id: 'legacy-1' } : null,
    });

  return {
    from: vi.fn().mockReturnValue(chain),
    chain,
  };
}

describe('checkMatriculeAvailable', () => {
  it('allows empty matricule without querying', async () => {
    const supabase = createSupabaseMock({});
    const result = await checkMatriculeAvailable(
      supabase as never,
      'tenant-1',
      '   ',
    );
    expect(result).toEqual({ ok: true });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('rejects duplicate matricule on StudentProfile', async () => {
    const supabase = createSupabaseMock({ profileHit: true });
    const result = await checkMatriculeAvailable(
      supabase as never,
      'tenant-1',
      'MIN-2026-001',
    );
    expect(result).toEqual({
      ok: false,
      message: 'This matricule is already in use.',
    });
  });

  it('rejects duplicate matricule on legacy students table', async () => {
    const supabase = createSupabaseMock({ legacyHit: true });
    const result = await checkMatriculeAvailable(
      supabase as never,
      'tenant-1',
      'MIN-2026-001',
    );
    expect(result).toEqual({
      ok: false,
      message: 'This matricule is already in use.',
    });
  });

  it('accepts available matricule', async () => {
    const supabase = createSupabaseMock({});
    const result = await checkMatriculeAvailable(
      supabase as never,
      'tenant-1',
      'MIN-2026-001',
    );
    expect(result).toEqual({ ok: true });
  });
});
