'use client';

import { useEffect, useMemo, useState } from 'react';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { AttendanceDataGrid } from '@/components/acadia/attendance/attendance-data-grid';
import {
  computeWeightedAttendancePercentage,
  detectAttendancePatterns,
  formatAttendancePercentage,
  normalizeReportDateRange,
  patternFlagLabel,
  summarizeStudentAttendance,
  type AttendancePatternInsight,
} from '@/lib/acadia/attendance';
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

type PatternRow = AttendancePatternInsight & {
  name: string;
  registrationNumber: string;
};

const DEFAULT_COLUMN_ORDER = ['student', 'rate', 'absent', 'late', 'flags'];

export function AttendanceAnalyticsPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [subjectId, setSubjectId] = useState(ALL_SUBJECTS);
  const [classId, setClassId] = useState(ALL_CLASSES);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { data: subjects = [] } = useSubjectOptions(activeYearId ?? '');
  const { data: classes = [] } = useClassesForFilters();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);

  const dateRange = normalizeReportDateRange(fromDate, toDate);
  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? t('attendance.invalidDateRange')
      : null;

  const query = useQuery({
    queryKey: [
      'attendance-analytics',
      tenantId,
      activeYearId,
      subjectId,
      classId,
      dateRange.fromDate,
      dateRange.toDate,
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
      if (dateRange.fromDate) {
        sessionQuery = sessionQuery.gte('sessionDate', dateRange.fromDate);
      }
      if (dateRange.toDate) {
        sessionQuery = sessionQuery.lte('sessionDate', dateRange.toDate);
      }
      const { data: sessions, error: sessionError } = await sessionQuery;
      if (sessionError) {
        throw sessionError;
      }
      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return {
          patterns: [] as PatternRow[],
          atRisk: 0,
          avgRate: null as number | null,
          sessionCount: 0,
          recordCount: 0,
        };
      }

      const records = await fetchAttendanceRecordsForSessions(
        supabase,
        tenantId!,
        sessionIds,
      );

      if (records.length === 0) {
        return {
          patterns: [] as PatternRow[],
          atRisk: 0,
          avgRate: null,
          sessionCount: sessionIds.length,
          recordCount: 0,
        };
      }

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

      const summaries = summarizeStudentAttendance(records);
      const patterns = detectAttendancePatterns(summaries).map((insight) => {
        const profile = profileByStudent.get(insight.studentProfileId);
        return {
          ...insight,
          name: profile?.name ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
        };
      });

      return {
        patterns,
        atRisk: patterns.length,
        avgRate: computeWeightedAttendancePercentage(records.map((r) => r.status)),
        sessionCount: sessionIds.length,
        recordCount: records.length,
      };
    },
    enabled:
      !!activeYearId &&
      !dateRangeError &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const patterns = useMemo(() => query.data?.patterns ?? [], [query.data?.patterns]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [subjectId, classId, fromDate, toDate, patterns.length]);

  const columns = useMemo<ColumnDef<PatternRow>[]>(
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
        id: 'rate',
        accessorFn: (row) => row.percentage,
        header: ({ column }) => (
          <DataGridColumnHeader title="Rate" visibility column={column} />
        ),
        cell: ({ row }) => formatAttendancePercentage(row.original.percentage),
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
        id: 'flags',
        accessorFn: (row) => row.flags.join(', '),
        header: ({ column }) => (
          <DataGridColumnHeader title="Flags" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.flags.map((flag) => (
              <Badge key={flag} variant="outline">
                {patternFlagLabel(flag)}
              </Badge>
            ))}
          </div>
        ),
        size: 240,
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: patterns,
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

  const emptyMessage = (() => {
    if ((query.data?.sessionCount ?? 0) === 0) {
      return t('attendance.noSessionsInRange');
    }
    if ((query.data?.recordCount ?? 0) === 0) {
      return t('attendance.sessionsWithoutMarks');
    }
    return t('attendance.noConcerningPatterns');
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <CurrentAcademicYearBadge label="Year" />
        <div className="flex flex-wrap items-end gap-4">
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
          <div className="min-w-[160px]">
            <p className="mb-1.5 text-sm font-medium">From</p>
            <DatePickerInput value={fromDate} onChange={setFromDate} />
          </div>
          <div className="min-w-[160px]">
            <p className="mb-1.5 text-sm font-medium">To</p>
            <DatePickerInput value={toDate} onChange={setToDate} />
          </div>
        </div>
      </div>

      {dateRangeError ? (
        <p className="text-sm text-destructive">{dateRangeError}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('attendance.overallAttendanceRate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {query.isLoading
              ? '—'
              : formatAttendancePercentage(query.data?.avgRate ?? null)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('attendance.studentsFlagged')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {query.isLoading ? '—' : (query.data?.atRisk ?? 0)}
          </CardContent>
        </Card>
      </div>

      <AttendanceDataGrid
        table={table}
        title={t('attendance.patternsTitle')}
        recordCount={patterns.length}
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
