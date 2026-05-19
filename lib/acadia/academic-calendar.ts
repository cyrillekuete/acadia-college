import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAcadiaId } from '@/lib/acadia/ids';

export const TERMS_PER_YEAR = 3;
export const SEQUENCES_PER_YEAR = 6;

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

export function termNumberForSequence(sequenceNumber: number): number {
  return Math.floor((sequenceNumber - 1) / 2) + 1;
}

export function numberInTermForSequence(sequenceNumber: number): number {
  return sequenceNumber % 2 === 1 ? 1 : 2;
}

export function buildTermRows(
  tenantId: string,
  academicYearId: string,
): TermInsert[] {
  return Array.from({ length: TERMS_PER_YEAR }, (_, index) => ({
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
): SequenceInsert[] {
  const termByNumber = new Map(terms.map((t) => [t.number, t.id]));

  return Array.from({ length: SEQUENCES_PER_YEAR }, (_, index) => {
    const number = index + 1;
    const termNumber = termNumberForSequence(number);
    const termId = termByNumber.get(termNumber);
    if (!termId) {
      throw new Error(`Missing term ${termNumber} for academic year ${academicYearId}`);
    }
    return {
      id: generateAcadiaId('seq'),
      tenantId,
      academicYearId,
      termId,
      number,
      numberInTerm: numberInTermForSequence(number),
    };
  });
}

export async function provisionCameroonCalendar(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<{ terms: number; sequences: number }> {
  const { count: existingTerms, error: countError } = await supabase
    .from('Term')
    .select('id', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId);

  if (countError) {
    throw countError;
  }
  if ((existingTerms ?? 0) > 0) {
    throw new Error('This academic year already has terms. Edit existing terms or delete them first.');
  }

  const termRows = buildTermRows(tenantId, academicYearId);
  const { error: termError } = await supabase.from('Term').insert(termRows);
  if (termError) {
    throw termError;
  }

  const sequenceRows = buildSequenceRows(tenantId, academicYearId, termRows);
  const { error: sequenceError } = await supabase
    .from('AcademicSequence')
    .insert(sequenceRows);
  if (sequenceError) {
    throw sequenceError;
  }

  return { terms: termRows.length, sequences: sequenceRows.length };
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
