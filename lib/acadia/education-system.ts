export const ACADEMIC_SUB_SYSTEMS = ['ENGLISH', 'FRENCH'] as const;
export type AcademicSubSystem = (typeof ACADEMIC_SUB_SYSTEMS)[number];

export const ACADEMIC_BRANCHES = ['GRAMMAR', 'TECHNICAL', 'COMMERCIAL'] as const;
export type AcademicBranch = (typeof ACADEMIC_BRANCHES)[number];

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

export function specialtyStreamLabel(
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
    number?: number;
    labelEn?: string | null;
    labelFr?: string | null;
  } | null,
): string {
  if (!level) {
    return '—';
  }
  const label = level.labelEn?.trim() || level.labelFr?.trim();
  if (label) {
    return label;
  }
  if (level.number !== undefined) {
    return `Level ${level.number}`;
  }
  return '—';
}

type RowWithCatalog = Record<string, unknown> & {
  subSystem?: string | null;
  branch?: string | null;
  Specialty?: unknown;
};

function specialtyFromRow(row: RowWithCatalog): {
  subSystem?: string;
  branch?: string;
} | null {
  const raw = row.Specialty;
  const rel = Array.isArray(raw) ? raw[0] : raw;
  if (rel && typeof rel === 'object') {
    return rel as { subSystem?: string; branch?: string };
  }
  return null;
}

export function rowMatchesCatalogFilters(
  row: RowWithCatalog,
  filters: CatalogFilters,
): boolean {
  const specialty = specialtyFromRow(row);
  const subSystem =
    row.subSystem ?? specialty?.subSystem ?? null;
  const branch = row.branch ?? specialty?.branch ?? null;

  if (filters.subSystem && subSystem !== filters.subSystem) {
    return false;
  }
  if (filters.branch && branch !== filters.branch) {
    return false;
  }
  return true;
}

export const SPECIALTY_STREAMS: {
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  code: string;
  nameEn: string;
  nameFr: string;
}[] = [
  {
    subSystem: 'ENGLISH',
    branch: 'GRAMMAR',
    code: 'EN-GRAM',
    nameEn: 'English — Grammar',
    nameFr: 'Anglophone — Général',
  },
  {
    subSystem: 'ENGLISH',
    branch: 'TECHNICAL',
    code: 'EN-TECH',
    nameEn: 'English — Technical',
    nameFr: 'Anglophone — Technique',
  },
  {
    subSystem: 'ENGLISH',
    branch: 'COMMERCIAL',
    code: 'EN-COMM',
    nameEn: 'English — Commercial',
    nameFr: 'Anglophone — Commercial',
  },
  {
    subSystem: 'FRENCH',
    branch: 'GRAMMAR',
    code: 'FR-GRAM',
    nameEn: 'French — Grammar',
    nameFr: 'Francophone — Général',
  },
  {
    subSystem: 'FRENCH',
    branch: 'TECHNICAL',
    code: 'FR-TECH',
    nameEn: 'French — Technical',
    nameFr: 'Francophone — Technique',
  },
  {
    subSystem: 'FRENCH',
    branch: 'COMMERCIAL',
    code: 'FR-COMM',
    nameEn: 'French — Commercial',
    nameFr: 'Francophone — Commercial',
  },
];
