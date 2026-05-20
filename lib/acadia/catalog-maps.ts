import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';

/** Map legacy snake_case student create enums to catalog PascalCase values. */
export function toAcademicSubSystem(
  value: string | undefined | null,
): AcademicSubSystem | null {
  const v = (value ?? '').toLowerCase();
  if (v === 'english') return 'ENGLISH';
  if (v === 'french') return 'FRENCH';
  if (value === 'ENGLISH' || value === 'FRENCH') return value;
  return null;
}

export function toAcademicBranch(
  value: string | undefined | null,
): AcademicBranch | null {
  const v = (value ?? '').toLowerCase();
  if (v === 'grammar') return 'GRAMMAR';
  if (v === 'technical') return 'TECHNICAL';
  if (v === 'commercial') return 'COMMERCIAL';
  if (value === 'GRAMMAR' || value === 'TECHNICAL' || value === 'COMMERCIAL') {
    return value;
  }
  return null;
}
