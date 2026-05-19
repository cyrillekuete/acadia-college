'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  StudentClassMigrationValues,
  StudentProfileEditValues,
} from '@/lib/acadia/student-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

export function useStudentMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

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
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { error: profileError } = await supabase
        .from('StudentProfile')
        .update({
          registrationNumber: values.registrationNumber.trim(),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
      void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
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
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { error: profileError } = await supabase
        .from('StudentProfile')
        .update({
          specialtyId: values.specialtyId,
          currentLevelId: values.levelId,
          updatedAt: now,
        })
        .eq('id', profileId)
        .eq('tenantId', tenantId);
      if (profileError) {
        throw profileError;
      }

      const { error: enrollmentError } = await supabase
        .from('StudentEnrollment')
        .insert({
          id: generateAcadiaId('enr'),
          tenantId,
          studentProfileId: profileId,
          academicYearId: values.academicYearId,
          specialtyId: values.specialtyId,
          levelId: values.levelId,
          status: 'ENROLLED',
          applicationId: null,
          createdAt: now,
          updatedAt: now,
        });
      if (enrollmentError) {
        throw enrollmentError;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
      void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
      void queryClient.invalidateQueries({
        queryKey: ['student-academic-progress'],
      });
      toast.success('Student class placement updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    updateStudentProfile,
    migrateStudentClass,
  };
}
