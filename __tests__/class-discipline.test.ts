import { describe, expect, it } from 'vitest';
import {
  aggregateDiscipline,
  canWriteClassDiscipline,
  normalizeDisciplineCount,
  parseClassDisciplineTerm,
} from '@/lib/acadia/class-discipline';

describe('canWriteClassDiscipline', () => {
  it('allows admins without a class-master match', () => {
    expect(
      canWriteClassDiscipline({
        roleSlug: 'admin',
        staffProfileId: null,
        classMasterStaffProfileId: 'staff-1',
      }),
    ).toBe(true);
    expect(
      canWriteClassDiscipline({
        roleSlug: 'registrar',
        classMasterStaffProfileId: 'staff-1',
      }),
    ).toBe(true);
  });

  it('allows the class master of that class', () => {
    expect(
      canWriteClassDiscipline({
        roleSlug: 'teacher',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: 'staff-1',
      }),
    ).toBe(true);
  });

  it('denies subject teachers and other class masters', () => {
    expect(
      canWriteClassDiscipline({
        roleSlug: 'teacher',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: 'staff-2',
      }),
    ).toBe(false);
    expect(
      canWriteClassDiscipline({
        roleSlug: 'lecturer',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: null,
      }),
    ).toBe(false);
    expect(
      canWriteClassDiscipline({
        roleSlug: 'student',
        staffProfileId: 'staff-1',
        classMasterStaffProfileId: 'staff-1',
      }),
    ).toBe(false);
  });
});

describe('aggregateDiscipline', () => {
  const rows = [
    { termNumber: 1, absenceHours: 4, suspensions: 1, warnings: 2 },
    { termNumber: 3, absenceHours: 3, suspensions: 0, warnings: 1 },
  ];

  it('returns zeros when a term has no row', () => {
    expect(aggregateDiscipline(rows, '2')).toEqual({
      absences: 0,
      suspensions: 0,
      warnings: 0,
    });
    expect(aggregateDiscipline(undefined, '1')).toEqual({
      absences: 0,
      suspensions: 0,
      warnings: 0,
    });
  });

  it('uses the matching term and sums annual totals', () => {
    expect(aggregateDiscipline(rows, '1')).toEqual({
      absences: 4,
      suspensions: 1,
      warnings: 2,
    });
    expect(aggregateDiscipline(rows, 'annual')).toEqual({
      absences: 7,
      suspensions: 1,
      warnings: 3,
    });
  });
});

describe('class discipline helpers', () => {
  it('parses term numbers and clamps counts', () => {
    expect(parseClassDisciplineTerm('2')).toBe('2');
    expect(parseClassDisciplineTerm('annual')).toBe('1');
    expect(normalizeDisciplineCount(12.9, 99)).toBe(12);
    expect(normalizeDisciplineCount(-4, 99)).toBe(0);
    expect(normalizeDisciplineCount(1000, 999)).toBe(999);
  });
});
