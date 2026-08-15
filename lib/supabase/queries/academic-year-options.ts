import type { SupabaseClient } from '@supabase/supabase-js';

export type AcademicYearOption = {
  id: string;
  label: string;
  isCurrent: boolean;
  timetablePublishedAt: string | null;
};

export async function fetchAcademicYearOptions(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<AcademicYearOption[]> {
  const { data, error } = await supabase
    .from('AcademicYear')
    .select('id, label, isCurrent, timetablePublishedAt')
    .eq('tenantId', tenantId)
    .order('startsOn', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    label: row.label as string,
    isCurrent: row.isCurrent as boolean,
    timetablePublishedAt: (row.timetablePublishedAt as string | null) ?? null,
  }));
}
