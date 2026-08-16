'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  normalizeReportCardTemplatePreference,
  type ReportCardTemplatePreference,
} from '@/lib/acadia/report-card-templates';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchReportCardTemplatePreference } from '@/lib/supabase/queries/report-card-templates';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export const REPORT_CARD_TEMPLATE_QUERY_KEY = 'report-card-template-preference';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

export function useReportCardTemplatePreference() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useQuery({
    queryKey: [REPORT_CARD_TEMPLATE_QUERY_KEY, tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchReportCardTemplatePreference(supabase, tenantId!, activeYearId!);
    },
    staleTime: 60_000,
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useSaveReportCardTemplatePreference() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId;
  const userId = session?.profile?.id;
  const { activeYearId } = useActiveAcademicYear();

  return useMutation({
    mutationFn: async (values: ReportCardTemplatePreference) => {
      if (!tenantId || !userId || !activeYearId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const preference = normalizeReportCardTemplatePreference(values);
      const now = new Date().toISOString();

      const { data: existing } = await supabase
        .from('ReportCardTemplatePreference')
        .select('id')
        .eq('tenantId', tenantId)
        .eq('academicYearId', activeYearId)
        .maybeSingle();

      const row = {
        id: (existing?.id as string | undefined) ?? generateAcadiaId('rctp'),
        tenantId,
        academicYearId: activeYearId,
        term1Template: preference.term1Template,
        term2Template: preference.term2Template,
        term3Template: preference.term3Template,
        annualTemplate: preference.annualTemplate,
        updatedByUserId: userId,
        updatedAt: now,
        createdAt: now,
      };

      const { error } = await supabase.from('ReportCardTemplatePreference').upsert(row, {
        onConflict: 'tenantId,academicYearId',
      });
      if (error) {
        throw error;
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'report_card_template.saved',
        description: 'Report card templates saved for the academic year.',
        entityId: activeYearId,
        entityType: 'AcademicYear',
        meta: preference,
      });

      return preference;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [REPORT_CARD_TEMPLATE_QUERY_KEY] });
      toast.success('Report card templates saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });
}
