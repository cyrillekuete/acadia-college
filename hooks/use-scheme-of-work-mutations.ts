'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { canWriteOperations, canWriteRegistry } from '@/lib/acadia/roles';
import type { SchemeOfWorkStatus } from '@/lib/acadia/scheme-of-work';
import { nextTopicSortOrder } from '@/lib/acadia/scheme-of-work';
import type { SchemeOfWorkTopicFormValues } from '@/lib/acadia/scheme-of-work-schemas';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  deleteSchemeTopic,
  fetchSchemeDetailById,
  fetchSchemeTopics,
  insertSchemeTopic,
  markSchemeTopicProgress,
  reorderSchemeTopics,
  teacherCanMarkClassSubject,
  updateSchemeStatus,
  updateSchemeTopic,
  upsertSchemeOfWork,
} from '@/lib/supabase/queries/scheme-of-work';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateSchemeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['scheme-of-work-detail'] });
  void queryClient.invalidateQueries({ queryKey: ['scheme-of-work-topics'] });
  void queryClient.invalidateQueries({ queryKey: ['scheme-of-work-teacher-list'] });
  void queryClient.invalidateQueries({ queryKey: ['scheme-of-work-student-list'] });
  void queryClient.invalidateQueries({ queryKey: ['scheme-of-work-subject-year'] });
  void queryClient.invalidateQueries({ queryKey: ['scheme-of-work-subject-levels'] });
  void queryClient.invalidateQueries({ queryKey: ['scheme-of-work-year'] });
}

export function useSchemeOfWorkMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const roleSlug = session?.roleSlug ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const profileQuery = useLinkedAcadiaProfile();
  const staffProfileId = profileQuery.data?.staffProfileId ?? null;

  const openOrCreateScheme = useMutation({
    mutationFn: async (input: { subjectId: string; levelId: string }) => {
      if (!tenantId || !activeYearId) {
        throw new Error('Missing tenant or academic year.');
      }
      if (!canWriteRegistry(roleSlug)) {
        throw new Error('You do not have permission to edit schemes of work.');
      }
      const supabase = requireBrowserClient();
      return upsertSchemeOfWork(supabase, tenantId, {
        academicYearId: activeYearId,
        subjectId: input.subjectId,
        levelId: input.levelId,
      });
    },
    onSuccess: () => {
      invalidateSchemeQueries(queryClient);
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error));
    },
  });

  const setSchemeStatus = useMutation({
    mutationFn: async (input: { schemeId: string; status: SchemeOfWorkStatus }) => {
      if (!tenantId) {
        throw new Error('Missing tenant.');
      }
      if (!canWriteRegistry(roleSlug)) {
        throw new Error('You do not have permission to publish schemes of work.');
      }
      const supabase = requireBrowserClient();
      await updateSchemeStatus(supabase, tenantId, input.schemeId, input.status);
    },
    onSuccess: (_, input) => {
      invalidateSchemeQueries(queryClient);
      toast.success(
        input.status === 'PUBLISHED'
          ? 'Scheme of work published.'
          : 'Scheme of work moved back to draft.',
      );
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error));
    },
  });

  const saveTopic = useMutation({
    mutationFn: async (input: {
      schemeId: string;
      topicId?: string;
      values: SchemeOfWorkTopicFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Missing tenant.');
      }
      if (!canWriteRegistry(roleSlug)) {
        throw new Error('You do not have permission to edit topics.');
      }
      const supabase = requireBrowserClient();
      const scheme = await fetchSchemeDetailById(supabase, tenantId, input.schemeId);
      if (!scheme) {
        throw new Error('Scheme of work not found.');
      }

      if (input.topicId) {
        await updateSchemeTopic(
          supabase,
          tenantId,
          scheme,
          input.topicId,
          input.values,
        );
        return;
      }

      const topics = await fetchSchemeTopics(supabase, tenantId, scheme.id);
      const parentTopicId = input.values.parentTopicId?.trim() || null;
      const sortOrder = nextTopicSortOrder(topics, parentTopicId);
      await insertSchemeTopic(supabase, tenantId, scheme, input.values, sortOrder);
    },
    onSuccess: (_, input) => {
      invalidateSchemeQueries(queryClient);
      toast.success(input.topicId ? 'Topic updated.' : 'Topic added.');
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error));
    },
  });

  const removeTopic = useMutation({
    mutationFn: async (topicId: string) => {
      if (!tenantId) {
        throw new Error('Missing tenant.');
      }
      if (!canWriteRegistry(roleSlug)) {
        throw new Error('You do not have permission to delete topics.');
      }
      const supabase = requireBrowserClient();
      await deleteSchemeTopic(supabase, tenantId, topicId);
    },
    onSuccess: () => {
      invalidateSchemeQueries(queryClient);
      toast.success('Topic deleted.');
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error));
    },
  });

  const moveTopic = useMutation({
    mutationFn: async (input: { orderedTopicIds: string[] }) => {
      if (!tenantId) {
        throw new Error('Missing tenant.');
      }
      if (!canWriteRegistry(roleSlug)) {
        throw new Error('You do not have permission to reorder topics.');
      }
      const supabase = requireBrowserClient();
      await reorderSchemeTopics(supabase, tenantId, input.orderedTopicIds);
    },
    onSuccess: () => {
      invalidateSchemeQueries(queryClient);
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error));
    },
  });

  const setTopicProgress = useMutation({
    mutationFn: async (input: {
      topicId: string;
      classId: string;
      subjectId: string;
      completed: boolean;
    }) => {
      if (!tenantId || !activeYearId) {
        throw new Error('Missing tenant or academic year.');
      }
      if (!canWriteOperations(roleSlug)) {
        throw new Error('You do not have permission to update coverage.');
      }
      const supabase = requireBrowserClient();
      if (staffProfileId) {
        const allowed = await teacherCanMarkClassSubject(
          supabase,
          tenantId,
          activeYearId,
          staffProfileId,
          input.classId,
          input.subjectId,
        );
        if (!allowed && !canWriteRegistry(roleSlug)) {
          throw new Error('You can only mark topics for classes you teach.');
        }
      } else if (!canWriteRegistry(roleSlug)) {
        throw new Error('You can only mark topics for classes you teach.');
      }

      await markSchemeTopicProgress(supabase, tenantId, {
        topicId: input.topicId,
        classId: input.classId,
        completed: input.completed,
        staffProfileId,
      });
    },
    onSuccess: () => {
      invalidateSchemeQueries(queryClient);
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error));
    },
  });

  return {
    openOrCreateScheme,
    setSchemeStatus,
    saveTopic,
    removeTopic,
    moveTopic,
    setTopicProgress,
  };
}
