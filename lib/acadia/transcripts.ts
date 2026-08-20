import {
  canWriteAcademicAdmin,
  isAdmin,
  isGuardian,
  isStaffOrTeacher,
  isStudent,
} from '@/lib/acadia/roles';
import { unwrapRelation } from '@/lib/acadia/record-display';

export const TRANSCRIPT_COPY_REQUEST_STATUSES = [
  'PENDING',
  'FULFILLED',
  'REJECTED',
] as const;

export const TRANSCRIPT_VERSION_STATUSES = [
  'PENDING',
  'READY',
  'FAILED',
] as const;

export type TranscriptCopyRequestStatus =
  (typeof TRANSCRIPT_COPY_REQUEST_STATUSES)[number];

export type TranscriptVersionStatus =
  (typeof TRANSCRIPT_VERSION_STATUSES)[number];

export type TranscriptListStatusFilter = 'all' | 'ready' | 'not-issued';

export type CopyRequestListStatusFilter =
  | 'all'
  | 'PENDING'
  | 'FULFILLED'
  | 'REJECTED';

export type TranscriptBadgeVariant =
  | 'success'
  | 'warning'
  | 'destructive'
  | 'secondary';

/** Admins (including bursar) and teaching staff may open transcript screens. */
export function canViewTranscripts(
  roleSlug: string | null | undefined,
): boolean {
  return isAdmin(roleSlug) || isStaffOrTeacher(roleSlug);
}

/** Writes match SQL `acadia_is_admin_or_registrar()` — bursar is view-only. */
export function canManageTranscripts(
  roleSlug: string | null | undefined,
): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/**
 * Registrar-filed copy requests (current UI + RLS).
 * Student/guardian self-service is not wired yet — see {@link canSelfRequestTranscriptCopy}.
 */
export function canRequestTranscriptCopy(
  roleSlug: string | null | undefined,
): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** Future self-service: students and guardians may submit once RLS allows INSERT. */
export function canSelfRequestTranscriptCopy(
  roleSlug: string | null | undefined,
): boolean {
  return isStudent(roleSlug) || isGuardian(roleSlug);
}

export function copyRequestBadgeVariant(
  status: string | null | undefined,
): TranscriptBadgeVariant {
  if (status === 'FULFILLED') {
    return 'success';
  }
  if (status === 'REJECTED') {
    return 'destructive';
  }
  if (status === 'PENDING') {
    return 'warning';
  }
  return 'secondary';
}

export function transcriptVersionBadgeVariant(
  status: string | null | undefined,
): TranscriptBadgeVariant {
  if (status === 'READY') {
    return 'success';
  }
  if (status === 'FAILED') {
    return 'destructive';
  }
  if (status === 'PENDING') {
    return 'warning';
  }
  return 'secondary';
}

export function canResolveCopyRequest(
  currentStatus: string,
  nextStatus: string,
): boolean {
  return (
    currentStatus === 'PENDING' &&
    (nextStatus === 'FULFILLED' || nextStatus === 'REJECTED')
  );
}

export function hasDuplicatePendingCopyRequest(
  existing: ReadonlyArray<{
    id?: string;
    studentProfileId: string;
    status: string;
  }>,
  studentProfileId: string,
  excludeId?: string | null,
): boolean {
  const target = studentProfileId.trim();
  if (!target) {
    return false;
  }
  return existing.some(
    (row) =>
      row.status === 'PENDING' &&
      row.studentProfileId === target &&
      row.id !== excludeId,
  );
}

export function canFulfillCopyRequest(input: {
  hasReadyTranscript: boolean;
  versionStatus?: string | null;
}): boolean {
  if (!input.hasReadyTranscript) {
    return false;
  }
  if (input.versionStatus && input.versionStatus !== 'READY') {
    return false;
  }
  return true;
}

export function assertCopyRequestRejectNote(
  status: string,
  note: string | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (status !== 'REJECTED') {
    return { ok: true };
  }
  if (note?.trim()) {
    return { ok: true };
  }
  return { ok: false, message: 'A rejection reason is required.' };
}

export function shouldWarnFeeHold(balanceMinor: number | null | undefined): boolean {
  return (balanceMinor ?? 0) > 0;
}

export function transcriptIdentityKey(input: {
  studentProfileId: string;
  academicYearId: string;
  termId: string;
}): string {
  return `${input.studentProfileId.trim()}::${input.academicYearId.trim()}::${input.termId.trim()}`;
}

export function findDuplicateTranscript<
  T extends {
    id: string;
    studentProfileId: string;
    academicYearId: string;
    termId: string;
  },
>(
  existing: readonly T[],
  candidate: {
    studentProfileId: string;
    academicYearId: string;
    termId: string;
  },
  excludeId?: string | null,
): T | null {
  const key = transcriptIdentityKey(candidate);
  return (
    existing.find(
      (row) => row.id !== excludeId && transcriptIdentityKey(row) === key,
    ) ?? null
  );
}

export function isIssuedTranscript(version: {
  status?: string | null;
  issuedAt?: string | null;
} | null | undefined): boolean {
  if (!version) {
    return false;
  }
  return version.status === 'READY' && Boolean(version.issuedAt?.trim());
}

export function nextTranscriptVersionNumber(
  versions: ReadonlyArray<{ versionNumber?: number | null }>,
): number {
  const max = versions.reduce(
    (highest, row) => Math.max(highest, Number(row.versionNumber ?? 0)),
    0,
  );
  return max + 1;
}

export function canReissueTranscript(
  currentStatus: string | null | undefined,
): boolean {
  return currentStatus === 'READY' || currentStatus === 'FAILED';
}

export function canIssueReadyTranscript(input: {
  marksComplete: boolean;
  overrideIncompleteMarks?: boolean;
}): boolean {
  return input.marksComplete || Boolean(input.overrideIncompleteMarks);
}

export function reissueRequiresReason(
  reason: string | null | undefined,
): boolean {
  return !reason?.trim();
}

export type TranscriptListRow = {
  id: string;
  currentVersionId?: string | null;
  StudentProfile?: unknown;
  AcademicYear?: unknown;
  Term?: unknown;
  TranscriptVersion?: unknown;
} & Record<string, unknown>;

export type CopyRequestListRow = {
  id: string;
  status?: string;
  createdAt?: string;
  note?: string | null;
  studentProfileId?: string;
  StudentProfile?: unknown;
  RequestedBy?: unknown;
  ResolvedBy?: unknown;
} & Record<string, unknown>;

export function currentTranscriptVersion(row: TranscriptListRow) {
  return unwrapRelation<{
    issuedAt?: string | null;
    status?: string | null;
    versionNumber?: number | null;
  }>(row.TranscriptVersion);
}

export function transcriptRowMatchesStatusFilter(
  row: TranscriptListRow,
  filter: TranscriptListStatusFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }
  const issued = isIssuedTranscript(currentTranscriptVersion(row));
  if (filter === 'ready') {
    return issued;
  }
  return !issued;
}

export function transcriptMatchesSearch(
  row: TranscriptListRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const profile = unwrapRelation<{
    registrationNumber?: string;
    matriculeNumber?: string;
    User?: unknown;
  }>(row.StudentProfile);
  const user = unwrapRelation<{ name?: string }>(profile?.User);
  const version = currentTranscriptVersion(row);
  const haystack = [
    user?.name,
    profile?.registrationNumber,
    profile?.matriculeNumber,
    version?.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function copyRequestRowMatchesStatusFilter(
  row: CopyRequestListRow,
  filter: CopyRequestListStatusFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }
  return String(row.status ?? 'PENDING') === filter;
}

export function copyRequestMatchesSearch(
  row: CopyRequestListRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const profile = unwrapRelation<{
    registrationNumber?: string;
    matriculeNumber?: string;
    User?: unknown;
  }>(row.StudentProfile);
  const user = unwrapRelation<{ name?: string }>(profile?.User);
  const requester = unwrapRelation<{ name?: string }>(row.RequestedBy);
  const haystack = [
    user?.name,
    profile?.registrationNumber,
    profile?.matriculeNumber,
    requester?.name,
    row.status,
    row.note,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function copyRequestMatchesStudentSet(
  studentProfileId: string | null | undefined,
  allowedIds: ReadonlySet<string> | null,
): boolean {
  if (!allowedIds) {
    return true;
  }
  const id = studentProfileId?.trim() ?? '';
  return Boolean(id) && allowedIds.has(id);
}

export function copyRequestStudentStanding(input: {
  isActive?: boolean | null;
  alumniSince?: string | null;
}): 'alumni' | 'inactive' | 'active' {
  if (input.alumniSince?.trim()) {
    return 'alumni';
  }
  if (input.isActive === false) {
    return 'inactive';
  }
  return 'active';
}
