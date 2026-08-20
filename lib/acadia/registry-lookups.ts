import type { SupabaseClient } from '@supabase/supabase-js';

export type RegistryEmailConflict =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Block registry create when email exists in auth-linked User
 * or the legacy students table.
 */
export async function checkRegistryStudentEmail(
  supabase: SupabaseClient,
  tenantId: string,
  email: string,
  excludeUserId?: string,
): Promise<RegistryEmailConflict> {
  const normalized = email.trim().toLowerCase();

  let pascalQuery = supabase
    .from('User')
    .select('id')
    .eq('tenantId', tenantId)
    .ilike('email', normalized);
  if (excludeUserId) {
    pascalQuery = pascalQuery.neq('id', excludeUserId);
  }
  const { data: pascalUser } = await pascalQuery.maybeSingle();

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
      message: 'This student ID is already in use.',
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
      message: 'This student ID is already in use.',
    };
  }

  return { ok: true };
}

export async function checkMatriculeAvailable(
  supabase: SupabaseClient,
  tenantId: string,
  matricule: string,
  excludeProfileId?: string,
): Promise<RegistryEmailConflict> {
  const trimmed = matricule.trim();
  if (!trimmed) {
    return { ok: true };
  }

  let query = supabase
    .from('StudentProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('matriculeNumber', trimmed);

  if (excludeProfileId) {
    query = query.neq('id', excludeProfileId);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing?.id) {
    return {
      ok: false,
      message: 'This matricule is already in use.',
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
      message: 'This matricule is already in use.',
    };
  }

  return { ok: true };
}
