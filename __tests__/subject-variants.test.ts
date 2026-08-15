import { describe, expect, it } from 'vitest';
import {
  findOverlappingVariant,
  levelsOverlap,
  normalizeSubjectName,
  sortSubjectsWithVariants,
  subjectVariantGroupKey,
  suggestVariantCode,
  variantGroupCounts,
} from '@/lib/acadia/subject-variants';

describe('normalizeSubjectName', () => {
  it('trims and collapses case and spaces', () => {
    expect(normalizeSubjectName('  Chemistry  ')).toBe('chemistry');
    expect(normalizeSubjectName('Organic   Chemistry')).toBe('organic chemistry');
  });
});

describe('subjectVariantGroupKey', () => {
  it('groups by name, stream, and year', () => {
    expect(
      subjectVariantGroupKey({
        nameEn: 'Chemistry',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
      }),
    ).toBe(
      subjectVariantGroupKey({
        nameEn: 'chemistry',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
      }),
    );
  });
});

describe('levelsOverlap', () => {
  it('detects shared level ids', () => {
    expect(levelsOverlap(['f1', 'f2'], ['f5', 'f2'])).toBe(true);
    expect(levelsOverlap(['f1', 'f2'], ['l6', 'u6'])).toBe(false);
  });
});

describe('findOverlappingVariant', () => {
  const existing = [
    {
      id: 'chem-o',
      nameEn: 'Chemistry',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      academicYearId: 'year-1',
      levelIds: ['f1', 'f2', 'f3', 'f4', 'f5'],
    },
  ];

  it('rejects the same name covering an overlapping level', () => {
    const overlap = findOverlappingVariant(existing, {
      nameEn: 'chemistry',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      academicYearId: 'year-1',
      levelIds: ['f5', 'l6'],
    });
    expect(overlap?.id).toBe('chem-o');
  });

  it('allows a non-overlapping level variant', () => {
    expect(
      findOverlappingVariant(existing, {
        nameEn: 'Chemistry',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
        levelIds: ['l6', 'u6'],
      }),
    ).toBeNull();
  });

  it('ignores the record being edited', () => {
    expect(
      findOverlappingVariant(existing, {
        id: 'chem-o',
        nameEn: 'Chemistry',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
        levelIds: ['f1', 'f2'],
      }),
    ).toBeNull();
  });
});

describe('suggestVariantCode', () => {
  it('appends an incrementing suffix', () => {
    expect(suggestVariantCode('CHEM', ['CHEM'])).toBe('CHEM-2');
    expect(suggestVariantCode('CHEM', ['CHEM', 'CHEM-2'])).toBe('CHEM-3');
  });
});

describe('catalog grouping', () => {
  it('keeps same-name variants adjacent', () => {
    const sorted = sortSubjectsWithVariants([
      {
        nameEn: 'Physics',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
        levelIds: ['f1'],
        code: 'PHY',
      },
      {
        nameEn: 'Chemistry',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
        levelIds: ['l6'],
        code: 'CHEM-2',
      },
      {
        nameEn: 'Chemistry',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
        levelIds: ['f1'],
        code: 'CHEM',
      },
    ]);
    expect(sorted.map((row) => row.code)).toEqual(['CHEM', 'CHEM-2', 'PHY']);
  });

  it('counts variants in a group', () => {
    const counts = variantGroupCounts([
      {
        nameEn: 'Chemistry',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
      },
      {
        nameEn: 'Chemistry',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
      },
      {
        nameEn: 'Physics',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        academicYearId: 'year-1',
      },
    ]);
    expect(
      counts.get(
        subjectVariantGroupKey({
          nameEn: 'Chemistry',
          subSystem: 'ENGLISH',
          branch: 'GRAMMAR',
          academicYearId: 'year-1',
        }),
      ),
    ).toBe(2);
  });
});
