import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAcadiaId } from '@/lib/acadia/ids';

/** Cameroon secondary default: 3 terms, 2 sequences per term, 6 per year. */
export const DEFAULT_ACADEMIC_STRUCTURE = {
  termsPerYear: 3,
  sequencesPerTerm: 2,
  sequencesPerYear: 6,
} as const;

/** @deprecated Use DEFAULT_ACADEMIC_STRUCTURE.termsPerYear */
export const TERMS_PER_YEAR = DEFAULT_ACADEMIC_STRUCTURE.termsPerYear;

/** @deprecated Use DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear */
export const SEQUENCES_PER_YEAR = DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear;

export type AcademicYearStructure = {
  termsPerYear: number;
  sequencesPerTerm: number;
  sequencesPerYear: number;
};

export type SequenceDistribution = {
  /** sequencesPerTerm per term index (0-based), e.g. [2, 2, 1] */
  countsPerTerm: number[];
  /** sequence number (1-based) → term number (1-based) */
  termNumberBySequence: Map<number, number>;
  /** sequence number (1-based) → position within term (1-based) */
  numberInTermBySequence: Map<number, number>;
};

export type TermInsert = {
  id: string;
  tenantId: string;
  academicYearId: string;
  number: number;
  levelId?: string | null;
};

export type SequenceInsert = {
  id: string;
  tenantId: string;
  academicYearId: string;
  termId: string;
  number: number;
  numberInTerm: number;
};

export type StructureValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  distribution: SequenceDistribution;
};

export function buildSequenceDistribution(
  structure: AcademicYearStructure,
): SequenceDistribution {
  const { termsPerYear, sequencesPerYear } = structure;
  const base = Math.floor(sequencesPerYear / termsPerYear);
  const remainder = sequencesPerYear % termsPerYear;

  const countsPerTerm = Array.from({ length: termsPerYear }, (_, i) =>
    base + (i < remainder ? 1 : 0),
  );

  const termNumberBySequence = new Map<number, number>();
  const numberInTermBySequence = new Map<number, number>();
  let seqNum = 1;

  for (let termIdx = 0; termIdx < termsPerYear; termIdx++) {
    const termNumber = termIdx + 1;
    for (let pos = 1; pos <= countsPerTerm[termIdx]; pos++) {
      termNumberBySequence.set(seqNum, termNumber);
      numberInTermBySequence.set(seqNum, pos);
      seqNum++;
    }
  }

  return { countsPerTerm, termNumberBySequence, numberInTermBySequence };
}

export function validateAcademicYearStructure(
  structure: AcademicYearStructure,
): StructureValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (structure.termsPerYear < 1 || structure.termsPerYear > 12) {
    errors.push('Terms per year must be between 1 and 12.');
  }
  if (structure.sequencesPerTerm < 1 || structure.sequencesPerTerm > 6) {
    errors.push('Sequences per term must be between 1 and 6.');
  }
  if (structure.sequencesPerYear < 1 || structure.sequencesPerYear > 24) {
    errors.push('Sequences per academic year must be between 1 and 24.');
  }
  if (structure.sequencesPerYear < structure.termsPerYear) {
    errors.push('Sequences per year must be at least equal to terms per year.');
  }

  const distribution = buildSequenceDistribution(structure);
  const uniformTotal = structure.sequencesPerTerm * structure.termsPerYear;

  if (uniformTotal !== structure.sequencesPerYear) {
    warnings.push(
      `Sequences per term (${structure.sequencesPerTerm}) × terms (${structure.termsPerYear}) = ${uniformTotal}, but sequences per year is ${structure.sequencesPerYear}. Extra sequences are distributed to earlier terms.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    distribution,
  };
}

export function termNumberForSequence(
  sequenceNumber: number,
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): number {
  const { termNumberBySequence } = buildSequenceDistribution(structure);
  const term = termNumberBySequence.get(sequenceNumber);
  if (term == null) {
    throw new Error(`Sequence ${sequenceNumber} is out of range for this academic structure.`);
  }
  return term;
}

export function numberInTermForSequence(
  sequenceNumber: number,
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): number {
  const { numberInTermBySequence } = buildSequenceDistribution(structure);
  const pos = numberInTermBySequence.get(sequenceNumber);
  if (pos == null) {
    throw new Error(`Sequence ${sequenceNumber} is out of range for this academic structure.`);
  }
  return pos;
}

export function formatDistributionPreview(distribution: SequenceDistribution): string {
  return distribution.countsPerTerm
    .map((count, i) => `Term ${i + 1}: ${count}`)
    .join(' · ');
}

export function buildTermRows(
  tenantId: string,
  academicYearId: string,
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): TermInsert[] {
  return Array.from({ length: structure.termsPerYear }, (_, index) => ({
    id: generateAcadiaId('term'),
    tenantId,
    academicYearId,
    number: index + 1,
    levelId: null,
  }));
}

export function buildSequenceRows(
  tenantId: string,
  academicYearId: string,
  terms: Pick<TermInsert, 'id' | 'number'>[],
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): SequenceInsert[] {
  const termByNumber = new Map(terms.map((t) => [t.number, t.id]));
  const distribution = buildSequenceDistribution(structure);
  const rows: SequenceInsert[] = [];

  for (let seqNum = 1; seqNum <= structure.sequencesPerYear; seqNum++) {
    const termNumber = distribution.termNumberBySequence.get(seqNum);
    const numberInTerm = distribution.numberInTermBySequence.get(seqNum);
    if (termNumber == null || numberInTerm == null) {
      continue;
    }
    const termId = termByNumber.get(termNumber);
    if (!termId) {
      throw new Error(`Missing term ${termNumber} for academic year ${academicYearId}`);
    }
    rows.push({
      id: generateAcadiaId('seq'),
      tenantId,
      academicYearId,
      termId,
      number: seqNum,
      numberInTerm,
    });
  }

  return rows;
}

export async function loadAcademicYearStructure(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<AcademicYearStructure> {
  const { data, error } = await supabase
    .from('AcademicYear')
    .select('termsPerYear, sequencesPerTerm, sequencesPerYear')
    .eq('id', academicYearId)
    .eq('tenantId', tenantId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Academic year not found.');
  }

  return {
    termsPerYear: data.termsPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
    sequencesPerTerm: data.sequencesPerTerm ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
    sequencesPerYear: data.sequencesPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
  };
}

export type ProvisionResult = {
  terms: number;
  sequences: number;
  termsCreated: number;
  sequencesCreated: number;
};

export async function provisionAcademicCalendar(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
  structure?: AcademicYearStructure,
  options?: { termsOnly?: boolean; sequencesOnly?: boolean },
): Promise<ProvisionResult> {
  const resolvedStructure =
    structure ?? (await loadAcademicYearStructure(supabase, tenantId, academicYearId));

  const validation = validateAcademicYearStructure(resolvedStructure);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const provisionTerms = !options?.sequencesOnly;
  const provisionSequences = !options?.termsOnly;

  let termsCreated = 0;
  let sequencesCreated = 0;

  const { data: existingTerms, error: termsError } = await supabase
    .from('Term')
    .select('id, number')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId);

  if (termsError) {
    throw termsError;
  }

  const existingTermNumbers = new Set((existingTerms ?? []).map((t) => t.number));
  if (
    provisionTerms &&
    existingTermNumbers.size > resolvedStructure.termsPerYear
  ) {
    throw new Error(
      `This year has ${existingTermNumbers.size} terms but structure allows ${resolvedStructure.termsPerYear}. Remove extra terms or increase terms per year.`,
    );
  }

  let termRows = (existingTerms ?? []) as Pick<TermInsert, 'id' | 'number'>[];

  if (provisionTerms) {
    const missingTermRows = buildTermRows(tenantId, academicYearId, resolvedStructure).filter(
      (row) => !existingTermNumbers.has(row.number),
    );

    if (missingTermRows.length > 0) {
      const { error: termInsertError } = await supabase.from('Term').insert(missingTermRows);
      if (termInsertError) {
        throw termInsertError;
      }
      termsCreated = missingTermRows.length;
    }

    const { data: allTerms, error: reloadTermsError } = await supabase
      .from('Term')
      .select('id, number')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId);

    if (reloadTermsError) {
      throw reloadTermsError;
    }
    termRows = (allTerms ?? []) as Pick<TermInsert, 'id' | 'number'>[];
  }

  if (provisionSequences) {
    const { data: existingSequences, error: seqCountError } = await supabase
      .from('AcademicSequence')
      .select('number')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId);

    if (seqCountError) {
      throw seqCountError;
    }

    const existingSeqNumbers = new Set((existingSequences ?? []).map((s) => s.number));
    if (existingSeqNumbers.size > resolvedStructure.sequencesPerYear) {
      throw new Error(
        `This year has ${existingSeqNumbers.size} sequences but structure allows ${resolvedStructure.sequencesPerYear}. Remove extra sequences or increase sequences per year.`,
      );
    }

    const missingSequenceRows = buildSequenceRows(
      tenantId,
      academicYearId,
      termRows,
      resolvedStructure,
    ).filter((row) => !existingSeqNumbers.has(row.number));

    if (missingSequenceRows.length > 0) {
      const { error: sequenceError } = await supabase
        .from('AcademicSequence')
        .insert(missingSequenceRows);
      if (sequenceError) {
        throw sequenceError;
      }
      sequencesCreated = missingSequenceRows.length;
    }
  }

  const { count: finalTermCount } = await supabase
    .from('Term')
    .select('id', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId);

  const { count: finalSeqCount } = await supabase
    .from('AcademicSequence')
    .select('id', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId);

  return {
    terms: finalTermCount ?? 0,
    sequences: finalSeqCount ?? 0,
    termsCreated,
    sequencesCreated,
  };
}

/** @deprecated Use provisionAcademicCalendar */
export async function provisionCameroonCalendar(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<{ terms: number; sequences: number }> {
  const result = await provisionAcademicCalendar(
    supabase,
    tenantId,
    academicYearId,
    DEFAULT_ACADEMIC_STRUCTURE,
  );
  return { terms: result.terms, sequences: result.sequences };
}

export async function setCurrentAcademicYear(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const { error: clearError } = await supabase
    .from('AcademicYear')
    .update({ isCurrent: false, updatedAt: now })
    .eq('tenantId', tenantId)
    .neq('id', academicYearId);

  if (clearError) {
    throw clearError;
  }

  const { error: setError } = await supabase
    .from('AcademicYear')
    .update({ isCurrent: true, updatedAt: now })
    .eq('id', academicYearId)
    .eq('tenantId', tenantId);

  if (setError) {
    throw setError;
  }
}
