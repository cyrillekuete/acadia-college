import { describe, expect, it } from 'vitest';
import { resolveStaffRoleId } from '@/lib/acadia/provision-staff';
import type { SupabaseClient } from '@supabase/supabase-js';

function mockClient(rows: Array<{ id: string; slug: string }>): SupabaseClient {
  return {
    from() {
      return {
        select() {
          return {
            eq(column: string, value: unknown) {
              if (column === 'id') {
                const row = rows.find((r) => r.id === value) ?? null;
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({ data: row, error: null }),
                    };
                  },
                };
              }

              return {
                in: async () => ({
                  data: rows.filter((r) =>
                    ['teacher', 'lecturer', 'staff'].includes(r.slug),
                  ),
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe('resolveStaffRoleId', () => {
  it('rejects preferred roles outside the staff allowlist', async () => {
    const result = await resolveStaffRoleId(
      mockClient([{ id: 'role-admin', slug: 'admin' }]),
      'role-admin',
    );
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('accepts a preferred teacher role id', async () => {
    const result = await resolveStaffRoleId(
      mockClient([{ id: 'role-teacher', slug: 'teacher' }]),
      'role-teacher',
    );
    expect(result).toEqual({ ok: true, roleId: 'role-teacher' });
  });

  it('falls back to the first available staff slug when no preference', async () => {
    const result = await resolveStaffRoleId(
      mockClient([
        { id: 'role-staff', slug: 'staff' },
        { id: 'role-teacher', slug: 'teacher' },
      ]),
    );
    expect(result).toEqual({ ok: true, roleId: 'role-teacher' });
  });
});
