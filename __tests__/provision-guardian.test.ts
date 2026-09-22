import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { provisionGuardianProfileAndLink } from '@/lib/acadia/provision-guardian';

type MemoryRow = Record<string, unknown>;

function createMemoryAdmin(seed?: { UserRole?: MemoryRow[] }) {
  const tables: Record<string, MemoryRow[]> = {
    UserRole: [...(seed?.UserRole ?? [])],
    User: [],
    GuardianStudentLink: [],
  };

  function from(table: string) {
    const filters: Array<(row: MemoryRow) => boolean> = [];
    let payload: MemoryRow | null = null;

    const run = () => {
      const rows = tables[table] ?? [];
      tables[table] = rows;
      if (payload) {
        rows.push(payload);
        payload = null;
        return { data: null, error: null };
      }
      return {
        data: rows.filter((row) => filters.every((predicate) => predicate(row))),
        error: null,
      };
    };

    const builder = {
      select() {
        return builder;
      },
      insert(row: MemoryRow) {
        payload = { ...row };
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in(column: string, values: readonly unknown[]) {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      or(expression: string) {
        const slugs = [...expression.matchAll(/slug\.ilike\.([a-z]+)/gi)].map(
          (match) => match[1].toLowerCase(),
        );
        if (slugs.length > 0) {
          filters.push((row) =>
            slugs.includes(String(row.slug ?? '').trim().toLowerCase()),
          );
        }
        return builder;
      },
      maybeSingle: async () => {
        const result = run();
        const data = Array.isArray(result.data) ? (result.data[0] ?? null) : null;
        return { data, error: null };
      },
      then(
        resolve: (value: { data: MemoryRow[] | null; error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(run()).then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    client: { from } as unknown as SupabaseClient,
    tables,
  };
}

const provisionInput = {
  tenantId: 'tenant-1',
  actorUserId: 'admin-1',
  parentAuthId: 'parent-auth-1',
  parentEmail: 'Parent@School.cm',
  parentName: 'Ada Parent',
  studentProfileId: 'student-1',
  relationshipLabel: 'mother',
};

describe('provisionGuardianProfileAndLink', () => {
  it('creates the parent role when the catalog has none, then links the student', async () => {
    const { client, tables } = createMemoryAdmin();

    const result = await provisionGuardianProfileAndLink(client, provisionInput);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.createdUser).toBe(true);
    expect(result.linkId.startsWith('gsl-')).toBe(true);

    expect(tables.UserRole).toHaveLength(1);
    expect(tables.UserRole[0]).toMatchObject({
      slug: 'parent',
      name: 'Parent',
      isTrashed: false,
      isProtected: true,
      isDefault: false,
    });
    expect(tables.User).toHaveLength(1);
    expect(tables.User[0]).toMatchObject({
      id: 'parent-auth-1',
      email: 'parent@school.cm',
      roleId: tables.UserRole[0]?.id,
    });
    expect(tables.GuardianStudentLink).toHaveLength(1);
    expect(tables.GuardianStudentLink[0]).toMatchObject({
      tenantId: 'tenant-1',
      guardianUserId: 'parent-auth-1',
      studentProfileId: 'student-1',
      relationshipLabel: 'mother',
    });
  });

  it('reuses a case-variant parent role instead of inserting a second one', async () => {
    const { client, tables } = createMemoryAdmin({
      UserRole: [{ id: 'role-parent', slug: 'Parent', isTrashed: false }],
    });

    const result = await provisionGuardianProfileAndLink(client, provisionInput);

    expect(result.ok).toBe(true);
    expect(tables.UserRole).toHaveLength(1);
    expect(tables.User[0]).toMatchObject({ roleId: 'role-parent' });
  });
});
