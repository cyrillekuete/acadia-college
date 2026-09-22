import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';

export type UsersTableRow = {
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
  tenantId?: unknown;
  roleId?: unknown;
  isTrashed?: unknown;
  isProtected?: unknown;
  avatar?: unknown;
  UserRole?: AcadiaUserProfile['UserRole'] | AcadiaUserProfile['UserRole'][] | null;
};

function nonEmptyString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

/**
 * Session tenant must match RLS `acadia_current_tenant_id()`.
 * Legacy `"User"."tenantId"` wins when set; otherwise `users.tenant_id`.
 */
export function preferredTenantId(
  legacyTenant: unknown,
  usersTenant: unknown,
): string | null {
  const legacy = nonEmptyString(legacyTenant);
  const users = nonEmptyString(usersTenant);
  if (
    process.env.NODE_ENV === 'development' &&
    legacy &&
    users &&
    legacy !== users
  ) {
    console.warn(
      'Acadia tenant mismatch: preferring legacy User.tenantId over users.tenant_id',
    );
  }
  return legacy ?? users;
}

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
    tenantId: preferredTenantId(legacy?.tenantId, usersRow.tenant_id),
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
