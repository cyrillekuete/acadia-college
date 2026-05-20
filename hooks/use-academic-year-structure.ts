'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  type AcademicYearStructure,
  DEFAULT_ACADEMIC_STRUCTURE,
  validateAcademicYearStructure,
} from '@/lib/acadia/academic-calendar';
import type {
  AcademicYearStructureFormValues,
  SequencesStructureFormValues,
  TermsStructureFormValues,
} from '@/lib/acadia/calendar-schemas';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type AcademicYearStructureRow = AcademicYearStructure & {
  academicYearId: string;
  label: string;
};

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateStructureQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  academicYearId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: ['academic-year-structure', academicYearId],
  });
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['academic-year-options'] });
  void queryClient.invalidateQueries({ queryKey: ['term-options'] });
}

export function useAcademicYearStructure(academicYearId: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['academic-year-structure', tenantId, academicYearId],
    queryFn: async (): Promise<AcademicYearStructureRow> => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('id, label, termsPerYear, sequencesPerTerm, sequencesPerYear')
        .eq('id', academicYearId!)
        .eq('tenantId', tenantId!)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error('Academic year not found.');
      }

      return {
        academicYearId: data.id,
        label: data.label,
        termsPerYear: data.termsPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
        sequencesPerTerm:
          data.sequencesPerTerm ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
        sequencesPerYear:
          data.sequencesPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
      };
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      typeof academicYearId === 'string' &&
      academicYearId.length > 0,
  });
}

export function useUpdateAcademicYearStructure() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useMutation({
    mutationFn: async ({
      academicYearId,
      values,
    }: {
      academicYearId: string;
      values:
        | AcademicYearStructureFormValues
        | TermsStructureFormValues
        | SequencesStructureFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }

      const supabase = requireBrowserClient();

      const { data: current, error: loadError } = await supabase
        .from('AcademicYear')
        .select('termsPerYear, sequencesPerTerm, sequencesPerYear')
        .eq('id', academicYearId)
        .eq('tenantId', tenantId)
        .maybeSingle();

      if (loadError) {
        throw loadError;
      }
      if (!current) {
        throw new Error('Academic year not found.');
      }

      const merged: AcademicYearStructure = {
        termsPerYear:
          'termsPerYear' in values && values.termsPerYear != null
            ? values.termsPerYear
            : (current.termsPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.termsPerYear),
        sequencesPerTerm:
          'sequencesPerTerm' in values && values.sequencesPerTerm != null
            ? values.sequencesPerTerm
            : (current.sequencesPerTerm ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm),
        sequencesPerYear:
          'sequencesPerYear' in values && values.sequencesPerYear != null
            ? values.sequencesPerYear
            : (current.sequencesPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear),
      };

      const validation = validateAcademicYearStructure(merged);
      if (!validation.valid) {
        throw new Error(validation.errors.join(' '));
      }

      const { count: termCount, error: termCountError } = await supabase
        .from('Term')
        .select('id', { count: 'exact', head: true })
        .eq('tenantId', tenantId)
        .eq('academicYearId', academicYearId);

      if (termCountError) {
        throw termCountError;
      }
      if ((termCount ?? 0) > merged.termsPerYear) {
        throw new Error(
          `Cannot reduce terms per year below ${termCount} — existing terms are in use. Remove extra terms first.`,
        );
      }

      const { count: seqCount, error: seqCountError } = await supabase
        .from('AcademicSequence')
        .select('id', { count: 'exact', head: true })
        .eq('tenantId', tenantId)
        .eq('academicYearId', academicYearId);

      if (seqCountError) {
        throw seqCountError;
      }
      if ((seqCount ?? 0) > merged.sequencesPerYear) {
        throw new Error(
          `Cannot reduce sequences per year below ${seqCount} — existing sequences are in use. Remove extra sequences first.`,
        );
      }

      const { error: updateError } = await supabase
        .from('AcademicYear')
        .update({
          termsPerYear: merged.termsPerYear,
          sequencesPerTerm: merged.sequencesPerTerm,
          sequencesPerYear: merged.sequencesPerYear,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', academicYearId)
        .eq('tenantId', tenantId);

      if (updateError) {
        throw updateError;
      }

      return { merged, warnings: validation.warnings };
    },
    onSuccess: (result, variables) => {
      invalidateStructureQueries(queryClient, variables.academicYearId);
      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0]);
      }
      toast.success('Academic structure saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });
}
