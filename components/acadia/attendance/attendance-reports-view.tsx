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
import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from '@/lib/icons';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Input, InputWrapper } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AttendanceDataGrid } from '@/components/acadia/attendance/attendance-data-grid';
import { useTranslation } from '@/hooks/useTranslation';
import {
  ATTENDANCE_ROSTER_ENROLLMENT_STATUS,
  buildAttendanceSummaryCsv,
  chunkIds,
  computeWeightedAttendancePercentage,
  countAttendanceStatuses,
  formatAttendancePercentage,
  normalizeReportDateRange,
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

const ALL_SUBJECTS = '__all__';
const ALL_CLASSES = '__all__';

type SummaryRow = StudentAttendanceSummary & {
  name: string;
  registrationNumber: string;
};

type SessionRow = {
  id: string;
  sessionDate: string;
  label: string;
  subjectCode: string;
  className: string;
};

const SUMMARY_COLUMN_ORDER = [
  'student',
  'sessions',
  'absent',
  'late',
  'rate',
];
const SESSION_COLUMN_ORDER = ['sessionDate', 'class', 'subject', 'label'];

export function AttendanceReportsView() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [subjectId, setSubjectId] = useState(ALL_SUBJECTS);
  const [classId, setClassId] = useState(ALL_CLASSES);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [includeWithdrawn, setIncludeWithdrawn] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const { data: subjects = [] } = useSubjectOptions(activeYearId ?? '');
  const { data: classes = [] } = useClassesForFilters();
  const [summaryPagination, setSummaryPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [summarySorting, setSummarySorting] = useState<SortingState>([]);
  const [summaryColumnOrder, setSummaryColumnOrder] = useState(SUMMARY_COLUMN_ORDER);
  const [sessionPagination, setSessionPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sessionSorting, setSessionSorting] = useState<SortingState>([]);
  const [sessionColumnOrder, setSessionColumnOrder] = useState(SESSION_COLUMN_ORDER);

  const dateRange = normalizeReportDateRange(fromDate, toDate);
  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? t('attendance.invalidDateRange')
      : null;

  const query = useQuery({
    queryKey: [
      'attendance-reports',
      tenantId,
      activeYearId,
      subjectId,
      classId,
      dateRange.fromDate,
      dateRange.toDate,
      includeWithdrawn,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let sessionQuery = supabase
        .from('AttendanceSession')
        .select(
          `
          id,
          sessionDate,
          label,
          classId,
          Subject!AttendanceSession_subjectId_tenantId_fkey ( code ),
          Class!AttendanceSession_classId_tenantId_fkey ( name )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .order('sessionDate', { ascending: false });

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
          sessions: [],
          summaries: [],
          totals: countAttendanceStatuses([]),
          overallRate: null as number | null,
          sessionsWithoutMarks: 0,
        };
      }

      let records = await fetchAttendanceRecordsForSessions(
        supabase,
        tenantId!,
        sessionIds,
      );

      if (!includeWithdrawn) {
        const profileIds = Array.from(
          new Set(records.map((r) => r.studentProfileId)),
        );
        if (profileIds.length > 0) {
          const enrolled = new Set<string>();
          for (const chunk of chunkIds(profileIds)) {
            const { data: enrollments, error: enrollError } = await supabase
              .from('StudentEnrollment')
              .select('studentProfileId')
              .eq('tenantId', tenantId!)
              .eq('academicYearId', activeYearId!)
              .eq('status', ATTENDANCE_ROSTER_ENROLLMENT_STATUS)
              .in('studentProfileId', chunk);
            if (enrollError) {
              throw enrollError;
            }
            for (const row of enrollments ?? []) {
              enrolled.add(row.studentProfileId as string);
            }
          }
          records = records.filter((r) => enrolled.has(r.studentProfileId));
        }
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

      const statuses = records.map((r) => r.status);
      const summaries = summarizeStudentAttendance(records).map((summary) => {
        const profile = profileByStudent.get(summary.studentProfileId);
        return {
          ...summary,
          name: profile?.name ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
        };
      });

      const sessionsWithMarks = new Set(
        records
          .map((r) => r.attendanceSessionId)
          .filter((id): id is string => !!id),
      );

      return {
        sessions: (sessions ?? []).map((s) => {
          const subject = unwrapRelation<{ code?: string }>(s.Subject);
          const classRow = unwrapRelation<{ name?: string }>(s.Class);
          return {
            id: s.id as string,
            sessionDate: s.sessionDate as string,
            label: (s.label as string) ?? '—',
            subjectCode: subject?.code ?? '—',
            className: classRow?.name ?? '—',
          };
        }),
        summaries,
        totals: countAttendanceStatuses(statuses),
        overallRate: computeWeightedAttendancePercentage(statuses),
        sessionsWithoutMarks: sessionIds.filter((id) => !sessionsWithMarks.has(id))
          .length,
      };
    },
    enabled:
      !!activeYearId &&
      !dateRangeError &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const data = query.data;
  const summaries = useMemo(() => {
    const rows = data?.summaries ?? [];
    const q = studentSearch.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter((row) => {
      const haystack = [row.name, row.registrationNumber]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data?.summaries, studentSearch]);
  const recentSessions = useMemo(
    () => (data?.sessions ?? []).slice(0, 20),
    [data?.sessions],
  );
  const isLoading = query.isLoading || query.isFetching;
  const totals = data?.totals;

  useEffect(() => {
    setSummaryPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSessionPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    subjectId,
    classId,
    fromDate,
    toDate,
    includeWithdrawn,
    studentSearch,
    summaries.length,
    recentSessions.length,
  ]);

  const summaryColumns = useMemo<ColumnDef<SummaryRow>[]>(
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
        id: 'rate',
        accessorFn: (row) => row.percentage,
        header: ({ column }) => (
          <DataGridColumnHeader title="Attendance rate" visibility column={column} />
        ),
        cell: ({ row }) => formatAttendancePercentage(row.original.percentage),
        size: 140,
        enableSorting: true,
      },
    ],
    [],
  );

  const sessionColumns = useMemo<ColumnDef<SessionRow>[]>(
    () => [
      {
        accessorKey: 'sessionDate',
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" visibility column={column} />
        ),
        size: 140,
        enableSorting: true,
      },
      {
        id: 'class',
        accessorFn: (row) => row.className,
        header: ({ column }) => (
          <DataGridColumnHeader title="Class" visibility column={column} />
        ),
        size: 140,
        enableSorting: true,
      },
      {
        id: 'subject',
        accessorFn: (row) => row.subjectCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" visibility column={column} />
        ),
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataGridColumnHeader title="Label" visibility column={column} />
        ),
        size: 180,
        enableSorting: true,
      },
    ],
    [],
  );

  const summaryTable = useReactTable({
    data: summaries,
    columns: summaryColumns,
    getRowId: (row) => row.studentProfileId,
    state: {
      pagination: summaryPagination,
      sorting: summarySorting,
      columnOrder: summaryColumnOrder,
    },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setSummaryColumnOrder,
    onPaginationChange: setSummaryPagination,
    onSortingChange: setSummarySorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const sessionTable = useReactTable({
    data: recentSessions,
    columns: sessionColumns,
    getRowId: (row) => row.id,
    state: {
      pagination: sessionPagination,
      sorting: sessionSorting,
      columnOrder: sessionColumnOrder,
    },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setSessionColumnOrder,
    onPaginationChange: setSessionPagination,
    onSortingChange: setSessionSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExportCsv = () => {
    const csv = buildAttendanceSummaryCsv(summaries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `attendance-report-${activeYearId ?? 'year'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const emptySummaryMessage = (() => {
    if (studentSearch.trim()) {
      return t('attendance.noSearchMatches');
    }
    if ((data?.sessions.length ?? 0) > 0 && summaries.length === 0) {
      return t('attendance.sessionsWithoutMarks');
    }
    return t('attendance.noRecordsInRange');
  })();

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <CurrentAcademicYearBadge label="Year" />
        <div className="flex flex-wrap items-end justify-end gap-4">
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
          <div className="min-w-[180px]">
            <p className="mb-1.5 text-sm font-medium">From</p>
            <DatePickerInput
              value={fromDate}
              onChange={setFromDate}
              placeholder="Pick a date"
            />
          </div>
          <div className="min-w-[180px]">
            <p className="mb-1.5 text-sm font-medium">To</p>
            <DatePickerInput
              value={toDate}
              onChange={setToDate}
              placeholder="Pick a date"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Checkbox
              checked={includeWithdrawn}
              onCheckedChange={(checked) => setIncludeWithdrawn(checked === true)}
            />
            {t('attendance.includeWithdrawn')}
          </label>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            {t('attendance.exportCsv')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            {t('common.buttons.print')}
          </Button>
        </div>
      </div>

      {dateRangeError ? (
        <p className="text-sm text-destructive print:hidden">{dateRangeError}</p>
      ) : null}
      {dateRange.inverted && !dateRangeError ? (
        <p className="text-sm text-muted-foreground print:hidden">
          {t('attendance.dateRangeSwapped')}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-5">
        <AdminOverviewStatCard
          title="Sessions"
          value={
            isLoading || !data
              ? '—'
              : formatDashboardStatValue(data.sessions.length)
          }
          footer={isLoading ? 'Loading…' : 'In selected range'}
          icon="calendar-tick"
        />
        <AdminOverviewStatCard
          title="Present"
          value={
            isLoading || !totals ? '—' : formatDashboardStatValue(totals.present)
          }
          footer={isLoading ? 'Loading…' : 'Marked present'}
          footerTone="positive"
          icon="check"
        />
        <AdminOverviewStatCard
          title="Absent"
          value={
            isLoading || !totals ? '—' : formatDashboardStatValue(totals.absent)
          }
          footer={isLoading ? 'Loading…' : 'Marked absent'}
          icon="cross"
        />
        <AdminOverviewStatCard
          title="Late"
          value={
            isLoading || !totals ? '—' : formatDashboardStatValue(totals.late)
          }
          footer={isLoading ? 'Loading…' : 'Arrived late'}
          icon="notification"
        />
        <AdminOverviewStatCard
          title={t('attendance.excused')}
          value={
            isLoading || !totals ? '—' : formatDashboardStatValue(totals.excused)
          }
          footer={
            isLoading
              ? 'Loading…'
              : formatAttendancePercentage(data?.overallRate ?? null)
          }
          icon="check"
        />
      </div>

      {(data?.sessionsWithoutMarks ?? 0) > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('attendance.sessionsWithoutMarksCount', {
            count: data?.sessionsWithoutMarks ?? 0,
          })}
        </p>
      ) : null}

      <AttendanceDataGrid
        table={summaryTable}
        title="Student summaries"
        headerExtra={
          <InputWrapper className="w-full max-w-xs">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder={t('attendance.searchStudents')}
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </InputWrapper>
        }
        recordCount={summaries.length}
        isLoading={isLoading}
        isError={query.isError}
        error={query.error}
        emptyMessage={emptySummaryMessage}
      />

      <AttendanceDataGrid
        table={sessionTable}
        title={t('attendance.recentSessions')}
        recordCount={recentSessions.length}
        isLoading={isLoading}
        isError={query.isError}
        error={query.error}
        emptyMessage={t('attendance.noSessionsInRange')}
      />
    </div>
  );
}
