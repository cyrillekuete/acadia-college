'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  removeClassTeacherAssignment,
  syncClassTeacherAssignment,
} from '@/lib/supabase/queries/staff-class-assignments';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function invalidateTeacherAssignmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ['class-teacher-assignments'] });
  void queryClient.invalidateQueries({ queryKey: ['staff-teaching-assignments'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-assignments'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-teacher-options'] });
  void queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
  void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
}

export function useClassTeacherAssignmentMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const syncAssignment = useMutation({
    mutationFn: async (input: {
      classId: string;
      academicYearId: string;
      staffProfileId: string;
      subjectIds: string[];
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await syncClassTeacherAssignment(supabase, tenantId, input);
    },
    onSuccess: () => {
      invalidateTeacherAssignmentQueries(queryClient);
      toast.success('Teacher assignment saved.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const removeAssignment = useMutation({
    mutationFn: async (input: {
      classId: string;
      academicYearId: string;
      staffProfileId: string;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await removeClassTeacherAssignment(supabase, tenantId, input);
    },
    onSuccess: () => {
      invalidateTeacherAssignmentQueries(queryClient);
      toast.success('Teacher removed from class.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  return { syncAssignment, removeAssignment };
}
