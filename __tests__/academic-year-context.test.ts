/**
 * Academic year setup status, active year resolution, and persistence helpers
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_ACADEMIC_STRUCTURE } from '@/lib/acadia/academic-calendar';
import {
  activeAcademicYearStorageKey,
  readStoredActiveAcademicYearId,
  resolveInitialActiveYearId,
  writeStoredActiveAcademicYearId,
} from '@/lib/acadia/active-academic-year-storage';
import type { AcademicYearOption } from '@/hooks/use-academic-calendar-options';

const YEARS: AcademicYearOption[] = [
  { id: 'year-2026', label: '2026–2027', isCurrent: true },
  { id: 'year-2025', label: '2025–2026', isCurrent: false },
];

describe('AcademicYear setup status', () => {
  it('treats configured when current year exists', () => {
    const status = {
      configured: true,
      yearCount: 2,
      current: {
        id: 'year-1',
        label: '2025–2026',
        startsOn: '2025-09-01',
        endsOn: '2026-06-30',
        isCurrent: true,
        isActive: true,
        termsPerYear: DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
        sequencesPerTerm: DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
        sequencesPerYear: DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
      },
    };
    expect(status.configured).toBe(true);
    expect(status.current?.id).toBe('year-1');
  });

  it('treats not configured when no current year', () => {
    const status = { configured: false, yearCount: 1, current: null };
    expect(status.configured).toBe(false);
    expect(status.yearCount).toBe(1);
  });
});

describe('resolveInitialActiveYearId', () => {
  it('prefers stored id when valid', () => {
    expect(
      resolveInitialActiveYearId(YEARS, 'year-2026', 'year-2025'),
    ).toBe('year-2025');
  });

  it('falls back to current year when storage is missing or invalid', () => {
    expect(resolveInitialActiveYearId(YEARS, 'year-2026', null)).toBe(
      'year-2026',
    );
    expect(resolveInitialActiveYearId(YEARS, 'year-2026', 'unknown')).toBe(
      'year-2026',
    );
  });

  it('uses first year when no current and no valid storage', () => {
    expect(resolveInitialActiveYearId(YEARS, null, null)).toBe('year-2026');
  });

  it('returns null when no years exist', () => {
    expect(resolveInitialActiveYearId([], null, null)).toBeNull();
  });
});

describe('active academic year localStorage', () => {
  const tenantId = 'tenant-test';

  beforeEach(() => {
    const store: Record<string, string> = {};
    const localStorage = {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      removeItem(key: string) {
        delete store[key];
      },
    };
    vi.stubGlobal('localStorage', localStorage);
  });

  it('uses tenant-scoped storage key', () => {
    expect(activeAcademicYearStorageKey(tenantId)).toBe(
      'acadia:activeAcademicYear:tenant-test',
    );
  });

  it('reads and writes stored active year id', () => {
    writeStoredActiveAcademicYearId(tenantId, 'year-2025');
    expect(readStoredActiveAcademicYearId(tenantId)).toBe('year-2025');
    writeStoredActiveAcademicYearId(tenantId, null);
    expect(readStoredActiveAcademicYearId(tenantId)).toBeNull();
  });
});
