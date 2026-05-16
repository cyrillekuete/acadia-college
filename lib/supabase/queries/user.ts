import { SupabaseClient } from '@supabase/supabase-js';

export type AcadiaUserProfile = {
  id: string;
  email: string;
  name: string | null;
  tenantId: string | null;
  status: string;
  roleId: string;
  UserRole: {
    slug: string;
    name: string;
  } | null;
};

export async function fetchAcadiaUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<AcadiaUserProfile | null> {
  const { data, error } = await supabase
    .from('User')
    .select('id, email, name, tenantId, status, roleId, UserRole(slug, name)')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
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
    ...(row as Omit<AcadiaUserProfile, 'UserRole'>),
    UserRole: role,
  };
}
