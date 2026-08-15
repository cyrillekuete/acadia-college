'use client';

import { useMutation } from '@tanstack/react-query';

export type FamilyCredentialsResult = {
  studentId: string;
  studentLoginEmail: string;
  studentTemporaryPassword: string;
  parentCode: string;
  parentLoginEmail: string;
  parentTemporaryPassword: string | null;
};

function readRequiredString(
  json: Record<string, unknown>,
  key: string,
): string | null {
  const value = json[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function useStudentCredentialsMutation() {
  return useMutation({
    mutationFn: async (profileId: string): Promise<FamilyCredentialsResult> => {
      const res = await fetch(`/api/acadia/students/${profileId}/credentials`, {
        method: 'POST',
      });

      const json = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        throw new Error(
          (json.message as string | undefined) ??
            'Failed to download login credentials.',
        );
      }

      const studentId = readRequiredString(json, 'studentId');
      const studentLoginEmail = readRequiredString(json, 'studentLoginEmail');
      const studentTemporaryPassword = readRequiredString(
        json,
        'studentTemporaryPassword',
      );
      const parentCode = readRequiredString(json, 'parentCode');
      const parentLoginEmail = readRequiredString(json, 'parentLoginEmail');
      const parentTemporaryPassword =
        json.parentTemporaryPassword === null
          ? null
          : readRequiredString(json, 'parentTemporaryPassword');

      if (
        !studentId ||
        !studentLoginEmail ||
        !studentTemporaryPassword ||
        !parentCode ||
        !parentLoginEmail ||
        (parentTemporaryPassword !== null && !parentTemporaryPassword)
      ) {
        throw new Error('Server returned an invalid credentials response.');
      }

      return {
        studentId,
        studentLoginEmail,
        studentTemporaryPassword,
        parentCode,
        parentLoginEmail,
        parentTemporaryPassword,
      };
    },
  });
}
