import type { SupabaseClient } from '@supabase/supabase-js';
import { usersTableStatusFromUserStatus } from '@/lib/acadia/user-management';

export async function syncSnakeCaseUsersRow(
  admin: SupabaseClient,
  input: {
    id: string;
    email: string;
    name: string;
    roleSlug: string;
    status: string;
    tenantId: string;
    now: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const payload = {
    email: input.email,
    name: input.name,
    role: input.roleSlug,
    status: usersTableStatusFromUserStatus(input.status),
    tenant_id: input.tenantId,
    updated_at: input.now,
  };

  const { data: existing, error: lookupError } = await admin
    .from('users')
    .select('id')
    .eq('id', input.id)
    .maybeSingle();

  if (lookupError && !lookupError.message?.includes('does not exist')) {
    return { ok: false, message: lookupError.message };
  }

  if (existing?.id) {
    const { error } = await admin.from('users').update(payload).eq('id', input.id);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  const { error } = await admin.from('users').insert({
    id: input.id,
    ...payload,
    created_at: input.now,
    has_default_password: true,
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function revokeUserSessions(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const authAdmin = admin.auth.admin as {
    signOut?: (id: string, scope?: 'global' | 'local' | 'others') => Promise<unknown>;
  };
  if (typeof authAdmin.signOut === 'function') {
    await authAdmin.signOut(userId, 'global');
    return;
  }
}
