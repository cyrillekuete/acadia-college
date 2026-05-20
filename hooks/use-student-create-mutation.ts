'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StudentCreateInput } from '@/lib/acadia/student-create-schemas';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

type CreateStudentResult = {
  studentId: string;
  studentUuid: string;
  studentProfileId: string;
  parentCode: string;
  newParentAuthCreated: boolean;
};

export function useStudentCreateMutation() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useMutation({
    mutationFn: async (input: StudentCreateInput): Promise<CreateStudentResult> => {
      const res = await fetch('/api/acadia/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const json = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        throw new Error((json.message as string | undefined) ?? 'Failed to create student.');
      }

      return json as unknown as CreateStudentResult;
    },
    onSuccess: (_data, _vars, _ctx) => {
      void queryClient.invalidateQueries({ queryKey: ['students-list'] });
      if (tenantId) {
        void queryClient.invalidateQueries({
          queryKey: ['students-list', tenantId],
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['student-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
    },
  });
}
