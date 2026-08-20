import type { SupabaseClient } from '@supabase/supabase-js';
import { UserStatus } from '@/app/models/user';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { formatStaffDisplayName } from '@/lib/acadia/staff-email';
import type { StaffUpdateInput } from '@/lib/acadia/staff-create-schemas';

export type UpdateStaffResult =
  | { ok: true }
  | { ok: false; message: string; status: number };

export type DeactivateStaffResult =
  | { ok: true }
  | { ok: false; message: string; status: number };

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateStaffProfile(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    profileId: string;
    actorUserId: string;
    values: StaffUpdateInput;
  },
): Promise<UpdateStaffResult> {
  const now = new Date().toISOString();
  const values = input.values;
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const displayName = formatStaffDisplayName(values.title, firstName, lastName);

  const { data: profile, error: lookupError } = await supabase
    .from('StaffProfile')
    .select('id, userId')
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, message: lookupError.message, status: 400 };
  }
  if (!profile?.userId) {
    return { ok: false, message: 'Staff profile not found.', status: 404 };
  }

  const { error: profileError } = await supabase
    .from('StaffProfile')
    .update({
      title: values.title,
      firstName,
      lastName,
      personalEmail: values.personalEmail.trim().toLowerCase(),
      phone: emptyToNull(values.phone),
      address: emptyToNull(values.address),
      city: emptyToNull(values.city),
      region: emptyToNull(values.region),
      qualifications: emptyToNull(values.qualifications),
      teachingExperience: emptyToNull(values.teachingExperience),
      employmentType: values.employmentType,
      hireDate: emptyToNull(values.hireDate),
      monthlySalary: values.monthlySalary ?? null,
      emergencyContactName: emptyToNull(values.emergencyContactName),
      emergencyContactRelationship: values.emergencyContactRelationship ?? null,
      emergencyContactPhone: emptyToNull(values.emergencyContactPhone),
      bio: emptyToNull(values.bio),
      officeRoom: emptyToNull(values.officeRoom),
      officePhone: emptyToNull(values.officePhone),
      departmentId: emptyToNull(values.departmentId),
      isActive: values.isActive,
      updatedAt: now,
    })
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId);

  if (profileError) {
    return { ok: false, message: profileError.message, status: 400 };
  }

  const { error: userError } = await supabase
    .from('User')
    .update({
      name: displayName,
      status: values.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE,
      updatedAt: now,
    })
    .eq('id', profile.userId)
    .eq('tenantId', input.tenantId);

  if (userError) {
    return { ok: false, message: userError.message, status: 400 };
  }

  void appendSystemLog(supabase, {
    userId: input.actorUserId,
    event: 'staff.updated',
    description: `Updated staff profile ${input.profileId}`,
    entityId: input.profileId,
    entityType: 'StaffProfile',
  });

  return { ok: true };
}

export async function deactivateStaffProfile(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    profileId: string;
    actorUserId: string;
  },
): Promise<DeactivateStaffResult> {
  const now = new Date().toISOString();

  const { data: profile, error: lookupError } = await supabase
    .from('StaffProfile')
    .select('id, userId, isActive, staffCode')
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, message: lookupError.message, status: 400 };
  }
  if (!profile) {
    return { ok: false, message: 'Staff profile not found.', status: 404 };
  }
  if (!profile.isActive) {
    return { ok: false, message: 'Staff member is already inactive.', status: 400 };
  }

  const { error: profileError } = await supabase
    .from('StaffProfile')
    .update({ isActive: false, updatedAt: now })
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId);

  if (profileError) {
    return { ok: false, message: profileError.message, status: 400 };
  }

  if (profile.userId) {
    const { error: userError } = await supabase
      .from('User')
      .update({ status: UserStatus.INACTIVE, updatedAt: now })
      .eq('id', profile.userId)
      .eq('tenantId', input.tenantId);

    if (userError) {
      return { ok: false, message: userError.message, status: 400 };
    }
  }

  void appendSystemLog(supabase, {
    userId: input.actorUserId,
    event: 'staff.deactivated',
    description: `Deactivated staff ${profile.staffCode ?? input.profileId}`,
    entityId: input.profileId,
    entityType: 'StaffProfile',
  });

  return { ok: true };
}
