import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { Database } from '@/lib/supabase/database.types';
import {
  findOverlappingVariant,
  OVERLAPPING_VARIANT_MESSAGE,
  type SubjectVariantCandidate,
} from '@/lib/acadia/subject-variants';

type Client = SupabaseClient<Database>;

export async function assertNoOverlappingSubjectVariant(
  supabase: Client,
  tenantId: string,
  next: {
    id?: string;
    nameEn: string;
    subSystem: string;
    branch: string;
    academicYearId: string;
    levelIds: string[];
  },
): Promise<void> {
  const { data, error } = await supabase
    .from('Subject')
    .select(
      `
      id,
      nameEn,
      subSystem,
      branch,
      academicYearId,
      levelId,
      SubjectLevel ( levelId )
    `,
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', next.academicYearId)
    .eq('subSystem', next.subSystem as AcademicSubSystem)
    .eq('branch', next.branch as AcademicBranch);

  if (error) {
    throw error;
  }

  const existing: SubjectVariantCandidate[] = (data ?? []).map((row) => ({
    id: row.id as string,
    nameEn: row.nameEn as string,
    subSystem: row.subSystem as string,
    branch: row.branch as string,
    academicYearId: (row.academicYearId as string | null) ?? null,
    levelIds: Array.isArray(row.SubjectLevel) && row.SubjectLevel.length > 0
      ? row.SubjectLevel.map((level) => level.levelId as string)
      : row.levelId
        ? [row.levelId as string]
        : [],
  }));

  const overlap = findOverlappingVariant(existing, next);
  if (overlap) {
    throw new Error(OVERLAPPING_VARIANT_MESSAGE);
  }
}

export async function copySubjectAssignments(
  supabase: Client,
  tenantId: string,
  sourceSubjectId: string,
  targetSubjectId: string,
  now: string,
  generateId: (prefix: string) => string,
): Promise<void> {
  const { data, error } = await supabase
    .from('SubjectAssignment')
    .select(
      'academicYearId, staffProfileId, isLead, teachesPrimaryHome, notes',
    )
    .eq('tenantId', tenantId)
    .eq('subjectId', sourceSubjectId);

  if (error) {
    throw error;
  }
  if (!data?.length) {
    return;
  }

  const { error: insertError } = await supabase.from('SubjectAssignment').insert(
    data.map((row) => ({
      id: generateId('assign'),
      tenantId,
      subjectId: targetSubjectId,
      academicYearId: row.academicYearId,
      staffProfileId: row.staffProfileId,
      isLead: row.isLead,
      teachesPrimaryHome: row.teachesPrimaryHome,
      notes: row.notes,
      createdAt: now,
      updatedAt: now,
    })),
  );
  if (insertError) {
    throw insertError;
  }
}
