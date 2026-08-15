'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { StudentClassExportDialog } from '@/components/acadia/student/student-class-export-dialog';
import {
  StudentClassRosterPrint,
  type StudentClassPrintJob,
} from '@/components/acadia/student/student-class-roster-print';
import { StudentList } from '@/components/acadia/student/student-list';
import { StudentRegistryFiltersPanel } from '@/components/acadia/student/student-registry-filters';
import { StudentRegistryStats } from '@/components/acadia/student/student-registry-stats';
import { Button } from '@/components/ui/button';
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
import {
  findClassExportOptionByName,
  getStudentClassExportOptions,
} from '@/lib/acadia/student-class-export';
import { seededInitialData } from '@/lib/acadia/cache/tags';
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

export function StudentRegistry({
  extraActions,
  initialStudents,
  seedYearId,
}: {
  extraActions?: ReactNode;
  initialStudents?: StudentListItem[];
  seedYearId?: string | null;
}) {
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
    initialData: seededInitialData(initialStudents, seedYearId, activeYearId),
    staleTime: 60_000,
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

  const scopePairs = useMemo(
    () => teacherStudentsResult?.scope.pairs ?? [],
    [teacherStudentsResult?.scope.pairs],
  );

  const [filters, setFilters] = useState<StudentRegistryFilters>(
    EMPTY_STUDENT_REGISTRY_FILTERS,
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [printJob, setPrintJob] = useState<StudentClassPrintJob | null>(null);

  const activeYearLabel = activeYear?.label ?? null;

  const exportClassOptions = useMemo(
    () =>
      getStudentClassExportOptions(
        listSource,
        isTeacherView ? scopePairs : undefined,
      ),
    [isTeacherView, listSource, scopePairs],
  );

  const initialExportClassId = useMemo(
    () => findClassExportOptionByName(exportClassOptions, filters.className)?.id ?? null,
    [exportClassOptions, filters.className],
  );

  useEffect(() => {
    if (!printJob) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 300);

    const clearPrintJob = () => setPrintJob(null);
    window.addEventListener('afterprint', clearPrintJob);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('afterprint', clearPrintJob);
    };
  }, [printJob]);

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
    <>
      <div className={printJob ? 'print:hidden' : undefined}>
        <AcadiaPageShell
          title={t('students.title')}
          description={
            isTeacherView
              ? t('students.teacherDescription')
              : t('students.description')
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                disabled={studentsLoading || exportClassOptions.length === 0}
              >
                <Download className="size-4" />
                {t('students.downloadList')}
              </Button>
              {extraActions}
            </div>
          }
        >
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
          <StudentClassExportDialog
            open={exportOpen}
            onOpenChange={setExportOpen}
            students={listSource}
            classOptions={exportClassOptions}
            academicYearLabel={activeYearLabel}
            initialClassId={initialExportClassId}
            onPrint={setPrintJob}
          />
        </AcadiaPageShell>
      </div>
      {printJob ? <StudentClassRosterPrint job={printJob} /> : null}
    </>
  );
}
