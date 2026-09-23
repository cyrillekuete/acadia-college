import type { SubjectGrade } from '@/lib/acadia/report-card-types';

export type ClassicTermMarkCell = {
  sequences: Array<number | null>;
  average: number | null;
  total: number | null;
};

export type ClassicTermRollup = {
  coefficient: number;
  average: number | null;
  total: number | null;
  weightedAverage: number | null;
  passed: boolean | null;
};

export function subjectSequenceMark(subject: SubjectGrade, slot: number): number | null {
  const key = `seq${slot}` as keyof SubjectGrade;
  const fromRoot = subject[key];
  if (typeof fromRoot === 'number' && Number.isFinite(fromRoot)) {
    return fromRoot;
  }
  const fromMap = subject.sequences?.[key as keyof NonNullable<SubjectGrade['sequences']>];
  return typeof fromMap === 'number' && Number.isFinite(fromMap) ? fromMap : null;
}

/** Mean of the term's sequence marks, and their sum (15 and 18 → 16.5 and 33). */
export function classicTermSubjectCells(
  sequences: Array<number | null | undefined>,
): ClassicTermMarkCell {
  const values = sequences.map((value) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null,
  );
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) {
    return { sequences: values, average: null, total: null };
  }
  const total = present.reduce((sum, value) => sum + value, 0);
  return {
    sequences: values,
    average: total / present.length,
    total,
  };
}

export function classicTermGroupRollup(
  rows: Array<{ coefficient: number; average: number | null; total: number | null }>,
): ClassicTermRollup {
  const coefficient = rows.reduce((sum, row) => sum + (row.coefficient > 0 ? row.coefficient : 0), 0);
  const scored = rows.filter((row) => row.average != null);
  if (scored.length === 0) {
    return {
      coefficient,
      average: null,
      total: null,
      weightedAverage: null,
      passed: null,
    };
  }
  const average = scored.reduce((sum, row) => sum + (row.average ?? 0), 0);
  const total = scored.reduce((sum, row) => sum + (row.total ?? 0), 0);
  const weight = scored.reduce((sum, row) => sum + (row.coefficient > 0 ? row.coefficient : 0), 0);
  const weightedPoints = scored.reduce(
    (sum, row) => sum + (row.average ?? 0) * (row.coefficient > 0 ? row.coefficient : 0),
    0,
  );
  const weightedAverage = weight > 0 ? weightedPoints / weight : null;
  return {
    coefficient,
    average,
    total,
    weightedAverage,
    passed: weightedAverage == null ? null : weightedAverage >= 10,
  };
}

export function disciplineAbsenceTotal(input: {
  absences: number;
  justifiedAbsences?: number;
}): number {
  const justified = input.justifiedAbsences ?? 0;
  const unjustified = input.absences;
  return justified + unjustified;
}

export function formatClassicAverage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '-';
  }
  const hundredths = Math.round(value * 100) / 100;
  if (Number.isInteger(hundredths)) {
    return String(hundredths);
  }
  const tenths = Math.round(value * 10) / 10;
  if (Math.abs(hundredths - tenths) < 0.001) {
    return tenths.toFixed(1);
  }
  return hundredths.toFixed(2);
}
