import { SupabaseClient } from '@supabase/supabase-js';
import { mergeDualTableUserProfile } from '@/lib/acadia/user-profile-merge';

export type AcadiaUserProfile = {
  id: string;
  email: string;
  name: string | null;
  tenantId: string | null;
  status: string;
  roleId: string;
  isTrashed: boolean;
  createdAt?: string;
  updatedAt?: string;
  isProtected?: boolean;
  avatar?: string | null;
  UserRole: {
    id?: string;
    slug: string;
    name: string;
    isTrashed?: boolean;
    createdAt?: string;
    isProtected?: boolean;
    isDefault?: boolean;
  } | null;
};

export type FetchAcadiaProfileResult =
  | { status: 'ok'; profile: AcadiaUserProfile }
  | { status: 'not_found' }
  | { status: 'error' };

/**
 * Fetch user profile for auth gate and session hook.
 *
 * Strategy (dual-table during migration):
 *  1. Check new `users` table (database.sql schema, role column).
 *  2. Fall back to legacy `User` + `UserRole` join for accounts not yet
 *     migrated.
 * Once all existing users have rows in `users`, the fallback branch can
 * be removed in a follow-up PR.
 */
export async function fetchAcadiaUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<FetchAcadiaProfileResult> {
  // ── New users table (snake_case, database.sql) ──────────────────────────
  const { data: newRow, error: newError } = await supabase
    .from('users')
    .select(
      'id, email, name, tenant_id, status, role, avatar_url, created_at, updated_at',
    )
    .eq('id', userId)
    .maybeSingle();

  if (newError) {
    // Table may not exist yet in this environment; fall through to legacy.
    if (!newError.message?.includes('relation') && !newError.message?.includes('does not exist')) {
      return { status: 'error' };
    }
  }

  if (newRow) {
    const row = newRow as Record<string, unknown>;
    const roleSlug = String(row.role ?? '');
    const [{ data: legacy }, { data: roleBySlug }] = await Promise.all([
      supabase
        .from('User')
        .select(
          'roleId, isTrashed, isProtected, avatar, UserRole(id, slug, name, isTrashed, createdAt, isProtected, isDefault)',
        )
        .eq('id', userId)
        .maybeSingle(),
      roleSlug
        ? supabase
            .from('UserRole')
            .select(
              'id, slug, name, isTrashed, createdAt, isProtected, isDefault',
            )
            .eq('slug', roleSlug)
            .eq('isTrashed', false)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      status: 'ok',
      profile: mergeDualTableUserProfile(
        row,
        legacy as Record<string, unknown> | null,
        roleBySlug as AcadiaUserProfile['UserRole'],
      ),
    };
  }

  // ── Legacy User + UserRole join (PascalCase tables) ─────────────────────
  const USER_PROFILE_SELECT =
    'id, email, name, tenantId, status, roleId, isTrashed, createdAt, updatedAt, isProtected, avatar, UserRole(id, slug, name, isTrashed, createdAt, isProtected, isDefault)';

  const { data, error } = await supabase
    .from('User')
    .select(USER_PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { status: 'error' };
  }

  if (!data) {
    return { status: 'not_found' };
  }

  const row = data as Record<string, unknown>;
  const roleRaw = row.UserRole;
  const roleCandidate = Array.isArray(roleRaw) ? roleRaw[0] : roleRaw;
  const role: AcadiaUserProfile['UserRole'] =
    roleCandidate &&
    typeof roleCandidate === 'object' &&
    'slug' in roleCandidate &&
    typeof (roleCandidate as { slug: unknown }).slug === 'string'
      ? (roleCandidate as AcadiaUserProfile['UserRole'])
      : null;

  return {
    status: 'ok',
    profile: {
      ...(row as Omit<AcadiaUserProfile, 'UserRole' | 'isTrashed'>),
      isTrashed: Boolean(row.isTrashed),
      UserRole: role,
    },
  };
}

/** Returns profile or null — use {@link fetchAcadiaUserProfile} when query errors must be distinguished. */
export async function fetchAcadiaUserProfileOrNull(
  supabase: SupabaseClient,
  userId: string,
): Promise<AcadiaUserProfile | null> {
  const result = await fetchAcadiaUserProfile(supabase, userId);
  return result.status === 'ok' ? result.profile : null;
}
