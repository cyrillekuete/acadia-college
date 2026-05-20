'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StaffCreateInput } from '@/lib/acadia/staff-create-schemas';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

type CreateStaffResult = {
  staffId: string;
  staffCode: string;
};

export function useStaffCreateMutation() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useMutation({
    mutationFn: async (input: StaffCreateInput): Promise<CreateStaffResult> => {
      const res = await fetch('/api/acadia/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const json = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        throw new Error((json.message as string | undefined) ?? 'Failed to create staff.');
      }

      return json as unknown as CreateStaffResult;
    },
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: ['staff-list', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['department-options', tenantId] });
      }
    },
  });
}
