'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StudentCreateInput } from '@/lib/acadia/student-create-schemas';

type CreateStudentResult = {
  studentId: string;
  studentUuid: string;
  parentCode: string;
  newParentAuthCreated: boolean;
};

export function useStudentCreateMutation() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase-list', 'students'] });
    },
  });
}
