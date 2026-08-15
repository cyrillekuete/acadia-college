export function normalizeSubjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function subjectVariantGroupKey(input: {
  nameEn: string;
  subSystem: string;
  branch: string;
  academicYearId: string;
}): string {
  return [
    normalizeSubjectName(input.nameEn),
    input.subSystem,
    input.branch,
    input.academicYearId,
  ].join('|');
}

export function levelsOverlap(left: string[], right: string[]): boolean {
  const set = new Set(left);
  return right.some((id) => set.has(id));
}

export type SubjectVariantCandidate = {
  id: string;
  nameEn: string;
  subSystem: string;
  branch: string;
  academicYearId: string | null;
  levelIds: string[];
};

export const OVERLAPPING_VARIANT_MESSAGE =
  'A subject with this name already covers one of the selected levels in this year and stream. Create a level variant with non-overlapping levels instead.';

export function findOverlappingVariant(
  existing: SubjectVariantCandidate[],
  next: Omit<SubjectVariantCandidate, 'id'> & { id?: string },
): SubjectVariantCandidate | null {
  if (!next.academicYearId) {
    return null;
  }
  const nextKey = subjectVariantGroupKey({
    nameEn: next.nameEn,
    subSystem: next.subSystem,
    branch: next.branch,
    academicYearId: next.academicYearId,
  });

  for (const row of existing) {
    if (next.id && row.id === next.id) {
      continue;
    }
    if (!row.academicYearId) {
      continue;
    }
    const key = subjectVariantGroupKey({
      nameEn: row.nameEn,
      subSystem: row.subSystem,
      branch: row.branch,
      academicYearId: row.academicYearId,
    });
    if (key !== nextKey) {
      continue;
    }
    if (levelsOverlap(row.levelIds, next.levelIds)) {
      return row;
    }
  }
  return null;
}

export function suggestVariantCode(baseCode: string, existingCodes: string[]): string {
  const upper = baseCode.trim().toUpperCase();
  const used = new Set(existingCodes.map((code) => code.trim().toUpperCase()));
  const stem = upper.replace(/-\d+$/, '') || upper;
  let n = 2;
  let candidate = `${stem}-${n}`;
  while (used.has(candidate) || candidate === upper) {
    n += 1;
    candidate = `${stem}-${n}`;
  }
  return candidate;
}

export function sortSubjectsWithVariants<
  T extends {
    nameEn: string;
    subSystem: string;
    branch: string;
    academicYearId?: string | null;
    levelIds?: string[];
    code?: string;
  },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const keyA = subjectVariantGroupKey({
      nameEn: a.nameEn,
      subSystem: a.subSystem,
      branch: a.branch,
      academicYearId: a.academicYearId ?? '',
    });
    const keyB = subjectVariantGroupKey({
      nameEn: b.nameEn,
      subSystem: b.subSystem,
      branch: b.branch,
      academicYearId: b.academicYearId ?? '',
    });
    if (keyA !== keyB) {
      return keyA.localeCompare(keyB);
    }
    const firstA = a.levelIds?.[0] ?? '';
    const firstB = b.levelIds?.[0] ?? '';
    if (firstA !== firstB) {
      return firstA.localeCompare(firstB);
    }
    return (a.code ?? '').localeCompare(b.code ?? '');
  });
}

export function variantGroupCounts<
  T extends {
    nameEn: string;
    subSystem: string;
    branch: string;
    academicYearId?: string | null;
  },
>(rows: T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = subjectVariantGroupKey({
      nameEn: row.nameEn,
      subSystem: row.subSystem,
      branch: row.branch,
      academicYearId: row.academicYearId ?? '',
    });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
