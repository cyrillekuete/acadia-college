import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { ClassPromotionPolicyRow } from '@/lib/acadia/class-promotion-policy-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import type { PromotionFiltersValues } from '@/lib/acadia/promotion-schemas';

type Client = SupabaseClient<Database>;

export type ClassWithPolicy = {
  id: string;
  name: string;
  levelId: string;
  subSystem: string;
  branch: string;
  policy: ClassPromotionPolicyRow | null;
};

export async function fetchClassPromotionPolicies(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
): Promise<ClassPromotionPolicyRow[]> {
  const { data, error } = await supabase
    .from('ClassPromotionPolicy')
    .select(
      'id, classId, academicYearId, autoPromotionEnabled, minPromotionAverage, notes',
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    classId: row.classId,
    academicYearId: row.academicYearId,
    autoPromotionEnabled: row.autoPromotionEnabled,
    minPromotionAverage: Number(row.minPromotionAverage),
    notes: row.notes,
  }));
}

export async function copyClassPromotionPolicies(
  supabase: Client,
  tenantId: string,
  fromYearId: string,
  toYearId: string,
  userId: string,
): Promise<{ copied: number; skipped: number }> {
  const now = new Date().toISOString();
  const source = await fetchClassPromotionPolicies(supabase, tenantId, fromYearId);
  const existing = await fetchClassPromotionPolicies(supabase, tenantId, toYearId);
  const existingClassIds = new Set(existing.map((p) => p.classId));

  let copied = 0;
  let skipped = 0;

  for (const policy of source) {
    if (existingClassIds.has(policy.classId)) {
      skipped += 1;
      continue;
    }
    const { error } = await supabase.from('ClassPromotionPolicy').insert({
      id: generateAcadiaId('cppol'),
      tenantId,
      classId: policy.classId,
      academicYearId: toYearId,
      autoPromotionEnabled: policy.autoPromotionEnabled,
      minPromotionAverage: policy.minPromotionAverage,
      notes: policy.notes,
      createdAt: now,
      updatedAt: now,
    });
    if (error) {
      throw new Error(
        `Failed to copy promotion policy for class ${policy.classId}: ${error.message}`,
      );
    }
    copied += 1;
  }

  void userId;
  return { copied, skipped };
}

export async function fetchActiveClassesForPromotion(
  supabase: Client,
  tenantId: string,
  filters?: {
    subSystem?: string;
    branch?: string;
    levelId?: string;
  },
): Promise<
  {
    id: string;
    name: string;
    levelId: string;
    subSystem: string;
    branch: string;
  }[]
> {
  let query = supabase
    .from('Class')
    .select('id, name, levelId, subSystem, branch')
    .eq('tenantId', tenantId)
    .eq('status', 'ACTIVE')
    .order('name', { ascending: true });

  if (filters?.subSystem) {
    query = query.eq(
      'subSystem',
      filters.subSystem as Database['public']['Enums']['AcademicSubSystem'],
    );
  }
  if (filters?.branch) {
    query = query.eq(
      'branch',
      filters.branch as Database['public']['Enums']['AcademicBranch'],
    );
  }
  if (filters?.levelId) {
    query = query.eq('levelId', filters.levelId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function fetchClassPromotionPolicy(
  supabase: Client,
  tenantId: string,
  classId: string,
  academicYearId: string,
): Promise<ClassPromotionPolicyRow | null> {
  const { data, error } = await supabase
    .from('ClassPromotionPolicy')
    .select(
      'id, classId, academicYearId, autoPromotionEnabled, minPromotionAverage, notes',
    )
    .eq('tenantId', tenantId)
    .eq('classId', classId)
    .eq('academicYearId', academicYearId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    classId: data.classId,
    academicYearId: data.academicYearId,
    autoPromotionEnabled: data.autoPromotionEnabled,
    minPromotionAverage: Number(data.minPromotionAverage),
    notes: data.notes,
  };
}

export {
  fetchClassSubjectIds,
  fetchClassSubjectSelections,
} from '@/lib/supabase/queries/class-subjects';

export async function countEnrollmentsForClass(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  classId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('StudentEnrollment')
    .select('id', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('classId', classId)
    .eq('status', 'ENROLLED');

  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function fetchEnrollmentsForClassPromotion(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  classId: string,
) {
  const { data, error } = await supabase
    .from('StudentEnrollment')
    .select(
      `
      id,
      studentProfileId,
      subSystem,
      branch,
      levelId,
      classId,
      StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
        registrationNumber,
        User!StudentProfile_userId_tenantId_fkey ( name )
      )
    `,
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('classId', classId)
    .eq('status', 'ENROLLED');

  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function fetchUnassignedEnrollments(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  filters?: { subSystem?: string; branch?: string; levelId?: string },
) {
  let query = supabase
    .from('StudentEnrollment')
    .select(
      `
      studentProfileId,
      subSystem,
      branch,
      levelId,
      StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
        registrationNumber,
        User!StudentProfile_userId_tenantId_fkey ( name )
      )
    `,
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED')
    .is('classId', null);

  if (filters?.subSystem) {
    query = query.eq(
      'subSystem',
      filters.subSystem as Database['public']['Enums']['AcademicSubSystem'],
    );
  }
  if (filters?.branch) {
    query = query.eq(
      'branch',
      filters.branch as Database['public']['Enums']['AcademicBranch'],
    );
  }
  if (filters?.levelId) {
    query = query.eq('levelId', filters.levelId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function fetchClassesMissingPolicies(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
): Promise<{ classId: string; className: string; enrollmentCount: number }[]> {
  const { data: enrollments, error: enrollError } = await supabase
    .from('StudentEnrollment')
    .select('classId, Class!StudentEnrollment_classId_tenantId_fkey ( name )')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED')
    .not('classId', 'is', null);

  if (enrollError) {
    throw enrollError;
  }

  const policies = await fetchClassPromotionPolicies(
    supabase,
    tenantId,
    academicYearId,
  );
  const policyClassIds = new Set(policies.map((p) => p.classId));

  const byClass = new Map<string, { name: string; count: number }>();
  for (const row of enrollments ?? []) {
    const classId = row.classId as string;
    if (!classId || policyClassIds.has(classId)) {
      continue;
    }
    const classRel = row.Class as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(classRel)
      ? classRel[0]?.name
      : classRel?.name ?? classId;
    const existing = byClass.get(classId);
    if (existing) {
      existing.count += 1;
    } else {
      byClass.set(classId, { name: name ?? classId, count: 1 });
    }
  }

  return Array.from(byClass.entries()).map(([classId, { name, count }]) => ({
    classId,
    className: name,
    enrollmentCount: count,
  }));
}

export async function isPromotionYearLocked(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('StudentPromotionDecision')
    .select('id', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .not('appliedAt', 'is', null);

  if (error) {
    throw error;
  }
  return (count ?? 0) > 0;
}

export async function deleteAutoPromotionDecisionsForClass(
  supabase: Client,
  tenantId: string,
  classId: string,
  academicYearId: string,
): Promise<void> {
  const { error } = await supabase
    .from('StudentPromotionDecision')
    .delete()
    .eq('tenantId', tenantId)
    .eq('classId', classId)
    .eq('academicYearId', academicYearId)
    .eq('source', 'AUTO');

  if (error) {
    throw error;
  }
}

export async function markAutoDecisionsPolicyStale(
  supabase: Client,
  tenantId: string,
  classId: string,
  academicYearId: string,
  staleAt: string,
): Promise<void> {
  const { error } = await supabase
    .from('StudentPromotionDecision')
    .update({ policyStaleAt: staleAt, updatedAt: staleAt })
    .eq('tenantId', tenantId)
    .eq('classId', classId)
    .eq('academicYearId', academicYearId)
    .eq('source', 'AUTO');

  if (error) {
    throw error;
  }
}

export async function fetchPromotionDecisions(
  supabase: Client,
  tenantId: string,
  filters: { academicYearId: string; classId: string },
) {
  const enrollments = await fetchEnrollmentsForClassPromotion(
    supabase,
    tenantId,
    filters.academicYearId,
    filters.classId,
  );
  const enrolledStudentIds = new Set(
    enrollments.map((e) => e.studentProfileId as string),
  );

  const { data: decisions, error } = await supabase
    .from('StudentPromotionDecision')
    .select(
      `
      id,
      studentProfileId,
      yearAverage,
      recommendedAction,
      finalAction,
      source,
      targetLevelId,
      targetClassId,
      notes,
      policyMinAverage,
      policyStaleAt,
      classId,
      enrollmentId,
      StudentProfile!StudentPromotionDecision_studentProfileId_tenantId_fkey (
        registrationNumber,
        User!StudentProfile_userId_tenantId_fkey ( name )
      ),
      Level!StudentPromotionDecision_targetLevelId_tenantId_fkey ( number, labelEn, labelFr )
    `,
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', filters.academicYearId)
    .eq('classId', filters.classId)
    .order('yearAverage', { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  const decisionByStudent = new Map(
    (decisions ?? []).map((d) => [d.studentProfileId as string, d]),
  );

  const merged = enrollments.map((enrollment) => {
    const studentId = enrollment.studentProfileId as string;
    const decision = decisionByStudent.get(studentId);
    if (decision) {
      return {
        ...decision,
        enrollmentId: enrollment.id,
        isPending: false,
        isOrphan: false,
        classChangedSinceCompute:
          decision.classId !== enrollment.classId &&
          decision.source === 'AUTO',
      };
    }
    return {
      id: null,
      studentProfileId: studentId,
      yearAverage: null,
      recommendedAction: null,
      finalAction: null,
      source: null,
      targetLevelId: null,
      targetClassId: null,
      notes: null,
      policyMinAverage: null,
      policyStaleAt: null,
      classId: filters.classId,
      enrollmentId: enrollment.id,
      StudentProfile: enrollment.StudentProfile,
      Level: null,
      isPending: true,
      isOrphan: false,
      classChangedSinceCompute: false,
    };
  });

  const orphans = (decisions ?? []).filter(
    (d) => !enrolledStudentIds.has(d.studentProfileId as string),
  );

  return { rows: merged, orphans };
}

export async function fetchPromotionStatementRows(
  supabase: Client,
  tenantId: string,
  filters: { academicYearId: string; classId: string },
) {
  const { rows, orphans } = await fetchPromotionDecisions(
    supabase,
    tenantId,
    filters,
  );
  return [...rows, ...orphans.map((o) => ({ ...o, isOrphan: true, isPending: false }))];
}

export async function resolveClassIdsForBulkCompute(
  supabase: Client,
  tenantId: string,
  filters: PromotionFiltersValues,
): Promise<string[]> {
  if (filters.bulkMode === 'class') {
    return filters.classId ? [filters.classId] : [];
  }

  const { data: policies, error: policyError } = await supabase
    .from('ClassPromotionPolicy')
    .select('classId, autoPromotionEnabled')
    .eq('tenantId', tenantId)
    .eq('academicYearId', filters.academicYearId);

  if (policyError) {
    throw policyError;
  }

  const policyClassIds = new Set(
    (policies ?? [])
      .filter((p) => p.autoPromotionEnabled)
      .map((p) => p.classId as string),
  );

  if (filters.bulkMode === 'year') {
    return Array.from(policyClassIds);
  }

  const classes = await fetchActiveClassesForPromotion(supabase, tenantId, {
    subSystem: filters.subSystem,
    branch: filters.branch,
  });

  return classes
    .filter((c) => policyClassIds.has(c.id))
    .map((c) => c.id);
}
