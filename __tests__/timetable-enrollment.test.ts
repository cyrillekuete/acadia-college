import { describe, expect, it } from 'vitest';
import {
  pickPreferredEnrolledClassId,
} from '@/lib/acadia/student-enrollment';

describe('pickPreferredEnrolledClassId', () => {
  it('prefers enrolled rows with a class over unassigned rows', () => {
    expect(
      pickPreferredEnrolledClassId([
        { classId: null, createdAt: '2026-08-03T00:00:00.000Z' },
        { classId: 'class-a', createdAt: '2026-08-01T00:00:00.000Z' },
      ]),
    ).toBe('class-a');
  });

  it('prefers the newest row when both have a class', () => {
    expect(
      pickPreferredEnrolledClassId([
        { classId: 'class-old', createdAt: '2026-08-01T00:00:00.000Z' },
        { classId: 'class-new', createdAt: '2026-08-03T00:00:00.000Z' },
      ]),
    ).toBe('class-new');
  });

  it('returns null when no row has a class', () => {
    expect(
      pickPreferredEnrolledClassId([
        { classId: null, createdAt: '2026-08-01T00:00:00.000Z' },
      ]),
    ).toBeNull();
  });
});
