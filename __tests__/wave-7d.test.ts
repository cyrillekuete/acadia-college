/**
 * Wave 7D unit tests
 * Covers: enrollment schemas, enrollment helpers, student schemas
 */
import { describe, it, expect } from 'vitest';
import {
  applicantDisplayName,
  buildEnrollmentApplicationRow,
  canEditEnrollmentApplication,
  generateRegistrationNumber,
  normalizeMatriculeNumber,
} from '@/lib/acadia/enrollment';
import {
  enrollmentApplicationSchema,
  reviewApplicationSchema,
} from '@/lib/acadia/enrollment-schemas';
import {
  studentClassMigrationSchema,
  studentProfileEditSchema,
} from '@/lib/acadia/student-schemas';
import { canWriteRegistry } from '@/lib/acadia/roles';

describe('enrollmentApplicationSchema', () => {
  it('requires sub-system, branch, and academic placement', () => {
    const result = enrollmentApplicationSchema.safeParse({
      kind: 'NEW',
      firstNameEn: 'Jane',
      lastNameEn: 'Doe',
      email: 'jane@school.edu',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      levelId: 'level-1',
      academicYearId: 'year-1',
      preferredLocale: 'en',
    });
    expect(result.success).toBe(true);
  });

  it('requires student profile for re-enrollment', () => {
    const result = enrollmentApplicationSchema.safeParse({
      kind: 'RE_ENROLL',
      firstNameEn: 'Jane',
      lastNameEn: 'Doe',
      email: 'jane@school.edu',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      levelId: 'level-1',
      academicYearId: 'year-1',
      preferredLocale: 'en',
      studentProfileId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = enrollmentApplicationSchema.safeParse({
      kind: 'NEW',
      firstNameEn: 'Jane',
      lastNameEn: 'Doe',
      email: '',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      levelId: 'level-1',
      academicYearId: 'year-1',
      preferredLocale: 'en',
    });
    expect(result.success).toBe(false);
  });
});

describe('reviewApplicationSchema', () => {
  it('requires rejection reason when rejecting', () => {
    expect(
      reviewApplicationSchema.safeParse({ decision: 'approve' }).success,
    ).toBe(true);
    expect(
      reviewApplicationSchema.safeParse({ decision: 'reject' }).success,
    ).toBe(false);
    expect(
      reviewApplicationSchema.safeParse({
        decision: 'reject',
        rejectionReason: 'Incomplete documents',
      }).success,
    ).toBe(true);
  });
});

describe('enrollment helpers', () => {
  it('builds pending application row with catalog fields', () => {
    const row = buildEnrollmentApplicationRow(
      'tenant-1',
      'app-1',
      {
        kind: 'NEW',
        firstNameEn: 'Paul',
        lastNameEn: 'Mbarga',
        firstNameFr: '',
        lastNameFr: '',
        email: 'paul@school.edu',
        phone: '',
        preferredLocale: 'en',
        studentProfileId: '',
        subSystem: 'FRENCH',
        branch: 'TECHNICAL',
        levelId: 'level-2',
        academicYearId: 'year-2026',
      },
      '2026-05-19T00:00:00.000Z',
    );
    expect(row.status).toBe('PENDING');
    expect(row.subSystem).toBe('FRENCH');
    expect(row.branch).toBe('TECHNICAL');
    expect(row.studentProfileId).toBeNull();
  });

  it('formats applicant display name', () => {
    expect(applicantDisplayName('Jane', 'Doe')).toBe('Jane Doe');
    expect(applicantDisplayName(null, null, 'Jean', 'Dupont')).toBe('Jean Dupont');
  });

  it('generates registration numbers with AC prefix', () => {
    expect(generateRegistrationNumber('2025-2026')).toMatch(/^AC-2026-/);
  });

  it('normalizes optional ministry matricule', () => {
    expect(normalizeMatriculeNumber('  GOV-123  ')).toBe('GOV-123');
    expect(normalizeMatriculeNumber('')).toBeNull();
    expect(normalizeMatriculeNumber(undefined)).toBeNull();
    expect(normalizeMatriculeNumber('   ')).toBeNull();
  });

  it('only allows editing pending applications', () => {
    expect(canEditEnrollmentApplication('PENDING')).toBe(true);
    expect(canEditEnrollmentApplication('APPROVED')).toBe(false);
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

describe('canWriteRegistry for enrollment', () => {
  it('allows admin, registrar, and bursar to manage registry', () => {
    expect(canWriteRegistry('admin')).toBe(true);
    expect(canWriteRegistry('registrar')).toBe(true);
    expect(canWriteRegistry('financial-director')).toBe(true);
    expect(canWriteRegistry('student')).toBe(false);
  });
});
