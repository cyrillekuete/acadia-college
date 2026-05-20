import { describe, it, expect } from 'vitest';
import { toAcademicBranch, toAcademicSubSystem } from '@/lib/acadia/catalog-maps';

describe('catalog-maps', () => {
  it('maps legacy subsystem values to catalog enums', () => {
    expect(toAcademicSubSystem('english')).toBe('ENGLISH');
    expect(toAcademicSubSystem('french')).toBe('FRENCH');
  });

  it('maps legacy branch values to catalog enums', () => {
    expect(toAcademicBranch('grammar')).toBe('GRAMMAR');
    expect(toAcademicBranch('technical')).toBe('TECHNICAL');
    expect(toAcademicBranch('commercial')).toBe('COMMERCIAL');
  });
});
