import { getDummyStudentFullName, type DummyStudent } from '@/lib/acadia/dummy-students';
import { formatMoney } from '@/i18n/format';

export type StudentQuickFilterId =
  | 'fully_enrolled_paid'
  | 'pending_fees'
  | 'pending_enrollment'
  | 'overdue_fees';

export const STUDENT_QUICK_FILTERS: Array<{ id: StudentQuickFilterId; label: string }> =
  [
    { id: 'fully_enrolled_paid', label: 'Fully Enrolled & Paid' },
    { id: 'pending_fees', label: 'Pending Fees' },
    { id: 'pending_enrollment', label: 'Pending Enrollment' },
    { id: 'overdue_fees', label: 'Overdue Fees' },
  ];

export type StudentRegistryFilters = {
  query: string;
  subSystem: string | null;
  branch: string | null;
  className: string | null;
  enrollmentStatus: string | null;
  feesStatus: string | null;
  quickFilter: StudentQuickFilterId | null;
};

export const EMPTY_STUDENT_REGISTRY_FILTERS: StudentRegistryFilters = {
  query: '',
  subSystem: null,
  branch: null,
  className: null,
  enrollmentStatus: null,
  feesStatus: null,
  quickFilter: null,
};

export type StudentRegistryStats = {
  total: number;
  active: number;
  inactive: number;
  newLast7Days: number;
  feesCollectionPercent: number;
  paidFees: number;
  totalFees: number;
  feesFooter: string;
  academicYearLabel: string;
};

function normalizeSubSystem(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase();
}

function normalizeBranch(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase();
}

function matchesQuickFilter(
  student: DummyStudent,
  quickFilter: StudentQuickFilterId,
): boolean {
  const feesStatus = (student.fees_status ?? '').toLowerCase();
  const isPaid =
    feesStatus === 'paid' ||
    (student.total_fees > 0 && student.paid_fees >= student.total_fees);

  switch (quickFilter) {
    case 'fully_enrolled_paid':
      return student.enrollment_status === 'active' && isPaid;
    case 'pending_fees':
      return (
        feesStatus === 'pending' ||
        feesStatus === 'partial' ||
        (student.paid_fees > 0 && student.paid_fees < student.total_fees)
      );
    case 'pending_enrollment':
      return student.enrollment_status === 'pending';
    case 'overdue_fees':
      return feesStatus === 'overdue';
    default:
      return true;
  }
}

export function studentRegistryHasActiveFilters(
  filters: StudentRegistryFilters,
): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.subSystem != null ||
    filters.branch != null ||
    filters.className != null ||
    filters.enrollmentStatus != null ||
    filters.feesStatus != null ||
    filters.quickFilter != null
  );
}

export function filterStudentsRegistry(
  students: DummyStudent[],
  filters: StudentRegistryFilters,
): DummyStudent[] {
  const q = filters.query.trim().toLowerCase();

  return students.filter((student) => {
    if (filters.subSystem) {
      const rowSub = normalizeSubSystem(student.subsystem);
      const want = filters.subSystem.toLowerCase();
      if (rowSub !== want) {
        return false;
      }
    }

    if (filters.branch) {
      const rowBranch = normalizeBranch(student.branch);
      const want = filters.branch.toLowerCase();
      if (rowBranch !== want) {
        return false;
      }
    }

    if (filters.className && student.class_name !== filters.className) {
      return false;
    }

    if (
      filters.enrollmentStatus &&
      student.enrollment_status !== filters.enrollmentStatus
    ) {
      return false;
    }

    if (filters.feesStatus) {
      const rowFees = (student.fees_status ?? 'pending').toLowerCase();
      if (rowFees !== filters.feesStatus.toLowerCase()) {
        return false;
      }
    }

    if (filters.quickFilter && !matchesQuickFilter(student, filters.quickFilter)) {
      return false;
    }

    if (!q) {
      return true;
    }

    const fullName = getDummyStudentFullName(student).toLowerCase();
    return (
      fullName.includes(q) ||
      student.email.toLowerCase().includes(q) ||
      student.student_id.toLowerCase().includes(q) ||
      (student.matricule_number?.toLowerCase().includes(q) ?? false)
    );
  });
}

export function computeStudentRegistryStats(
  students: DummyStudent[],
  academicYearLabel?: string | null,
): StudentRegistryStats {
  const total = students.length;
  const active = students.filter((s) => s.status === 'active').length;
  const inactive = total - active;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newLast7Days = students.filter((s) => {
    const enrolled = new Date(s.enrollment_date);
    return enrolled >= sevenDaysAgo;
  }).length;

  const totalFees = students.reduce((sum, s) => sum + s.total_fees, 0);
  const paidFees = students.reduce((sum, s) => sum + s.paid_fees, 0);
  const feesCollectionPercent =
    totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0;

  return {
    total,
    active,
    inactive,
    newLast7Days,
    feesCollectionPercent,
    paidFees,
    totalFees,
    feesFooter: `${formatMoney(paidFees)} of ${formatMoney(totalFees)}`,
    academicYearLabel: academicYearLabel ?? '—',
  };
}

export function getStudentClassOptions(students: DummyStudent[]): string[] {
  return Array.from(
    new Set(students.map((s) => s.class_name).filter((c) => c && c !== '—')),
  ).sort();
}

export function getStudentFeesStatusOptions(students: DummyStudent[]): string[] {
  return Array.from(
    new Set(
      students
        .map((s) => (s.fees_status ?? 'pending').toLowerCase())
        .filter(Boolean),
    ),
  ).sort();
}
