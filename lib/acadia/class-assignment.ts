import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

export type ClassResolutionStatus = 'resolved' | 'ambiguous' | 'none';

export type ClassResolutionResult = {
  status: ClassResolutionStatus;
  classId: string | null;
  candidateIds: string[];
};

export function pickMatches(
  rows: { id: string; specialtyId: string | null }[],
  specialtyId: string,
): { id: string; specialtyId: string | null }[] {
  const specialtyMatches = rows.filter((r) => r.specialtyId === specialtyId);
  if (specialtyMatches.length > 0) {
    return specialtyMatches;
  }
  return rows.filter((r) => r.specialtyId == null);
}

/** Resolve class for enrollment: prefer exact specialty, else level-only (null specialty). */
export async function resolveClassForEnrollment(
  supabase: Client,
  tenantId: string,
  levelId: string,
  specialtyId: string,
): Promise<ClassResolutionResult> {
  const { data, error } = await supabase
    .from('Class')
    .select('id, specialtyId')
    .eq('tenantId', tenantId)
    .eq('levelId', levelId)
    .eq('status', 'ACTIVE');

  if (error) {
    throw error;
  }

  const rows = (data ?? []).map((r) => ({
    id: r.id as string,
    specialtyId: r.specialtyId as string | null,
  }));

  const matches = pickMatches(rows, specialtyId);
  const candidateIds = matches.map((m) => m.id);

  if (matches.length === 1) {
    return { status: 'resolved', classId: matches[0].id, candidateIds };
  }
  if (matches.length === 0) {
    return { status: 'none', classId: null, candidateIds: [] };
  }
  return { status: 'ambiguous', classId: null, candidateIds };
}

/** When exactly one active class matches level + specialty rules, return its id. */
export async function resolveClassIdForEnrollment(
  supabase: Client,
  tenantId: string,
  levelId: string,
  specialtyId: string,
): Promise<string | null> {
  const result = await resolveClassForEnrollment(
    supabase,
    tenantId,
    levelId,
    specialtyId,
  );
  return result.status === 'resolved' ? result.classId : null;
}
