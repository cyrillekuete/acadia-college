'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StudentList } from '@/components/acadia/student/student-list';
import { StudentRegistryFiltersPanel } from '@/components/acadia/student/student-registry-filters';
import { StudentRegistryStats } from '@/components/acadia/student/student-registry-stats';
import type { StudentListItem } from '@/lib/acadia/student-list-item';
import {
  EMPTY_STUDENT_REGISTRY_FILTERS,
  computeStudentRegistryStats,
  computeTeacherStudentRegistryStats,
  filterStudentsRegistry,
  getStudentClassOptions,
  getStudentFeesStatusOptions,
  getTeacherSubjectOptions,
  type StudentRegistryFilters,
} from '@/lib/acadia/student-registry';
import { isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';
import { useTeacherStudents } from '@/hooks/use-teacher-students';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchStudentsList } from '@/lib/supabase/queries/students-list';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';

export function StudentRegistry() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const roleSlug = session?.roleSlug ?? null;
  const isTeacherView = isStaffOrTeacher(roleSlug) && !isAdmin(roleSlug);
  const { activeYear, activeYearId } = useActiveAcademicYear();

  const { data: remoteStudents, isLoading: adminStudentsLoading } = useQuery({
    queryKey: ['students-list', tenantId, activeYearId],
    queryFn: async () => {
      if (!tenantId || !activeYearId) {
        throw new Error('Tenant and academic year are required');
      }
      const supabase = requireBrowserClient();
      return fetchStudentsList(supabase, tenantId, activeYearId);
    },
    enabled:
      !isTeacherView &&
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const {
    data: teacherStudentsResult,
    isLoading: teacherStudentsLoading,
  } = useTeacherStudents();

  const studentsLoading = isTeacherView ? teacherStudentsLoading : adminStudentsLoading;

  const listSource = useMemo((): StudentListItem[] => {
    if (studentsLoading || !activeYearId) {
      return [];
    }
    if (isTeacherView) {
      return teacherStudentsResult?.students ?? [];
    }
    if (remoteStudents != null) {
      return remoteStudents;
    }
    return [];
  }, [
    activeYearId,
    isTeacherView,
    remoteStudents,
    studentsLoading,
    teacherStudentsResult?.students,
  ]);

  const scopePairs = teacherStudentsResult?.scope.pairs ?? [];

  const [filters, setFilters] = useState<StudentRegistryFilters>(
    EMPTY_STUDENT_REGISTRY_FILTERS,
  );

  const activeYearLabel = activeYear?.label ?? null;

  const adminStats = useMemo(
    () => computeStudentRegistryStats(listSource, activeYearLabel),
    [listSource, activeYearLabel],
  );

  const teacherStats = useMemo(
    () => computeTeacherStudentRegistryStats(listSource, scopePairs, activeYearLabel),
    [listSource, scopePairs, activeYearLabel],
  );

  const filteredStudents = useMemo(
    () =>
      filterStudentsRegistry(listSource, filters, {
        scopePairs: isTeacherView ? scopePairs : undefined,
      }),
    [filters, isTeacherView, listSource, scopePairs],
  );

  const classOptions = useMemo(
    () => getStudentClassOptions(listSource),
    [listSource],
  );

  const feesStatusOptions = useMemo(
    () => getStudentFeesStatusOptions(listSource),
    [listSource],
  );

  const subjectOptions = useMemo(
    () => getTeacherSubjectOptions(scopePairs),
    [scopePairs],
  );

  const emptyMessage = useMemo(() => {
    if (!isTeacherView || studentsLoading) {
      return undefined;
    }
    if (!teacherStudentsResult) {
      return t('students.emptyLinkProfile');
    }
    if (scopePairs.length === 0) {
      return t('students.emptyNoClasses');
    }
    if (listSource.length === 0) {
      return t('students.emptyNoStudents');
    }
    return undefined;
  }, [isTeacherView, listSource.length, scopePairs.length, studentsLoading, teacherStudentsResult, t]);

  return (
    <div className="space-y-7.5">
      <StudentRegistryStats
        mode={isTeacherView ? 'teacher' : 'admin'}
        adminStats={adminStats}
        teacherStats={teacherStats}
        isLoading={studentsLoading}
      />
      <StudentRegistryFiltersPanel
        mode={isTeacherView ? 'teacher' : 'admin'}
        filters={filters}
        onChange={setFilters}
        classOptions={classOptions}
        feesStatusOptions={feesStatusOptions}
        subjectOptions={subjectOptions}
      />
      <StudentList
        students={filteredStudents}
        isLoading={studentsLoading && listSource.length === 0}
        emptyMessage={emptyMessage}
        defaultSorting={
          isTeacherView
            ? [
                { id: 'class_name', desc: false },
                { id: 'student', desc: false },
              ]
            : undefined
        }
      />
    </div>
  );
}
