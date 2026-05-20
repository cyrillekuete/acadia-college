'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SubjectGroupingFormValues } from '@/lib/acadia/subject-catalog';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateGroupingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['subject-grouping-options'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-list'] });
}

export function useSubjectGroupingMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const createGrouping = useMutation({
    mutationFn: async (values: SubjectGroupingFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const code = values.code?.trim() || null;
      const { error } = await supabase.from('SubjectGrouping').insert({
        id: generateAcadiaId('subjgrp'),
        tenantId,
        nameEn: values.nameEn.trim(),
        nameFr: values.nameFr.trim(),
        code,
        sortOrder: values.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateGroupingQueries(queryClient);
      toast.success('Grouping created.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateGrouping = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: SubjectGroupingFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const code = values.code?.trim() || null;
      const { error } = await supabase
        .from('SubjectGrouping')
        .update({
          nameEn: values.nameEn.trim(),
          nameFr: values.nameFr.trim(),
          code,
          sortOrder: values.sortOrder ?? 0,
          updatedAt: now,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateGroupingQueries(queryClient);
      toast.success('Grouping updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteGrouping = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('SubjectGrouping')
        .delete()
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateGroupingQueries(queryClient);
      toast.success('Grouping deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return { createGrouping, updateGrouping, deleteGrouping };
}
