import type { StudentEnrollmentStatus } from '@/lib/acadia/student-list-item';

/** Filter value for students enrolled in the year without a class. */
export const UNASSIGNED_CLASS_FILTER = '__unassigned__';

export type EnrollmentPreferenceRow = {
  status: string;
  createdAt: string;
  classId?: string | null;
};

export type EnrollmentRowWithProfile = EnrollmentPreferenceRow & {
  profileId: string;
};

export function mapEnrollmentStatus(
  status: string | null | undefined,
  classId?: string | null,
): StudentEnrollmentStatus {
  if (status === 'ENROLLED') {
    return classId ? 'active' : 'pending';
  }
  if (!status) {
    return 'pending';
  }
  return 'inactive';
}

export function isPreferredEnrollment(
  current: EnrollmentPreferenceRow,
  candidate: EnrollmentPreferenceRow,
): boolean {
  const currentEnrolled = current.status === 'ENROLLED';
  const candidateEnrolled = candidate.status === 'ENROLLED';
  if (candidateEnrolled !== currentEnrolled) {
    return candidateEnrolled;
  }
  return (
    new Date(candidate.createdAt).getTime() > new Date(current.createdAt).getTime()
  );
}

export function pickPreferredEnrollment<T extends EnrollmentPreferenceRow>(
  rows: T[],
): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (!best || isPreferredEnrollment(best, row)) {
      best = row;
    }
  }
  return best;
}

export function pickPreferredEnrolledClassId<
  T extends { classId?: string | null; createdAt: string },
>(rows: T[]): string | null {
  let best: T | null = null;
  for (const row of rows) {
    if (!best) {
      best = row;
      continue;
    }
    const rowHasClass = Boolean(row.classId?.trim());
    const bestHasClass = Boolean(best.classId?.trim());
    if (rowHasClass !== bestHasClass) {
      if (rowHasClass) {
        best = row;
      }
      continue;
    }
    if (
      new Date(row.createdAt).getTime() > new Date(best.createdAt).getTime()
    ) {
      best = row;
    }
  }
  return best?.classId?.trim() || null;
}

export function collapseEnrollmentsByProfile<T extends EnrollmentRowWithProfile>(
  rows: T[],
): T[] {
  const byProfile = new Map<string, T>();
  for (const row of rows) {
    if (!row.profileId) {
      continue;
    }
    const existing = byProfile.get(row.profileId);
    if (!existing || isPreferredEnrollment(existing, row)) {
      byProfile.set(row.profileId, row);
    }
  }
  return Array.from(byProfile.values());
}

export function isOfficialRosterEnrollment(
  enrollmentStatus: StudentEnrollmentStatus,
): boolean {
  return enrollmentStatus === 'active' || enrollmentStatus === 'pending';
}
