import { describe, expect, it } from 'vitest';
import { requireClassIdForEnrollment } from '@/lib/acadia/class-assignment';
import { UNASSIGNED_CLASS_FILTER } from '@/lib/acadia/student-enrollment';
import {
  EMPTY_STUDENT_REGISTRY_FILTERS,
  filterStudentsRegistry,
  getStudentClassOptions,
} from '@/lib/acadia/student-registry';
import type { StudentListItem } from '@/lib/acadia/student-list-item';

function student(overrides: Partial<StudentListItem> = {}): StudentListItem {
  return {
    id: 'profile-1',
    student_id: 'AC-2026-1',
    registration_number: 'AC-2026-1',
    first_name: 'Ada',
    last_name: 'Ngono',
    email: 'ada@example.com',
    avatar: null,
    class_id: 'class-a',
    class_name: 'Form 5A',
    subsystem: 'ENGLISH',
    branch: 'GRAMMAR',
    matricule_number: null,
    enrollment_status: 'active',
    status: 'active',
    enrollment_date: '2026-01-01T00:00:00.000Z',
    email_verified: true,
    total_fees: 0,
    paid_fees: 0,
    fees_status: 'pending',
    ...overrides,
  };
}

describe('requireClassIdForEnrollment', () => {
  it('uses an explicit class id', () => {
    expect(
      requireClassIdForEnrollment('class-b', {
        status: 'ambiguous',
        classId: null,
        candidateIds: ['class-a', 'class-b'],
      }),
    ).toBe('class-b');
  });

  it('uses the unique resolved class', () => {
    expect(
      requireClassIdForEnrollment(null, {
        status: 'resolved',
        classId: 'class-a',
        candidateIds: ['class-a'],
      }),
    ).toBe('class-a');
  });

  it('fails when no class matches or several match', () => {
    expect(() =>
      requireClassIdForEnrollment('', {
        status: 'none',
        classId: null,
        candidateIds: [],
      }),
    ).toThrow(/No active class/);
    expect(() =>
      requireClassIdForEnrollment(null, {
        status: 'ambiguous',
        classId: null,
        candidateIds: ['a', 'b'],
      }),
    ).toThrow(/Multiple classes/);
  });
});

describe('filterStudentsRegistry class id', () => {
  it('filters by class id and unassigned students', () => {
    const students = [
      student({ id: 'a', class_id: 'class-a', class_name: 'Form 5A' }),
      student({
        id: 'b',
        class_id: 'class-b',
        class_name: 'Form 5A',
        subsystem: 'FRENCH',
        branch: 'TECHNICAL',
      }),
      student({ id: 'u', class_id: null, class_name: '—', enrollment_status: 'pending' }),
    ];

    expect(
      filterStudentsRegistry(students, {
        ...EMPTY_STUDENT_REGISTRY_FILTERS,
        classId: 'class-b',
      }).map((row) => row.id),
    ).toEqual(['b']);

    expect(
      filterStudentsRegistry(students, {
        ...EMPTY_STUDENT_REGISTRY_FILTERS,
        classId: UNASSIGNED_CLASS_FILTER,
      }).map((row) => row.id),
    ).toEqual(['u']);

    const options = getStudentClassOptions(students);
    expect(options.map((option) => option.id).sort()).toEqual(['class-a', 'class-b']);
    expect(options.find((option) => option.id === 'class-b')?.name).toContain('Form 5A');
  });
});
