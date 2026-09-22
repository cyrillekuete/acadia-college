import type { SupabaseClient } from '@supabase/supabase-js';

/** Scalar StaffProfile columns. Related User and Department are loaded separately. */
export const STAFF_DETAIL_SELECT = `
  id,
  userId,
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
  departmentId
`;

const STAFF_USER_SELECT =
  'id, email, name, status, country, timezone, lastSignInAt';

const STAFF_DEPARTMENT_SELECT = 'code, nameEn, nameFr';

export type StaffDetailRecord = {
  id: string;
  userId: string;
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

type StaffProfilePick = {
  id: string;
  isActive: boolean;
  createdAt: string;
};

/**
 * Prefer an active profile, then the most recently created one.
 * Used when several StaffProfile rows share a userId.
 */
function pickPreferredStaffProfile<T extends StaffProfilePick>(
  rows: T[],
): T | null {
  if (rows.length === 0) {
    return null;
  }

  const sorted = [...rows].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  return sorted[0] ?? null;
}

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
    .select('id, isActive, createdAt')
    .eq('tenantId', tenantId)
    .eq('userId', trimmed);

  if (byUserIdError) {
    throw byUserIdError;
  }

  const preferred = pickPreferredStaffProfile(
    (byUserId ?? []) as StaffProfilePick[],
  );
  if (preferred?.id) {
    return preferred.id;
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

async function fetchRelatedRow(
  supabase: SupabaseClient,
  table: 'User' | 'Department',
  columns: string,
  tenantId: string,
  id: string,
): Promise<unknown> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq('tenantId', tenantId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
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

  const row = data as StaffDetailRecord;
  const user = row.userId
    ? await fetchRelatedRow(supabase, 'User', STAFF_USER_SELECT, tenantId, row.userId)
    : null;
  const department = row.departmentId
    ? await fetchRelatedRow(
        supabase,
        'Department',
        STAFF_DEPARTMENT_SELECT,
        tenantId,
        row.departmentId,
      )
    : null;

  return {
    ...row,
    User: user,
    Department: department,
  };
}
