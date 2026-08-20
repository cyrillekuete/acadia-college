import type { SupabaseClient } from '@supabase/supabase-js';

export type AcademicYearOption = {
  id: string;
  label: string;
  isCurrent: boolean;
  isActive: boolean;
  timetablePublishedAt: string | null;
};

export async function fetchAcademicYearOptions(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { includeInactive?: boolean },
): Promise<AcademicYearOption[]> {
  let query = supabase
    .from('AcademicYear')
    .select('id, label, isCurrent, isActive, timetablePublishedAt')
    .eq('tenantId', tenantId)
    .order('startsOn', { ascending: false });

  if (!options?.includeInactive) {
    query = query.eq('isActive', true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    label: row.label as string,
    isCurrent: row.isCurrent as boolean,
    isActive: row.isActive !== false,
    timetablePublishedAt: (row.timetablePublishedAt as string | null) ?? null,
  }));
}
