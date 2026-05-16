import { SupabaseClient } from '@supabase/supabase-js';

export async function fetchAdminDashboardStats(
  supabase: SupabaseClient,
  tenantId: string | null,
) {
  const countTable = async (table: string) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (tenantId) {
      q = q.eq('tenantId', tenantId);
    }
    const { count, error } = await q;
    if (error) {
      throw error;
    }
    return count ?? 0;
  };

  const [students, staff, courses, applications, enrollments] = await Promise.all([
    countTable('StudentProfile'),
    countTable('StaffProfile'),
    countTable('Course'),
    countTable('EnrollmentApplication'),
    countTable('StudentEnrollment'),
  ]);

  return {
    students,
    staff,
    courses,
    applications,
    enrollments,
  };
}
