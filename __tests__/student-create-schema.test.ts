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

  it('skips student vs parent email check when parent email is empty', () => {
    const result = studentCreateSchema.safeParse({
      ...basePayload,
      email: 'same@school.test',
      parent_email: '',
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
            i.message.includes('must be different'),
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
