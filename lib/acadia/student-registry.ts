import { getStudentFullName, type StudentListItem } from '@/lib/acadia/student-list-item';
import {
  DEFAULT_FEE_CURRENCY,
  formatMoneyMinor,
} from '@/lib/acadia/finance';
import type { TeacherTeachingScopePair } from '@/lib/supabase/queries/teacher-students';
import { UNASSIGNED_CLASS_FILTER } from '@/lib/acadia/student-enrollment';

export type StudentRegistrySubjectOption = {
  id: string;
  label: string;
};

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
  classId: string | null;
  subjectId: string | null;
  enrollmentStatus: string | null;
  feesStatus: string | null;
  quickFilter: StudentQuickFilterId | null;
};

export const EMPTY_STUDENT_REGISTRY_FILTERS: StudentRegistryFilters = {
  query: '',
  subSystem: null,
  branch: null,
  classId: null,
  subjectId: null,
  enrollmentStatus: null,
  feesStatus: null,
  quickFilter: null,
};

export type TeacherStudentRegistryStats = {
  total: number;
  active: number;
  classCount: number;
  subjectCount: number;
  academicYearLabel: string;
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
  student: StudentListItem,
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
        feesStatus === 'outstanding' ||
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
    filters.classId != null ||
    filters.subjectId != null ||
    filters.enrollmentStatus != null ||
    filters.feesStatus != null ||
    filters.quickFilter != null
  );
}

export function filterStudentsRegistryByTeachingScope(
  students: StudentListItem[],
  filters: StudentRegistryFilters,
  scopePairs: TeacherTeachingScopePair[],
): StudentListItem[] {
  if (!filters.subjectId) {
    return students;
  }

  const classIdsForSubject = new Set(
    scopePairs
      .filter((pair) => pair.subjectId === filters.subjectId)
      .map((pair) => pair.classId),
  );

  return students.filter((student) => {
    if (student.class_id) {
      return classIdsForSubject.has(student.class_id);
    }
    const classNamesForSubject = new Set(
      scopePairs
        .filter((pair) => pair.subjectId === filters.subjectId)
        .map((pair) => pair.className),
    );
    return classNamesForSubject.has(student.class_name);
  });
}

export function filterStudentsRegistry(
  students: StudentListItem[],
  filters: StudentRegistryFilters,
  options?: {
    scopePairs?: TeacherTeachingScopePair[];
  },
): StudentListItem[] {
  const scopedStudents = options?.scopePairs
    ? filterStudentsRegistryByTeachingScope(students, filters, options.scopePairs)
    : students;

  const q = filters.query.trim().toLowerCase();

  return scopedStudents.filter((student) => {
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

    if (filters.classId) {
      if (filters.classId === UNASSIGNED_CLASS_FILTER) {
        if (student.class_id) {
          return false;
        }
      } else if (student.class_id !== filters.classId) {
        return false;
      }
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

    const fullName = getStudentFullName(student).toLowerCase();
    return (
      fullName.includes(q) ||
      student.email.toLowerCase().includes(q) ||
      student.student_id.toLowerCase().includes(q) ||
      (student.registration_number?.toLowerCase().includes(q) ?? false) ||
      (student.matricule_number?.toLowerCase().includes(q) ?? false)
    );
  });
}

export function computeTeacherStudentRegistryStats(
  students: StudentListItem[],
  scopePairs: TeacherTeachingScopePair[],
  academicYearLabel?: string | null,
): TeacherStudentRegistryStats {
  const total = students.length;
  const active = students.filter((s) => s.enrollment_status === 'active').length;
  const classCount = new Set(scopePairs.map((pair) => pair.classId)).size;
  const subjectCount = new Set(scopePairs.map((pair) => pair.subjectId)).size;

  return {
    total,
    active,
    classCount,
    subjectCount,
    academicYearLabel: academicYearLabel ?? '—',
  };
}

export function getTeacherSubjectOptions(
  scopePairs: TeacherTeachingScopePair[],
): StudentRegistrySubjectOption[] {
  const byId = new Map<string, string>();
  for (const pair of scopePairs) {
    if (!byId.has(pair.subjectId)) {
      byId.set(pair.subjectId, pair.subjectName);
    }
  }
  return Array.from(byId.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function computeStudentRegistryStats(
  students: StudentListItem[],
  academicYearLabel?: string | null,
): StudentRegistryStats {
  const total = students.length;
  const active = students.filter((s) => s.enrollment_status === 'active').length;
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
    feesFooter: `${formatMoneyMinor(paidFees, DEFAULT_FEE_CURRENCY)} of ${formatMoneyMinor(totalFees, DEFAULT_FEE_CURRENCY)}`,
    academicYearLabel: academicYearLabel ?? '—',
  };
}

export type StudentRegistryClassOption = {
  id: string;
  name: string;
};

export function formatStudentClassOptionLabel(student: StudentListItem): string {
  const name = student.class_name?.trim() && student.class_name !== '—'
    ? student.class_name
    : student.class_id ?? '';
  const stream = [student.subsystem, student.branch].filter(Boolean).join(' / ');
  return stream ? `${name} (${stream})` : name;
}

export function getStudentClassOptions(
  students: StudentListItem[],
): StudentRegistryClassOption[] {
  const byName = new Map<string, Set<string>>();
  const byId = new Map<string, StudentListItem>();

  for (const student of students) {
    if (!student.class_id) {
      continue;
    }
    byId.set(student.class_id, student);
    const name = student.class_name?.trim() || student.class_id;
    const ids = byName.get(name) ?? new Set<string>();
    ids.add(student.class_id);
    byName.set(name, ids);
  }

  return Array.from(byId.entries())
    .map(([id, student]) => {
      const name = student.class_name?.trim() || id;
      const colliding = (byName.get(name)?.size ?? 0) > 1;
      return {
        id,
        name: colliding ? formatStudentClassOptionLabel(student) : name,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function registryHasUnassignedClass(students: StudentListItem[]): boolean {
  return students.some((student) => !student.class_id);
}

export function getStudentFeesStatusOptions(students: StudentListItem[]): string[] {
  return Array.from(
    new Set(
      students
        .map((s) => (s.fees_status ?? 'pending').toLowerCase())
        .filter(Boolean),
    ),
  ).sort();
}
