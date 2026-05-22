import { describe, expect, it } from 'vitest';
import { staffCreateSchema } from '@/lib/acadia/staff-create-schemas';

const basePayload = {
  title: 'Mr' as const,
  firstName: 'Paul',
  lastName: 'Mbarga',
  personalEmail: 'paul.mbarga@example.com',
  phoneCountry: 'Cameroon',
  phone: '612345678',
  subSystem: 'ENGLISH' as const,
  subjectIds: [] as string[],
  classIds: [] as string[],
  academicYearId: 'year-1',
  employmentType: 'FULL_TIME' as const,
  emergencyContactPhoneCountry: 'Cameroon',
  emergencyContactPhone: '',
  isActive: true,
};

describe('staffCreateSchema', () => {
  it('accepts a valid teacher payload', () => {
    const result = staffCreateSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it('requires first and last name', () => {
    const result = staffCreateSchema.safeParse({
      ...basePayload,
      firstName: '',
    });
    expect(result.success).toBe(false);
  });

  it('requires a valid personal email', () => {
    const result = staffCreateSchema.safeParse({
      ...basePayload,
      personalEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid Cameroon mobile when phone provided', () => {
    const result = staffCreateSchema.safeParse({
      ...basePayload,
      phone: '512345678',
    });
    expect(result.success).toBe(false);
  });

  it('accepts Cameroon phone with country code or trunk prefix', () => {
    expect(staffCreateSchema.safeParse({
      ...basePayload,
      phone: '237677123456',
    }).success).toBe(true);
    expect(staffCreateSchema.safeParse({
      ...basePayload,
      phone: '0677123456',
    }).success).toBe(true);
  });

  it('requires academic year id', () => {
    const result = staffCreateSchema.safeParse({
      ...basePayload,
      academicYearId: '',
    });
    expect(result.success).toBe(false);
  });
});
