import {
  formatStudentFeesAmounts,
  studentBranchLabel,
  studentFeesStatusLabel,
} from '@/lib/acadia/student-list';
import {
  getStudentFullName,
  type StudentEnrollmentStatus,
  type StudentListItem,
} from '@/lib/acadia/student-list-item';
import { isOfficialRosterEnrollment } from '@/lib/acadia/student-enrollment';

export const CLASS_EXPORT_NAME_PREFIX = 'name:';

export type StudentClassExportOption = {
  id: string;
  name: string;
};

export type StudentClassExportFormatters = {
  branch: (student: StudentListItem) => string;
  enrollmentStatus: (student: StudentListItem) => string;
  feesStatus: (student: StudentListItem) => string;
  feesAmounts: (student: StudentListItem) => string;
};

export type StudentClassExportRow = {
  studentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  className: string;
  branch: string;
  enrollmentStatus: string;
  feesStatus: string;
  feesAmounts: string;
};

export type StudentClassExportLabels = {
  studentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  className: string;
  branch: string;
  enrollmentStatus: string;
  feesStatus: string;
  feesAmounts: string;
};

export const DEFAULT_STUDENT_CLASS_EXPORT_LABELS: StudentClassExportLabels = {
  studentId: 'Student ID',
  matricule: 'Matricule',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  className: 'Class',
  branch: 'Branch',
  enrollmentStatus: 'Enrollment status',
  feesStatus: 'Fees status',
  feesAmounts: 'Paid / total',
};

const ENROLLMENT_STATUS_LABELS: Record<StudentEnrollmentStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
};

export const DEFAULT_STUDENT_CLASS_EXPORT_FORMATTERS: StudentClassExportFormatters = {
  branch: (student) => studentBranchLabel(student.branch),
  enrollmentStatus: (student) =>
    ENROLLMENT_STATUS_LABELS[student.enrollment_status] ?? student.enrollment_status,
  feesStatus: (student) => studentFeesStatusLabel(student.fees_status),
  feesAmounts: (student) =>
    formatStudentFeesAmounts(student.paid_fees, student.total_fees) ?? '—',
};

export function getStudentClassExportOptions(
  students: StudentListItem[],
  scopePairs?: Array<{ classId: string; className: string }>,
): StudentClassExportOption[] {
  const byId = new Map<string, string>();

  for (const pair of scopePairs ?? []) {
    const classId = pair.classId.trim();
    const className = pair.className.trim();
    if (!classId) {
      continue;
    }
    if (!byId.has(classId)) {
      byId.set(classId, className || classId);
    }
  }

  for (const student of students) {
    const option = classOptionFromStudent(student);
    if (!option || byId.has(option.id)) {
      continue;
    }
    byId.set(option.id, option.name);
  }

  return Array.from(byId.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function findClassExportOptionByName(
  options: StudentClassExportOption[],
  className: string | null | undefined,
): StudentClassExportOption | null {
  const name = className?.trim();
  if (!name) {
    return null;
  }
  return options.find((option) => option.name === name) ?? null;
}

export function studentMatchesExportClass(
  student: StudentListItem,
  option: StudentClassExportOption,
): boolean {
  if (option.id.startsWith(CLASS_EXPORT_NAME_PREFIX)) {
    return student.class_name === option.name;
  }
  if (student.class_id) {
    return student.class_id === option.id;
  }
  return student.class_name === option.name;
}

export function filterStudentsByExportClass(
  students: StudentListItem[],
  option: StudentClassExportOption,
): StudentListItem[] {
  return students.filter((student) => studentMatchesExportClass(student, option));
}

export function sortStudentsForClassExport(
  students: StudentListItem[],
): StudentListItem[] {
  return [...students].sort((a, b) => {
    const last = a.last_name.localeCompare(b.last_name, undefined, {
      sensitivity: 'base',
    });
    if (last !== 0) {
      return last;
    }
    const first = a.first_name.localeCompare(b.first_name, undefined, {
      sensitivity: 'base',
    });
    if (first !== 0) {
      return first;
    }
    return getStudentFullName(a).localeCompare(getStudentFullName(b), undefined, {
      sensitivity: 'base',
    });
  });
}

export function filterStudentsForOfficialRoster(
  students: StudentListItem[],
  includeWithdrawn: boolean,
): StudentListItem[] {
  if (includeWithdrawn) {
    return students;
  }
  return students.filter((student) =>
    isOfficialRosterEnrollment(student.enrollment_status),
  );
}

export function studentsForClassExport(
  students: StudentListItem[],
  option: StudentClassExportOption,
  includeWithdrawn = false,
): StudentListItem[] {
  return sortStudentsForClassExport(
    filterStudentsByExportClass(
      filterStudentsForOfficialRoster(students, includeWithdrawn),
      option,
    ),
  );
}

export function formatStudentForClassExport(
  student: StudentListItem,
  formatters: StudentClassExportFormatters = DEFAULT_STUDENT_CLASS_EXPORT_FORMATTERS,
): StudentClassExportRow {
  return {
    studentId: student.registration_number ?? student.student_id,
    matricule: student.matricule_number ?? '',
    firstName: student.first_name,
    lastName: student.last_name,
    email: student.email,
    className: student.class_name,
    branch: formatters.branch(student),
    enrollmentStatus: formatters.enrollmentStatus(student),
    feesStatus: formatters.feesStatus(student),
    feesAmounts: formatters.feesAmounts(student),
  };
}

export function studentClassExportRowValues(
  row: StudentClassExportRow,
): string[] {
  return [
    row.studentId,
    row.matricule,
    row.firstName,
    row.lastName,
    row.email,
    row.className,
    row.branch,
    row.enrollmentStatus,
    row.feesStatus,
    row.feesAmounts,
  ];
}

export function studentClassExportHeaderValues(
  labels: StudentClassExportLabels = DEFAULT_STUDENT_CLASS_EXPORT_LABELS,
): string[] {
  return [
    labels.studentId,
    labels.matricule,
    labels.firstName,
    labels.lastName,
    labels.email,
    labels.className,
    labels.branch,
    labels.enrollmentStatus,
    labels.feesStatus,
    labels.feesAmounts,
  ];
}

export function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildStudentClassCsv(
  students: StudentListItem[],
  option: StudentClassExportOption,
  labels: StudentClassExportLabels = DEFAULT_STUDENT_CLASS_EXPORT_LABELS,
  formatters: StudentClassExportFormatters = DEFAULT_STUDENT_CLASS_EXPORT_FORMATTERS,
  includeWithdrawn = false,
): string {
  const rows = studentsForClassExport(students, option, includeWithdrawn).map(
    (student) =>
      studentClassExportRowValues(formatStudentForClassExport(student, formatters)),
  );
  const lines = [studentClassExportHeaderValues(labels), ...rows].map((row) =>
    row.map(escapeCsvValue).join(','),
  );
  return `\uFEFF${lines.join('\r\n')}`;
}

export function slugifyExportToken(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'class';
}

export function studentClassExportFilename(
  className: string,
  academicYearLabel?: string | null,
): string {
  const classSlug = slugifyExportToken(className);
  const yearSlug = academicYearLabel?.trim()
    ? slugifyExportToken(academicYearLabel)
    : '';
  return yearSlug
    ? `students-${classSlug}-${yearSlug}.csv`
    : `students-${classSlug}.csv`;
}

export function downloadUtf8File(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadStudentClassCsv(
  csv: string,
  filename: string,
): void {
  downloadUtf8File(csv, filename, 'text/csv');
}

function classOptionFromStudent(
  student: StudentListItem,
): StudentClassExportOption | null {
  const name = student.class_name.trim();
  if (student.class_id) {
    return {
      id: student.class_id,
      name: name && name !== '—' ? name : student.class_id,
    };
  }
  if (name && name !== '—') {
    return { id: `${CLASS_EXPORT_NAME_PREFIX}${name}`, name };
  }
  return null;
}
