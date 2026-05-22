'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StaffCreateInput } from '@/lib/acadia/staff-create-schemas';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

type CreateStaffResult = {
  staffId: string;
  staffCode: string;
  loginEmail: string;
  temporaryPassword: string;
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

      const staffId = json.staffId;
      const staffCode = json.staffCode;
      const loginEmail = json.loginEmail;
      const temporaryPassword = json.temporaryPassword;

      if (
        typeof staffId !== 'string' ||
        typeof staffCode !== 'string' ||
        typeof loginEmail !== 'string' ||
        typeof temporaryPassword !== 'string'
      ) {
        throw new Error('Server returned an invalid staff creation response.');
      }

      return { staffId, staffCode, loginEmail, temporaryPassword };
    },
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: ['staff-list', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['department-options', tenantId] });
      }
    },
  });
}
