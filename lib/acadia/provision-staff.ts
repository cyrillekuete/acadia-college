import type { SupabaseClient } from '@supabase/supabase-js';
import { UserStatus } from '@/app/models/user';
import { generateStaffCode } from '@/lib/acadia/ids';
import type { StaffCreateInput } from '@/lib/acadia/staff-create-schemas';
import { createAdminClient } from '@/lib/supabase/admin';

export type ProvisionStaffResult =
  | { ok: true; staffId: string; staffCode: string }
  | { ok: false; message: string; status: number };

const STAFF_ROLE_SLUGS = ['teacher', 'lecturer', 'staff'] as const;

async function resolveStaffRoleId(
  supabase: SupabaseClient,
  preferredRoleId?: string,
): Promise<string | null> {
  if (preferredRoleId?.trim()) {
    return preferredRoleId.trim();
  }

  const { data, error } = await supabase
    .from('UserRole')
    .select('id, slug')
    .eq('isTrashed', false)
    .in('slug', [...STAFF_ROLE_SLUGS]);

  if (error || !data?.length) {
    return null;
  }

  const bySlug = new Map(data.map((row) => [row.slug as string, row.id as string]));
  for (const slug of STAFF_ROLE_SLUGS) {
    const id = bySlug.get(slug);
    if (id) {
      return id;
    }
  }

  return (data[0]?.id as string) ?? null;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function rollbackStaff(
  supabase: SupabaseClient,
  admin: ReturnType<typeof createAdminClient>,
  authId: string,
) {
  await supabase.from('StaffProfile').delete().eq('id', authId);
  await supabase.from('User').delete().eq('id', authId);
  await admin.auth.admin.deleteUser(authId);
}

export async function provisionStaff(
  supabase: SupabaseClient,
  input: StaffCreateInput,
  tenantId: string,
  actorUserId: string,
): Promise<ProvisionStaffResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const staffCode = emptyToNull(input.staffCode) ?? generateStaffCode();

  const roleId = await resolveStaffRoleId(supabase, input.roleId);
  if (!roleId) {
    return {
      ok: false,
      message: 'No teacher/staff role is configured. Contact an administrator.',
      status: 500,
    };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authError || !authData.user) {
    const message =
      authError?.message?.includes('already been registered') ||
      authError?.message?.includes('already exists')
        ? 'A user with this email already exists.'
        : (authError?.message ?? 'Failed to create auth account.');
    return { ok: false, message, status: 400 };
  }

  const authId = authData.user.id;

  const { error: userError } = await supabase.from('User').insert({
    id: authId,
    email,
    name,
    roleId,
    tenantId,
    status: UserStatus.ACTIVE,
    invitedByUserId: actorUserId,
    createdAt: now,
    updatedAt: now,
    isTrashed: false,
    isProtected: false,
  });

  if (userError) {
    await admin.auth.admin.deleteUser(authId);
    return {
      ok: false,
      message: userError.message ?? 'Failed to create user profile.',
      status: 400,
    };
  }

  const { error: staffError } = await supabase.from('StaffProfile').insert({
    id: authId,
    userId: authId,
    tenantId,
    staffCode,
    title: emptyToNull(input.title),
    employmentType: input.employmentType,
    departmentId: emptyToNull(input.departmentId),
    hireDate: emptyToNull(input.hireDate),
    officePhone: emptyToNull(input.officePhone),
    officeRoom: emptyToNull(input.officeRoom),
    bio: emptyToNull(input.bio),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });

  if (staffError) {
    await rollbackStaff(supabase, admin, authId);
    return {
      ok: false,
      message: staffError.message ?? 'Failed to create staff profile.',
      status: 400,
    };
  }

  const { error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (linkError) {
    console.warn('[provisionStaff] Failed to send password setup link:', linkError.message);
  }

  return { ok: true, staffId: authId, staffCode };
}
