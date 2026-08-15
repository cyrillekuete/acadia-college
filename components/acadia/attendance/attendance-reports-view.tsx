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
import { AttendanceDataGrid } from '@/components/acadia/attendance/attendance-data-grid';
import { useTranslation } from '@/hooks/useTranslation';
import {
  countAttendanceStatuses,
  formatAttendancePercentage,
  summarizeStudentAttendance,
  type AttendanceStatus,
  type StudentAttendanceSummary,
} from '@/lib/acadia/attendance';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import {
  useAcadiaCollegeSession,
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';

const ALL_SUBJECTS = '__all__';

type SummaryRow = StudentAttendanceSummary & {
  name: string;
  registrationNumber: string;
};

type SessionRow = {
  id: string;
  sessionDate: string;
  label: string;
  subjectCode: string;
};

const SUMMARY_COLUMN_ORDER = [
  'student',
  'sessions',
  'absent',
  'late',
  'rate',
];
const SESSION_COLUMN_ORDER = ['sessionDate', 'subject', 'label'];

export function AttendanceReportsView() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [subjectId, setSubjectId] = useState(ALL_SUBJECTS);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const { data: subjects = [] } = useSubjectOptions(activeYearId ?? '');
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

  const query = useQuery({
    queryKey: [
      'attendance-reports',
      tenantId,
      activeYearId,
      subjectId,
      fromDate,
      toDate,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let sessionQuery = supabase
        .from('AttendanceSession')
        .select('id, sessionDate, label, Subject!AttendanceSession_subjectId_tenantId_fkey ( code )')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .order('sessionDate', { ascending: false });

      if (subjectId !== ALL_SUBJECTS) {
        sessionQuery = sessionQuery.eq('subjectId', subjectId);
      }
      if (fromDate) {
        sessionQuery = sessionQuery.gte('sessionDate', fromDate);
      }
      if (toDate) {
        sessionQuery = sessionQuery.lte('sessionDate', toDate);
      }

      const { data: sessions, error: sessionError } = await sessionQuery;
      if (sessionError) {
        throw sessionError;
      }

      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return { sessions: [], summaries: [], totals: countAttendanceStatuses([]) };
      }

      const { data: records, error: recordsError } = await supabase
        .from('AttendanceRecord')
        .select(
          `
          studentProfileId,
          status,
          attendanceSessionId,
          StudentProfile!AttendanceRecord_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .in('attendanceSessionId', sessionIds);

      if (recordsError) {
        throw recordsError;
      }

      const statuses = (records ?? []).map(
        (r) => r.status as AttendanceStatus,
      );
      const summaries = summarizeStudentAttendance(
        (records ?? []).map((r) => ({
          studentProfileId: r.studentProfileId as string,
          status: r.status as AttendanceStatus,
        })),
      ).map((summary) => {
        const record = (records ?? []).find(
          (r) => r.studentProfileId === summary.studentProfileId,
        );
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(record?.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          ...summary,
          name: user?.name ?? profile?.registrationNumber ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
        };
      });

      return {
        sessions: (sessions ?? []).map((s) => {
          const subject = unwrapRelation<{ code?: string }>(s.Subject);
          return {
            id: s.id as string,
            sessionDate: s.sessionDate as string,
            label: (s.label as string) ?? '—',
            subjectCode: subject?.code ?? '—',
          };
        }),
        summaries,
        totals: countAttendanceStatuses(statuses),
      };
    },
    enabled:
      !!activeYearId &&
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
  }, [subjectId, fromDate, toDate, studentSearch, summaries.length, recentSessions.length]);

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
        size: 160,
        enableSorting: true,
      },
      {
        id: 'subject',
        accessorFn: (row) => row.subjectCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" visibility column={column} />
        ),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataGridColumnHeader title="Label" visibility column={column} />
        ),
        size: 200,
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

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <CurrentAcademicYearBadge label="Year" />
        <div className="flex flex-wrap items-end justify-end gap-4">
          <div className="min-w-[200px]">
            <p className="text-sm font-medium mb-1.5">Subject</p>
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
            <p className="text-sm font-medium mb-1.5">From</p>
            <DatePickerInput
              value={fromDate}
              onChange={setFromDate}
              placeholder="Pick a date"
            />
          </div>
          <div className="min-w-[180px]">
            <p className="text-sm font-medium mb-1.5">To</p>
            <DatePickerInput
              value={toDate}
              onChange={setToDate}
              placeholder="Pick a date"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
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
      </div>

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
        emptyMessage={
          studentSearch.trim()
            ? 'No students match your search.'
            : 'No records in range.'
        }
      />

      <AttendanceDataGrid
        table={sessionTable}
        title="Recent sessions"
        recordCount={recentSessions.length}
        isLoading={isLoading}
        isError={query.isError}
        error={query.error}
        emptyMessage="No sessions in range."
      />
    </div>
  );
}
