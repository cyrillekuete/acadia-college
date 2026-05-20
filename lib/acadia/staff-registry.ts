import { subSystemLabel } from '@/lib/acadia/education-system';

export type StaffListRow = {
  id: string;
  staffCode: string | null;
  title: string | null;
  employmentType: string;
  isActive: boolean;
  hireDate: string | null;
  createdAt: string;
  departmentId: string | null;
  departmentName: string | null;
  name: string;
  email: string | null;
  avatar: string | null;
  subsystem: string | null;
  subsystems: string[];
  subjects: string[];
};

export type StaffQuickFilterId = 'active_only' | 'new_this_week' | 'with_subjects';

export const STAFF_QUICK_FILTERS: Array<{ id: StaffQuickFilterId; label: string }> =
  [
    { id: 'active_only', label: 'Active only' },
    { id: 'new_this_week', label: 'New this week' },
    { id: 'with_subjects', label: 'With subjects' },
  ];

export type StaffRegistryFilters = {
  query: string;
  subSystem: string | null;
  subjectName: string | null;
  activeStatus: string | null;
  quickFilter: StaffQuickFilterId | null;
};

export const EMPTY_STAFF_REGISTRY_FILTERS: StaffRegistryFilters = {
  query: '',
  subSystem: null,
  subjectName: null,
  activeStatus: null,
  quickFilter: null,
};

export type StaffRegistryStats = {
  total: number;
  active: number;
  inactive: number;
  newLast7Days: number;
  subjectsCoveredCount: number;
  academicYearLabel: string;
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  ADJUNCT: 'Adjunct',
  VISITING: 'Visiting',
};

export function staffEmploymentLabel(type: string): string {
  return EMPLOYMENT_LABELS[type] ?? type;
}

function normalizeSubSystem(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase();
}

function matchesStaffQuickFilter(
  row: StaffListRow,
  quickFilter: StaffQuickFilterId,
): boolean {
  switch (quickFilter) {
    case 'active_only':
      return row.isActive;
    case 'with_subjects':
      return row.subjects.length > 0;
    case 'new_this_week': {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const reference = row.hireDate ?? row.createdAt;
      return reference ? new Date(reference) >= weekAgo : false;
    }
    default:
      return true;
  }
}

export function staffRegistryHasActiveFilters(filters: StaffRegistryFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.subSystem != null ||
    filters.subjectName != null ||
    filters.activeStatus != null ||
    filters.quickFilter != null
  );
}

export function filterStaffRegistry(
  rows: StaffListRow[],
  filters: StaffRegistryFilters,
): StaffListRow[] {
  const q = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.subSystem) {
      const want = filters.subSystem.toLowerCase();
      const matches =
        normalizeSubSystem(row.subsystem) === want ||
        row.subsystems.some((s) => normalizeSubSystem(s) === want);
      if (!matches) {
        return false;
      }
    }

    if (filters.subjectName && !row.subjects.includes(filters.subjectName)) {
      return false;
    }

    if (filters.activeStatus === 'active' && !row.isActive) {
      return false;
    }
    if (filters.activeStatus === 'inactive' && row.isActive) {
      return false;
    }

    if (filters.quickFilter && !matchesStaffQuickFilter(row, filters.quickFilter)) {
      return false;
    }

    if (!q) {
      return true;
    }

    return (
      row.name.toLowerCase().includes(q) ||
      (row.email?.toLowerCase().includes(q) ?? false) ||
      (row.staffCode?.toLowerCase().includes(q) ?? false)
    );
  });
}

export function computeStaffRegistryStats(
  rows: StaffListRow[],
  academicYearLabel?: string | null,
): StaffRegistryStats {
  const total = rows.length;
  const active = rows.filter((r) => r.isActive).length;
  const inactive = total - active;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newLast7Days = rows.filter((r) => {
    const reference = r.hireDate ?? r.createdAt;
    return reference ? new Date(reference) >= sevenDaysAgo : false;
  }).length;

  const subjectsCoveredCount = new Set(
    rows.flatMap((r) => r.subjects).filter(Boolean),
  ).size;

  return {
    total,
    active,
    inactive,
    newLast7Days,
    subjectsCoveredCount,
    academicYearLabel: academicYearLabel ?? '—',
  };
}

export function getStaffSubjectOptions(rows: StaffListRow[]): string[] {
  return Array.from(new Set(rows.flatMap((r) => r.subjects).filter(Boolean))).sort();
}

export function staffSubsystemDisplayLabel(
  subsystem: string | null,
  subsystems: string[],
): string {
  const unique = Array.from(
    new Set(
      [...subsystems, subsystem]
        .filter((s): s is string => Boolean(s))
        .map((s) => subSystemLabel(s)),
    ),
  ).filter((label) => label !== '—');

  if (unique.length === 0) {
    return '—';
  }
  return unique.join(', ');
}
