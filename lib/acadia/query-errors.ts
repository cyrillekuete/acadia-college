import { translate } from '@/lib/acadia/locale';
import { CUSTOM_DOMAIN_IN_USE_MESSAGE } from '@/lib/acadia/tenant-profile';

function readErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error !== null &&
    error !== undefined &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return null;
}

function readErrorCode(error: unknown): string | null {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

function friendlyPostgresMessage(code: string, rawMessage: string): string | null {
  if (code === '23505') {
    if (rawMessage.includes('Class_tenantId_subSystem_branch_name_key')) {
      return translate('errors.classNameExists');
    }
    if (rawMessage.includes('Subject_tenant_year_code_uidx')) {
      return translate('errors.subjectCodeExists');
    }
    if (rawMessage.includes('SubjectAssignment_tenant_subject_staff_year_uidx')) {
      return translate('errors.subjectTeacherAssigned');
    }
    if (rawMessage.includes('SubjectAssignment_one_lead_uidx')) {
      return translate('errors.subjectLeadExists');
    }
    if (
      rawMessage.includes('SubjectGrouping_tenant_lower_code_uidx') ||
      rawMessage.includes('SubjectGrouping_tenantId_code_key')
    ) {
      return translate('errors.groupingCodeExists');
    }
    if (rawMessage.includes('AcademicYear_tenant_current_uidx')) {
      return translate('errors.currentYearExists');
    }
    if (
      rawMessage.includes('ExamSession_normal_sequence_uidx') ||
      rawMessage.includes('ExamSession_resit_sequence_uidx') ||
      rawMessage.includes('ExamSession_major_type_uidx')
    ) {
      return translate('errors.examSessionExists');
    }
    if (rawMessage.includes('StudentEnrollment_tenant_student_year_enrolled_uidx')) {
      return translate('errors.studentAlreadyEnrolled');
    }
    if (rawMessage.includes('Tenant_customDomain_uidx')) {
      return CUSTOM_DOMAIN_IN_USE_MESSAGE;
    }
    return translate('errors.duplicateRecord');
  }
  if (code === '42501') {
    return translate('errors.permissionDenied');
  }
  if (code === '23503') {
    if (rawMessage.includes('Level') || rawMessage.includes('levelId')) {
      return translate('errors.levelInUse');
    }
    return translate('errors.recordInUse');
  }
  return null;
}

export function isMissingRelationError(error: unknown): boolean {
  const code = readErrorCode(error);
  if (code === 'PGRST205' || code === '42P01') {
    return true;
  }
  const message = readErrorMessage(error);
  if (!message) {
    return false;
  }
  return (
    /could not find the table/i.test(message) ||
    /schema cache/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

export function getQueryErrorMessage(error: unknown): string {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);
  if (code && message) {
    const friendly = friendlyPostgresMessage(code, message);
    if (friendly) {
      return friendly;
    }
  }
  if (message) {
    return message;
  }
  return translate('errors.failedToLoad', { defaultValue: 'Failed to load data.' });
}

export function getMutationErrorMessage(
  error: unknown,
  fallback = 'Operation failed.',
): string {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);
  if (code && message) {
    const friendly = friendlyPostgresMessage(code, message);
    if (friendly) {
      return friendly;
    }
  }
  if (message) {
    return message;
  }
  return translate('errors.operationFailed', { defaultValue: fallback });
}

export function throwMutationError(error: unknown, fallback?: string): never {
  throw new Error(getMutationErrorMessage(error, fallback));
}
