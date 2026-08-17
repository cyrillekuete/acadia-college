/**
 * Wave 7D unit tests
 * Covers: student ID helpers, student schemas, registry write access
 */
import { describe, it, expect } from 'vitest';
import {
  generateRegistrationNumber,
  normalizeMatriculeNumber,
} from '@/lib/acadia/student-ids';
import {
  studentClassMigrationSchema,
  studentProfileEditSchema,
} from '@/lib/acadia/student-schemas';
import { canWriteRegistry } from '@/lib/acadia/roles';

describe('student ID helpers', () => {
  it('generates registration numbers with AC prefix', () => {
    expect(generateRegistrationNumber('2025-2026')).toMatch(/^AC-2026-/);
  });

  it('normalizes optional ministry matricule', () => {
    expect(normalizeMatriculeNumber('  GOV-123  ')).toBe('GOV-123');
    expect(normalizeMatriculeNumber('')).toBeNull();
    expect(normalizeMatriculeNumber(undefined)).toBeNull();
    expect(normalizeMatriculeNumber('   ')).toBeNull();
  });
});

describe('studentProfileEditSchema', () => {
  it('accepts valid profile edits', () => {
    const result = studentProfileEditSchema.safeParse({
      registrationNumber: 'AC-2026-001',
      matriculeNumber: '',
      isActive: true,
      alumniDirectoryOptIn: false,
      alumniSince: '',
      name: 'Acadia Student',
      email: 'student@acadia-college.edu',
    });
    expect(result.success).toBe(true);
  });
});

describe('studentClassMigrationSchema', () => {
  it('requires target placement fields', () => {
    const result = studentClassMigrationSchema.safeParse({
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      levelId: 'level-2',
      academicYearId: 'year-1',
    });
    expect(result.success).toBe(true);
  });
});

describe('canWriteRegistry', () => {
  it('allows admin, registrar, and bursar to manage registry', () => {
    expect(canWriteRegistry('admin')).toBe(true);
    expect(canWriteRegistry('registrar')).toBe(true);
    expect(canWriteRegistry('financial-director')).toBe(true);
    expect(canWriteRegistry('student')).toBe(false);
  });
});
