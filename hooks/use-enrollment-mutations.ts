'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  buildEnrollmentApplicationRow,
  canEditEnrollmentApplication,
} from '@/lib/acadia/enrollment';
import type { EnrollmentApplicationInput } from '@/lib/acadia/enrollment-schemas';
import type { ReviewApplicationInput } from '@/lib/acadia/enrollment-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { checkRegistryStudentEmail } from '@/lib/acadia/registry-lookups';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { classListTags, studentListTags } from '@/lib/acadia/cache/tags';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Operation failed.';
}

function invalidateEnrollmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
}

export function useEnrollmentMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const createApplication = useMutation({
    mutationFn: async (values: EnrollmentApplicationInput) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const emailCheck = await checkRegistryStudentEmail(
        supabase,
        tenantId,
        values.email,
      );
      if (!emailCheck.ok) {
        throw new Error(emailCheck.message);
      }

      const id = generateAcadiaId('app');
      const now = new Date().toISOString();
      const row = buildEnrollmentApplicationRow(tenantId, id, values, now);

      const { error } = await supabase.from('EnrollmentApplication').insert({
        ...row,
        createdAt: now,
      });
      if (error) {
        throw error;
      }
      return id;
    },
    onSuccess: (id) => {
      invalidateEnrollmentQueries(queryClient);
      toast.success('Enrollment application created.');
      router.push(`/enrollment/applications/${id}`);
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateApplication = useMutation({
    mutationFn: async ({
      id,
      values,
      currentStatus,
    }: {
      id: string;
      values: EnrollmentApplicationInput;
      currentStatus: string;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      if (!canEditEnrollmentApplication(currentStatus)) {
        throw new Error('Only pending applications can be edited.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const row = buildEnrollmentApplicationRow(tenantId, id, values, now);

      const { error } = await supabase
        .from('EnrollmentApplication')
        .update({
          kind: row.kind,
          studentProfileId: row.studentProfileId,
          firstNameEn: row.firstNameEn,
          firstNameFr: row.firstNameFr,
          lastNameEn: row.lastNameEn,
          lastNameFr: row.lastNameFr,
          email: row.email,
          phone: row.phone,
          dateOfBirth: row.dateOfBirth,
          levelId: row.levelId,
          academicYearId: row.academicYearId,
          subSystem: row.subSystem,
          branch: row.branch,
          preferredLocale: row.preferredLocale,
          updatedAt: now,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateEnrollmentQueries(queryClient);
      toast.success('Application updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const reviewApplication = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: ReviewApplicationInput;
    }) => {
      const response = await fetch(
        `/api/acadia/enrollment/applications/${id}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as {
        message?: string;
        candidateClassIds?: string[];
      };
      if (!response.ok) {
        const err = new Error(payload.message ?? 'Review failed.') as Error & {
          payload?: typeof payload;
        };
        err.payload = payload;
        throw err;
      }
      return payload;
    },
    onSuccess: (_data, variables) => {
      invalidateEnrollmentQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['students-list'] });
      void queryClient.invalidateQueries({ queryKey: ['student-detail'] });
      if (tenantId) {
        invalidateAcadiaCache([
          ...studentListTags(tenantId),
          ...classListTags(tenantId),
        ]);
      }
      if (variables.input.decision === 'approve') {
        toast.success('Application approved and enrollment created.');
      } else {
        toast.success('Application rejected.');
      }
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    createApplication,
    updateApplication,
    reviewApplication,
  };
}
