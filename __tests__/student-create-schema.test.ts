/**
 * Student create form validation: parent contact and email uniqueness rules.
 */
import { describe, it, expect } from 'vitest';
import {
  CAMEROON_REGIONS,
  filterCities,
  getCitiesForRegion,
  isCityInRegion,
} from '@/lib/acadia/cameroon-locations';
import { normalizePhoneForLookup } from '@/lib/acadia/phone';
import { buildStudentSystemAuthEmail } from '@/lib/acadia/provision-accounts';
import {
  formatStudentEmailForDisplay,
  isStudentSystemAuthEmail,
} from '@/lib/acadia/student-system-auth-email';
import { studentCreateSchema } from '@/lib/acadia/student-create-schemas';

const basePayload = {
  first_name: 'Jean',
  last_name: 'Dupont',
  email: 'student@school.test',
  subsystem: 'english' as const,
  branch: 'grammar' as const,
  is_new_student: true,
  parent_name: 'Marie Dupont',
  parent_email: '',
  parent_phone_country: 'Cameroon',
  parent_phone: '677123456',
  parent_relationship: 'mother' as const,
  academic_year_id: 'year-2025',
  level_id: 'level-1',
};

describe('studentCreateSchema parent contact', () => {
  it('requires parent phone', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      parent_phone: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('parent_phone'))).toBe(
        true,
      );
    }
  });

  it('allows empty parent email', () => {
    const result = studentCreateSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parent_email).toBe('');
      expect(result.data.parent_phone).toBe('+237677123456');
      expect(result.data).not.toHaveProperty('parent_phone_country');
    }
  });

  it('composes optional student phone to E.164', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      phone_country: 'Cameroon',
      phone: '677123456',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+237677123456');
    }
  });

  it('rejects Cameroon parent phones not starting with 6', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      parent_phone: '577123456',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes('parent_phone'),
        ),
      ).toBe(true);
    }
  });

  it('validates parent email format when provided', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      parent_email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('parent_email'))).toBe(
        true,
      );
    }
  });

  it('accepts valid parent email when provided', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      parent_email: 'parent@school.test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parent_email).toBe('parent@school.test');
    }
  });

  it('accepts DD-MM-YYYY date of birth and stores ISO date', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      date_of_birth: '15-03-2010',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date_of_birth).toBe('2010-03-15');
    }
  });

  it('rejects an already-converted ISO date of birth', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      date_of_birth: '2010-03-15',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path.includes('date_of_birth') &&
            issue.message === 'validation.invalidDateOfBirth',
        ),
      ).toBe(true);
    }
  });

  it('rejects invalid date of birth formats', () => {
    expect(
      studentCreateSchema.safeParse({
        ...basePayload,
        date_of_birth: '32-01-2010',
      }).success,
    ).toBe(false);
    expect(
      studentCreateSchema.safeParse({
        ...basePayload,
        date_of_birth: '15/03/2010',
      }).success,
    ).toBe(false);
  });

  it('omits a blank enrollment date', () => {
    const omitted = studentCreateSchema.safeParse(basePayload);
    expect(omitted.success).toBe(true);
    if (omitted.success) {
      expect(omitted.data.enrollment_date).toBeUndefined();
    }

    const empty = studentCreateSchema.safeParse({
      ...basePayload,
      enrollment_date: '',
    });
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.enrollment_date).toBeUndefined();
    }

    const whitespace = studentCreateSchema.safeParse({
      ...basePayload,
      enrollment_date: '   ',
    });
    expect(whitespace.success).toBe(true);
    if (whitespace.success) {
      expect(whitespace.data.enrollment_date).toBeUndefined();
    }
  });

  it('keeps a valid ISO enrollment date', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      enrollment_date: '2026-09-01',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enrollment_date).toBe('2026-09-01');
    }
  });

  it('rejects enrollment dates that are not YYYY-MM-DD', () => {
    for (const enrollment_date of ['01-09-2026', 'not-a-date']) {
      const result = studentCreateSchema.safeParse({
        ...basePayload,
        enrollment_date,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.path.includes('enrollment_date') &&
              issue.message === 'validation.invalid.date',
          ),
        ).toBe(true);
      }
    }
  });

  it('skips student vs parent email check when parent email is empty', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      email: 'same@school.test',
      parent_email: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty student email', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      email: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('');
    }
  });

  it('accepts valid optional student email', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      email: 'student@school.test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('student@school.test');
    }
  });

  it('rejects invalid student email when provided', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('email'))).toBe(
        true,
      );
    }
  });

  it('skips emailsMustDiffer when student email is empty', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      email: '',
      parent_email: 'parent@school.test',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional country field', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      country: 'Cameroon',
      region: 'Centre',
      city: 'Yaoundé',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('Cameroon');
    }
  });

  it('rejects matching student and parent emails', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      email: 'shared@school.test',
      parent_email: 'shared@school.test',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.path.includes('parent_email') &&
            i.message === 'validation.emailsMustDiffer',
        ),
      ).toBe(true);
    }
  });

  it('allows empty matricule_number', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      matricule_number: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matricule_number).toBeUndefined();
    }
  });

  it('trims matricule_number when provided', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      matricule_number: '  MIN-2026-001  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matricule_number).toBe('MIN-2026-001');
    }
  });
});

describe('buildStudentSystemAuthEmail', () => {
  it('builds a synthetic student login email', () => {
    expect(buildStudentSystemAuthEmail('tenant-1', 'STU-123')).toBe(
      'student.tenant-1.STU-123@student.acadia.local',
    );
  });
});

describe('isStudentSystemAuthEmail', () => {
  it('detects synthetic student login emails', () => {
    expect(
      isStudentSystemAuthEmail(
        'student.117b136b-002f-4833-bc31-08f47da658bd.stu-2026-70722@student.acadia.local',
      ),
    ).toBe(true);
    expect(isStudentSystemAuthEmail('student.tenant-1.STU-123@student.acadia.local')).toBe(
      true,
    );
  });

  it('rejects real contact emails and empty values', () => {
    expect(isStudentSystemAuthEmail('kongyuy.regency@school.test')).toBe(false);
    expect(isStudentSystemAuthEmail('')).toBe(false);
    expect(isStudentSystemAuthEmail(null)).toBe(false);
    expect(isStudentSystemAuthEmail(undefined)).toBe(false);
  });
});

describe('formatStudentEmailForDisplay', () => {
  it('hides synthetic system login emails', () => {
    expect(
      formatStudentEmailForDisplay(
        'student.tenant-1.STU-123@student.acadia.local',
      ),
    ).toBe('—');
  });

  it('returns real contact emails unchanged', () => {
    expect(formatStudentEmailForDisplay('kongyuy.regency@school.test')).toBe(
      'kongyuy.regency@school.test',
    );
  });

  it('returns a dash for empty values', () => {
    expect(formatStudentEmailForDisplay('')).toBe('—');
    expect(formatStudentEmailForDisplay('   ')).toBe('—');
    expect(formatStudentEmailForDisplay(null)).toBe('—');
  });
});

describe('cameroon-locations', () => {
  it('lists 10 official regions', () => {
    expect(CAMEROON_REGIONS).toHaveLength(10);
  });

  it('returns cities for a known region', () => {
    const cities = getCitiesForRegion('Centre');
    expect(cities.length).toBeGreaterThan(0);
    expect(cities).toContain('Yaoundé');
  });

  it('filters cities by query', () => {
    const matches = filterCities('Littoral', 'dou');
    expect(matches.some((c) => c.toLowerCase().includes('dou'))).toBe(true);
  });

  it('checks city membership in region', () => {
    expect(isCityInRegion('Centre', 'Yaoundé')).toBe(true);
    expect(isCityInRegion('Centre', 'Douala')).toBe(false);
  });
});

describe('normalizePhoneForLookup', () => {
  it('strips formatting and country prefix', () => {
    expect(normalizePhoneForLookup('+237 677 123 456')).toBe('677123456');
    expect(normalizePhoneForLookup('0677123456')).toBe('677123456');
  });
});
