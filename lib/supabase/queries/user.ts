import { SupabaseClient } from '@supabase/supabase-js';

export type AcadiaUserProfile = {
  id: string;
  email: string;
  name: string | null;
  tenantId: string | null;
  status: string;
  roleId: string;
  isTrashed: boolean;
  UserRole: {
    slug: string;
    name: string;
    isTrashed?: boolean;
  } | null;
};

export type FetchAcadiaProfileResult =
  | { status: 'ok'; profile: AcadiaUserProfile }
  | { status: 'not_found' }
  | { status: 'error' };

const USER_PROFILE_SELECT =
  'id, email, name, tenantId, status, roleId, isTrashed, UserRole(slug, name, isTrashed)';

export async function fetchAcadiaUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<FetchAcadiaProfileResult> {
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
