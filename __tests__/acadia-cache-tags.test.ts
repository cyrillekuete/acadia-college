import { describe, expect, it } from 'vitest';
import {
  academicYearTag,
  catalogTag,
  classListTags,
  dashboardRoleTag,
  dashboardTag,
  dashboardTags,
  dashboardYearTag,
  filterAllowedAcadiaCacheTags,
  isAllowedAcadiaCacheTag,
  seededInitialData,
  staffListTags,
  staffTag,
  studentListTags,
  studentsTag,
  studentsYearTag,
} from '@/lib/acadia/cache/tags';
import {
  encodeActiveAcademicYearCookie,
  parseActiveAcademicYearCookie,
} from '@/lib/acadia/active-academic-year-storage';

const TENANT = 'tenant-a';
const OTHER = 'tenant-b';
const YEAR = 'year-1';
const USER = 'user-1';

describe('acadia cache tags', () => {
  it('scopes every tag to the tenant id', () => {
    expect(catalogTag(TENANT)).toBe(`catalog:${TENANT}`);
    expect(classListTags(TENANT)).toEqual([
      `catalog:${TENANT}`,
      `academic-year:${TENANT}`,
      `students:${TENANT}`,
    ]);
    expect(academicYearTag(TENANT)).toBe(`academic-year:${TENANT}`);
    expect(studentsTag(TENANT)).toBe(`students:${TENANT}`);
    expect(studentsYearTag(TENANT, YEAR)).toBe(`students:${TENANT}:${YEAR}`);
    expect(staffTag(TENANT)).toBe(`staff:${TENANT}`);
    expect(dashboardTag(TENANT)).toBe(`dashboard:${TENANT}`);
    expect(dashboardYearTag(TENANT, YEAR)).toBe(`dashboard:${TENANT}:${YEAR}`);
    expect(dashboardYearTag(TENANT, null)).toBe(`dashboard:${TENANT}`);
    expect(dashboardRoleTag(TENANT, USER)).toBe(`dashboard-role:${TENANT}:${USER}`);
  });

  it('allows only known prefixes that include the session tenant', () => {
    expect(isAllowedAcadiaCacheTag(studentsTag(TENANT), TENANT)).toBe(true);
    expect(isAllowedAcadiaCacheTag(studentsYearTag(TENANT, YEAR), TENANT)).toBe(true);
    expect(isAllowedAcadiaCacheTag(studentsTag(OTHER), TENANT)).toBe(false);
    expect(isAllowedAcadiaCacheTag('marks:tenant-a', TENANT)).toBe(false);
    expect(isAllowedAcadiaCacheTag('students', TENANT)).toBe(false);
  });

  it('filters and dedupes tags for revalidation', () => {
    const allowed = filterAllowedAcadiaCacheTags(
      [
        studentsTag(TENANT),
        studentsTag(TENANT),
        studentsTag(OTHER),
        'finance:anything',
        ...staffListTags(TENANT),
        ...dashboardTags(TENANT, YEAR),
        ...classListTags(TENANT),
      ],
      TENANT,
    );

    expect(allowed).toEqual([
      `students:${TENANT}`,
      `staff:${TENANT}`,
      `dashboard:${TENANT}`,
      `dashboard:${TENANT}:${YEAR}`,
      `catalog:${TENANT}`,
      `academic-year:${TENANT}`,
    ]);
  });

  it('returns seeded data only when the year matches', () => {
    expect(seededInitialData(['a'], YEAR, YEAR)).toEqual(['a']);
    expect(seededInitialData(['a'], YEAR, 'other')).toBeUndefined();
    expect(seededInitialData(['a'], undefined, YEAR)).toEqual(['a']);
    expect(seededInitialData(undefined, YEAR, YEAR)).toBeUndefined();
  });
});

describe('active academic year cookie', () => {
  it('encodes tenant and year and rejects cross-tenant values', () => {
    const encoded = encodeActiveAcademicYearCookie(TENANT, YEAR);
    expect(encoded).toBe(`${TENANT}:${YEAR}`);
    expect(parseActiveAcademicYearCookie(encoded, TENANT)).toBe(YEAR);
    expect(parseActiveAcademicYearCookie(encoded, OTHER)).toBeNull();
    expect(parseActiveAcademicYearCookie(YEAR, TENANT)).toBeNull();
    expect(parseActiveAcademicYearCookie(null, TENANT)).toBeNull();
  });
});
