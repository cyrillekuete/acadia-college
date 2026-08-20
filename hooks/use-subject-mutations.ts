'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type SubjectType } from '@/lib/acadia/subject-catalog';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import { localDateTimeInputToIso } from '@/lib/acadia/dates';
import { materialHasSubmissionsMessage } from '@/lib/acadia/coursework';
import type {
  SubjectAssignmentFormValues,
  SubjectFormValues,
  SubjectMaterialFormValues,
  TimetableSlotFormValues,
} from '@/lib/acadia/subject-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  assertTimetableSlotDeletable,
  assertTimetableSlotValid,
  buildTimetableSlotWritePayload,
  writeTimetableSlot,
} from '@/lib/supabase/queries/timetable';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { catalogTags, dashboardTags } from '@/lib/acadia/cache/tags';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function invalidateSubjectQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-list'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-assignments'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-materials'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-timetable'] });
  void queryClient.invalidateQueries({ queryKey: ['timetable-slots'] });
  void queryClient.invalidateQueries({ queryKey: ['subject-options'] });
  if (tenantId) {
    invalidateAcadiaCache([...catalogTags(tenantId), ...dashboardTags(tenantId)]);
  }
}

function subjectPayload(
  values: SubjectFormValues,
  extras?: { copyAssignmentsFromSubjectId?: string; subjectType?: SubjectType },
) {
  return {
    code: values.code.trim().toUpperCase(),
    nameEn: values.nameEn.trim(),
    nameFr: values.nameFr?.trim() || values.nameEn.trim(),
    academicYearId: values.academicYearId,
    subSystem: values.subSystem,
    branch: values.branch,
    levelIds: values.levelIds,
    coefficient: values.coefficient,
    groupingId: values.groupingId?.trim() || '',
    hasSubBranches: values.hasSubBranches,
    subBranches: values.hasSubBranches ? values.subBranches : [],
    copyAssignmentsFromSubjectId: extras?.copyAssignmentsFromSubjectId ?? '',
    subjectType: extras?.subjectType ?? 'OTHERS',
  };
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
      const { data, error } = await supabase.rpc('acadia_save_subject', {
        p_tenant_id: tenantId,
        p_subject_id: null,
        p_payload: subjectPayload(values, {
          copyAssignmentsFromSubjectId,
        }),
      });
      if (error) {
        throw error;
      }
      return data as string;
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Subject created.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      const { data: existing, error: fetchError } = await supabase
        .from('Subject')
        .select('subjectType')
        .eq('id', id)
        .eq('tenantId', tenantId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      const { error } = await supabase.rpc('acadia_save_subject', {
        p_tenant_id: tenantId,
        p_subject_id: id,
        p_payload: subjectPayload(values, {
          subjectType: (existing?.subjectType as SubjectType | undefined) ?? 'OTHERS',
        }),
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Subject updated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Subject deactivated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Subject reactivated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      if (values.isLead) {
        const { error: leadError } = await supabase
          .from('SubjectAssignment')
          .update({ isLead: false, updatedAt: now })
          .eq('tenantId', tenantId)
          .eq('subjectId', subjectId)
          .eq('academicYearId', values.academicYearId)
          .eq('isLead', true);
        if (leadError) {
          throw leadError;
        }
      }
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
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Teacher assigned to subject.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Assignment removed.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      const dueAt = localDateTimeInputToIso(values.dueAt);
      if (!dueAt) {
        throw new Error('Due date is invalid.');
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
        dueAt,
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
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Subject material added.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const updateMaterial = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: SubjectMaterialFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const dueAt = localDateTimeInputToIso(values.dueAt);
      if (!dueAt) {
        throw new Error('Due date is invalid.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('CourseworkTask')
        .update({
          titleEn: values.titleEn.trim(),
          titleFr: values.titleFr.trim(),
          descriptionEn: values.descriptionEn?.trim() || null,
          descriptionFr: values.descriptionFr?.trim() || null,
          dueAt,
          maxScore: values.maxScore,
          isPublished: values.isPublished,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Subject material updated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { count, error: countError } = await supabase
        .from('CourseworkSubmission')
        .select('id', { count: 'exact', head: true })
        .eq('tenantId', tenantId)
        .eq('taskId', id);
      if (countError) {
        throw countError;
      }
      if ((count ?? 0) > 0) {
        throw new Error(materialHasSubmissionsMessage(count ?? 0));
      }
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
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Material removed.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const createTimetableSlot = useMutation({
    mutationFn: async (values: TimetableSlotFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await assertTimetableSlotValid(supabase, tenantId, values);
      const slotId = generateAcadiaId('slot');
      await writeTimetableSlot(supabase, tenantId, {
        id: slotId,
        ...buildTimetableSlotWritePayload(values),
      });
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Timetable slot created.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
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
      await writeTimetableSlot(supabase, tenantId, {
        id,
        ...buildTimetableSlotWritePayload(values),
        excludeSlotId: id,
      });
    },
    onSuccess: () => {
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Timetable slot updated.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const deleteTimetableSlot = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await assertTimetableSlotDeletable(supabase, tenantId, id);
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
      invalidateSubjectQueries(queryClient, tenantId);
      toast.success('Timetable slot deleted.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  return {
    createSubject,
    updateSubject,
    deactivateSubject,
    reactivateSubject,
    createAssignment,
    deleteAssignment,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    createTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
  };
}
