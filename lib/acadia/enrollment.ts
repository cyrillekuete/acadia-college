import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { EnrollmentApplicationFormValues } from '@/lib/acadia/enrollment-schemas';

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

/** Matricule for manual student create; uses override when provided. */
export function resolveStudentMatricule(
  override: string | undefined,
  academicYearLabel?: string,
): string {
  const trimmed = override?.trim();
  if (trimmed) {
    return trimmed;
  }
  return generateRegistrationNumber(academicYearLabel);
}

export function buildEnrollmentApplicationRow(
  tenantId: string,
  id: string,
  values: EnrollmentApplicationFormValues,
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
    specialtyId: values.specialtyId,
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
