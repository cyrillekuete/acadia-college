'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  StudentClassMigrationValues,
  StudentProfileEditValues,
} from '@/lib/acadia/student-schemas';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { classListTags, studentListTags } from '@/lib/acadia/cache/tags';
import { canWriteRegistry } from '@/lib/acadia/roles';

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

async function readApiError(res: Response): Promise<string> {
  const json = (await res.json().catch(() => null)) as { message?: string } | null;
  return json?.message || `Request failed (${res.status}).`;
}

function invalidateStudentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string | null,
  profileId?: string,
  academicYearId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['students-list'] });
  void queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
  void queryClient.invalidateQueries({ queryKey: ['class-enrolled-students'] });
  void queryClient.invalidateQueries({ queryKey: ['student-academic-progress'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-accounts'] });
  void queryClient.invalidateQueries({ queryKey: ['student-fee-account'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-outstanding'] });
  void queryClient.invalidateQueries({ queryKey: ['missing-fee-accounts'] });
  if (profileId) {
    void queryClient.invalidateQueries({
      queryKey: ['student-detail', tenantId, profileId],
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: ['student-detail'] });
  }
  if (tenantId) {
    invalidateAcadiaCache([
      ...studentListTags(tenantId, academicYearId),
      ...classListTags(tenantId),
    ]);
  }
}

export function useStudentMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const { activeYearId } = useActiveAcademicYear();
  const tenantId = session?.tenantId ?? null;
  const canWrite = canWriteRegistry(session?.roleSlug);

  const updateStudentProfile = useMutation({
    mutationFn: async ({
      profileId,
      values,
    }: {
      profileId: string;
      userId: string;
      values: StudentProfileEditValues;
    }) => {
      if (!canWrite) {
        throw new Error('You do not have permission to modify registry records.');
      }
      const res = await fetch(`/api/acadia/students/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matriculeNumber: values.matriculeNumber,
          isActive: values.isActive,
          alumniDirectoryOptIn: values.alumniDirectoryOptIn,
          alumniSince: values.alumniSince,
          name: values.name,
          email: values.email,
          country: values.country,
          timezone: values.timezone,
          academicYearId: activeYearId ?? undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
    },
    onSuccess: (_data, variables) => {
      invalidateStudentQueries(
        queryClient,
        tenantId,
        variables.profileId,
        activeYearId,
      );
      toast.success('Student profile updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const migrateStudentClass = useMutation({
    mutationFn: async ({
      profileId,
      values,
    }: {
      profileId: string;
      values: StudentClassMigrationValues;
    }) => {
      if (!canWrite) {
        throw new Error('You do not have permission to modify registry records.');
      }
      const res = await fetch(`/api/acadia/students/${profileId}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
        feeWarning?: string | null;
      } | null;
      if (!res.ok) {
        throw new Error(json?.message || `Request failed (${res.status}).`);
      }
      return json;
    },
    onSuccess: (data, variables) => {
      invalidateStudentQueries(
        queryClient,
        tenantId,
        variables.profileId,
        variables.values.academicYearId,
      );
      if (data?.feeWarning) {
        toast.warning(data.feeWarning);
      }
      toast.success('Student class placement updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const withdrawStudent = useMutation({
    mutationFn: async ({
      profileId,
      academicYearId,
      deactivateProfile,
    }: {
      profileId: string;
      academicYearId: string;
      deactivateProfile?: boolean;
    }) => {
      if (!canWrite) {
        throw new Error('You do not have permission to modify registry records.');
      }
      const res = await fetch(`/api/acadia/students/${profileId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId, deactivateProfile }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
    },
    onSuccess: (_data, variables) => {
      invalidateStudentQueries(
        queryClient,
        tenantId,
        variables.profileId,
        variables.academicYearId,
      );
      toast.success('Student withdrawn from this academic year.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    updateStudentProfile,
    migrateStudentClass,
    withdrawStudent,
  };
}
