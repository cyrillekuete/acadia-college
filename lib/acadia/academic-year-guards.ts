export type YearDateRange = {
  id?: string;
  label?: string;
  startsOn: string;
  endsOn: string;
};

export function dateRangesOverlap(
  aStartsOn: string,
  aEndsOn: string,
  bStartsOn: string,
  bEndsOn: string,
): boolean {
  return aStartsOn <= bEndsOn && bStartsOn <= aEndsOn;
}

export function findOverlappingAcademicYear(
  candidate: YearDateRange,
  existing: YearDateRange[],
  ignoreId?: string | null,
): YearDateRange | null {
  return (
    existing.find((year) => {
      if (ignoreId && year.id === ignoreId) {
        return false;
      }
      return dateRangesOverlap(
        candidate.startsOn,
        candidate.endsOn,
        year.startsOn,
        year.endsOn,
      );
    }) ?? null
  );
}

export function findDuplicateAcademicYearLabel(
  label: string,
  existing: Array<{ id?: string; label: string }>,
  ignoreId?: string | null,
): { id?: string; label: string } | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return (
    existing.find((year) => {
      if (ignoreId && year.id === ignoreId) {
        return false;
      }
      return year.label.trim().toLowerCase() === normalized;
    }) ?? null
  );
}

export function assertAcademicYearUniqueness(input: {
  label: string;
  startsOn: string;
  endsOn: string;
  existing: YearDateRange[];
  ignoreId?: string | null;
}): void {
  const duplicateLabel = findDuplicateAcademicYearLabel(
    input.label,
    input.existing,
    input.ignoreId,
  );
  if (duplicateLabel) {
    throw new Error(`An academic year labeled "${duplicateLabel.label}" already exists.`);
  }

  const overlap = findOverlappingAcademicYear(
    { startsOn: input.startsOn, endsOn: input.endsOn },
    input.existing,
    input.ignoreId,
  );
  if (overlap) {
    throw new Error(
      `Dates overlap ${overlap.label ?? 'another academic year'} (${overlap.startsOn}–${overlap.endsOn}).`,
    );
  }
}

export function isDateWithinYearBounds(
  onDate: string,
  startsOn: string,
  endsOn: string,
): boolean {
  return onDate >= startsOn && onDate <= endsOn;
}

export function milestoneDuplicateKey(
  kind: string,
  termId?: string | null,
): string {
  return `${kind}::${termId?.trim() || ''}`;
}

export function findDuplicateMilestoneKind(input: {
  kind: string;
  termId?: string | null;
  existing: Array<{ id?: string; kind: string; termId?: string | null }>;
  ignoreId?: string | null;
}): { id?: string; kind: string } | null {
  const key = milestoneDuplicateKey(input.kind, input.termId);
  return (
    input.existing.find((row) => {
      if (ignoreIdMatches(row.id, input.ignoreId)) {
        return false;
      }
      return milestoneDuplicateKey(row.kind, row.termId) === key;
    }) ?? null
  );
}

function ignoreIdMatches(id: string | undefined, ignoreId?: string | null): boolean {
  return Boolean(ignoreId && id === ignoreId);
}

export function assertSequenceBelongsToYear(input: {
  sequenceAcademicYearId: string;
  termAcademicYearId: string;
}): void {
  if (input.sequenceAcademicYearId !== input.termAcademicYearId) {
    throw new Error('Sequence must belong to the same academic year as its term.');
  }
}

export function assertSequenceNumberInTermUnique(input: {
  termId: string;
  numberInTerm: number;
  existing: Array<{ id?: string; termId: string; numberInTerm: number }>;
  ignoreId?: string | null;
}): void {
  const duplicate = input.existing.find((row) => {
    if (ignoreIdMatches(row.id, input.ignoreId)) {
      return false;
    }
    return row.termId === input.termId && row.numberInTerm === input.numberInTerm;
  });
  if (duplicate) {
    throw new Error(
      `Sequence position ${input.numberInTerm} is already used in this term.`,
    );
  }
}
