import type { SupabaseClient } from '@supabase/supabase-js';

export type RegistryEmailConflict =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Block registry create/approve when email exists in auth-linked User,
 * legacy students table, or a pending enrollment application (other id).
 */
export async function checkRegistryStudentEmail(
  supabase: SupabaseClient,
  tenantId: string,
  email: string,
  options?: { excludeApplicationId?: string },
): Promise<RegistryEmailConflict> {
  const normalized = email.trim().toLowerCase();

  const { data: pascalUser } = await supabase
    .from('User')
    .select('id')
    .eq('tenantId', tenantId)
    .ilike('email', normalized)
    .maybeSingle();

  if (pascalUser?.id) {
    return {
      ok: false,
      message: 'A user with this email already exists.',
    };
  }

  const { data: legacyStudent } = await supabase
    .from('students')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('email', normalized)
    .maybeSingle();

  if (legacyStudent?.id) {
    return {
      ok: false,
      message: 'A student with this email already exists in the registry.',
    };
  }

  let pendingQuery = supabase
    .from('EnrollmentApplication')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('status', 'PENDING')
    .ilike('email', normalized);

  if (options?.excludeApplicationId) {
    pendingQuery = pendingQuery.neq('id', options.excludeApplicationId);
  }

  const { data: pendingApp } = await pendingQuery.maybeSingle();

  if (pendingApp?.id) {
    return {
      ok: false,
      message:
        'A pending enrollment application already exists for this email.',
    };
  }

  return { ok: true };
}

export async function checkRegistrationNumberAvailable(
  supabase: SupabaseClient,
  tenantId: string,
  registrationNumber: string,
  excludeProfileId?: string,
): Promise<RegistryEmailConflict> {
  const trimmed = registrationNumber.trim();
  if (!trimmed) {
    return { ok: false, message: 'Registration number is required.' };
  }

  let query = supabase
    .from('StudentProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('registrationNumber', trimmed);

  if (excludeProfileId) {
    query = query.neq('id', excludeProfileId);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing?.id) {
    return {
      ok: false,
      message: 'This matricule / registration number is already in use.',
    };
  }

  const { data: legacy } = await supabase
    .from('students')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('matricule_number', trimmed)
    .maybeSingle();

  if (legacy?.id) {
    return {
      ok: false,
      message: 'This matricule / registration number is already in use.',
    };
  }

  return { ok: true };
}
