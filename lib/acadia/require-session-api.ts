import { createClient } from '@/lib/supabase/server';
import { fetchAcadiaUserProfile } from '@/lib/supabase/queries/user';

export type SessionApiContext = {
  actorUserId: string;
  tenantId: string;
  roleSlug: string;
  email: string;
  isProtected: boolean;
};

export async function requireSessionApi(): Promise<
  { ok: true; ctx: SessionApiContext } | { ok: false; status: number; message: string }
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

  const profile = profileResult.profile;
  const tenantId = profile.tenantId;
  if (!tenantId) {
    return { ok: false, status: 403, message: 'Tenant context is required.' };
  }

  const roleSlug = profile.UserRole?.slug ?? '';

  return {
    ok: true,
    ctx: {
      actorUserId: user.id,
      tenantId,
      roleSlug,
      email: profile.email,
      isProtected: Boolean(profile.isProtected),
    },
  };
}
