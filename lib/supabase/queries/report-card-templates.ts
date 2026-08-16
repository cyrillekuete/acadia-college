import type { SupabaseClient } from '@supabase/supabase-js';
import { getQueryErrorMessage, isMissingRelationError } from '@/lib/acadia/query-errors';
import {
  normalizeReportCardTemplatePreference,
  type ReportCardTemplatePreference,
} from '@/lib/acadia/report-card-templates';

export type ReportCardTemplatePreferenceRow = ReportCardTemplatePreference & {
  id: string;
  academicYearId: string;
};

export async function fetchReportCardTemplatePreference(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<ReportCardTemplatePreferenceRow | null> {
  const { data, error } = await supabase
    .from('ReportCardTemplatePreference')
    .select(
      'id, academicYearId, term1Template, term2Template, term3Template, annualTemplate',
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw new Error(getQueryErrorMessage(error));
  }
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    academicYearId: data.academicYearId,
    ...normalizeReportCardTemplatePreference(data),
  };
}
