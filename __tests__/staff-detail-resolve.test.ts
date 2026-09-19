import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveStaffProfileId } from '@/lib/supabase/queries/staff-detail';

type StaffRow = {
  id: string;
  userId: string;
  staffCode: string | null;
  isActive: boolean;
  createdAt: string;
};

function mockClient(rows: StaffRow[]): SupabaseClient {
  return {
    from() {
      return {
        select() {
          const filters: Record<string, string> = {};
          let limitCount: number | null = null;
          const orderSpecs: Array<{ column: string; ascending: boolean }> = [];

          const builder = {
            eq(column: string, value: unknown) {
              filters[column] = String(value);
              return builder;
            },
            order(column: string, opts?: { ascending?: boolean }) {
              orderSpecs.push({
                column,
                ascending: opts?.ascending !== false,
              });
              return builder;
            },
            limit(n: number) {
              limitCount = n;
              return builder;
            },
            async maybeSingle() {
              let matched = rows.filter((row) => {
                if (filters.tenantId && filters.tenantId !== 'tenant-1') {
                  return false;
                }
                if (filters.id && row.id !== filters.id) {
                  return false;
                }
                if (filters.userId && row.userId !== filters.userId) {
                  return false;
                }
                if (filters.staffCode && row.staffCode !== filters.staffCode) {
                  return false;
                }
                return (
                  Boolean(filters.id) ||
                  Boolean(filters.userId) ||
                  Boolean(filters.staffCode)
                );
              });

              for (const spec of [...orderSpecs].reverse()) {
                matched = [...matched].sort((a, b) => {
                  const av = a[spec.column as keyof StaffRow];
                  const bv = b[spec.column as keyof StaffRow];
                  if (av === bv) return 0;
                  if (typeof av === 'boolean' && typeof bv === 'boolean') {
                    const cmp = Number(av) - Number(bv);
                    return spec.ascending ? cmp : -cmp;
                  }
                  const cmp = String(av).localeCompare(String(bv));
                  return spec.ascending ? cmp : -cmp;
                });
              }

              if (limitCount != null) {
                matched = matched.slice(0, limitCount);
              }

              if (matched.length > 1) {
                return {
                  data: null,
                  error: { message: 'multiple rows', code: 'PGRST116' },
                };
              }

              const row = matched[0] ?? null;
              return {
                data: row ? { id: row.id } : null,
                error: null,
              };
            },
          };

          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe('resolveStaffProfileId', () => {
  const rows: StaffRow[] = [
    {
      id: 'profile-1',
      userId: 'user-1',
      staffCode: 'TCH-001',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'profile-2',
      userId: 'user-2',
      staffCode: 'TCH-002',
      isActive: false,
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ];

  it('resolves by StaffProfile.id', async () => {
    const result = await resolveStaffProfileId(
      mockClient(rows),
      'tenant-1',
      'profile-1',
    );
    expect(result).toBe('profile-1');
  });

  it('falls back to userId when id does not match', async () => {
    const result = await resolveStaffProfileId(
      mockClient(rows),
      'tenant-1',
      'user-2',
    );
    expect(result).toBe('profile-2');
  });

  it('falls back to staffCode when id and userId do not match', async () => {
    const result = await resolveStaffProfileId(
      mockClient(rows),
      'tenant-1',
      'TCH-001',
    );
    expect(result).toBe('profile-1');
  });

  it('returns null when no identifier matches', async () => {
    const result = await resolveStaffProfileId(
      mockClient(rows),
      'tenant-1',
      'missing-id',
    );
    expect(result).toBeNull();
  });

  it('returns null for blank identifiers', async () => {
    const result = await resolveStaffProfileId(
      mockClient(rows),
      'tenant-1',
      '   ',
    );
    expect(result).toBeNull();
  });

  it('prefers the active profile when multiple share a userId', async () => {
    const multi: StaffRow[] = [
      {
        id: 'inactive-profile',
        userId: 'shared-user',
        staffCode: 'OLD',
        isActive: false,
        createdAt: '2026-03-01T00:00:00.000Z',
      },
      {
        id: 'active-profile',
        userId: 'shared-user',
        staffCode: 'NEW',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const result = await resolveStaffProfileId(
      mockClient(multi),
      'tenant-1',
      'shared-user',
    );
    expect(result).toBe('active-profile');
  });
});
