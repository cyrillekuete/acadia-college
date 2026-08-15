'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StudentCreateInput } from '@/lib/acadia/student-create-schemas';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { classListTags, studentListTags } from '@/lib/acadia/cache/tags';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

type CreateStudentResult = {
  studentId: string;
  studentUuid: string;
  studentProfileId: string;
  studentLoginEmail: string;
  studentTemporaryPassword: string;
  parentCode: string;
  parentLoginEmail: string;
  parentTemporaryPassword: string | null;
  newParentAuthCreated: boolean;
};

function readRequiredString(
  json: Record<string, unknown>,
  key: string,
): string | null {
  const value = json[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

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

      const studentId = readRequiredString(json, 'studentId');
      const studentUuid = readRequiredString(json, 'studentUuid');
      const studentProfileId = readRequiredString(json, 'studentProfileId');
      const studentLoginEmail = readRequiredString(json, 'studentLoginEmail');
      const studentTemporaryPassword = readRequiredString(
        json,
        'studentTemporaryPassword',
      );
      const parentCode = readRequiredString(json, 'parentCode');
      const parentLoginEmail = readRequiredString(json, 'parentLoginEmail');
      const parentTemporaryPasswordRaw = json.parentTemporaryPassword;
      const parentTemporaryPassword =
        parentTemporaryPasswordRaw === null
          ? null
          : readRequiredString(json, 'parentTemporaryPassword');
      const newParentAuthCreated = json.newParentAuthCreated;

      if (
        !studentId ||
        !studentUuid ||
        !studentProfileId ||
        !studentLoginEmail ||
        !studentTemporaryPassword ||
        !parentCode ||
        !parentLoginEmail ||
        typeof newParentAuthCreated !== 'boolean' ||
        (newParentAuthCreated ? !parentTemporaryPassword : parentTemporaryPassword !== null)
      ) {
        throw new Error('Server returned an invalid student creation response.');
      }

      return {
        studentId,
        studentUuid,
        studentProfileId,
        studentLoginEmail,
        studentTemporaryPassword,
        parentCode,
        parentLoginEmail,
        parentTemporaryPassword,
        newParentAuthCreated,
      };
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
      if (tenantId) {
        invalidateAcadiaCache([
          ...studentListTags(tenantId),
          ...classListTags(tenantId),
        ]);
      }
    },
  });
}
