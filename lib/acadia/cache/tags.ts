export const ACADIA_CACHE_TAG_PREFIXES = [
  'catalog',
  'academic-year',
  'students',
  'staff',
  'dashboard',
  'dashboard-role',
] as const;

export type AcadiaCacheTagPrefix = (typeof ACADIA_CACHE_TAG_PREFIXES)[number];

export function catalogTag(tenantId: string): string {
  return `catalog:${tenantId}`;
}

export function academicYearTag(tenantId: string): string {
  return `academic-year:${tenantId}`;
}

export function studentsTag(tenantId: string): string {
  return `students:${tenantId}`;
}

export function studentsYearTag(tenantId: string, yearId: string): string {
  return `students:${tenantId}:${yearId}`;
}

export function staffTag(tenantId: string): string {
  return `staff:${tenantId}`;
}

export function dashboardTag(tenantId: string): string {
  return `dashboard:${tenantId}`;
}

export function dashboardYearTag(
  tenantId: string,
  yearId: string | null,
): string {
  return yearId ? `dashboard:${tenantId}:${yearId}` : `dashboard:${tenantId}`;
}

export function dashboardRoleTag(tenantId: string, userId: string): string {
  return `dashboard-role:${tenantId}:${userId}`;
}

export function catalogTags(tenantId: string): string[] {
  return [catalogTag(tenantId), academicYearTag(tenantId)];
}

/** Class list includes per-class enrollment counts, so it is also student-tagged. */
export function classListTags(tenantId: string): string[] {
  return [catalogTag(tenantId), academicYearTag(tenantId), studentsTag(tenantId)];
}

export function studentListTags(tenantId: string, yearId?: string | null): string[] {
  return yearId
    ? [studentsTag(tenantId), studentsYearTag(tenantId, yearId), dashboardTag(tenantId)]
    : [studentsTag(tenantId), dashboardTag(tenantId)];
}

export function staffListTags(tenantId: string): string[] {
  return [staffTag(tenantId), dashboardTag(tenantId)];
}

export function dashboardTags(
  tenantId: string,
  yearId?: string | null,
): string[] {
  return [dashboardTag(tenantId), dashboardYearTag(tenantId, yearId ?? null)];
}

export function isAllowedAcadiaCacheTag(tag: string, tenantId: string): boolean {
  if (!tenantId || !tag.includes(tenantId)) {
    return false;
  }
  const prefix = tag.split(':')[0];
  return (ACADIA_CACHE_TAG_PREFIXES as readonly string[]).includes(prefix);
}

export function filterAllowedAcadiaCacheTags(
  tags: readonly string[],
  tenantId: string,
): string[] {
  return [...new Set(tags)].filter((tag) => isAllowedAcadiaCacheTag(tag, tenantId));
}

export function seededInitialData<T>(
  seed: T | undefined,
  seedYearId: string | null | undefined,
  activeYearId: string | null,
): T | undefined {
  if (seed === undefined) {
    return undefined;
  }
  if (seedYearId === undefined) {
    return seed;
  }
  return seedYearId === activeYearId ? seed : undefined;
}
