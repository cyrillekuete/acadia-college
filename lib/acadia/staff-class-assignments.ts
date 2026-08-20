export function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)));
}

/** Class assignment rows are only meaningful when the teacher has at least one subject. */
export function hasClassTeacherSubjects(subjectIds: string[]): boolean {
  return uniqueIds(subjectIds).length > 0;
}

export function validateSubjectIdsOfferedInClass(
  offeredSubjectIds: string[],
  requestedSubjectIds: string[],
): string[] {
  const requested = uniqueIds(requestedSubjectIds);
  const offered = new Set(offeredSubjectIds);
  const invalid = requested.filter((id) => !offered.has(id));
  if (invalid.length > 0) {
    throw new Error('One or more subjects are not assigned to this class.');
  }
  return requested;
}

export function classSubjectPairsForSelection(input: {
  classIds: string[];
  subjectIds: string[];
  offeredPairs: Array<{ classId: string; subjectId: string }>;
}): Array<{ classId: string; subjectId: string }> {
  const classIds = new Set(uniqueIds(input.classIds));
  const subjectIds = new Set(uniqueIds(input.subjectIds));
  const seen = new Set<string>();
  const pairs: Array<{ classId: string; subjectId: string }> = [];

  for (const pair of input.offeredPairs) {
    if (!classIds.has(pair.classId) || !subjectIds.has(pair.subjectId)) {
      continue;
    }
    const key = `${pair.classId}:${pair.subjectId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    pairs.push({ classId: pair.classId, subjectId: pair.subjectId });
  }

  return pairs;
}

/**
 * After removing class–subject rows, year-level SubjectAssignment rows for
 * subjects no longer taught in any class should be deleted.
 */
export function subjectIdsUnreferencedAfterRemoval(
  removedSubjectIds: string[],
  remainingScsaSubjectIds: string[],
): string[] {
  const remaining = new Set(uniqueIds(remainingScsaSubjectIds));
  return uniqueIds(removedSubjectIds).filter((id) => !remaining.has(id));
}

/** Diff current vs desired subject ids for safer SCSA sync (insert then delete). */
export function diffAssignmentSubjectIds(
  existingSubjectIds: string[],
  desiredSubjectIds: string[],
): { toInsert: string[]; toDelete: string[] } {
  const existing = uniqueIds(existingSubjectIds);
  const desired = uniqueIds(desiredSubjectIds);
  const existingSet = new Set(existing);
  const desiredSet = new Set(desired);
  return {
    toInsert: desired.filter((id) => !existingSet.has(id)),
    toDelete: existing.filter((id) => !desiredSet.has(id)),
  };
}

export function buildTeacherTeachingScope(rows: Array<{
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
}>): {
  classIds: string[];
  subjectIds: string[];
  pairs: Array<{
    classId: string;
    subjectId: string;
    className: string;
    subjectName: string;
  }>;
} {
  const classIds: string[] = [];
  const subjectIds: string[] = [];
  const seenClasses = new Set<string>();
  const seenSubjects = new Set<string>();
  const pairKeys = new Set<string>();
  const pairs: Array<{
    classId: string;
    subjectId: string;
    className: string;
    subjectName: string;
  }> = [];

  for (const row of rows) {
    if (!seenClasses.has(row.classId)) {
      seenClasses.add(row.classId);
      classIds.push(row.classId);
    }
    if (!seenSubjects.has(row.subjectId)) {
      seenSubjects.add(row.subjectId);
      subjectIds.push(row.subjectId);
    }
    const key = `${row.classId}:${row.subjectId}`;
    if (pairKeys.has(key)) {
      continue;
    }
    pairKeys.add(key);
    pairs.push(row);
  }

  return { classIds, subjectIds, pairs };
}

export function mergeTeacherClassScope<
  TPair extends { classId: string },
  TScope extends { classIds: string[] },
>(subjectScope: TScope, classMaster: TPair[]): TScope & { classMaster: TPair[] } {
  const classIds = Array.from(
    new Set([...subjectScope.classIds, ...classMaster.map((row) => row.classId)]),
  );
  return {
    ...subjectScope,
    classIds,
    classMaster,
  };
}
