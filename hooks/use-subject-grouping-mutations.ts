'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SubjectGroupingFormValues } from '@/lib/acadia/subject-catalog';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { catalogTags } from '@/lib/acadia/cache/tags';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function invalidateGroupingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: ['subject-grouping-options'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-grouping-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-list'] });
  if (tenantId) {
    invalidateAcadiaCache(catalogTags(tenantId));
  }
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
      const code = values.code?.trim().toUpperCase() || null;
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
      invalidateGroupingQueries(queryClient, tenantId);
      toast.success('Grouping created.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      const code = values.code?.trim().toUpperCase() || null;
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
      invalidateGroupingQueries(queryClient, tenantId);
      toast.success('Grouping updated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      invalidateGroupingQueries(queryClient, tenantId);
      toast.success('Grouping deleted.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const moveSubjectsToGrouping = useMutation({
    mutationFn: async (input: {
      subjectIds: string[];
      groupingId: string | null;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      if (input.subjectIds.length === 0) {
        return 0;
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Subject')
        .update({
          groupingId: input.groupingId,
          updatedAt: new Date().toISOString(),
        })
        .eq('tenantId', tenantId)
        .in('id', input.subjectIds);
      if (error) {
        throw error;
      }
      return input.subjectIds.length;
    },
    onSuccess: (count) => {
      invalidateGroupingQueries(queryClient, tenantId);
      toast.success(
        count === 1
          ? 'Moved 1 subject.'
          : `Moved ${count} subjects.`,
      );
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  return { createGrouping, updateGrouping, deleteGrouping, moveSubjectsToGrouping };
}
