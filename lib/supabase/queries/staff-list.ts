import type { SupabaseClient } from '@supabase/supabase-js';
import type { StaffListRow } from '@/lib/acadia/staff-registry';
import { subSystemLabel } from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';

const STAFF_LIST_SELECT = `
  id,
  staffCode,
  title,
  employmentType,
  isActive,
  hireDate,
  createdAt,
  departmentId,
  Department!StaffProfile_departmentId_tenantId_fkey ( nameEn, nameFr ),
  User!StaffProfile_userId_tenantId_fkey ( name, email, avatar ),
  SubjectAssignment!SubjectAssignment_staffProfileId_tenantId_fkey (
    academicYearId,
    Subject!SubjectAssignment_subjectId_tenantId_fkey (
      nameEn,
      code,
      Specialty!Subject_specialtyId_tenantId_fkey ( subSystem )
    )
  )
`;

type SubjectNested = {
  nameEn?: string;
  code?: string;
  Specialty?: unknown;
};

type AssignmentNested = {
  Subject?: unknown;
};

type StaffListDbRow = {
  id: string;
  staffCode: string | null;
  title: string | null;
  employmentType: string;
  isActive: boolean;
  hireDate: string | null;
  createdAt: string;
  departmentId: string | null;
  Department: unknown;
  User: unknown;
  SubjectAssignment: unknown;
};

function departmentName(dept: unknown): string | null {
  const row = unwrapRelation<{ nameEn?: string; nameFr?: string }>(dept);
  if (!row) return null;
  return row.nameEn ?? row.nameFr ?? null;
}

function subjectDisplayName(subject: SubjectNested | null): string | null {
  if (!subject) return null;
  return subject.nameEn ?? subject.code ?? null;
}

function aggregateAssignments(
  assignments: unknown,
  academicYearId?: string | null,
): {
  subjects: string[];
  subsystems: string[];
} {
  const raw = Array.isArray(assignments)
    ? assignments
    : assignments
      ? [assignments]
      : [];

  const subjects = new Set<string>();
  const subsystems = new Set<string>();

  for (const item of raw) {
    const assignment = item as AssignmentNested & { academicYearId?: string };
    if (academicYearId && assignment.academicYearId !== academicYearId) {
      continue;
    }
    const subject = unwrapRelation<SubjectNested>(assignment.Subject);
    const name = subjectDisplayName(subject);
    if (name) {
      subjects.add(name);
    }

    const specialty = unwrapRelation<{ subSystem?: string }>(subject?.Specialty);
    if (specialty?.subSystem) {
      subsystems.add(specialty.subSystem);
    }
  }

  return {
    subjects: Array.from(subjects).sort(),
    subsystems: Array.from(subsystems),
  };
}

function deriveSubsystemDisplay(subsystems: string[]): string | null {
  if (subsystems.length === 0) {
    return null;
  }
  const labels = subsystems.map((s) => subSystemLabel(s)).filter((l) => l !== '—');
  if (labels.length === 0) {
    return null;
  }
  return labels.join(', ');
}

function mapRow(row: StaffListDbRow, academicYearId?: string | null): StaffListRow {
  const user = unwrapRelation<{ name?: string; email?: string; avatar?: string }>(
    row.User,
  );
  const { subjects, subsystems } = aggregateAssignments(
    row.SubjectAssignment,
    academicYearId,
  );

  return {
    id: row.id,
    staffCode: row.staffCode,
    title: row.title,
    employmentType: row.employmentType,
    isActive: row.isActive,
    hireDate: row.hireDate,
    createdAt: row.createdAt,
    departmentId: row.departmentId,
    departmentName: departmentName(row.Department),
    name: user?.name ?? row.staffCode ?? 'Staff member',
    email: user?.email ?? null,
    avatar: user?.avatar ? `/media/avatars/${user.avatar}` : null,
    subjects,
    subsystems,
    subsystem: deriveSubsystemDisplay(subsystems),
  };
}

export async function fetchStaffList(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId?: string | null,
): Promise<StaffListRow[]> {
  const { data, error } = await supabase
    .from('StaffProfile')
    .select(STAFF_LIST_SELECT)
    .eq('tenantId', tenantId)
    .order('createdAt', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRow(row as StaffListDbRow, academicYearId));
}

export type DepartmentOption = { id: string; name: string };

export async function fetchDepartmentOptions(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<DepartmentOption[]> {
  const { data, error } = await supabase
    .from('Department')
    .select('id, nameEn, nameFr')
    .eq('tenantId', tenantId)
    .order('nameEn', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.nameEn as string) ?? (row.nameFr as string) ?? row.id,
  }));
}
