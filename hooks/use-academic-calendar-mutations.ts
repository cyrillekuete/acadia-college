'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DEFAULT_ACADEMIC_STRUCTURE,
  provisionAcademicCalendar,
  setCurrentAcademicYear,
} from '@/lib/acadia/academic-calendar';
import type {
  AcademicYearFormValues,
  CalendarMilestoneFormValues,
  SequenceFormValues,
  TermFormValues,
} from '@/lib/acadia/calendar-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { catalogTags, dashboardTags } from '@/lib/acadia/cache/tags';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Operation failed.';
}

function optionalDateField(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function invalidateCalendarQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['academic-year-options'] });
  void queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
  void queryClient.invalidateQueries({ queryKey: ['term-options'] });
  void queryClient.invalidateQueries({ queryKey: ['academic-year-structure'] });
  void queryClient.invalidateQueries({ queryKey: ['academic-calendar-milestones'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
  if (tenantId) {
    invalidateAcadiaCache([...catalogTags(tenantId), ...dashboardTags(tenantId)]);
  }
}

export function useAcademicCalendarMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const createAcademicYear = useMutation({
    mutationFn: async (values: AcademicYearFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const id = generateAcadiaId('year');
      const now = new Date().toISOString();

      const structure = {
        termsPerYear: values.termsPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
        sequencesPerTerm:
          values.sequencesPerTerm ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
        sequencesPerYear:
          values.sequencesPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
      };

      const { error } = await supabase.from('AcademicYear').insert({
        id,
        tenantId,
        label: values.label.trim(),
        startsOn: values.startsOn,
        endsOn: values.endsOn,
        isCurrent: values.isCurrent,
        isActive: values.isActive,
        termsPerYear: structure.termsPerYear,
        sequencesPerTerm: structure.sequencesPerTerm,
        sequencesPerYear: structure.sequencesPerYear,
        enrollmentOpensAt: optionalDateField(values.enrollmentOpensAt),
        enrollmentClosesAt: optionalDateField(values.enrollmentClosesAt),
        updatedAt: now,
      });
      if (error) {
        throw error;
      }

      if (values.isCurrent) {
        await setCurrentAcademicYear(supabase, tenantId, id);
      }

      const provisioned = await provisionAcademicCalendar(supabase, tenantId, id, structure);
      return { id, structure, provisioned };
    },
    onSuccess: (result) => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success(
        `Academic year created with ${result.structure.termsPerYear} terms and ${result.structure.sequencesPerYear} sequences.`,
      );
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateAcademicYear = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: AcademicYearFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('AcademicYear')
        .update({
          label: values.label.trim(),
          startsOn: values.startsOn,
          endsOn: values.endsOn,
          isCurrent: values.isCurrent,
          isActive: values.isActive,
          termsPerYear: values.termsPerYear,
          sequencesPerTerm: values.sequencesPerTerm,
          sequencesPerYear: values.sequencesPerYear,
          enrollmentOpensAt: optionalDateField(values.enrollmentOpensAt),
          enrollmentClosesAt: optionalDateField(values.enrollmentClosesAt),
          updatedAt: now,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }

      if (values.isCurrent) {
        await setCurrentAcademicYear(supabase, tenantId, id);
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Academic year updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const setAcademicYearCurrent = useMutation({
    mutationFn: async (academicYearId: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await setCurrentAcademicYear(supabase, tenantId, academicYearId);
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Current academic year updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const provisionCalendar = useMutation({
    mutationFn: async ({
      academicYearId,
      termsOnly,
      sequencesOnly,
    }: {
      academicYearId: string;
      termsOnly?: boolean;
      sequencesOnly?: boolean;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      return provisionAcademicCalendar(supabase, tenantId, academicYearId, undefined, {
        termsOnly,
        sequencesOnly,
      });
    },
    onSuccess: (result) => {
      invalidateCalendarQueries(queryClient, tenantId);
      const parts: string[] = [];
      if (result.termsCreated > 0) {
        parts.push(`${result.termsCreated} term(s) created`);
      }
      if (result.sequencesCreated > 0) {
        parts.push(`${result.sequencesCreated} sequence(s) created`);
      }
      if (parts.length === 0) {
        toast.success(
          `Calendar complete: ${result.terms} terms, ${result.sequences} sequences.`,
        );
      } else {
        toast.success(`${parts.join('; ')} (${result.terms} terms, ${result.sequences} sequences total).`);
      }
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createTerm = useMutation({
    mutationFn: async (values: TermFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase.from('Term').insert({
        id: generateAcadiaId('term'),
        tenantId,
        academicYearId: values.academicYearId,
        number: values.number,
        levelId: values.levelId?.trim() || null,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Term created.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateTerm = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TermFormValues }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Term')
        .update({
          academicYearId: values.academicYearId,
          number: values.number,
          levelId: values.levelId?.trim() || null,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Term updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteTerm = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Term')
        .delete()
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Term deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createSequence = useMutation({
    mutationFn: async (values: SequenceFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase.from('AcademicSequence').insert({
        id: generateAcadiaId('seq'),
        tenantId,
        academicYearId: values.academicYearId,
        termId: values.termId,
        number: values.number,
        numberInTerm: values.numberInTerm,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Sequence created.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateSequence = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: SequenceFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('AcademicSequence')
        .update({
          academicYearId: values.academicYearId,
          termId: values.termId,
          number: values.number,
          numberInTerm: values.numberInTerm,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Sequence updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('AcademicSequence')
        .delete()
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Sequence deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createMilestone = useMutation({
    mutationFn: async (values: CalendarMilestoneFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { error } = await supabase.from('AcademicCalendarMilestone').insert({
        id: generateAcadiaId('milestone'),
        tenantId,
        academicYearId: values.academicYearId,
        kind: values.kind,
        onDate: values.onDate,
        termId: values.termId?.trim() || null,
        labelEn: values.labelEn?.trim() || null,
        labelFr: values.labelFr?.trim() || null,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Calendar milestone created.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: CalendarMilestoneFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('AcademicCalendarMilestone')
        .update({
          academicYearId: values.academicYearId,
          kind: values.kind,
          onDate: values.onDate,
          termId: values.termId?.trim() || null,
          labelEn: values.labelEn?.trim() || null,
          labelFr: values.labelFr?.trim() || null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Calendar milestone updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('AcademicCalendarMilestone')
        .delete()
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient, tenantId);
      toast.success('Calendar milestone deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    createAcademicYear,
    updateAcademicYear,
    setAcademicYearCurrent,
    provisionCalendar,
    createTerm,
    updateTerm,
    deleteTerm,
    createSequence,
    updateSequence,
    deleteSequence,
    createMilestone,
    updateMilestone,
    deleteMilestone,
  };
}
