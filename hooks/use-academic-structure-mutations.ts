'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { levelCatalogForSubSystem } from '@/lib/acadia/education-system';
import type { ClassFormValues, LevelFormValues } from '@/lib/acadia/structure-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import {
  getMutationErrorMessage,
  throwMutationError,
} from '@/lib/acadia/query-errors';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  bulkAssignClassSubjects,
  insertClassSubjects,
  syncClassSubjects,
} from '@/lib/supabase/queries/class-subjects';
import {
  buildClassDeleteBlockedMessage,
  fetchClassDeleteBlockers,
  hasClassDeleteBlockers,
} from '@/lib/supabase/queries/class-delete';
import {
  buildLevelDeleteBlockedMessage,
  canCascadeDeleteClasses,
  deleteClassesForLevel,
  fetchLevelDeleteBlockers,
  hasNonClassBlockers,
} from '@/lib/supabase/queries/level-delete';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function invalidateStructureQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['level-list'] });
  void queryClient.invalidateQueries({ queryKey: ['level-options'] });
  void queryClient.invalidateQueries({ queryKey: ['levels-catalog'] });
  void queryClient.invalidateQueries({ queryKey: ['class-list'] });
  void queryClient.invalidateQueries({ queryKey: ['class-options'] });
  void queryClient.invalidateQueries({ queryKey: ['level-for-stream'] });
  void queryClient.invalidateQueries({ queryKey: ['subjects-for-class'] });
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
      let blockers = await fetchLevelDeleteBlockers(supabase, tenantId, id);

      if (hasNonClassBlockers(blockers)) {
        throw new Error(buildLevelDeleteBlockedMessage(blockers));
      }

      if (canCascadeDeleteClasses(blockers)) {
        await deleteClassesForLevel(supabase, tenantId, id);
        blockers = await fetchLevelDeleteBlockers(supabase, tenantId, id);
        if (blockers.classes > 0 || hasNonClassBlockers(blockers)) {
          throw new Error(buildLevelDeleteBlockedMessage(blockers));
        }
      }

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
      const blockers = await fetchClassDeleteBlockers(supabase, tenantId, id);

      if (hasClassDeleteBlockers(blockers)) {
        throw new Error(buildClassDeleteBlockedMessage(blockers));
      }

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

  const importLevelCatalog = useMutation({
    mutationFn: async ({
      subSystem,
      branch,
    }: {
      subSystem: AcademicSubSystem;
      branch: AcademicBranch;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const catalog = levelCatalogForSubSystem(subSystem);

      const { data: existing, error: fetchError } = await supabase
        .from('Level')
        .select('name')
        .eq('tenantId', tenantId)
        .eq('subSystem', subSystem)
        .eq('branch', branch);
      if (fetchError) {
        throwMutationError(fetchError);
      }

      const existingNames = new Set(
        (existing ?? []).map((row) => row.name.trim().toLowerCase()),
      );
      const now = new Date().toISOString();
      let created = 0;
      let skipped = 0;

      for (const entry of catalog) {
        const trimmedName = entry.labelEn.trim();
        if (existingNames.has(trimmedName.toLowerCase())) {
          skipped += 1;
          continue;
        }
        const { error } = await supabase.from('Level').insert({
          id: generateAcadiaId('lvl'),
          tenantId,
          name: trimmedName,
          subSystem,
          branch,
          number: entry.number,
          labelEn: entry.labelEn,
          labelFr: entry.labelFr,
          sortOrder: entry.sortOrder,
          createdAt: now,
        });
        if (error) {
          if (error.code === '23505') {
            skipped += 1;
            existingNames.add(trimmedName.toLowerCase());
            continue;
          }
          throwMutationError(error);
        }
        created += 1;
        existingNames.add(trimmedName.toLowerCase());
      }

      return { created, skipped };
    },
    onSuccess: ({ created, skipped }) => {
      invalidateStructureQueries(queryClient);
      if (created === 0 && skipped > 0) {
        toast.info(`All standard levels already exist (${skipped} skipped).`);
      } else {
        toast.success(`Imported ${created} level(s).${skipped > 0 ? ` ${skipped} skipped (already exist).` : ''}`);
      }
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const assignClassSubjects = useMutation({
    mutationFn: async ({
      classIds,
      subjectIds,
      academicYearId,
    }: {
      classIds: string[];
      subjectIds: string[];
      academicYearId?: string | null;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      return bulkAssignClassSubjects(supabase, tenantId, classIds, subjectIds, {
        academicYearId,
      });
    },
    onSuccess: (result) => {
      invalidateStructureQueries(queryClient);
      const parts: string[] = [];
      if (result.added > 0) {
        parts.push(`${result.added} assignment(s) added`);
      }
      if (result.skippedDuplicate > 0) {
        parts.push(`${result.skippedDuplicate} already linked`);
      }
      if (result.skippedIneligible > 0) {
        parts.push(
          `${result.skippedIneligible} skipped (subject not offered for that class)`,
        );
      }
      if (result.added > 0) {
        toast.success(parts.join('. ') + '.');
      } else if (parts.length > 0) {
        toast.info(parts.join('. ') + '.');
      } else {
        toast.info('No new assignments were made.');
      }
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  return {
    createLevel,
    updateLevel,
    deleteLevel,
    importLevelCatalog,
    createClass,
    updateClass,
    deleteClass,
    assignClassSubjects,
  };
}
