export type MarksEntryBranch = {
  id: string;
  name: string;
};

export type MarksEntryColumn = {
  id: string | null;
  name: string;
};

export const SUBJECT_MARK_COLUMN: MarksEntryColumn = {
  id: null,
  name: 'Subject',
};

export function markDraftKey(
  studentProfileId: string,
  subjectSubBranchId: string | null,
): string {
  return `${studentProfileId}::${subjectSubBranchId ?? ''}`;
}

export function parseMarkDraftKey(key: string): {
  studentProfileId: string;
  subjectSubBranchId: string | null;
} {
  const [studentProfileId, branchId = ''] = key.split('::');
  return {
    studentProfileId,
    subjectSubBranchId: branchId ? branchId : null,
  };
}

/** Branch ids a student should enter, or null for a single subject-level mark. */
export function resolveStudentBranchIds(
  classId: string | null | undefined,
  assignedByClass: Map<string, string[]>,
): string[] | null {
  if (!classId) {
    return null;
  }
  const assigned = assignedByClass.get(classId);
  if (!assigned || assigned.length === 0) {
    return null;
  }
  return assigned;
}

export function resolveMarksEntryColumns(input: {
  subBranches: MarksEntryBranch[];
  assignedByClass: Map<string, string[]>;
  studentClassIds?: (string | null | undefined)[];
}): MarksEntryColumn[] {
  const classIds = input.studentClassIds ?? Array.from(input.assignedByClass.keys());
  let needsSubjectColumn = classIds.length === 0;
  const neededBranchIds = new Set<string>();

  for (const classId of classIds) {
    const assigned = resolveStudentBranchIds(classId, input.assignedByClass);
    if (assigned == null) {
      needsSubjectColumn = true;
    } else {
      for (const id of assigned) {
        neededBranchIds.add(id);
      }
    }
  }

  const columns: MarksEntryColumn[] = [];
  if (needsSubjectColumn || neededBranchIds.size === 0 || input.subBranches.length === 0) {
    columns.push(SUBJECT_MARK_COLUMN);
  }
  for (const branch of input.subBranches) {
    if (neededBranchIds.has(branch.id)) {
      columns.push({ id: branch.id, name: branch.name });
    }
  }
  return columns.length > 0 ? columns : [SUBJECT_MARK_COLUMN];
}

export function columnsForStudent(
  columns: MarksEntryColumn[],
  studentBranchIds: string[] | null,
): MarksEntryColumn[] {
  if (studentBranchIds == null) {
    return [SUBJECT_MARK_COLUMN];
  }
  const allowed = new Set(studentBranchIds);
  const matched = columns.filter((column) => column.id && allowed.has(column.id));
  return matched.length > 0 ? matched : [SUBJECT_MARK_COLUMN];
}
