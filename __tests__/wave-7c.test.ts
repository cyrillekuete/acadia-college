/**
 * Wave 7C unit tests
 * Covers: roles (user management), user schemas, status audit events
 */
import { describe, it, expect } from 'vitest';
import {
  canManageUsers,
  canWriteAcademicAdmin,
  isFinancialDirector,
  isAdmin,
} from '@/lib/acadia/roles';
import {
  createUserSchema,
  tenantSessionSettingsSchema,
} from '@/lib/acadia/user-schemas';
import { userStatusLogEvent } from '@/lib/acadia/user-management';
import { UserStatus } from '@/app/models/user';

describe('canManageUsers', () => {
  it('allows admin, super-admin, registrar', () => {
    expect(canManageUsers('admin')).toBe(true);
    expect(canManageUsers('super-admin')).toBe(true);
    expect(canManageUsers('registrar')).toBe(true);
  });

  it('denies financial-director and staff roles', () => {
    expect(canManageUsers('financial-director')).toBe(false);
    expect(canManageUsers('lecturer')).toBe(false);
    expect(canManageUsers('student')).toBe(false);
  });
});

describe('isFinancialDirector', () => {
  it('matches financial-director slug only', () => {
    expect(isFinancialDirector('financial-director')).toBe(true);
    expect(isFinancialDirector('admin')).toBe(false);
  });
});

describe('isAdmin vs canManageUsers', () => {
  it('treats bursar as admin for institution ops but not user CRUD', () => {
    expect(isAdmin('financial-director')).toBe(true);
    expect(canManageUsers('financial-director')).toBe(false);
  });
});

describe('canWriteAcademicAdmin', () => {
  it('matches SQL admin-or-registrar and excludes bursar', () => {
    expect(canWriteAcademicAdmin('admin')).toBe(true);
    expect(canWriteAcademicAdmin('super-admin')).toBe(true);
    expect(canWriteAcademicAdmin('registrar')).toBe(true);
    expect(canWriteAcademicAdmin('financial-director')).toBe(true);
    expect(canWriteAcademicAdmin('bursar')).toBe(false);
    expect(canWriteAcademicAdmin('teacher')).toBe(false);
  });
});

describe('createUserSchema', () => {
  it('rejects weak passwords', () => {
    const result = createUserSchema.safeParse({
      email: 'user@school.edu',
      name: 'Test User',
      roleId: 'role-1',
      status: UserStatus.ACTIVE,
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a policy-compliant password', () => {
    const result = createUserSchema.safeParse({
      email: 'user@school.edu',
      name: 'Test User',
      roleId: 'role-1',
      status: UserStatus.ACTIVE,
      password: 'Acadia2026!',
    });
    expect(result.success).toBe(true);
  });
});

describe('tenantSessionSettingsSchema', () => {
  it('requires timeout between 15 and 1440 minutes', () => {
    expect(
      tenantSessionSettingsSchema.safeParse({
        sessionTimeoutMinutes: 10,
        sessionWarningMinutes: 5,
      }).success,
    ).toBe(false);
    expect(
      tenantSessionSettingsSchema.safeParse({
        sessionTimeoutMinutes: 60,
        sessionWarningMinutes: 5,
      }).success,
    ).toBe(true);
  });

  it('rejects warning >= timeout (prevents immediate idle warning)', () => {
    expect(
      tenantSessionSettingsSchema.safeParse({
        sessionTimeoutMinutes: 30,
        sessionWarningMinutes: 30,
      }).success,
    ).toBe(false);
    expect(
      tenantSessionSettingsSchema.safeParse({
        sessionTimeoutMinutes: 30,
        sessionWarningMinutes: 45,
      }).success,
    ).toBe(false);
    expect(
      tenantSessionSettingsSchema.safeParse({
        sessionTimeoutMinutes: 30,
        sessionWarningMinutes: 29,
      }).success,
    ).toBe(true);
  });
});

describe('userStatusLogEvent', () => {
  it('returns null when status unchanged', () => {
    expect(userStatusLogEvent(UserStatus.ACTIVE, UserStatus.ACTIVE)).toBeNull();
  });

  it('maps activation and deactivation', () => {
    expect(
      userStatusLogEvent(UserStatus.INACTIVE, UserStatus.ACTIVE),
    ).toBe('user.activated');
    expect(
      userStatusLogEvent(UserStatus.ACTIVE, UserStatus.INACTIVE),
    ).toBe('user.deactivated');
    expect(
      userStatusLogEvent(UserStatus.ACTIVE, UserStatus.BLOCKED),
    ).toBe('user.blocked');
  });
});
