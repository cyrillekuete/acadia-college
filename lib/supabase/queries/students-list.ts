import type { SupabaseClient } from '@supabase/supabase-js';
import type { DummyStudent, StudentEnrollmentStatus } from '@/lib/acadia/dummy-students';

const STUDENTS_LIST_SELECT =
  'id, student_id, first_name, last_name, email, class_name, subsystem, branch, enrollment_status, enrollment_date, matricule_number, total_fees, paid_fees, fees_status, status';

type StudentsListRow = {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  class_name: string | null;
  subsystem: string | null;
  branch: string | null;
  enrollment_status: string | null;
  enrollment_date: string | null;
  matricule_number: string | null;
  total_fees: number | null;
  paid_fees: number | null;
  fees_status: string | null;
  status: string | null;
};

function normalizeEnrollmentStatus(
  value: string | null | undefined,
): StudentEnrollmentStatus {
  const normalized = (value ?? 'pending').toLowerCase();
  if (normalized === 'active' || normalized === 'pending' || normalized === 'inactive') {
    return normalized;
  }
  return 'pending';
}

function mapRow(row: StudentsListRow): DummyStudent {
  const enrollmentStatus = normalizeEnrollmentStatus(row.enrollment_status);
  const enrollmentDate = row.enrollment_date
    ? new Date(row.enrollment_date).toISOString()
    : new Date().toISOString();

  return {
    id: row.id,
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email ?? '',
    avatar: null,
    class_name: row.class_name ?? '—',
    subsystem: row.subsystem,
    branch: row.branch,
    matricule_number: row.matricule_number,
    enrollment_status: enrollmentStatus,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    enrollment_date: enrollmentDate,
    email_verified: false,
    total_fees: Number(row.total_fees ?? 0),
    paid_fees: Number(row.paid_fees ?? 0),
    fees_status: row.fees_status,
  };
}

export async function fetchStudentsList(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<DummyStudent[]> {
  const { data, error } = await supabase
    .from('students')
    .select(STUDENTS_LIST_SELECT)
    .eq('tenant_id', tenantId)
    .order('enrollment_date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRow(row as StudentsListRow));
}
