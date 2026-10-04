export type DisciplineScopeGroup = {
  id: string;
  wholeSchool: boolean;
  subSystem: string | null;
  branch: string | null;
  minLevel: number | null;
  maxLevel: number | null;
};

export type DisciplineScopeClassLink = {
  scopeGroupId: string;
  classId: string;
};

export function classMatchesDisciplineScopes(
  schoolClass: {
    id: string;
    subSystem: string;
    branch: string;
    levelNumber?: number | null;
  },
  groups: readonly DisciplineScopeGroup[],
  classLinks: readonly DisciplineScopeClassLink[],
): boolean {
  return groups.some((group) => {
    if (group.wholeSchool) return true;
    const linkedClassIds = classLinks
      .filter((link) => link.scopeGroupId === group.id)
      .map((link) => link.classId);
    const hasFilters = Boolean(group.subSystem || group.branch || group.minLevel != null);
    if (!hasFilters && linkedClassIds.length === 0) return false;
    if (group.subSystem && group.subSystem !== schoolClass.subSystem) return false;
    if (group.branch && group.branch !== schoolClass.branch) return false;
    if (group.minLevel != null && (schoolClass.levelNumber == null || schoolClass.levelNumber < group.minLevel || schoolClass.levelNumber > (group.maxLevel ?? group.minLevel))) return false;
    return linkedClassIds.length === 0 || linkedClassIds.includes(schoolClass.id);
  });
}
