'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StudentList } from '@/components/acadia/student/student-list';
import { StudentRegistryFiltersPanel } from '@/components/acadia/student/student-registry-filters';
import { StudentRegistryStats } from '@/components/acadia/student/student-registry-stats';
import type { DummyStudent } from '@/lib/acadia/dummy-students';
import {
  EMPTY_STUDENT_REGISTRY_FILTERS,
  computeStudentRegistryStats,
  filterStudentsRegistry,
  getStudentClassOptions,
  getStudentFeesStatusOptions,
  type StudentRegistryFilters,
} from '@/lib/acadia/student-registry';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchStudentsList } from '@/lib/supabase/queries/students-list';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export function StudentRegistry() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYear, activeYearId } = useActiveAcademicYear();

  const { data: remoteStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-list', tenantId, activeYearId],
    queryFn: async () => {
      if (!tenantId || !activeYearId) {
        throw new Error('Tenant and academic year are required');
      }
      const supabase = requireBrowserClient();
      return fetchStudentsList(supabase, tenantId, activeYearId);
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const listSource = useMemo((): DummyStudent[] => {
    if (studentsLoading || !activeYearId) {
      return [];
    }
    if (remoteStudents != null) {
      return remoteStudents;
    }
    return [];
  }, [remoteStudents, studentsLoading, activeYearId]);

  const [filters, setFilters] = useState<StudentRegistryFilters>(
    EMPTY_STUDENT_REGISTRY_FILTERS,
  );

  const activeYearLabel = activeYear?.label ?? null;

  const stats = useMemo(
    () => computeStudentRegistryStats(listSource, activeYearLabel),
    [listSource, activeYearLabel],
  );

  const filteredStudents = useMemo(
    () => filterStudentsRegistry(listSource, filters),
    [listSource, filters],
  );

  const classOptions = useMemo(
    () => getStudentClassOptions(listSource),
    [listSource],
  );

  const feesStatusOptions = useMemo(
    () => getStudentFeesStatusOptions(listSource),
    [listSource],
  );

  return (
    <div className="space-y-7.5">
      <StudentRegistryStats stats={stats} isLoading={studentsLoading} />
      <StudentRegistryFiltersPanel
        filters={filters}
        onChange={setFilters}
        classOptions={classOptions}
        feesStatusOptions={feesStatusOptions}
      />
      <StudentList
        students={filteredStudents}
        isLoading={studentsLoading && listSource.length === 0}
      />
    </div>
  );
}
