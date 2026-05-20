import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { throwMutationError } from '@/lib/acadia/query-errors';

type Client = SupabaseClient<Database>;

export type LevelDeleteBlockers = {
  classes: number;
  classEnrollments: number;
  promotionClassRefs: number;
  enrollments: number;
  applications: number;
  subjects: number;
  subjectLevels: number;
  subjectOfferings: number;
  terms: number;
  studentProfiles: number;
  promotionFrom: number;
  promotionTarget: number;
};

type LevelBlockerCountTable =
  | 'StudentEnrollment'
  | 'EnrollmentApplication'
  | 'Subject'
  | 'SubjectLevel'
  | 'SubjectSpecialtyOffering'
  | 'Term'
  | 'StudentProfile'
  | 'StudentPromotionDecision';

async function countRows(
  supabase: Client,
  table: LevelBlockerCountTable,
  tenantId: string,
  column: string,
  value: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq(column, value);

  if (error) {
    throwMutationError(error);
  }
  return count ?? 0;
}

export async function fetchLevelDeleteBlockers(
  supabase: Client,
  tenantId: string,
  levelId: string,
): Promise<LevelDeleteBlockers> {
  const { data: classes, error: classError } = await supabase
    .from('Class')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('levelId', levelId);

  if (classError) {
    throwMutationError(classError);
  }

  const classIds = (classes ?? []).map((row) => row.id as string);
  let classEnrollments = 0;
  let promotionClassRefs = 0;
  if (classIds.length > 0) {
    const { count: enrollmentCount, error: enrollmentError } = await supabase
      .from('StudentEnrollment')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)
      .in('classId', classIds);
    if (enrollmentError) {
      throwMutationError(enrollmentError);
    }
    classEnrollments = enrollmentCount ?? 0;

    const { count: fromClassCount, error: fromClassError } = await supabase
      .from('StudentPromotionDecision')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)
      .in('classId', classIds);
    if (fromClassError) {
      throwMutationError(fromClassError);
    }

    const { count: targetClassCount, error: targetClassError } = await supabase
      .from('StudentPromotionDecision')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)
      .in('targetClassId', classIds);
    if (targetClassError) {
      throwMutationError(targetClassError);
    }

    promotionClassRefs = (fromClassCount ?? 0) + (targetClassCount ?? 0);
  }

  const [
    enrollments,
    applications,
    subjects,
    subjectLevels,
    subjectOfferings,
    terms,
    studentProfiles,
    promotionFrom,
    promotionTarget,
  ] = await Promise.all([
    countRows(supabase, 'StudentEnrollment', tenantId, 'levelId', levelId),
    countRows(supabase, 'EnrollmentApplication', tenantId, 'levelId', levelId),
    countRows(supabase, 'Subject', tenantId, 'levelId', levelId),
    countRows(supabase, 'SubjectLevel', tenantId, 'levelId', levelId),
    countRows(supabase, 'SubjectSpecialtyOffering', tenantId, 'levelId', levelId),
    countRows(supabase, 'Term', tenantId, 'levelId', levelId),
    countRows(supabase, 'StudentProfile', tenantId, 'currentLevelId', levelId),
    countRows(supabase, 'StudentPromotionDecision', tenantId, 'fromLevelId', levelId),
    countRows(supabase, 'StudentPromotionDecision', tenantId, 'targetLevelId', levelId),
  ]);

  return {
    classes: classIds.length,
    classEnrollments,
    promotionClassRefs,
    enrollments,
    applications,
    subjects,
    subjectLevels,
    subjectOfferings,
    terms,
    studentProfiles,
    promotionFrom,
    promotionTarget,
  };
}

export function formatLevelDeleteBlockers(blockers: LevelDeleteBlockers): string[] {
  const lines: string[] = [];
  if (blockers.classes > 0) {
    const extras: string[] = [];
    if (blockers.classEnrollments > 0) {
      extras.push(`${blockers.classEnrollments} student enrollment(s) on those classes`);
    }
    if (blockers.promotionClassRefs > 0) {
      extras.push(`${blockers.promotionClassRefs} promotion decision(s) tied to those classes`);
    }
    lines.push(
      `${blockers.classes} class(es)${extras.length > 0 ? ` (${extras.join('; ')})` : ''}`,
    );
  }
  if (blockers.enrollments > 0) {
    lines.push(`${blockers.enrollments} student enrollment(s) at this level`);
  }
  if (blockers.applications > 0) {
    lines.push(`${blockers.applications} enrollment application(s)`);
  }
  const subjectRefs = blockers.subjects + blockers.subjectLevels;
  if (subjectRefs > 0) {
    lines.push(`${subjectRefs} subject level link(s) in the catalog`);
  }
  if (blockers.subjectOfferings > 0) {
    lines.push(`${blockers.subjectOfferings} subject specialty offering(s)`);
  }
  if (blockers.terms > 0) {
    lines.push(`${blockers.terms} term record(s)`);
  }
  if (blockers.studentProfiles > 0) {
    lines.push(`${blockers.studentProfiles} student profile(s) with this as current level`);
  }
  if (blockers.promotionFrom > 0 || blockers.promotionTarget > 0) {
    lines.push(
      `${blockers.promotionFrom + blockers.promotionTarget} promotion decision(s) referencing this level`,
    );
  }
  return lines;
}

export function canCascadeDeleteClasses(blockers: LevelDeleteBlockers): boolean {
  return (
    blockers.classes > 0 &&
    blockers.classEnrollments === 0 &&
    blockers.promotionClassRefs === 0 &&
    blockers.enrollments === 0 &&
    blockers.applications === 0 &&
    blockers.subjects === 0 &&
    blockers.subjectLevels === 0 &&
    blockers.subjectOfferings === 0 &&
    blockers.terms === 0 &&
    blockers.studentProfiles === 0 &&
    blockers.promotionFrom === 0 &&
    blockers.promotionTarget === 0
  );
}

export function hasNonClassBlockers(blockers: LevelDeleteBlockers): boolean {
  return (
    blockers.enrollments > 0 ||
    blockers.applications > 0 ||
    blockers.subjects > 0 ||
    blockers.subjectLevels > 0 ||
    blockers.subjectOfferings > 0 ||
    blockers.terms > 0 ||
    blockers.studentProfiles > 0 ||
    blockers.promotionFrom > 0 ||
    blockers.promotionTarget > 0 ||
    blockers.classEnrollments > 0 ||
    blockers.promotionClassRefs > 0
  );
}

export async function deleteClassesForLevel(
  supabase: Client,
  tenantId: string,
  levelId: string,
): Promise<number> {
  const { data: classes, error: classError } = await supabase
    .from('Class')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('levelId', levelId);

  if (classError) {
    throwMutationError(classError);
  }

  const classIds = (classes ?? []).map((row) => row.id as string);
  if (classIds.length === 0) {
    return 0;
  }

  const { error: policyError } = await supabase
    .from('ClassPromotionPolicy')
    .delete()
    .eq('tenantId', tenantId)
    .in('classId', classIds);
  if (policyError) {
    throwMutationError(policyError);
  }

  const { error: subjectLinkError } = await supabase
    .from('ClassSubject')
    .delete()
    .eq('tenantId', tenantId)
    .in('classId', classIds);
  if (subjectLinkError) {
    throwMutationError(subjectLinkError);
  }

  const { error: classDeleteError } = await supabase
    .from('Class')
    .delete()
    .eq('tenantId', tenantId)
    .eq('levelId', levelId);
  if (classDeleteError) {
    throwMutationError(classDeleteError);
  }

  return classIds.length;
}

export function buildLevelDeleteBlockedMessage(blockers: LevelDeleteBlockers): string {
  const lines = formatLevelDeleteBlockers(blockers);
  if (lines.length === 0) {
    return 'This level cannot be deleted because other records still reference it.';
  }
  return `This level cannot be deleted until these are removed or reassigned:\n• ${lines.join('\n• ')}`;
}
