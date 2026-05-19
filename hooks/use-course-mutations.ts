'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { buildCourseRow } from '@/lib/acadia/course';
import type {
  CourseAssignmentFormValues,
  CourseFormValues,
  CourseMaterialFormValues,
  TimetableSlotFormValues,
} from '@/lib/acadia/course-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { timeStringToMinutes } from '@/lib/acadia/timetable';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateCourseQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['course-assignments'] });
  void queryClient.invalidateQueries({ queryKey: ['course-materials'] });
  void queryClient.invalidateQueries({ queryKey: ['course-timetable'] });
  void queryClient.invalidateQueries({ queryKey: ['course-options'] });
}

export function useCourseMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const createCourse = useMutation({
    mutationFn: async (values: CourseFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const id = generateAcadiaId('course');
      const now = new Date().toISOString();
      const row = buildCourseRow(tenantId, id, values, now);

      const { error } = await supabase.from('Course').insert({
        ...row,
        createdAt: now,
      });
      if (error) {
        throw error;
      }
      return id;
    },
    onSuccess: (id) => {
      invalidateCourseQueries(queryClient);
      toast.success('Course created.');
      router.push(`/courses/${id}`);
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateCourse = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: CourseFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const row = buildCourseRow(tenantId, id, values, now);

      const { error } = await supabase
        .from('Course')
        .update({
          code: row.code,
          nameEn: row.nameEn,
          nameFr: row.nameFr,
          credits: row.credits,
          hours: row.hours,
          specialtyId: row.specialtyId,
          levelId: row.levelId,
          termId: row.termId,
          updatedAt: now,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCourseQueries(queryClient);
      toast.success('Course updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deactivateCourse = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Course')
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
      invalidateCourseQueries(queryClient);
      toast.success('Course deactivated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createAssignment = useMutation({
    mutationFn: async ({
      courseId,
      values,
    }: {
      courseId: string;
      values: CourseAssignmentFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { error } = await supabase.from('CourseAssignment').insert({
        id: generateAcadiaId('assign'),
        tenantId,
        courseId,
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
      invalidateCourseQueries(queryClient);
      toast.success('Teacher assigned to course.');
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
        .from('CourseAssignment')
        .delete()
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCourseQueries(queryClient);
      toast.success('Assignment removed.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createMaterial = useMutation({
    mutationFn: async ({
      courseId,
      values,
    }: {
      courseId: string;
      values: CourseMaterialFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { error } = await supabase.from('CourseworkTask').insert({
        id: generateAcadiaId('task'),
        tenantId,
        courseId,
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
      invalidateCourseQueries(queryClient);
      toast.success('Course material added.');
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
      invalidateCourseQueries(queryClient);
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
      const now = new Date().toISOString();
      const { error } = await supabase.from('TimetableSlot').insert({
        id: generateAcadiaId('slot'),
        tenantId,
        academicYearId: values.academicYearId,
        courseId: values.courseId,
        staffProfileId: values.staffProfileId,
        roomId: values.roomId,
        dayOfWeek: values.dayOfWeek,
        startMinutes: timeStringToMinutes(values.startTime),
        endMinutes: timeStringToMinutes(values.endTime),
        createdAt: now,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCourseQueries(queryClient);
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
      const { error } = await supabase
        .from('TimetableSlot')
        .update({
          academicYearId: values.academicYearId,
          courseId: values.courseId,
          staffProfileId: values.staffProfileId,
          roomId: values.roomId,
          dayOfWeek: values.dayOfWeek,
          startMinutes: timeStringToMinutes(values.startTime),
          endMinutes: timeStringToMinutes(values.endTime),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCourseQueries(queryClient);
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
      invalidateCourseQueries(queryClient);
      toast.success('Timetable slot deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    createCourse,
    updateCourse,
    deactivateCourse,
    createAssignment,
    deleteAssignment,
    createMaterial,
    deleteMaterial,
    createTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
  };
}
