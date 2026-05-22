import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import {
  subjectMatchesClass,
  type ClassSubjectEligibilityClass,
  type ClassSubjectEligibilitySubject,
} from '@/lib/acadia/class-subject-eligibility';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { fetchSubjectLevelIds } from '@/lib/supabase/queries/subject-levels';

type Client = SupabaseClient<Database>;

export async function fetchClassSubjectIds(
  supabase: Client,
  tenantId: string,
  classId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('ClassSubject')
    .select('subjectId')
    .eq('tenantId', tenantId)
    .eq('classId', classId);

  if (error) {
    throw error;
  }
  return (data ?? []).map((r) => r.subjectId as string);
}

export async function insertClassSubjects(
  supabase: Client,
  tenantId: string,
  classId: string,
  subjectIds: string[],
): Promise<void> {
  if (subjectIds.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from('ClassSubject').insert(
    subjectIds.map((subjectId) => ({
      id: generateAcadiaId('csj'),
      tenantId,
      classId,
      subjectId,
      createdAt: now,
    })),
  );
  if (error) {
    throw error;
  }
}

export async function syncClassSubjects(
  supabase: Client,
  tenantId: string,
  classId: string,
  subjectIds: string[],
): Promise<void> {
  const existing = await fetchClassSubjectIds(supabase, tenantId, classId);
  const nextSet = new Set(subjectIds);
  const toRemove = existing.filter((id) => !nextSet.has(id));
  const existingSet = new Set(existing);
  const toAdd = subjectIds.filter((id) => !existingSet.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('ClassSubject')
      .delete()
      .eq('tenantId', tenantId)
      .eq('classId', classId)
      .in('subjectId', toRemove);
    if (error) {
      throw error;
    }
  }

  await insertClassSubjects(supabase, tenantId, classId, toAdd);
}

export type BulkAssignClassSubjectsResult = {
  added: number;
  skippedDuplicate: number;
  skippedIneligible: number;
};

export async function bulkAssignClassSubjects(
  supabase: Client,
  tenantId: string,
  classIds: string[],
  subjectIds: string[],
  options?: { academicYearId?: string | null },
): Promise<BulkAssignClassSubjectsResult> {
  const uniqueClassIds = Array.from(new Set(classIds.filter((id) => id.trim())));
  const uniqueSubjectIds = Array.from(new Set(subjectIds.filter((id) => id.trim())));

  if (uniqueClassIds.length === 0 || uniqueSubjectIds.length === 0) {
    return { added: 0, skippedDuplicate: 0, skippedIneligible: 0 };
  }

  const { data: classes, error: classError } = await supabase
    .from('Class')
    .select('id, levelId, subSystem, branch')
    .eq('tenantId', tenantId)
    .in('id', uniqueClassIds);

  if (classError) {
    throw classError;
  }

  const { data: subjects, error: subjectError } = await supabase
    .from('Subject')
    .select(
      `
      id,
      subSystem,
      branch,
      levelId,
      academicYearId,
      termId,
      deactivatedAt,
      Term!Subject_semesterId_tenantId_fkey ( academicYearId )
    `,
    )
    .eq('tenantId', tenantId)
    .in('id', uniqueSubjectIds)
    .is('deactivatedAt', null);

  if (subjectError) {
    throw subjectError;
  }

  const classById = new Map(
    (classes ?? []).map((row) => [row.id as string, row as ClassSubjectEligibilityClass]),
  );

  const subjectRows: ClassSubjectEligibilitySubject[] = await Promise.all(
    (subjects ?? []).map(async (row) => {
      const levelIds = await fetchSubjectLevelIds(supabase, tenantId, row.id as string);
      return {
        id: row.id as string,
        subSystem: row.subSystem as AcademicSubSystem,
        branch: row.branch as AcademicBranch,
        levelId: row.levelId as string,
        levelIds: levelIds.length > 0 ? levelIds : [row.levelId as string],
        academicYearId: row.academicYearId as string | null,
        termId: row.termId as string | null,
        deactivatedAt: row.deactivatedAt as string | null,
        Term: row.Term as ClassSubjectEligibilitySubject['Term'],
      };
    }),
  );

  const subjectById = new Map(subjectRows.map((s) => [s.id, s]));

  const { data: existingLinks, error: linkError } = await supabase
    .from('ClassSubject')
    .select('classId, subjectId')
    .eq('tenantId', tenantId)
    .in('classId', uniqueClassIds)
    .in('subjectId', uniqueSubjectIds);

  if (linkError) {
    throw linkError;
  }

  const existingPairs = new Set(
    (existingLinks ?? []).map((r) => `${r.classId}:${r.subjectId}`),
  );

  const toInsert: { classId: string; subjectId: string }[] = [];
  let skippedDuplicate = 0;
  let skippedIneligible = 0;

  for (const classId of uniqueClassIds) {
    const classRow = classById.get(classId);
    if (!classRow) {
      skippedIneligible += uniqueSubjectIds.length;
      continue;
    }
    for (const subjectId of uniqueSubjectIds) {
      const key = `${classId}:${subjectId}`;
      if (existingPairs.has(key)) {
        skippedDuplicate += 1;
        continue;
      }
      const subject = subjectById.get(subjectId);
      if (!subject || !subjectMatchesClass(subject, classRow, options)) {
        skippedIneligible += 1;
        continue;
      }
      toInsert.push({ classId, subjectId });
      existingPairs.add(key);
    }
  }

  if (toInsert.length > 0) {
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('ClassSubject').insert(
      toInsert.map(({ classId, subjectId }) => ({
        id: generateAcadiaId('csj'),
        tenantId,
        classId,
        subjectId,
        createdAt: now,
      })),
    );
    if (insertError) {
      throw insertError;
    }
  }

  return {
    added: toInsert.length,
    skippedDuplicate,
    skippedIneligible,
  };
}
