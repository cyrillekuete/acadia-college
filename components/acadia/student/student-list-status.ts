import type { StudentEnrollmentStatus } from '@/lib/acadia/dummy-students';

type StatusBadgeVariant = 'success' | 'warning' | 'secondary';

export const StudentEnrollmentStatusProps: Record<
  StudentEnrollmentStatus,
  { label: string; variant: StatusBadgeVariant }
> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  inactive: { label: 'Inactive', variant: 'warning' },
};

export function getStudentEnrollmentStatusProps(status: StudentEnrollmentStatus) {
  return (
    StudentEnrollmentStatusProps[status] ?? {
      label: 'Unknown',
      variant: 'secondary' as const,
    }
  );
}
