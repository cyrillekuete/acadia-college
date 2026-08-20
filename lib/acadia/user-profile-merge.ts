import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';

type UsersTableRow = {
  id: unknown;
  email?: unknown;
  name?: unknown;
  tenant_id?: unknown;
  status?: unknown;
  role?: unknown;
  avatar_url?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

type LegacyUserRow = {
  roleId?: unknown;
  isTrashed?: unknown;
  isProtected?: unknown;
  avatar?: unknown;
  UserRole?: AcadiaUserProfile['UserRole'] | AcadiaUserProfile['UserRole'][] | null;
};

function asString(value: unknown, fallback = ''): string {
  return value != null ? String(value) : fallback;
}

function unwrapRole(
  value: LegacyUserRow['UserRole'],
): AcadiaUserProfile['UserRole'] {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    candidate &&
    typeof candidate === 'object' &&
    'slug' in candidate &&
    typeof candidate.slug === 'string'
  ) {
    return candidate;
  }
  return null;
}

/** Merge snake_case `users` with PascalCase `User` so roleId/isProtected stay real. */
export function mergeDualTableUserProfile(
  usersRow: UsersTableRow,
  legacy?: LegacyUserRow | null,
  roleBySlug?: AcadiaUserProfile['UserRole'],
): AcadiaUserProfile {
  const roleSlug = asString(usersRow.role);
  const legacyRole = unwrapRole(legacy?.UserRole ?? null);
  const role =
    roleBySlug ??
    legacyRole ??
    (roleSlug ? { slug: roleSlug, name: roleSlug } : null);
  const roleId = asString(
    legacy?.roleId ?? role?.id ?? '',
    role?.id ?? '',
  );

  return {
    id: asString(usersRow.id),
    email: asString(usersRow.email),
    name: usersRow.name != null ? String(usersRow.name) : null,
    tenantId: usersRow.tenant_id != null ? String(usersRow.tenant_id) : null,
    status: asString(usersRow.status, 'active').toUpperCase(),
    roleId: roleId || asString(legacy?.roleId),
    isTrashed: Boolean(legacy?.isTrashed),
    isProtected: Boolean(legacy?.isProtected),
    avatar:
      legacy?.avatar != null
        ? String(legacy.avatar)
        : usersRow.avatar_url != null
          ? String(usersRow.avatar_url)
          : null,
    createdAt:
      usersRow.created_at != null ? String(usersRow.created_at) : undefined,
    updatedAt:
      usersRow.updated_at != null ? String(usersRow.updated_at) : undefined,
    UserRole: role,
  };
}
