import type { SubjectForClassOption } from '@/hooks/use-subjects-for-class';

export const SUBJECT_DEFAULT_GROUPING = '__subject_default__';
export const UNGROUPED_GROUPING_OVERRIDE = '__none__';

export type ClassSubjectSelection = {
  subjectId: string;
  subBranchIds: string[] | null;
  groupingId: string | null;
};

export type SubjectClassAssignment = {
  classId: string;
  subBranchIds: string[] | null;
  groupingId: string | null;
};

const DEFAULT_SELECTION_FIELDS = {
  subBranchIds: null as string[] | null,
  groupingId: null as string | null,
};

export function isUngroupedOverride(groupingId: string | null | undefined): boolean {
  return groupingId === UNGROUPED_GROUPING_OVERRIDE;
}

export function groupingOverrideToDb(
  groupingId: string | null,
  subjectDefaultGroupingId?: string | null,
): { groupingId: string | null; forceUngrouped: boolean } {
  if (isUngroupedOverride(groupingId)) {
    return { groupingId: null, forceUngrouped: true };
  }
  if (
    !groupingId ||
    groupingId === SUBJECT_DEFAULT_GROUPING ||
    groupingId === subjectDefaultGroupingId
  ) {
    return { groupingId: null, forceUngrouped: false };
  }
  return { groupingId, forceUngrouped: false };
}

export function groupingOverrideFromDb(
  groupingId: string | null | undefined,
  forceUngrouped?: boolean | null,
): string | null {
  if (forceUngrouped) {
    return UNGROUPED_GROUPING_OVERRIDE;
  }
  return groupingId ?? null;
}

export function selectionsToSubjectIds(selections: ClassSubjectSelection[]): string[] {
  return selections.map((selection) => selection.subjectId);
}

export function assignmentsToClassIds(assignments: SubjectClassAssignment[]): string[] {
  return assignments.map((assignment) => assignment.classId);
}

export function resolveEffectiveGrouping(
  selection: Pick<ClassSubjectSelection, 'groupingId'>,
  subjectDefaultGroupingId: string | null | undefined,
): string | null {
  if (isUngroupedOverride(selection.groupingId)) {
    return null;
  }
  return selection.groupingId ?? subjectDefaultGroupingId ?? null;
}

export function isGroupingOverridden(
  selection: Pick<ClassSubjectSelection, 'groupingId'>,
): boolean {
  return selection.groupingId !== null;
}

export function setSelectionGrouping(
  selections: ClassSubjectSelection[],
  subjectId: string,
  groupingId: string | null,
): ClassSubjectSelection[] {
  return selections.map((selection) =>
    selection.subjectId === subjectId ? { ...selection, groupingId } : selection,
  );
}

export function normalizeSubjectSelections(
  selections: ClassSubjectSelection[],
  options: SubjectForClassOption[],
): ClassSubjectSelection[] {
  const optionById = new Map(options.map((option) => [option.id, option]));
  const result: ClassSubjectSelection[] = [];

  for (const selection of selections) {
    const option = optionById.get(selection.subjectId);
    if (!option) {
      continue;
    }

    const groupingId = selection.groupingId ?? null;

    if (!option.hasSubBranches || option.subBranches.length === 0) {
      result.push({ subjectId: selection.subjectId, subBranchIds: null, groupingId });
      continue;
    }

    if (selection.subBranchIds === null) {
      result.push({ subjectId: selection.subjectId, subBranchIds: null, groupingId });
      continue;
    }

    const validBranchIds = new Set(option.subBranches.map((branch) => branch.id));
    const filtered = selection.subBranchIds.filter((id) => validBranchIds.has(id));
    if (filtered.length === 0) {
      continue;
    }

    if (filtered.length === option.subBranches.length) {
      result.push({ subjectId: selection.subjectId, subBranchIds: null, groupingId });
    } else {
      result.push({ subjectId: selection.subjectId, subBranchIds: filtered, groupingId });
    }
  }

  return result;
}

export function toggleFullSubject(
  selections: ClassSubjectSelection[],
  subjectId: string,
  checked: boolean,
): ClassSubjectSelection[] {
  if (!checked) {
    return selections.filter((selection) => selection.subjectId !== subjectId);
  }

  const existing = selections.find((selection) => selection.subjectId === subjectId);
  if (existing) {
    return selections.map((selection) =>
      selection.subjectId === subjectId
        ? { subjectId, ...DEFAULT_SELECTION_FIELDS }
        : selection,
    );
  }

  return [...selections, { subjectId, ...DEFAULT_SELECTION_FIELDS }];
}

export function toggleSubBranch(
  selections: ClassSubjectSelection[],
  subjectId: string,
  subBranchId: string,
  allSubBranchIds: string[],
  checked: boolean,
): ClassSubjectSelection[] {
  const existing = selections.find((selection) => selection.subjectId === subjectId);

  if (!existing) {
    if (!checked) {
      return selections;
    }
    return [
      ...selections,
      { subjectId, subBranchIds: [subBranchId], groupingId: null },
    ];
  }

  const groupingId = existing.groupingId ?? null;

  if (existing.subBranchIds === null) {
    if (!checked) {
      const remaining = allSubBranchIds.filter((id) => id !== subBranchId);
      if (remaining.length === 0) {
        return selections.filter((selection) => selection.subjectId !== subjectId);
      }
      return selections.map((selection) =>
        selection.subjectId === subjectId
          ? { subjectId, subBranchIds: remaining, groupingId }
          : selection,
      );
    }
    return selections;
  }

  let nextBranchIds: string[];
  if (checked) {
    nextBranchIds = existing.subBranchIds.includes(subBranchId)
      ? existing.subBranchIds
      : [...existing.subBranchIds, subBranchId];
  } else {
    nextBranchIds = existing.subBranchIds.filter((id) => id !== subBranchId);
  }

  if (nextBranchIds.length === 0) {
    return selections.filter((selection) => selection.subjectId !== subjectId);
  }

  if (nextBranchIds.length === allSubBranchIds.length) {
    return selections.map((selection) =>
      selection.subjectId === subjectId
        ? { subjectId, subBranchIds: null, groupingId }
        : selection,
    );
  }

  return selections.map((selection) =>
    selection.subjectId === subjectId
      ? { subjectId, subBranchIds: nextBranchIds, groupingId }
      : selection,
  );
}

export function toggleFullClass(
  assignments: SubjectClassAssignment[],
  classId: string,
  checked: boolean,
): SubjectClassAssignment[] {
  if (!checked) {
    return assignments.filter((assignment) => assignment.classId !== classId);
  }

  const existing = assignments.find((assignment) => assignment.classId === classId);
  if (existing) {
    return assignments.map((assignment) =>
      assignment.classId === classId
        ? { classId, ...DEFAULT_SELECTION_FIELDS }
        : assignment,
    );
  }

  return [...assignments, { classId, ...DEFAULT_SELECTION_FIELDS }];
}

export function toggleClassSubBranch(
  assignments: SubjectClassAssignment[],
  classId: string,
  subBranchId: string,
  allSubBranchIds: string[],
  checked: boolean,
): SubjectClassAssignment[] {
  const existing = assignments.find((assignment) => assignment.classId === classId);

  if (!existing) {
    if (!checked) {
      return assignments;
    }
    return [
      ...assignments,
      { classId, subBranchIds: [subBranchId], groupingId: null },
    ];
  }

  const groupingId = existing.groupingId ?? null;

  if (existing.subBranchIds === null) {
    if (!checked) {
      const remaining = allSubBranchIds.filter((id) => id !== subBranchId);
      if (remaining.length === 0) {
        return assignments.filter((assignment) => assignment.classId !== classId);
      }
      return assignments.map((assignment) =>
        assignment.classId === classId
          ? { classId, subBranchIds: remaining, groupingId }
          : assignment,
      );
    }
    return assignments;
  }

  let nextBranchIds: string[];
  if (checked) {
    nextBranchIds = existing.subBranchIds.includes(subBranchId)
      ? existing.subBranchIds
      : [...existing.subBranchIds, subBranchId];
  } else {
    nextBranchIds = existing.subBranchIds.filter((id) => id !== subBranchId);
  }

  if (nextBranchIds.length === 0) {
    return assignments.filter((assignment) => assignment.classId !== classId);
  }

  if (nextBranchIds.length === allSubBranchIds.length) {
    return assignments.map((assignment) =>
      assignment.classId === classId
        ? { classId, subBranchIds: null, groupingId }
        : assignment,
    );
  }

  return assignments.map((assignment) =>
    assignment.classId === classId
      ? { classId, subBranchIds: nextBranchIds, groupingId }
      : assignment,
  );
}

export function setAssignmentGrouping(
  assignments: SubjectClassAssignment[],
  classId: string,
  groupingId: string | null,
): SubjectClassAssignment[] {
  return assignments.map((assignment) =>
    assignment.classId === classId ? { ...assignment, groupingId } : assignment,
  );
}

export function normalizeSubjectClassAssignments(
  assignments: SubjectClassAssignment[],
  options: { id: string; hasSubBranches: boolean; subBranches: { id: string }[] }[],
): SubjectClassAssignment[] {
  const optionById = new Map(options.map((option) => [option.id, option]));
  const result: SubjectClassAssignment[] = [];

  for (const assignment of assignments) {
    const option = optionById.get(assignment.classId);
    if (!option) {
      continue;
    }

    const groupingId = assignment.groupingId ?? null;

    if (!option.hasSubBranches || option.subBranches.length === 0) {
      result.push({ classId: assignment.classId, subBranchIds: null, groupingId });
      continue;
    }

    if (assignment.subBranchIds === null) {
      result.push({ classId: assignment.classId, subBranchIds: null, groupingId });
      continue;
    }

    const validBranchIds = new Set(option.subBranches.map((branch) => branch.id));
    const filtered = assignment.subBranchIds.filter((id) => validBranchIds.has(id));
    if (filtered.length === 0) {
      continue;
    }

    if (filtered.length === option.subBranches.length) {
      result.push({ classId: assignment.classId, subBranchIds: null, groupingId });
    } else {
      result.push({ classId: assignment.classId, subBranchIds: filtered, groupingId });
    }
  }

  return result;
}

export function getSubjectSelection(
  selections: ClassSubjectSelection[],
  subjectId: string,
): ClassSubjectSelection | undefined {
  return selections.find((selection) => selection.subjectId === subjectId);
}

export function getClassAssignment(
  assignments: SubjectClassAssignment[],
  classId: string,
): SubjectClassAssignment | undefined {
  return assignments.find((assignment) => assignment.classId === classId);
}

export function isSubjectFullySelected(
  selection: ClassSubjectSelection | undefined,
  subBranchCount: number,
): boolean {
  if (!selection) {
    return false;
  }
  if (subBranchCount === 0) {
    return true;
  }
  return selection.subBranchIds === null;
}

export function isSubBranchSelected(
  selection: { subBranchIds: string[] | null } | undefined,
  subBranchId: string,
): boolean {
  if (!selection) {
    return false;
  }
  if (selection.subBranchIds === null) {
    return true;
  }
  return selection.subBranchIds.includes(subBranchId);
}

export function isSubjectPartiallySelected(
  selection: ClassSubjectSelection | undefined,
  subBranchCount: number,
): boolean {
  if (!selection || subBranchCount === 0) {
    return false;
  }
  if (selection.subBranchIds === null) {
    return false;
  }
  return (
    selection.subBranchIds.length > 0 &&
    selection.subBranchIds.length < subBranchCount
  );
}

export function formatSelectionLabel(
  subject: Pick<
    SubjectForClassOption,
    'code' | 'nameEn' | 'subBranches' | 'groupingNameEn'
  >,
  selection: ClassSubjectSelection,
  groupingNames?: Map<string, string>,
): string {
  let label: string;

  if (selection.subBranchIds === null || subject.subBranches.length === 0) {
    label = `${subject.code} — ${subject.nameEn}`;
  } else {
    const branchNames = subject.subBranches
      .filter((branch) => selection.subBranchIds!.includes(branch.id))
      .map((branch) => branch.name);
    label = `${subject.code} (${branchNames.join(', ')})`;
  }

  if (isUngroupedOverride(selection.groupingId)) {
    label += ' · Ungrouped';
  } else if (isGroupingOverridden(selection) && groupingNames?.has(selection.groupingId!)) {
    label += ` · ${groupingNames.get(selection.groupingId!)}`;
  }

  return label;
}

export function formatAssignmentLabel(
  classRow: { name: string; levelName?: string | null },
  assignment: SubjectClassAssignment,
  subBranches: { id: string; name: string }[],
  groupingNames?: Map<string, string>,
): string {
  let label = classRow.name;
  if (classRow.levelName?.trim()) {
    label += ` (${classRow.levelName.trim()})`;
  }

  if (assignment.subBranchIds !== null && subBranches.length > 0) {
    const branchNames = subBranches
      .filter((branch) => assignment.subBranchIds!.includes(branch.id))
      .map((branch) => branch.name);
    if (branchNames.length > 0) {
      label += ` — ${branchNames.join(', ')}`;
    }
  }

  if (isUngroupedOverride(assignment.groupingId)) {
    label += ' · Ungrouped';
  } else if (isGroupingOverridden(assignment) && groupingNames?.has(assignment.groupingId!)) {
    label += ` · ${groupingNames.get(assignment.groupingId!)}`;
  }

  return label;
}

export function selectAllSubjectSelections(
  options: { id: string }[],
  current: ClassSubjectSelection[],
): ClassSubjectSelection[] {
  const existing = new Map(current.map((selection) => [selection.subjectId, selection]));
  return options.map((option) => {
    const previous = existing.get(option.id);
    return previous ?? { subjectId: option.id, ...DEFAULT_SELECTION_FIELDS };
  });
}

export function groupOptionsByGrouping<
  T extends {
    groupingId: string | null;
    groupingNameEn: string | null;
    groupingSortOrder?: number | null;
  },
>(options: T[]): { groupingId: string | null; groupingName: string; options: T[] }[] {
  const grouped = new Map<string | null, T[]>();

  for (const option of options) {
    const key = option.groupingId ?? null;
    const list = grouped.get(key) ?? [];
    list.push(option);
    grouped.set(key, list);
  }

  const result: { groupingId: string | null; groupingName: string; options: T[] }[] = [];

  for (const [groupingId, groupOptions] of Array.from(grouped.entries())) {
    if (groupingId === null) {
      continue;
    }
    const groupingName = groupOptions[0]?.groupingNameEn?.trim() || 'Grouping';
    result.push({ groupingId, groupingName, options: groupOptions });
  }

  result.sort((a, b) => {
    const orderA = a.options[0]?.groupingSortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.options[0]?.groupingSortOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.groupingName.localeCompare(b.groupingName);
  });

  const ungrouped = grouped.get(null);
  if (ungrouped?.length) {
    result.push({ groupingId: null, groupingName: 'Ungrouped', options: ungrouped });
  }

  return result;
}
