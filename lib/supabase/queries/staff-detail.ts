import type { SupabaseClient } from '@supabase/supabase-js';

export const STAFF_DETAIL_SELECT = `
  id,
  staffCode,
  title,
  firstName,
  lastName,
  personalEmail,
  phone,
  address,
  city,
  region,
  qualifications,
  teachingExperience,
  subSystem,
  employmentType,
  hireDate,
  monthlySalary,
  emergencyContactName,
  emergencyContactRelationship,
  emergencyContactPhone,
  officeRoom,
  officePhone,
  bio,
  isActive,
  createdAt,
  updatedAt,
  departmentId,
  User!StaffProfile_userId_tenantId_fkey ( id, email, name, status, country, timezone, lastSignInAt ),
  Department!StaffProfile_departmentId_tenantId_fkey ( code, nameEn, nameFr )
`;

export type StaffDetailRecord = {
  id: string;
  staffCode: string | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  personalEmail: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  qualifications: string | null;
  teachingExperience: string | null;
  subSystem: string | null;
  employmentType: string;
  hireDate: string | null;
  monthlySalary: number | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  officeRoom: string | null;
  officePhone: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  departmentId: string | null;
  User: unknown;
  Department: unknown;
};

/**
 * Resolve any supported staff identifier to a `StaffProfile.id`.
 * Accepts profile UUID, auth `userId`, or `staffCode`.
 * Does not require `isActive` so inactive staff remain viewable.
 */
export async function resolveStaffProfileId(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<string | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }

  const { data: byProfileId, error: byProfileIdError } = await supabase
    .from('StaffProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('id', trimmed)
    .maybeSingle();

  if (byProfileIdError) {
    throw byProfileIdError;
  }
  if (byProfileId?.id) {
    return byProfileId.id as string;
  }

  const { data: byUserId, error: byUserIdError } = await supabase
    .from('StaffProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('userId', trimmed)
    .order('isActive', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byUserIdError) {
    throw byUserIdError;
  }
  if (byUserId?.id) {
    return byUserId.id as string;
  }

  const { data: byStaffCode, error: byStaffCodeError } = await supabase
    .from('StaffProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('staffCode', trimmed)
    .maybeSingle();

  if (byStaffCodeError) {
    throw byStaffCodeError;
  }

  return (byStaffCode?.id as string | undefined) ?? null;
}

export async function fetchStaffDetail(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<StaffDetailRecord | null> {
  const profileId = await resolveStaffProfileId(supabase, tenantId, id);
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase
    .from('StaffProfile')
    .select(STAFF_DETAIL_SELECT)
    .eq('tenantId', tenantId)
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  return data as unknown as StaffDetailRecord;
}
