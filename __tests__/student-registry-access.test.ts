import { describe, expect, it } from 'vitest';
import {
  canViewStudentRegistry,
  canWriteRegistry,
  isGuardian,
} from '@/lib/acadia/roles';

describe('canViewStudentRegistry', () => {
  it('allows administrators and teaching staff', () => {
    expect(canViewStudentRegistry('admin')).toBe(true);
    expect(canViewStudentRegistry('registrar')).toBe(true);
    expect(canViewStudentRegistry('bursar')).toBe(true);
    expect(canViewStudentRegistry('teacher')).toBe(true);
    expect(canViewStudentRegistry('staff')).toBe(true);
  });

  it('denies parents, guardians, and students', () => {
    expect(canViewStudentRegistry('parent')).toBe(false);
    expect(canViewStudentRegistry('guardian')).toBe(false);
    expect(canViewStudentRegistry('student')).toBe(false);
    expect(canWriteRegistry('parent')).toBe(false);
    expect(isGuardian('parent')).toBe(true);
  });
});
