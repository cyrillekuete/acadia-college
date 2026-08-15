import { describe, expect, it } from 'vitest';
import {
  aggregateDiscipline,
  canWriteClassDiscipline,
  classDisciplineRosterQueryKey,
  normalizeDisciplineCount,
  parseClassDisciplineTerm,
  unenrolledDisciplineStudentIds,
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
        roleSlug: 'financial-director',
        staffProfileId: null,
        classMasterStaffProfileId: 'staff-1',
      }),
    ).toBe(true);
  });

  it('denies bursar even without a class-master match', () => {
    expect(
      canWriteClassDiscipline({
        roleSlug: 'bursar',
        staffProfileId: null,
        classMasterStaffProfileId: 'staff-1',
      }),
    ).toBe(false);
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

  it('sums the same term across classes after a mid-year migration', () => {
    const migrated = [
      { termNumber: 1, absenceHours: 4, suspensions: 1, warnings: 2 },
      { termNumber: 1, absenceHours: 3, suspensions: 0, warnings: 1 },
      { termNumber: 2, absenceHours: 1, suspensions: 0, warnings: 0 },
    ];
    expect(aggregateDiscipline(migrated, '1')).toEqual({
      absences: 7,
      suspensions: 1,
      warnings: 3,
    });
    expect(aggregateDiscipline(migrated, 'annual')).toEqual({
      absences: 8,
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

  it('rejects students who are not on the class roster', () => {
    const enrolled = new Set(['s1', 's2']);
    expect(unenrolledDisciplineStudentIds(['s1', 's2'], enrolled)).toEqual([]);
    expect(unenrolledDisciplineStudentIds(['s1', 's9', 's1'], enrolled)).toEqual(['s9']);
  });

  it('uses a string term so save invalidation matches the roster query', () => {
    expect(classDisciplineRosterQueryKey('t', 'y', 'c', 2)).toEqual([
      'class-discipline-roster',
      't',
      'y',
      'c',
      '2',
    ]);
    expect(classDisciplineRosterQueryKey('t', 'y', 'c', '2')).toEqual(
      classDisciplineRosterQueryKey('t', 'y', 'c', 2),
    );
  });
});
