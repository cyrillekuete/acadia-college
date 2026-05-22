import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_ACADEMIC_STRUCTURE } from '@/lib/acadia/academic-calendar';

export type CurrentAcademicYear = {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  isActive: boolean;
  termsPerYear: number;
  sequencesPerTerm: number;
  sequencesPerYear: number;
  timetablePublishedAt: string | null;
};

export type AcademicYearSetupStatus = {
  configured: boolean;
  yearCount: number;
  current: CurrentAcademicYear | null;
};

const CURRENT_YEAR_SELECT =
  'id, label, startsOn, endsOn, isCurrent, isActive, termsPerYear, sequencesPerTerm, sequencesPerYear, timetablePublishedAt';

function mapYearRow(row: {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  isActive: boolean;
  termsPerYear: number | null;
  sequencesPerTerm: number | null;
  sequencesPerYear: number | null;
  timetablePublishedAt: string | null;
}): CurrentAcademicYear {
  return {
    id: row.id,
    label: row.label,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    isCurrent: row.isCurrent,
    isActive: row.isActive,
    termsPerYear: row.termsPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
    sequencesPerTerm:
      row.sequencesPerTerm ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
    sequencesPerYear:
      row.sequencesPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
    timetablePublishedAt: row.timetablePublishedAt ?? null,
  };
}

export async function fetchCurrentAcademicYear(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<CurrentAcademicYear | null> {
  const { data, error } = await supabase
    .from('AcademicYear')
    .select(CURRENT_YEAR_SELECT)
    .eq('tenantId', tenantId)
    .eq('isCurrent', true)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return mapYearRow(data);
}

export async function fetchAcademicYearSetupStatus(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<AcademicYearSetupStatus> {
  const { count, error: countError } = await supabase
    .from('AcademicYear')
    .select('id', { count: 'exact', head: true })
    .eq('tenantId', tenantId);

  if (countError) {
    throw countError;
  }

  const current = await fetchCurrentAcademicYear(supabase, tenantId);

  return {
    configured: current != null,
    yearCount: count ?? 0,
    current,
  };
}
