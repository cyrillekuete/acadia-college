'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  provisionCameroonCalendar,
  setCurrentAcademicYear,
} from '@/lib/acadia/academic-calendar';
import type {
  AcademicYearFormValues,
  CalendarMilestoneFormValues,
  SequenceFormValues,
  TermFormValues,
} from '@/lib/acadia/calendar-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
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

function invalidateCalendarQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['academic-year-options'] });
  void queryClient.invalidateQueries({ queryKey: ['term-options'] });
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

      const { error } = await supabase.from('AcademicYear').insert({
        id,
        tenantId,
        label: values.label.trim(),
        startsOn: values.startsOn,
        endsOn: values.endsOn,
        isCurrent: values.isCurrent,
        isActive: values.isActive,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }

      if (values.isCurrent) {
        await setCurrentAcademicYear(supabase, tenantId, id);
      }

      await provisionCameroonCalendar(supabase, tenantId, id);
      return id;
    },
    onSuccess: () => {
      invalidateCalendarQueries(queryClient);
      toast.success('Academic year created with 3 terms and 6 sequences.');
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
      toast.success('Current academic year updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const provisionCalendar = useMutation({
    mutationFn: async (academicYearId: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      return provisionCameroonCalendar(supabase, tenantId, academicYearId);
    },
    onSuccess: (result) => {
      invalidateCalendarQueries(queryClient);
      toast.success(
        `Provisioned ${result.terms} terms and ${result.sequences} sequences.`,
      );
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
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
      invalidateCalendarQueries(queryClient);
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
