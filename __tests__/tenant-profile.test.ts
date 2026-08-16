import { describe, expect, it } from 'vitest';
import { canWriteAcademicAdmin } from '@/lib/acadia/roles';
import {
  buildTenantProfilePatch,
  isTenantProfileField,
  parseTenantProfileField,
} from '@/lib/acadia/tenant-profile';

describe('tenant profile fields', () => {
  it('allows names, contact, and branding fields', () => {
    expect(isTenantProfileField('displayNameEn')).toBe(true);
    expect(isTenantProfileField('institutionEmail')).toBe(true);
    expect(isTenantProfileField('primaryColor')).toBe(true);
    expect(isTenantProfileField('slug')).toBe(false);
    expect(isTenantProfileField('status')).toBe(false);
  });

  it('requires institution names', () => {
    expect(parseTenantProfileField('displayNameEn', '  ')).toEqual({
      error: 'This field is required.',
    });
    expect(parseTenantProfileField('displayNameFr', 'Collège Acadia')).toEqual({
      field: 'displayNameFr',
      value: 'Collège Acadia',
    });
  });

  it('clears optional contact fields and validates email and url', () => {
    expect(parseTenantProfileField('institutionEmail', '')).toEqual({
      field: 'institutionEmail',
      value: null,
    });
    expect(parseTenantProfileField('institutionEmail', 'office@acadia.cm')).toEqual({
      field: 'institutionEmail',
      value: 'office@acadia.cm',
    });
    expect(parseTenantProfileField('institutionEmail', 'not-an-email')).toEqual({
      error: 'Please enter a valid email address.',
    });
    expect(parseTenantProfileField('websiteUrl', 'acadia.cm')).toEqual({
      field: 'websiteUrl',
      value: 'https://acadia.cm',
    });
  });

  it('normalizes colors and domains', () => {
    expect(parseTenantProfileField('primaryColor', '#c59')).toEqual({
      field: 'primaryColor',
      value: '#C59',
    });
    expect(parseTenantProfileField('accentColor', 'blue')).toEqual({
      error: 'Use a hex color like #C59434.',
    });
    expect(parseTenantProfileField('customDomain', 'https://School.Acadia.cm/path')).toEqual({
      field: 'customDomain',
      value: 'school.acadia.cm',
    });
  });

  it('builds a single-field patch', () => {
    expect(buildTenantProfilePatch('city', ' Douala ')).toEqual({ city: 'Douala' });
    expect(buildTenantProfilePatch('slug', 'acadia-college')).toEqual({
      error: 'Invalid input. Please check your data and try again.',
    });
  });
});

describe('tenant profile write access', () => {
  it('matches Tenant RLS admin-or-registrar', () => {
    expect(canWriteAcademicAdmin('admin')).toBe(true);
    expect(canWriteAcademicAdmin('registrar')).toBe(true);
    expect(canWriteAcademicAdmin('financial-director')).toBe(true);
    expect(canWriteAcademicAdmin('bursar')).toBe(false);
    expect(canWriteAcademicAdmin('teacher')).toBe(false);
  });
});
