import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

export type ClassResolutionStatus = 'resolved' | 'ambiguous' | 'none';

export type ClassResolutionResult = {
  status: ClassResolutionStatus;
  classId: string | null;
  candidateIds: string[];
};

/** Resolve class for enrollment by level and academic stream (sub-system + branch). */
export async function resolveClassForEnrollment(
  supabase: Client,
  tenantId: string,
  levelId: string,
  subSystem: AcademicSubSystem,
  branch: AcademicBranch,
): Promise<ClassResolutionResult> {
  const { data, error } = await supabase
    .from('Class')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('levelId', levelId)
    .eq('subSystem', subSystem)
    .eq('branch', branch)
    .eq('status', 'ACTIVE');

  if (error) {
    throw error;
  }

  const candidateIds = (data ?? []).map((r) => r.id as string);

  if (candidateIds.length === 1) {
    return { status: 'resolved', classId: candidateIds[0]!, candidateIds };
  }
  if (candidateIds.length === 0) {
    return { status: 'none', classId: null, candidateIds: [] };
  }
  return { status: 'ambiguous', classId: null, candidateIds };
}

/** When exactly one active class matches level + stream, return its id. */
export async function resolveClassIdForEnrollment(
  supabase: Client,
  tenantId: string,
  levelId: string,
  subSystem: AcademicSubSystem,
  branch: AcademicBranch,
): Promise<string | null> {
  const result = await resolveClassForEnrollment(
    supabase,
    tenantId,
    levelId,
    subSystem,
    branch,
  );
  return result.status === 'resolved' ? result.classId : null;
}
