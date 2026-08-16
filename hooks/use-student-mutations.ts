'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  StudentClassMigrationValues,
  StudentProfileEditValues,
} from '@/lib/acadia/student-schemas';
import { resolveClassIdForEnrollment } from '@/lib/acadia/class-assignment';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
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

export function useStudentMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canWrite = canWriteRegistry(session?.roleSlug);

  const updateStudentProfile = useMutation({
    mutationFn: async ({
      profileId,
      userId,
      values,
    }: {
      profileId: string;
      userId: string;
      values: StudentProfileEditValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      if (!canWrite) {
        throw new Error('You do not have permission to modify registry records.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { error: profileError } = await supabase
        .from('StudentProfile')
        .update({
          registrationNumber: values.registrationNumber.trim(),
          matriculeNumber: values.matriculeNumber ?? null,
          isActive: values.isActive,
          alumniDirectoryOptIn: values.alumniDirectoryOptIn,
          alumniSince: values.alumniSince?.trim() || null,
          updatedAt: now,
        })
        .eq('id', profileId)
        .eq('tenantId', tenantId);
      if (profileError) {
        throw profileError;
      }

      const { error: userError } = await supabase
        .from('User')
        .update({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          country: values.country?.trim() || null,
          timezone: values.timezone?.trim() || null,
          updatedAt: now,
        })
        .eq('id', userId)
        .eq('tenantId', tenantId);
      if (userError) {
        throw userError;
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
      void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
      void queryClient.invalidateQueries({ queryKey: ['students-list'] });
      void queryClient.invalidateQueries({
        queryKey: ['student-detail', tenantId, variables.profileId],
      });
      if (tenantId) {
        invalidateAcadiaCache(studentListTags(tenantId));
      }
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
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      if (!canWrite) {
        throw new Error('You do not have permission to modify registry records.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { error: profileError } = await supabase
        .from('StudentProfile')
        .update({
          subSystem: values.subSystem,
          branch: values.branch,
          currentLevelId: values.levelId,
          updatedAt: now,
        })
        .eq('id', profileId)
        .eq('tenantId', tenantId);
      if (profileError) {
        throw profileError;
      }

      let classId = values.classId?.trim() || null;
      if (!classId) {
        classId = await resolveClassIdForEnrollment(
          supabase,
          tenantId,
          values.levelId,
          values.subSystem,
          values.branch,
        );
      }

      const { data: existingEnrollment, error: lookupError } = await supabase
        .from('StudentEnrollment')
        .select('id')
        .eq('tenantId', tenantId)
        .eq('studentProfileId', profileId)
        .eq('academicYearId', values.academicYearId)
        .eq('status', 'ENROLLED')
        .maybeSingle();
      if (lookupError) {
        throw lookupError;
      }

      if (existingEnrollment?.id) {
        const { error: enrollmentError } = await supabase
          .from('StudentEnrollment')
          .update({
            subSystem: values.subSystem,
            branch: values.branch,
            levelId: values.levelId,
            classId,
            updatedAt: now,
          })
          .eq('id', existingEnrollment.id)
          .eq('tenantId', tenantId);
        if (enrollmentError) {
          throw enrollmentError;
        }
        return;
      }

      const { error: enrollmentError } = await supabase
        .from('StudentEnrollment')
        .insert({
          id: generateAcadiaId('enr'),
          tenantId,
          studentProfileId: profileId,
          academicYearId: values.academicYearId,
          subSystem: values.subSystem,
          branch: values.branch,
          levelId: values.levelId,
          classId,
          status: 'ENROLLED',
          applicationId: null,
          createdAt: now,
          updatedAt: now,
        });
      if (enrollmentError) {
        throw enrollmentError;
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
      void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
      void queryClient.invalidateQueries({ queryKey: ['students-list'] });
      void queryClient.invalidateQueries({
        queryKey: ['student-detail', tenantId, variables.profileId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['student-academic-progress'],
      });
      if (tenantId) {
        invalidateAcadiaCache([
          ...studentListTags(tenantId, variables.values.academicYearId),
          ...classListTags(tenantId),
        ]);
      }
      toast.success('Student class placement updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    updateStudentProfile,
    migrateStudentClass,
  };
}
