'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ClassFormValues, LevelFormValues } from '@/lib/acadia/structure-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import {
  getMutationErrorMessage,
  throwMutationError,
} from '@/lib/acadia/query-errors';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function invalidateStructureQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['level-list'] });
  void queryClient.invalidateQueries({ queryKey: ['level-options'] });
  void queryClient.invalidateQueries({ queryKey: ['levels-catalog'] });
  void queryClient.invalidateQueries({ queryKey: ['class-list'] });
  void queryClient.invalidateQueries({ queryKey: ['class-options'] });
  void queryClient.invalidateQueries({ queryKey: ['level-for-specialty'] });
}

async function nextLevelNumber(
  tenantId: string,
  subSystem: string,
  branch: string,
): Promise<number> {
  const supabase = requireBrowserClient();
  const { data, error } = await supabase
    .from('Level')
    .select('number')
    .eq('tenantId', tenantId)
    .eq('subSystem', subSystem)
    .eq('branch', branch)
    .order('number', { ascending: false })
    .limit(1);
  if (error) {
    throwMutationError(error);
  }
  const max = data?.[0]?.number ?? 0;
  return max + 1;
}

export function useAcademicStructureMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const createLevel = useMutation({
    mutationFn: async (values: LevelFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const number = await nextLevelNumber(tenantId, values.subSystem, values.branch);
      const trimmedName = values.name.trim();
      const now = new Date().toISOString();
      const { error } = await supabase.from('Level').insert({
        id: generateAcadiaId('lvl'),
        tenantId,
        name: trimmedName,
        subSystem: values.subSystem,
        branch: values.branch,
        number,
        labelEn: trimmedName,
        labelFr: trimmedName,
        sortOrder: number,
        createdAt: now,
      });
      if (error) {
        throwMutationError(error);
      }
    },
    onSuccess: () => {
      invalidateStructureQueries(queryClient);
      toast.success('Level created.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const updateLevel = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: LevelFormValues }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const trimmedName = values.name.trim();
      const { error } = await supabase
        .from('Level')
        .update({
          name: trimmedName,
          subSystem: values.subSystem,
          branch: values.branch,
          labelEn: trimmedName,
          labelFr: trimmedName,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throwMutationError(error);
      }
    },
    onSuccess: () => {
      invalidateStructureQueries(queryClient);
      toast.success('Level updated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const deleteLevel = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase.from('Level').delete().eq('id', id).eq('tenantId', tenantId);
      if (error) {
        throwMutationError(error);
      }
    },
    onSuccess: () => {
      invalidateStructureQueries(queryClient);
      toast.success('Level deleted.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const createClass = useMutation({
    mutationFn: async (values: ClassFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const classId = generateAcadiaId('cls');
      const now = new Date().toISOString();
      const { error } = await supabase.from('Class').insert({
        id: classId,
        tenantId,
        name: values.name.trim(),
        levelId: values.levelId,
        subSystem: values.subSystem,
        branch: values.branch,
        specialtyId: values.specialtyId?.trim() || null,
        staffProfileId: values.staffProfileId?.trim() || null,
        status: values.status,
        createdAt: now,
        updatedAt: now,
      });
      if (error) {
        throwMutationError(error);
      }
      try {
        await insertClassSubjects(supabase, tenantId, classId, values.subjectIds ?? []);
      } catch (subjectError) {
        throwMutationError(subjectError);
      }
    },
    onSuccess: () => {
      invalidateStructureQueries(queryClient);
      toast.success('Class created.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const updateClass = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ClassFormValues }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Class')
        .update({
          name: values.name.trim(),
          levelId: values.levelId,
          subSystem: values.subSystem,
          branch: values.branch,
          specialtyId: values.specialtyId?.trim() || null,
          staffProfileId: values.staffProfileId?.trim() || null,
          status: values.status,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throwMutationError(error);
      }
      try {
        await syncClassSubjects(supabase, tenantId, id, values.subjectIds ?? []);
      } catch (subjectError) {
        throwMutationError(subjectError);
      }
    },
    onSuccess: () => {
      invalidateStructureQueries(queryClient);
      toast.success('Class updated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase.from('Class').delete().eq('id', id).eq('tenantId', tenantId);
      if (error) {
        throwMutationError(error);
      }
    },
    onSuccess: () => {
      invalidateStructureQueries(queryClient);
      toast.success('Class deleted.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  return {
    createLevel,
    updateLevel,
    deleteLevel,
    createClass,
    updateClass,
    deleteClass,
  };
}
