import { describe, expect, it } from 'vitest';
import { getDashboardPathForRole, isKnownAcadiaRole } from '@/lib/auth/dashboard-routes';
import {
  canViewStudentRegistry,
  canWriteFinance,
  canWriteOperations,
  canWriteRegistry,
  isAdmin,
} from '@/lib/acadia/roles';
import { classMatchesDisciplineScopes } from '@/lib/acadia/discipline-scopes';

describe('staff duty access', () => {
  it('keeps Bursar finance-only and unions explicitly assigned duties', () => {
    expect(canWriteFinance(['teacher', 'bursar'])).toBe(true);
    expect(isAdmin('bursar')).toBe(false);
    expect(canWriteRegistry('bursar')).toBe(false);
    expect(canWriteOperations('bursar')).toBe(false);
    expect(canWriteOperations('teacher')).toBe(true);
  });

  it('recognizes office duties and routes them by their assigned duties', () => {
    expect(isKnownAcadiaRole('discipline-master')).toBe(true);
    expect(isKnownAcadiaRole('library-attendant')).toBe(true);
    expect(isKnownAcadiaRole('secretary')).toBe(true);
    expect(getDashboardPathForRole(['bursar'])).toBe('/finance/fees');
    expect(getDashboardPathForRole(['teacher', 'bursar'])).toBe('/dashboard/staff');
    expect(getDashboardPathForRole(['library-attendant'])).toBe('/dashboard/staff');
  });

  it('lets Secretaries view student registry while keeping office privileges separate', () => {
    expect(canViewStudentRegistry('secretary')).toBe(true);
    expect(canWriteRegistry('secretary')).toBe(false);
  });

  it('matches discipline groups with AND filters and OR groups, including future classes', () => {
    const groups = [
      { id: 'grammar-forms', wholeSchool: false, subSystem: 'ENGLISH', branch: 'GRAMMAR', minLevel: 1, maxLevel: 5 },
      { id: 'commercial-french', wholeSchool: false, subSystem: 'FRENCH', branch: 'COMMERCIAL', minLevel: null, maxLevel: null },
    ];
    expect(classMatchesDisciplineScopes(
      { id: 'new-form-2', subSystem: 'ENGLISH', branch: 'GRAMMAR', levelNumber: 2 },
      groups,
      [],
    )).toBe(true);
    expect(classMatchesDisciplineScopes(
      { id: 'technical-form-2', subSystem: 'ENGLISH', branch: 'TECHNICAL', levelNumber: 2 },
      groups,
      [],
    )).toBe(false);
    expect(classMatchesDisciplineScopes(
      { id: 'commercial-1', subSystem: 'FRENCH', branch: 'COMMERCIAL', levelNumber: 1 },
      groups,
      [],
    )).toBe(true);
  });
});
