import { createClient } from '@/lib/supabase/server';
import { fetchAcadiaUserProfile } from '@/lib/supabase/queries/user';
import { canManageUsers } from '@/lib/acadia/roles';

export type AdminApiContext = {
  actorUserId: string;
  tenantId: string;
  roleSlug: string;
};

export async function requireAdminApi(): Promise<
  { ok: true; ctx: AdminApiContext } | { ok: false; status: number; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, message: 'Authentication required.' };
  }

  const profileResult = await fetchAcadiaUserProfile(supabase, user.id);
  if (profileResult.status !== 'ok') {
    return { ok: false, status: 403, message: 'Acadia profile not found.' };
  }

  const roleSlug = profileResult.profile.UserRole?.slug ?? '';
  if (!canManageUsers(roleSlug)) {
    return {
      ok: false,
      status: 403,
      message: 'Only administrators can perform this action.',
    };
  }

  const tenantId = profileResult.profile.tenantId;
  if (!tenantId) {
    return { ok: false, status: 403, message: 'Tenant context is required.' };
  }

  return {
    ok: true,
    ctx: {
      actorUserId: user.id,
      tenantId,
      roleSlug,
    },
  };
}
