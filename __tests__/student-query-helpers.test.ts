import { describe, expect, it } from 'vitest';
import {
  normalizeEnrollmentStatus,
  splitStudentName,
} from '@/lib/supabase/queries/student-query-helpers';
import {
  collapseEnrollmentsByProfile,
  mapEnrollmentStatus,
} from '@/lib/acadia/student-enrollment';

describe('normalizeEnrollmentStatus', () => {
  it('maps enrolled variants to active', () => {
    expect(normalizeEnrollmentStatus('ENROLLED')).toBe('active');
    expect(normalizeEnrollmentStatus('active')).toBe('active');
  });

  it('maps pending values', () => {
    expect(normalizeEnrollmentStatus('pending')).toBe('pending');
    expect(normalizeEnrollmentStatus(null)).toBe('pending');
  });

  it('maps other values to inactive', () => {
    expect(normalizeEnrollmentStatus('withdrawn')).toBe('inactive');
  });
});

describe('mapEnrollmentStatus for roster rows', () => {
  it('maps enrolled with a class to active and without a class to pending', () => {
    expect(mapEnrollmentStatus('ENROLLED', 'class-a')).toBe('active');
    expect(mapEnrollmentStatus('ENROLLED', null)).toBe('pending');
    expect(mapEnrollmentStatus('WITHDRAWN', 'class-a')).toBe('inactive');

    const collapsed = collapseEnrollmentsByProfile([
      {
        profileId: 'p1',
        status: 'WITHDRAWN',
        createdAt: '2026-08-02T00:00:00.000Z',
        classId: 'old',
      },
      {
        profileId: 'p1',
        status: 'ENROLLED',
        createdAt: '2026-08-01T00:00:00.000Z',
        classId: 'new',
      },
      {
        profileId: 'p2',
        status: 'WITHDRAWN',
        createdAt: '2026-08-03T00:00:00.000Z',
        classId: 'x',
      },
    ]);

    expect(collapsed).toHaveLength(2);
    expect(collapsed.find((row) => row.profileId === 'p1')?.status).toBe('ENROLLED');
    expect(collapsed.find((row) => row.profileId === 'p2')?.status).toBe('WITHDRAWN');
  });
});

describe('splitStudentName', () => {
  it('splits full names into first and last', () => {
    expect(splitStudentName('Jane Marie Doe')).toEqual({
      first: 'Jane',
      last: 'Marie Doe',
    });
  });

  it('uses a placeholder first name when empty', () => {
    expect(splitStudentName('')).toEqual({ first: 'Student', last: '' });
  });

  it('handles single-word names', () => {
    expect(splitStudentName('Cher')).toEqual({ first: 'Cher', last: '' });
  });
});
