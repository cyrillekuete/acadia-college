import { describe, expect, it } from 'vitest';
import {
  normalizeEnrollmentStatus,
  splitStudentName,
} from '@/lib/supabase/queries/student-query-helpers';

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
