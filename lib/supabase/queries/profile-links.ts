import type { SupabaseClient } from '@supabase/supabase-js';
import { embed, FK } from '@/lib/supabase/embed-selects';
import type { Database } from '@/lib/supabase/database.types';
import { unwrapRelation } from '@/lib/acadia/record-display';

type Client = SupabaseClient<Database>;

export async function fetchStaffProfileIdForUser(
  supabase: Client,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('StaffProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('userId', userId)
    .eq('isActive', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function fetchStudentProfileIdForUser(
  supabase: Client,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('StudentProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('userId', userId)
    .eq('isActive', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export type StudentEnrollmentSummary = {
  classId: string;
  className: string;
};

type StudentEnrollmentSummaryRow = {
  classId: string | null;
  Class?: unknown;
};

export async function fetchStudentEnrollmentSummary(
  supabase: Client,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
): Promise<StudentEnrollmentSummary | null> {
  const { data, error } = await supabase
    .from('StudentEnrollment')
    .select(
      [
        'classId',
        embed('Class', FK.StudentEnrollment_class, 'name'),
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED')
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as unknown as StudentEnrollmentSummaryRow | null;

  if (!row?.classId) {
    return null;
  }

  const classRow = unwrapRelation<{ name?: string }>(row.Class);

  return {
    classId: row.classId,
    className: classRow?.name?.trim() || 'Your class',
  };
}
