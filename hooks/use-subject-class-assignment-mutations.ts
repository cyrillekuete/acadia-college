'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SubjectClassAssignment } from '@/lib/acadia/class-subject-selections';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import { requireBrowserClient } from '@/lib/supabase/client';
import { syncSubjectClassAssignments } from '@/lib/supabase/queries/class-subjects';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function invalidateClassAssignmentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['class-list'] });
  queryClient.invalidateQueries({ queryKey: ['subjects-for-class'] });
  queryClient.invalidateQueries({ queryKey: ['classes-for-subject'] });
  queryClient.invalidateQueries({ queryKey: ['subject-list'] });
}

export function useSubjectClassAssignmentMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const syncAssignments = useMutation({
    mutationFn: async ({
      subjectId,
      assignments,
    }: {
      subjectId: string;
      assignments: SubjectClassAssignment[];
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await syncSubjectClassAssignments(supabase, tenantId, subjectId, assignments);
    },
    onSuccess: () => {
      invalidateClassAssignmentQueries(queryClient);
      toast.success('Class assignments saved.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  return { syncAssignments };
}
