'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { canViewTimetableSlots } from '@/lib/acadia/timetable-publish';
import { requireBrowserClient } from '@/lib/supabase/client';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidatePublishQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['academic-year-options'] });
  void queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
}

export function useActiveYearTimetablePublish() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const { activeYear, activeYearId, isLoading: yearLoading } = useActiveAcademicYear();
  const publishedAt = activeYear?.timetablePublishedAt ?? null;

  return {
    activeYearId,
    publishedAt,
    isPublished: !!publishedAt,
    canView: canViewTimetableSlots(session?.roleSlug, publishedAt),
    canManage: canWriteRegistry(session?.roleSlug),
    isLoading: isLoading || yearLoading,
    isReady:
      !isLoading &&
      !yearLoading &&
      !isError &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, session?.tenantId ?? null),
  };
}

export function useTimetablePublishMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.authUser?.id ?? null;

  const publishTimetable = useMutation({
    mutationFn: async (academicYearId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('AcademicYear')
        .update({
          timetablePublishedAt: now,
          timetablePublishedByUserId: userId,
          updatedAt: now,
        })
        .eq('id', academicYearId)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidatePublishQueries(queryClient);
      toast.success('Timetable published for this academic year.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const unpublishTimetable = useMutation({
    mutationFn: async (academicYearId: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('AcademicYear')
        .update({
          timetablePublishedAt: null,
          timetablePublishedByUserId: null,
          updatedAt: now,
        })
        .eq('id', academicYearId)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidatePublishQueries(queryClient);
      toast.success('Timetable unpublished. Only administrators can view it now.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return { publishTimetable, unpublishTimetable };
}
