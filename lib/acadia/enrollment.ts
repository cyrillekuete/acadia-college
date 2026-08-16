import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { EnrollmentApplicationInput } from '@/lib/acadia/enrollment-schemas';

export function applicantDisplayName(
  firstNameEn?: string | null,
  lastNameEn?: string | null,
  firstNameFr?: string | null,
  lastNameFr?: string | null,
): string {
  const en = [firstNameEn, lastNameEn].filter(Boolean).join(' ').trim();
  if (en) {
    return en;
  }
  const fr = [firstNameFr, lastNameFr].filter(Boolean).join(' ').trim();
  return fr || 'Applicant';
}

export function generateRegistrationNumber(academicYearLabel?: string): string {
  const yearPart =
    academicYearLabel?.replace(/\D/g, '').slice(-4) ||
    String(new Date().getFullYear());
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `AC-${yearPart}-${suffix}`;
}

/** Optional ministry matricule from manual input only (never auto-generated). */
export function normalizeMatriculeNumber(
  value: string | undefined | null,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildEnrollmentApplicationRow(
  tenantId: string,
  id: string,
  values: EnrollmentApplicationInput,
  now: string,
) {
  return {
    id,
    tenantId,
    kind: values.kind,
    status: 'PENDING' as const,
    studentProfileId:
      values.kind === 'RE_ENROLL' && values.studentProfileId?.trim()
        ? values.studentProfileId.trim()
        : null,
    firstNameEn: values.firstNameEn.trim(),
    firstNameFr: values.firstNameFr?.trim() || null,
    lastNameEn: values.lastNameEn.trim(),
    lastNameFr: values.lastNameFr?.trim() || null,
    email: values.email.trim().toLowerCase(),
    phone: values.phone?.trim() || null,
    dateOfBirth: values.dateOfBirth ?? null,
    levelId: values.levelId,
    academicYearId: values.academicYearId,
    subSystem: values.subSystem as AcademicSubSystem,
    branch: values.branch as AcademicBranch,
    preferredLocale: values.preferredLocale,
    updatedAt: now,
  };
}

export function canEditEnrollmentApplication(status: string | undefined): boolean {
  return status === 'PENDING';
}

export const ENROLLMENT_APPLICATIONS_PATH = '/enrollment/applications';
export const ENROLLMENT_APPLICATION_ID_PARAM = 'applicationId';
export const ENROLLMENT_APPLICATION_VIEW_PARAM = 'view';

export type EnrollmentApplicationView = 'review' | 'edit' | 'confirmation';

export function parseEnrollmentApplicationView(
  raw: string | null | undefined,
): EnrollmentApplicationView {
  if (raw === 'edit' || raw === 'confirmation') {
    return raw;
  }
  return 'review';
}

export function enrollmentApplicationsHref(
  applicationId?: string | null,
  view?: EnrollmentApplicationView,
): string {
  const id = applicationId?.trim();
  if (!id) {
    return ENROLLMENT_APPLICATIONS_PATH;
  }
  const params = new URLSearchParams({
    [ENROLLMENT_APPLICATION_ID_PARAM]: id,
  });
  if (view && view !== 'review') {
    params.set(ENROLLMENT_APPLICATION_VIEW_PARAM, view);
  }
  return `${ENROLLMENT_APPLICATIONS_PATH}?${params.toString()}`;
}
