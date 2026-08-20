import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import {
  groupingOverrideFromDb,
  groupingOverrideToDb,
  type SubjectClassAssignment,
} from '@/lib/acadia/class-subject-selections';
import {
  subjectMatchesClass,
  type ClassSubjectEligibilityClass,
  type ClassSubjectEligibilitySubject,
} from '@/lib/acadia/class-subject-eligibility';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { localizedText } from '@/lib/acadia/locale';
import {
  toStudentClassSubjectRow,
  type StudentClassSubjectRow,
  type StudentClassSubjectSubBranch,
} from '@/lib/acadia/student-class-subjects';
import { embed, FK } from '@/lib/supabase/embed-selects';
import { fetchSubjectLevelIds } from '@/lib/supabase/queries/subject-levels';

type Client = SupabaseClient<Database>;

export type ClassSubjectSelectionRow = {
  subjectId: string;
  subBranchIds: string[] | null;
  groupingId: string | null;
};

export type SubjectClassAssignmentRow = SubjectClassAssignment;

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

export async function fetchClassSubjectSelections(
  supabase: Client,
  tenantId: string,
  classId: string,
): Promise<ClassSubjectSelectionRow[]> {
  const { data: classSubjectRows, error } = await supabase
    .from('ClassSubject')
    .select('subjectId, groupingId, forceUngrouped')
    .eq('tenantId', tenantId)
    .eq('classId', classId);

  if (error) {
    throw error;
  }

  const subjectIds = (classSubjectRows ?? []).map((r) => r.subjectId as string);
  if (subjectIds.length === 0) {
    return [];
  }

  const { data: branchRows, error: branchError } = await supabase
    .from('ClassSubjectSubBranch')
    .select('subjectId, subjectSubBranchId')
    .eq('tenantId', tenantId)
    .eq('classId', classId);

  if (branchError) {
    throw branchError;
  }

  const branchesBySubject = new Map<string, string[]>();
  for (const row of branchRows ?? []) {
    const subjectId = row.subjectId as string;
    const subBranchId = row.subjectSubBranchId as string;
    const list = branchesBySubject.get(subjectId) ?? [];
    list.push(subBranchId);
    branchesBySubject.set(subjectId, list);
  }

  return (classSubjectRows ?? []).map((row) => {
    const subjectId = row.subjectId as string;
    const branches = branchesBySubject.get(subjectId);
    return {
      subjectId,
      groupingId: groupingOverrideFromDb(
        row.groupingId as string | null,
        Boolean((row as { forceUngrouped?: boolean }).forceUngrouped),
      ),
      subBranchIds:
        !branches || branches.length === 0 ? null : branches,
    };
  });
}

type ClassSubjectDisplayQueryRow = {
  subjectId: string;
  groupingId: string | null;
  forceUngrouped?: boolean;
  Subject?: unknown;
  ClassGrouping?: unknown;
};

type NestedSubjectRow = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  coefficient: number;
  deactivatedAt: string | null;
  SubjectGrouping?: unknown;
  SubjectSubBranch?: StudentClassSubjectSubBranch[] | null;
};

function groupingNameFromRelation(value: unknown): string | null {
  const grouping = unwrapRelation<{ nameEn?: string | null; nameFr?: string | null }>(
    value,
  );
  return (
    localizedText(grouping?.nameEn, grouping?.nameFr) ||
    grouping?.nameEn?.trim() ||
    null
  );
}

export async function fetchClassSubjectDisplayRows(
  supabase: Client,
  tenantId: string,
  classId: string,
): Promise<StudentClassSubjectRow[]> {
  const { data, error } = await supabase
    .from('ClassSubject')
    .select(
      [
        'subjectId',
        'groupingId',
        'forceUngrouped',
        embed(
          'Subject',
          FK.ClassSubject_subject,
          [
            'id, code, nameEn, nameFr, coefficient, deactivatedAt',
            embed('SubjectGrouping', FK.Subject_grouping, 'id, nameEn, nameFr'),
            'SubjectSubBranch ( id, name, nameFr, sortOrder )',
          ].join(', '),
        ),
        `ClassGrouping:${embed('SubjectGrouping', FK.ClassSubject_grouping, 'id, nameEn, nameFr')}`,
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .eq('classId', classId);

  if (error) {
    throw error;
  }

  const classSubjectRows = (data ?? []) as unknown as ClassSubjectDisplayQueryRow[];
  if (classSubjectRows.length === 0) {
    return [];
  }

  const { data: branchRows, error: branchError } = await supabase
    .from('ClassSubjectSubBranch')
    .select('subjectId, subjectSubBranchId')
    .eq('tenantId', tenantId)
    .eq('classId', classId);

  if (branchError) {
    throw branchError;
  }

  const assignedBranchesBySubject = new Map<string, string[]>();
  for (const row of branchRows ?? []) {
    const subjectId = row.subjectId as string;
    const subBranchId = row.subjectSubBranchId as string;
    const list = assignedBranchesBySubject.get(subjectId) ?? [];
    list.push(subBranchId);
    assignedBranchesBySubject.set(subjectId, list);
  }

  const rows: StudentClassSubjectRow[] = [];
  for (const row of classSubjectRows) {
    const subject = unwrapRelation<NestedSubjectRow>(row.Subject);
    const subBranches = Array.isArray(subject?.SubjectSubBranch)
      ? [...subject.SubjectSubBranch].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        )
      : [];
    const assignedIds = subject
      ? (assignedBranchesBySubject.get(subject.id) ?? [])
      : [];
    const mapped = toStudentClassSubjectRow({
      subject: subject
        ? {
            id: subject.id,
            code: subject.code,
            nameEn: subject.nameEn,
            nameFr: subject.nameFr,
            coefficient: subject.coefficient,
            deactivatedAt: subject.deactivatedAt,
            groupingName: groupingNameFromRelation(subject.SubjectGrouping),
            subBranches,
          }
        : null,
      classGroupingName: groupingNameFromRelation(row.ClassGrouping),
      forceUngrouped: Boolean(row.forceUngrouped),
      assignedSubBranchIds: assignedIds.length > 0 ? assignedIds : null,
    });
    if (mapped) {
      rows.push(mapped);
    }
  }

  return rows.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

export async function fetchSubjectClassAssignments(
  supabase: Client,
  tenantId: string,
  subjectId: string,
): Promise<SubjectClassAssignmentRow[]> {
  const { data: classSubjectRows, error } = await supabase
    .from('ClassSubject')
    .select('classId, groupingId, forceUngrouped')
    .eq('tenantId', tenantId)
    .eq('subjectId', subjectId);

  if (error) {
    throw error;
  }

  const classIds = (classSubjectRows ?? []).map((r) => r.classId as string);
  if (classIds.length === 0) {
    return [];
  }

  const { data: branchRows, error: branchError } = await supabase
    .from('ClassSubjectSubBranch')
    .select('classId, subjectSubBranchId')
    .eq('tenantId', tenantId)
    .eq('subjectId', subjectId);

  if (branchError) {
    throw branchError;
  }

  const branchesByClass = new Map<string, string[]>();
  for (const row of branchRows ?? []) {
    const classId = row.classId as string;
    const subBranchId = row.subjectSubBranchId as string;
    const list = branchesByClass.get(classId) ?? [];
    list.push(subBranchId);
    branchesByClass.set(classId, list);
  }

  return (classSubjectRows ?? []).map((row) => {
    const classId = row.classId as string;
    const branches = branchesByClass.get(classId);
    return {
      classId,
      groupingId: groupingOverrideFromDb(
        row.groupingId as string | null,
        Boolean((row as { forceUngrouped?: boolean }).forceUngrouped),
      ),
      subBranchIds:
        !branches || branches.length === 0 ? null : branches,
    };
  });
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
      groupingId: null,
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

async function updateClassSubjectGroupings(
  supabase: Client,
  tenantId: string,
  classId: string,
  selections: ClassSubjectSelectionRow[],
): Promise<void> {
  const subjectIds = [...new Set(selections.map((selection) => selection.subjectId))];
  const defaults = new Map<string, string | null>();
  if (subjectIds.length > 0) {
    const { data, error } = await supabase
      .from('Subject')
      .select('id, groupingId')
      .eq('tenantId', tenantId)
      .in('id', subjectIds);
    if (error) {
      throw error;
    }
    for (const row of data ?? []) {
      defaults.set(row.id as string, (row.groupingId as string | null) ?? null);
    }
  }

  for (const selection of selections) {
    const persisted = groupingOverrideToDb(
      selection.groupingId,
      defaults.get(selection.subjectId),
    );
    const { error } = await supabase
      .from('ClassSubject')
      .update({
        groupingId: persisted.groupingId,
        forceUngrouped: persisted.forceUngrouped,
      })
      .eq('tenantId', tenantId)
      .eq('classId', classId)
      .eq('subjectId', selection.subjectId);

    if (error) {
      throw error;
    }
  }
}

export async function syncClassSubjectSelections(
  supabase: Client,
  tenantId: string,
  classId: string,
  selections: ClassSubjectSelectionRow[],
): Promise<void> {
  const subjectIds = selections.map((selection) => selection.subjectId);
  await syncClassSubjects(supabase, tenantId, classId, subjectIds);
  await updateClassSubjectGroupings(supabase, tenantId, classId, selections);

  const { error: deleteError } = await supabase
    .from('ClassSubjectSubBranch')
    .delete()
    .eq('tenantId', tenantId)
    .eq('classId', classId);

  if (deleteError) {
    throw deleteError;
  }

  const now = new Date().toISOString();
  const toInsert = selections.flatMap((selection) => {
    if (selection.subBranchIds === null || selection.subBranchIds.length === 0) {
      return [];
    }
    return selection.subBranchIds.map((subjectSubBranchId) => ({
      id: generateAcadiaId('cssb'),
      tenantId,
      classId,
      subjectId: selection.subjectId,
      subjectSubBranchId,
      createdAt: now,
    }));
  });

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('ClassSubjectSubBranch').insert(toInsert);
    if (insertError) {
      throw insertError;
    }
  }
}

export async function insertClassSubjectSelections(
  supabase: Client,
  tenantId: string,
  classId: string,
  selections: ClassSubjectSelectionRow[],
): Promise<void> {
  await syncClassSubjectSelections(supabase, tenantId, classId, selections);
}

export async function syncSubjectClassAssignments(
  supabase: Client,
  tenantId: string,
  subjectId: string,
  assignments: SubjectClassAssignmentRow[],
): Promise<void> {
  const existingRows = await fetchSubjectClassAssignments(supabase, tenantId, subjectId);
  const existingClassIds = existingRows.map((row) => row.classId);
  const nextClassIds = assignments.map((row) => row.classId);
  const nextSet = new Set(nextClassIds);
  const toRemove = existingClassIds.filter((id) => !nextSet.has(id));
  const existingSet = new Set(existingClassIds);
  const toAdd = nextClassIds.filter((id) => !existingSet.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('ClassSubject')
      .delete()
      .eq('tenantId', tenantId)
      .eq('subjectId', subjectId)
      .in('classId', toRemove);
    if (error) {
      throw error;
    }
  }

  if (toAdd.length > 0) {
    const now = new Date().toISOString();
    const { error } = await supabase.from('ClassSubject').insert(
      toAdd.map((classId) => ({
        id: generateAcadiaId('csj'),
        tenantId,
        classId,
        subjectId,
        groupingId: null,
        forceUngrouped: false,
        createdAt: now,
      })),
    );
    if (error) {
      throw error;
    }
  }

  const { data: subjectRow, error: subjectError } = await supabase
    .from('Subject')
    .select('groupingId')
    .eq('tenantId', tenantId)
    .eq('id', subjectId)
    .maybeSingle();
  if (subjectError) {
    throw subjectError;
  }
  const subjectDefaultGroupingId = (subjectRow?.groupingId as string | null) ?? null;

  for (const assignment of assignments) {
    const persisted = groupingOverrideToDb(
      assignment.groupingId,
      subjectDefaultGroupingId,
    );
    const { error } = await supabase
      .from('ClassSubject')
      .update({
        groupingId: persisted.groupingId,
        forceUngrouped: persisted.forceUngrouped,
      })
      .eq('tenantId', tenantId)
      .eq('subjectId', subjectId)
      .eq('classId', assignment.classId);

    if (error) {
      throw error;
    }
  }

  const { error: deleteError } = await supabase
    .from('ClassSubjectSubBranch')
    .delete()
    .eq('tenantId', tenantId)
    .eq('subjectId', subjectId);

  if (deleteError) {
    throw deleteError;
  }

  const { data: validSubBranches, error: subBranchLookupError } = await supabase
    .from('SubjectSubBranch')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('subjectId', subjectId);

  if (subBranchLookupError) {
    throw subBranchLookupError;
  }

  const validSubBranchIds = new Set((validSubBranches ?? []).map((row) => row.id));
  const invalidSubBranchIds = new Set<string>();

  const now = new Date().toISOString();
  const toInsert = assignments.flatMap((assignment) => {
    if (assignment.subBranchIds === null || assignment.subBranchIds.length === 0) {
      return [];
    }
    return assignment.subBranchIds.flatMap((subjectSubBranchId) => {
      if (!validSubBranchIds.has(subjectSubBranchId)) {
        invalidSubBranchIds.add(subjectSubBranchId);
        return [];
      }
      return [
        {
          id: generateAcadiaId('cssb'),
          tenantId,
          classId: assignment.classId,
          subjectId,
          subjectSubBranchId,
          createdAt: now,
        },
      ];
    });
  });

  if (invalidSubBranchIds.size > 0) {
    throw new Error(
      `Invalid sub-branch assignment(s) for subject ${subjectId}: ${Array.from(invalidSubBranchIds).join(', ')}`,
    );
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('ClassSubjectSubBranch').insert(toInsert);
    if (insertError) {
      throw insertError;
    }
  }
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
        groupingId: null,
        forceUngrouped: false,
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
