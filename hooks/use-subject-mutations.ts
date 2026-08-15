'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subBranchNameFr, type SubjectType } from '@/lib/acadia/subject-catalog';
import { buildSubjectRow } from '@/lib/acadia/subject';
import type {
  SubjectAssignmentFormValues,
  SubjectFormValues,
  SubjectMaterialFormValues,
  TimetableSlotFormValues,
} from '@/lib/acadia/subject-schemas';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { requireBrowserClient } from '@/lib/supabase/client';
import { replaceSubjectLevels } from '@/lib/supabase/queries/subject-levels';
import {
  assertNoOverlappingSubjectVariant,
  copySubjectAssignments,
} from '@/lib/supabase/queries/subject-variants';
import {
  assertTimetableSlotValid,
  buildTimetableSlotWritePayload,
} from '@/lib/supabase/queries/timetable';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateSubjectQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-list'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-assignments'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-materials'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-timetable'] });
  void queryClient.invalidateQueries({ queryKey: ['timetable-slots'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-options'] });
}

async function replaceSubjectSubBranches(
  supabase: SupabaseClient,
  tenantId: string,
  subjectId: string,
  values: SubjectFormValues,
  now: string,
) {
  const { error: deleteError } = await supabase
    .from('SubjectSubBranch')
    .delete()
    .eq('tenantId', tenantId)
    .eq('subjectId', subjectId);
  if (deleteError) {
    throw deleteError;
  }

  if (!values.hasSubBranches || values.subBranches.length === 0) {
    return;
  }

  const rows = values.subBranches.map((branch, index) => ({
    id: generateAcadiaId('subbranch'),
    tenantId,
    subjectId,
    name: branch.name.trim(),
    nameFr: subBranchNameFr(branch),
    coefficient: branch.hasCustomCoefficient ? branch.coefficient ?? null : null,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  const { error: insertError } = await supabase.from('SubjectSubBranch').insert(rows);
  if (insertError) {
    throw insertError;
  }
}

export function useSubjectMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const createSubject = useMutation({
    mutationFn: async ({
      values,
      copyAssignmentsFromSubjectId,
    }: {
      values: SubjectFormValues;
      copyAssignmentsFromSubjectId?: string;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await assertNoOverlappingSubjectVariant(supabase, tenantId, {
        nameEn: values.nameEn,
        subSystem: values.subSystem,
        branch: values.branch,
        academicYearId: values.academicYearId,
        levelIds: values.levelIds,
      });
      const id = generateAcadiaId('subject');
      const now = new Date().toISOString();
      const row = buildSubjectRow(tenantId, id, values, now, 'OTHERS');

      const { error } = await supabase.from('Subject').insert({
        ...row,
        createdAt: now,
      });
      if (error) {
        throw error;
      }
      await replaceSubjectSubBranches(supabase, tenantId, id, values, now);
      await replaceSubjectLevels(supabase, tenantId, id, values.levelIds, now);
      if (copyAssignmentsFromSubjectId) {
        await copySubjectAssignments(
          supabase,
          tenantId,
          copyAssignmentsFromSubjectId,
          id,
          now,
          generateAcadiaId,
        );
      }
      return id;
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Subject created.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateSubject = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: SubjectFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await assertNoOverlappingSubjectVariant(supabase, tenantId, {
        id,
        nameEn: values.nameEn,
        subSystem: values.subSystem,
        branch: values.branch,
        academicYearId: values.academicYearId,
        levelIds: values.levelIds,
      });
      const now = new Date().toISOString();
      const { data: existing, error: fetchError } = await supabase
        .from('Subject')
        .select('subjectType')
        .eq('id', id)
        .eq('tenantId', tenantId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      const row = buildSubjectRow(
        tenantId,
        id,
        values,
        now,
        (existing?.subjectType as SubjectType | undefined) ?? 'OTHERS',
      );

      const { error } = await supabase
        .from('Subject')
        .update({
          code: row.code,
          nameEn: row.nameEn,
          nameFr: row.nameFr,
          credits: row.credits,
          hours: row.hours,
          subSystem: row.subSystem,
          branch: row.branch,
          levelId: row.levelId,
          academicYearId: row.academicYearId,
          termId: row.termId,
          subjectType: row.subjectType,
          coefficient: row.coefficient,
          groupingId: row.groupingId,
          hasSubBranches: row.hasSubBranches,
          updatedAt: now,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
      await replaceSubjectSubBranches(supabase, tenantId, id, values, now);
      await replaceSubjectLevels(supabase, tenantId, id, values.levelIds, now);
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Subject updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deactivateSubject = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Subject')
        .update({
          deactivatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Subject deactivated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const reactivateSubject = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Subject')
        .update({
          deactivatedAt: null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Subject reactivated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createAssignment = useMutation({
    mutationFn: async ({
      subjectId,
      values,
    }: {
      subjectId: string;
      values: SubjectAssignmentFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { error } = await supabase.from('SubjectAssignment').insert({
        id: generateAcadiaId('assign'),
        tenantId,
        subjectId,
        academicYearId: values.academicYearId,
        staffProfileId: values.staffProfileId,
        isLead: values.isLead,
        teachesPrimaryHome: values.teachesPrimaryHome,
        notes: values.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Teacher assigned to subject.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('SubjectAssignment')
        .delete()
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Assignment removed.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createMaterial = useMutation({
    mutationFn: async ({
      subjectId,
      values,
    }: {
      subjectId: string;
      values: SubjectMaterialFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { error } = await supabase.from('CourseworkTask').insert({
        id: generateAcadiaId('task'),
        tenantId,
        subjectId,
        academicYearId: values.academicYearId,
        titleEn: values.titleEn.trim(),
        titleFr: values.titleFr.trim(),
        descriptionEn: values.descriptionEn?.trim() || null,
        descriptionFr: values.descriptionFr?.trim() || null,
        dueAt: values.dueAt,
        maxScore: values.maxScore,
        isPublished: values.isPublished,
        createdAt: now,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Subject material added.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('CourseworkTask')
        .delete()
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Material removed.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createTimetableSlot = useMutation({
    mutationFn: async (values: TimetableSlotFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await assertTimetableSlotValid(supabase, tenantId, values);
      const now = new Date().toISOString();
      const { error } = await supabase.from('TimetableSlot').insert({
        id: generateAcadiaId('slot'),
        tenantId,
        ...buildTimetableSlotWritePayload(values),
        createdAt: now,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Timetable slot created.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateTimetableSlot = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: TimetableSlotFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await assertTimetableSlotValid(supabase, tenantId, values, id);
      const { error } = await supabase
        .from('TimetableSlot')
        .update({
          ...buildTimetableSlotWritePayload(values),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Timetable slot updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteTimetableSlot = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('TimetableSlot')
        .delete()
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient);
      toast.success('Timetable slot deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    createSubject,
    updateSubject,
    deactivateSubject,
    reactivateSubject,
    createAssignment,
    deleteAssignment,
    createMaterial,
    deleteMaterial,
    createTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
  };
}
