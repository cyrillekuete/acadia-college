import {
  getUiLocale,
  localizedText,
  translate,
  type UiLocale,
} from '@/lib/acadia/locale';

export const ACADEMIC_SUB_SYSTEMS = ['ENGLISH', 'FRENCH'] as const;
export type AcademicSubSystem = (typeof ACADEMIC_SUB_SYSTEMS)[number];

export const ACADEMIC_BRANCHES = ['GRAMMAR', 'TECHNICAL', 'COMMERCIAL'] as const;
export type AcademicBranch = (typeof ACADEMIC_BRANCHES)[number];

export function isAcademicSubSystem(value: unknown): value is AcademicSubSystem {
  return (
    typeof value === 'string' &&
    (ACADEMIC_SUB_SYSTEMS as readonly string[]).includes(value)
  );
}

export function isAcademicBranch(value: unknown): value is AcademicBranch {
  return (
    typeof value === 'string' &&
    (ACADEMIC_BRANCHES as readonly string[]).includes(value)
  );
}

function normalizeStreamToken(value: string): string {
  return value.trim().toUpperCase();
}

/** Parse DB or form values (uppercase enums or lowercase form input) to canonical enums. */
export function parseAcademicSubSystem(value: unknown): AcademicSubSystem | null {
  if (value == null) {
    return null;
  }
  const normalized = normalizeStreamToken(String(value));
  return isAcademicSubSystem(normalized) ? normalized : null;
}

export function parseAcademicBranch(value: unknown): AcademicBranch | null {
  if (value == null) {
    return null;
  }
  const normalized = normalizeStreamToken(String(value));
  return isAcademicBranch(normalized) ? normalized : null;
}

export function requireAcademicStream(
  subSystem: unknown,
  branch: unknown,
  context?: string,
): { subSystem: AcademicSubSystem; branch: AcademicBranch } {
  const parsedSubSystem = parseAcademicSubSystem(subSystem);
  const parsedBranch = parseAcademicBranch(branch);
  if (!parsedSubSystem || !parsedBranch) {
    const prefix = context ? `${context}: ` : '';
    throw new Error(
      `${prefix}Invalid academic stream (subSystem=${String(subSystem)}, branch=${String(branch)}).`,
    );
  }
  return { subSystem: parsedSubSystem, branch: parsedBranch };
}

export type CatalogFilters = {
  subSystem: AcademicSubSystem | null;
  branch: AcademicBranch | null;
};

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  subSystem: null,
  branch: null,
};

export type LevelCatalogEntry = {
  number: number;
  labelEn: string;
  labelFr: string;
  sortOrder: number;
};

export const ENGLISH_LEVEL_CATALOG: LevelCatalogEntry[] = [
  { number: 1, labelEn: 'Form 1', labelFr: 'Form 1', sortOrder: 1 },
  { number: 2, labelEn: 'Form 2', labelFr: 'Form 2', sortOrder: 2 },
  { number: 3, labelEn: 'Form 3', labelFr: 'Form 3', sortOrder: 3 },
  { number: 4, labelEn: 'Form 4', labelFr: 'Form 4', sortOrder: 4 },
  { number: 5, labelEn: 'Form 5', labelFr: 'Form 5', sortOrder: 5 },
  { number: 6, labelEn: 'Lower Sixth', labelFr: 'Lower Sixth', sortOrder: 6 },
  { number: 7, labelEn: 'Upper Sixth', labelFr: 'Upper Sixth', sortOrder: 7 },
];

export const FRENCH_LEVEL_CATALOG: LevelCatalogEntry[] = [
  { number: 1, labelEn: 'Sixième', labelFr: 'Sixième', sortOrder: 1 },
  { number: 2, labelEn: 'Cinquième', labelFr: 'Cinquième', sortOrder: 2 },
  { number: 3, labelEn: 'Quatrième', labelFr: 'Quatrième', sortOrder: 3 },
  { number: 4, labelEn: 'Troisième', labelFr: 'Troisième', sortOrder: 4 },
  { number: 5, labelEn: 'Seconde', labelFr: 'Seconde', sortOrder: 5 },
  { number: 6, labelEn: 'Première', labelFr: 'Première', sortOrder: 6 },
  { number: 7, labelEn: 'Terminale', labelFr: 'Terminale', sortOrder: 7 },
];

export function levelCatalogForSubSystem(
  subSystem: AcademicSubSystem,
): LevelCatalogEntry[] {
  return subSystem === 'FRENCH' ? FRENCH_LEVEL_CATALOG : ENGLISH_LEVEL_CATALOG;
}

const SUB_SYSTEM_LABELS: Record<AcademicSubSystem, string> = {
  ENGLISH: 'English sub-system',
  FRENCH: 'French sub-system',
};

const BRANCH_LABELS: Record<AcademicBranch, string> = {
  GRAMMAR: 'Grammar',
  TECHNICAL: 'Technical',
  COMMERCIAL: 'Commercial',
};

export function subSystemLabel(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return SUB_SYSTEM_LABELS[value as AcademicSubSystem] ?? value;
}

export function branchLabel(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return BRANCH_LABELS[value as AcademicBranch] ?? value;
}

export function streamLabel(
  subSystem: string | null | undefined,
  branch: string | null | undefined,
): string {
  if (!subSystem && !branch) {
    return '—';
  }
  if (subSystem && branch) {
    return `${subSystemLabel(subSystem)} · ${branchLabel(branch)}`;
  }
  return subSystemLabel(subSystem) !== '—'
    ? subSystemLabel(subSystem)
    : branchLabel(branch);
}

export function levelDisplayLabel(
  level: {
    name?: string | null;
    number?: number;
    labelEn?: string | null;
    labelFr?: string | null;
  } | null,
  locale?: UiLocale,
): string {
  if (!level) {
    return '—';
  }
  const name = level.name?.trim();
  if (name) {
    return name;
  }
  const label = localizedText(level.labelEn, level.labelFr, locale ?? getUiLocale());
  if (label) {
    return label;
  }
  if (level.number !== undefined) {
    return translate('catalog.levelN', {
      number: level.number,
      defaultValue: `Level ${level.number}`,
    });
  }
  return '—';
}

type RowWithCatalog = Record<string, unknown> & {
  subSystem?: string | null;
  branch?: string | null;
};

export function rowMatchesCatalogFilters(
  row: RowWithCatalog,
  filters: CatalogFilters,
): boolean {
  const subSystem = row.subSystem ?? null;
  const branch = row.branch ?? null;

  if (filters.subSystem && subSystem !== filters.subSystem) {
    return false;
  }
  if (filters.branch && branch !== filters.branch) {
    return false;
  }
  return true;
}

