'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { AttendanceDataGrid } from '@/components/acadia/attendance/attendance-data-grid';
import {
  formatAttendancePercentage,
  summarizeStudentAttendance,
  type StudentAttendanceSummary,
} from '@/lib/acadia/attendance';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useClassesForFilters } from '@/hooks/use-enrollment-catalog-options';
import {
  useAcadiaCollegeSession,
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { fetchAttendanceRecordsForSessions } from '@/lib/supabase/queries/attendance-records';
import { useTranslation } from '@/hooks/useTranslation';

const ALL_SUBJECTS = '__all__';
const ALL_CLASSES = '__all__';

type RateRow = StudentAttendanceSummary & {
  name: string;
  registrationNumber: string;
};

const DEFAULT_COLUMN_ORDER = [
  'student',
  'sessions',
  'present',
  'absent',
  'late',
  'excused',
  'rate',
];

export function AttendancePercentagesPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [subjectId, setSubjectId] = useState(ALL_SUBJECTS);
  const [classId, setClassId] = useState(ALL_CLASSES);
  const { data: subjects = [] } = useSubjectOptions(activeYearId ?? '');
  const { data: classes = [] } = useClassesForFilters();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);

  const query = useQuery({
    queryKey: [
      'attendance-percentages',
      tenantId,
      activeYearId,
      subjectId,
      classId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let sessionQuery = supabase
        .from('AttendanceSession')
        .select('id')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (subjectId !== ALL_SUBJECTS) {
        sessionQuery = sessionQuery.eq('subjectId', subjectId);
      }
      if (classId !== ALL_CLASSES) {
        sessionQuery = sessionQuery.eq('classId', classId);
      }
      const { data: sessions, error: sessionError } = await sessionQuery;
      if (sessionError) {
        throw sessionError;
      }
      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return [];
      }

      const records = await fetchAttendanceRecordsForSessions(
        supabase,
        tenantId!,
        sessionIds,
      );

      const profileByStudent = new Map<
        string,
        { name: string; registrationNumber: string }
      >();
      for (const record of records) {
        if (profileByStudent.has(record.studentProfileId)) {
          continue;
        }
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(record.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        profileByStudent.set(record.studentProfileId, {
          name: user?.name ?? profile?.registrationNumber ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
        });
      }

      return summarizeStudentAttendance(records).map((summary) => {
        const profile = profileByStudent.get(summary.studentProfileId);
        return {
          ...summary,
          name: profile?.name ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
        };
      });
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [subjectId, classId, rows.length]);

  const columns = useMemo<ColumnDef<RateRow>[]>(
    () => [
      {
        id: 'student',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Student" visibility column={column} />
        ),
        cell: ({ row }) => (
          <>
            <span className="font-medium">{row.original.name}</span>
            <span className="text-muted-foreground text-xs block">
              {row.original.registrationNumber}
            </span>
          </>
        ),
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'sessions',
        header: ({ column }) => (
          <DataGridColumnHeader title="Sessions" visibility column={column} />
        ),
        size: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'present',
        header: ({ column }) => (
          <DataGridColumnHeader title="Present" visibility column={column} />
        ),
        size: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'absent',
        header: ({ column }) => (
          <DataGridColumnHeader title="Absent" visibility column={column} />
        ),
        size: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'late',
        header: ({ column }) => (
          <DataGridColumnHeader title="Late" visibility column={column} />
        ),
        size: 80,
        enableSorting: true,
      },
      {
        accessorKey: 'excused',
        header: ({ column }) => (
          <DataGridColumnHeader title="Excused" visibility column={column} />
        ),
        size: 100,
        enableSorting: true,
      },
      {
        id: 'rate',
        accessorFn: (row) => row.percentage,
        header: ({ column }) => (
          <DataGridColumnHeader title="Rate" visibility column={column} />
        ),
        cell: ({ row }) => formatAttendancePercentage(row.original.percentage),
        size: 100,
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.studentProfileId,
    state: { pagination, sorting, columnOrder },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <CurrentAcademicYearBadge label="Year" />
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px]">
            <p className="mb-1.5 text-sm font-medium">{t('students.class')}</p>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder={t('students.allClasses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLASSES}>{t('students.allClasses')}</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <p className="mb-1.5 text-sm font-medium">{t('students.subject')}</p>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SUBJECTS}>All subjects</SelectItem>
                {subjects.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <AttendanceDataGrid
        table={table}
        title={t('attendance.ratesTitle')}
        recordCount={rows.length}
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        emptyMessage={t('attendance.noRecordsInRange')}
      />
    </div>
  );
}
