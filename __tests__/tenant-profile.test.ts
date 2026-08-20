import { describe, expect, it } from 'vitest';
import { canWriteAcademicAdmin } from '@/lib/acadia/roles';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import {
  buildTenantProfilePatch,
  CUSTOM_DOMAIN_IN_USE_MESSAGE,
  isTenantProfileField,
  parseTenantProfileField,
  tenantStatusBadgeVariant,
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

  it('validates institution phone with country code and stores E.164', () => {
    expect(parseTenantProfileField('institutionPhone', '+237 677 123 456')).toEqual({
      field: 'institutionPhone',
      value: '+237677123456',
    });
    expect(parseTenantProfileField('institutionPhone', '12')).toEqual({
      error: 'Enter a valid phone number, including country code.',
    });
  });

  it('allows empty phone and rejects invalid numbers', () => {
    expect(parseTenantProfileField('institutionPhone', '')).toEqual({
      field: 'institutionPhone',
      value: null,
    });
    expect(parseTenantProfileField('institutionPhone', '+237 677 123 456')).toEqual({
      field: 'institutionPhone',
      value: '+237677123456',
    });
    expect(parseTenantProfileField('institutionPhone', 'abc')).toEqual({
      error: 'Enter a valid phone number, including country code.',
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

describe('custom domain uniqueness', () => {
  it('maps the unique index to a clear message', () => {
    expect(
      getMutationErrorMessage({
        code: '23505',
        message: 'duplicate key value violates unique constraint "Tenant_customDomain_uidx"',
      }),
    ).toBe(CUSTOM_DOMAIN_IN_USE_MESSAGE);
  });
});

describe('tenant status badge', () => {
  it('maps ACTIVE, ONBOARDING, SUSPENDED, and ARCHIVED', () => {
    expect(tenantStatusBadgeVariant('ACTIVE')).toBe('success');
    expect(tenantStatusBadgeVariant('ONBOARDING')).toBe('warning');
    expect(tenantStatusBadgeVariant('SUSPENDED')).toBe('destructive');
    expect(tenantStatusBadgeVariant('ARCHIVED')).toBe('secondary');
  });
});
