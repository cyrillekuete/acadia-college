import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { unwrapRelation } from '@/lib/acadia/record-display';
import {
  classSubjectPairsForSelection,
  diffAssignmentSubjectIds,
  hasClassTeacherSubjects,
  subjectIdsUnreferencedAfterRemoval,
  uniqueIds,
  validateSubjectIdsOfferedInClass,
} from '@/lib/acadia/staff-class-assignments';
import { throwMutationError } from '@/lib/acadia/query-errors';
import { embed, FK } from '@/lib/supabase/embed-selects';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

type StaffSubjectAssignRow = {
  staffProfileId: string;
  classId?: string;
  Subject?: unknown;
};

type StaffClassAssignRow = {
  staffProfileId?: string;
  classId?: string;
  StaffProfile?: unknown;
  Class?: unknown;
};

export type ClassTeacherSubjectOption = {
  id: string;
  code: string;
  nameEn: string;
};

export type ClassTeacherAssignment = {
  staffProfileId: string;
  staffName: string;
  staffCode: string | null;
  subjectIds: string[];
  subjects: ClassTeacherSubjectOption[];
};

export type StaffTeachingAssignment = {
  classId: string;
  className: string;
  subjectIds: string[];
  subjects: ClassTeacherSubjectOption[];
};

function staffLabel(staff: {
  staffCode?: string | null;
  User?: unknown;
} | null): { name: string; staffCode: string | null } {
  const user = unwrapRelation<{ name?: string | null }>(staff?.User);
  const staffCode = staff?.staffCode?.trim() || null;
  const name = user?.name?.trim() || staffCode || 'Teacher';
  return { name, staffCode };
}

function subjectOption(subject: {
  id?: string;
  code?: string;
  nameEn?: string;
} | null): ClassTeacherSubjectOption | null {
  const id = subject?.id?.trim();
  if (!id) {
    return null;
  }
  return {
    id,
    code: subject?.code?.trim() || id,
    nameEn: subject?.nameEn?.trim() || subject?.code?.trim() || id,
  };
}

async function fetchOfferedSubjectIds(
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
    throwMutationError(error);
  }

  return (data ?? []).map((row) => row.subjectId as string);
}

async function ensureStaffClassAssignment(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
  classId: string,
  academicYearId: string,
  now: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('StaffClassAssignment')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('staffProfileId', staffProfileId)
    .eq('classId', classId)
    .eq('academicYearId', academicYearId)
    .maybeSingle();

  if (error) {
    throwMutationError(error);
  }
  if (data) {
    return;
  }

  const { error: insertError } = await supabase.from('StaffClassAssignment').insert({
    id: generateAcadiaId('staff-class'),
    tenantId,
    staffProfileId,
    classId,
    academicYearId,
    createdAt: now,
  });
  if (insertError) {
    throwMutationError(insertError);
  }
}

async function ensureSubjectAssignments(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
  academicYearId: string,
  subjectIds: string[],
  now: string,
): Promise<void> {
  if (subjectIds.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from('SubjectAssignment')
    .select('subjectId')
    .eq('tenantId', tenantId)
    .eq('staffProfileId', staffProfileId)
    .eq('academicYearId', academicYearId)
    .in('subjectId', subjectIds);

  if (error) {
    throwMutationError(error);
  }

  const existing = new Set((data ?? []).map((row) => row.subjectId as string));
  const missing = subjectIds.filter((id) => !existing.has(id));
  if (missing.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('SubjectAssignment').insert(
    missing.map((subjectId) => ({
      id: generateAcadiaId('assign'),
      tenantId,
      subjectId,
      academicYearId,
      staffProfileId,
      isLead: false,
      teachesPrimaryHome: false,
      notes: null,
      createdAt: now,
      updatedAt: now,
    })),
  );
  if (insertError) {
    throwMutationError(insertError);
  }
}

async function reconcileOrphanSubjectAssignments(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
  academicYearId: string,
  removedSubjectIds: string[],
): Promise<void> {
  const candidates = uniqueIds(removedSubjectIds);
  if (candidates.length === 0) {
    return;
  }

  const { data: remaining, error } = await supabase
    .from('StaffClassSubjectAssignment')
    .select('subjectId')
    .eq('tenantId', tenantId)
    .eq('staffProfileId', staffProfileId)
    .eq('academicYearId', academicYearId)
    .in('subjectId', candidates);

  if (error) {
    throwMutationError(error);
  }

  const orphanIds = subjectIdsUnreferencedAfterRemoval(
    candidates,
    (remaining ?? []).map((row) => row.subjectId as string),
  );
  if (orphanIds.length === 0) {
    return;
  }

  const { error: deleteError } = await supabase
    .from('SubjectAssignment')
    .delete()
    .eq('tenantId', tenantId)
    .eq('staffProfileId', staffProfileId)
    .eq('academicYearId', academicYearId)
    .in('subjectId', orphanIds);

  if (deleteError) {
    throwMutationError(deleteError);
  }
}

async function clearClassMasterIfMatches(
  supabase: Client,
  tenantId: string,
  classId: string,
  staffProfileId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('Class')
    .select('staffProfileId')
    .eq('tenantId', tenantId)
    .eq('id', classId)
    .maybeSingle();

  if (error) {
    throwMutationError(error);
  }
  if (data?.staffProfileId !== staffProfileId) {
    return;
  }

  const { error: clearError } = await supabase
    .from('Class')
    .update({ staffProfileId: null, updatedAt: new Date().toISOString() })
    .eq('tenantId', tenantId)
    .eq('id', classId)
    .eq('staffProfileId', staffProfileId);

  if (clearError) {
    throwMutationError(clearError);
  }
}

export async function fetchClassTeacherAssignments(
  supabase: Client,
  tenantId: string,
  classId: string,
  academicYearId: string,
): Promise<ClassTeacherAssignment[]> {
  const [classResult, subjectResult] = await Promise.all([
    supabase
      .from('StaffClassAssignment')
      .select(
        `
        staffProfileId,
        ${embed('StaffProfile', FK.StaffClassAssignment_staffProfile, `
          staffCode,
          ${embed('User', FK.StaffProfile_user, 'name')}
        `)}
      `,
      )
      .eq('tenantId', tenantId)
      .eq('classId', classId)
      .eq('academicYearId', academicYearId),
    supabase
      .from('StaffClassSubjectAssignment')
      .select(
        `
        staffProfileId,
        subjectId,
        ${embed('Subject', FK.StaffClassSubjectAssignment_subject, 'id, code, nameEn')}
      `,
      )
      .eq('tenantId', tenantId)
      .eq('classId', classId)
      .eq('academicYearId', academicYearId),
  ]);

  if (classResult.error) {
    throwMutationError(classResult.error);
  }
  if (subjectResult.error) {
    throwMutationError(subjectResult.error);
  }

  const subjectsByStaff = new Map<string, ClassTeacherSubjectOption[]>();
  for (const row of (subjectResult.data ?? []) as unknown as StaffSubjectAssignRow[]) {
    const staffProfileId = row.staffProfileId;
    const subject = subjectOption(
      unwrapRelation<{ id?: string; code?: string; nameEn?: string }>(row.Subject),
    );
    if (!subject) {
      continue;
    }
    const list = subjectsByStaff.get(staffProfileId) ?? [];
    if (!list.some((item) => item.id === subject.id)) {
      list.push(subject);
    }
    subjectsByStaff.set(staffProfileId, list);
  }

  return ((classResult.data ?? []) as unknown as StaffClassAssignRow[]).map((row) => {
    const staffProfileId = row.staffProfileId as string;
    const staff = unwrapRelation<{ staffCode?: string | null; User?: unknown }>(
      row.StaffProfile,
    );
    const { name, staffCode } = staffLabel(staff);
    const subjects = (subjectsByStaff.get(staffProfileId) ?? []).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
    return {
      staffProfileId,
      staffName: name,
      staffCode,
      subjectIds: subjects.map((subject) => subject.id),
      subjects,
    };
  });
}

export async function fetchStaffTeachingAssignments(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
  academicYearId: string,
): Promise<StaffTeachingAssignment[]> {
  const [classResult, subjectResult] = await Promise.all([
    supabase
      .from('StaffClassAssignment')
      .select(
        `
        classId,
        ${embed('Class', FK.StaffClassAssignment_class, 'name')}
      `,
      )
      .eq('tenantId', tenantId)
      .eq('staffProfileId', staffProfileId)
      .eq('academicYearId', academicYearId),
    supabase
      .from('StaffClassSubjectAssignment')
      .select(
        `
        classId,
        subjectId,
        ${embed('Subject', FK.StaffClassSubjectAssignment_subject, 'id, code, nameEn')}
      `,
      )
      .eq('tenantId', tenantId)
      .eq('staffProfileId', staffProfileId)
      .eq('academicYearId', academicYearId),
  ]);

  if (classResult.error) {
    throwMutationError(classResult.error);
  }
  if (subjectResult.error) {
    throwMutationError(subjectResult.error);
  }

  const subjectsByClass = new Map<string, ClassTeacherSubjectOption[]>();
  for (const row of (subjectResult.data ?? []) as unknown as StaffSubjectAssignRow[]) {
    const classId = row.classId as string;
    const subject = subjectOption(
      unwrapRelation<{ id?: string; code?: string; nameEn?: string }>(row.Subject),
    );
    if (!subject) {
      continue;
    }
    const list = subjectsByClass.get(classId) ?? [];
    if (!list.some((item) => item.id === subject.id)) {
      list.push(subject);
    }
    subjectsByClass.set(classId, list);
  }

  return ((classResult.data ?? []) as unknown as StaffClassAssignRow[]).map((row) => {
    const classId = row.classId as string;
    const classRow = unwrapRelation<{ name?: string }>(row.Class);
    const subjects = (subjectsByClass.get(classId) ?? []).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
    return {
      classId,
      className: classRow?.name?.trim() || classId,
      subjectIds: subjects.map((subject) => subject.id),
      subjects,
    };
  });
}

export async function syncClassTeacherAssignment(
  supabase: Client,
  tenantId: string,
  input: {
    classId: string;
    academicYearId: string;
    staffProfileId: string;
    subjectIds: string[];
  },
): Promise<void> {
  const offeredSubjectIds = await fetchOfferedSubjectIds(
    supabase,
    tenantId,
    input.classId,
  );
  const subjectIds = validateSubjectIdsOfferedInClass(
    offeredSubjectIds,
    input.subjectIds,
  );
  if (!hasClassTeacherSubjects(subjectIds)) {
    await removeClassTeacherAssignment(supabase, tenantId, {
      classId: input.classId,
      academicYearId: input.academicYearId,
      staffProfileId: input.staffProfileId,
    });
    return;
  }

  const now = new Date().toISOString();

  await ensureStaffClassAssignment(
    supabase,
    tenantId,
    input.staffProfileId,
    input.classId,
    input.academicYearId,
    now,
  );

  const { data: existingRows, error: existingError } = await supabase
    .from('StaffClassSubjectAssignment')
    .select('subjectId')
    .eq('tenantId', tenantId)
    .eq('staffProfileId', input.staffProfileId)
    .eq('classId', input.classId)
    .eq('academicYearId', input.academicYearId);

  if (existingError) {
    throwMutationError(existingError);
  }

  const { toInsert, toDelete } = diffAssignmentSubjectIds(
    (existingRows ?? []).map((row) => row.subjectId as string),
    subjectIds,
  );

  // Insert first so a failed insert does not wipe existing subjects.
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('StaffClassSubjectAssignment')
      .insert(
        toInsert.map((subjectId) => ({
          id: generateAcadiaId('scsa'),
          tenantId,
          staffProfileId: input.staffProfileId,
          classId: input.classId,
          subjectId,
          academicYearId: input.academicYearId,
          createdAt: now,
        })),
      );
    if (insertError) {
      throwMutationError(insertError);
    }
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('StaffClassSubjectAssignment')
      .delete()
      .eq('tenantId', tenantId)
      .eq('staffProfileId', input.staffProfileId)
      .eq('classId', input.classId)
      .eq('academicYearId', input.academicYearId)
      .in('subjectId', toDelete);

    if (deleteError) {
      throwMutationError(deleteError);
    }
  }

  await ensureSubjectAssignments(
    supabase,
    tenantId,
    input.staffProfileId,
    input.academicYearId,
    subjectIds,
    now,
  );

  await reconcileOrphanSubjectAssignments(
    supabase,
    tenantId,
    input.staffProfileId,
    input.academicYearId,
    toDelete,
  );
}

export async function removeClassTeacherAssignment(
  supabase: Client,
  tenantId: string,
  input: {
    classId: string;
    academicYearId: string;
    staffProfileId: string;
  },
): Promise<void> {
  const { data: removedRows, error: lookupError } = await supabase
    .from('StaffClassSubjectAssignment')
    .select('subjectId')
    .eq('tenantId', tenantId)
    .eq('staffProfileId', input.staffProfileId)
    .eq('classId', input.classId)
    .eq('academicYearId', input.academicYearId);

  if (lookupError) {
    throwMutationError(lookupError);
  }

  const removedSubjectIds = (removedRows ?? []).map(
    (row) => row.subjectId as string,
  );

  const { error: subjectError } = await supabase
    .from('StaffClassSubjectAssignment')
    .delete()
    .eq('tenantId', tenantId)
    .eq('staffProfileId', input.staffProfileId)
    .eq('classId', input.classId)
    .eq('academicYearId', input.academicYearId);

  if (subjectError) {
    throwMutationError(subjectError);
  }

  const { error: classError } = await supabase
    .from('StaffClassAssignment')
    .delete()
    .eq('tenantId', tenantId)
    .eq('staffProfileId', input.staffProfileId)
    .eq('classId', input.classId)
    .eq('academicYearId', input.academicYearId);

  if (classError) {
    throwMutationError(classError);
  }

  await clearClassMasterIfMatches(
    supabase,
    tenantId,
    input.classId,
    input.staffProfileId,
  );

  await reconcileOrphanSubjectAssignments(
    supabase,
    tenantId,
    input.staffProfileId,
    input.academicYearId,
    removedSubjectIds,
  );
}

export async function insertClassSubjectAssignmentsForStaff(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
  academicYearId: string,
  classIds: string[],
  subjectIds: string[],
  now: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uniqueClassIds = uniqueIds(classIds);
  const uniqueSubjectIds = uniqueIds(subjectIds);
  if (uniqueClassIds.length === 0 || uniqueSubjectIds.length === 0) {
    return { ok: true };
  }

  const { data, error } = await supabase
    .from('ClassSubject')
    .select('classId, subjectId')
    .eq('tenantId', tenantId)
    .in('classId', uniqueClassIds)
    .in('subjectId', uniqueSubjectIds);

  if (error) {
    return { ok: false, message: error.message ?? 'Failed to load class subjects.' };
  }

  const pairs = classSubjectPairsForSelection({
    classIds: uniqueClassIds,
    subjectIds: uniqueSubjectIds,
    offeredPairs: (data ?? []).map((row) => ({
      classId: row.classId as string,
      subjectId: row.subjectId as string,
    })),
  });

  const rows = pairs.map((pair) => ({
    id: generateAcadiaId('scsa'),
    tenantId,
    staffProfileId,
    classId: pair.classId,
    subjectId: pair.subjectId,
    academicYearId,
    createdAt: now,
  }));

  if (rows.length === 0) {
    return {
      ok: false,
      message:
        'None of the selected subjects are offered in the selected classes. Adjust class or subject choices.',
    };
  }

  const { error: insertError } = await supabase
    .from('StaffClassSubjectAssignment')
    .insert(rows);
  if (insertError) {
    return {
      ok: false,
      message: insertError.message ?? 'Failed to assign class subjects.',
    };
  }
  return { ok: true };
}
