export type StudentEnrollmentStatus = 'active' | 'pending' | 'inactive';

export type StudentListItem = {
  id: string;
  student_id: string;
  registration_number: string | null;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  /** Populated from enrollment rows when available (used for teacher scope filters). */
  class_id?: string | null;
  class_name: string;
  subsystem: string | null;
  branch: string | null;
  matricule_number: string | null;
  enrollment_status: StudentEnrollmentStatus;
  status: 'active' | 'inactive';
  enrollment_date: string;
  email_verified: boolean;
  total_fees: number;
  paid_fees: number;
  fees_status: string | null;
};

export function getStudentFullName(
  student: Pick<StudentListItem, 'first_name' | 'last_name'>,
): string {
  return [student.first_name, student.last_name].filter(Boolean).join(' ');
}
