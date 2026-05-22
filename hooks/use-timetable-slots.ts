'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchTimetableSlotsForClass,
  fetchTimetableSlotsForStudent,
  fetchTimetableSlotsForTeacher,
  type TimetableSlotListRow,
} from '@/lib/supabase/queries/timetable';

function useTimetableSlotsQueryKey(
  scope: string,
  tenantId: string | null,
  academicYearId: string | null,
  entityId: string | null,
) {
  return ['timetable-slots', scope, tenantId, academicYearId, entityId] as const;
}

function useTimetableSlotsBase(
  scope: string,
  entityId: string | null | undefined,
  queryFn: () => Promise<TimetableSlotListRow[]>,
  options?: { enabled?: boolean },
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const extraEnabled = options?.enabled ?? true;

  return useQuery({
    queryKey: useTimetableSlotsQueryKey(scope, tenantId, activeYearId, entityId ?? null),
    queryFn,
    enabled:
      extraEnabled &&
      !!entityId &&
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useTimetableSlotsForClass(
  classId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useTimetableSlotsBase(scopeForClass(classId), classId, async () => {
    const supabase = requireBrowserClient();
    return fetchTimetableSlotsForClass(
      supabase,
      tenantId!,
      classId!,
      activeYearId!,
    );
  }, options);
}

export function useTimetableSlotsForTeacher(
  staffProfileId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useTimetableSlotsBase(scopeForTeacher(staffProfileId), staffProfileId, async () => {
    const supabase = requireBrowserClient();
    return fetchTimetableSlotsForTeacher(
      supabase,
      tenantId!,
      staffProfileId!,
      activeYearId!,
    );
  }, options);
}

export function useTimetableSlotsForStudent(
  studentProfileId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useTimetableSlotsBase(scopeForStudent(studentProfileId), studentProfileId, async () => {
    const supabase = requireBrowserClient();
    return fetchTimetableSlotsForStudent(
      supabase,
      tenantId!,
      studentProfileId!,
      activeYearId!,
    );
  }, options);
}

function scopeForClass(classId: string | null | undefined) {
  return `class:${classId ?? ''}`;
}

function scopeForTeacher(staffProfileId: string | null | undefined) {
  return `teacher:${staffProfileId ?? ''}`;
}

function scopeForStudent(studentProfileId: string | null | undefined) {
  return `student:${studentProfileId ?? ''}`;
}
