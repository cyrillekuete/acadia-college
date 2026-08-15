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
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { AttendanceDataGrid } from '@/components/acadia/attendance/attendance-data-grid';
import {
  detectAttendancePatterns,
  formatAttendancePercentage,
  patternFlagLabel,
  summarizeStudentAttendance,
  type AttendancePatternInsight,
  type AttendanceStatus,
} from '@/lib/acadia/attendance';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import {
  useAcadiaCollegeSession,
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';

const ALL_SUBJECTS = '__all__';

type PatternRow = AttendancePatternInsight & {
  name: string;
  registrationNumber: string;
};

const DEFAULT_COLUMN_ORDER = ['student', 'rate', 'absent', 'late', 'flags'];

export function AttendanceAnalyticsPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [subjectId, setSubjectId] = useState(ALL_SUBJECTS);
  const { data: subjects = [] } = useSubjectOptions(activeYearId ?? '');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);

  const query = useQuery({
    queryKey: ['attendance-analytics', tenantId, activeYearId, subjectId],
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
      const { data: sessions, error: sessionError } = await sessionQuery;
      if (sessionError) {
        throw sessionError;
      }
      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return { patterns: [], atRisk: 0, avgRate: null };
      }

      const { data: records, error: recordsError } = await supabase
        .from('AttendanceRecord')
        .select(
          `
          studentProfileId,
          status,
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

      const summaries = summarizeStudentAttendance(
        (records ?? []).map((r) => ({
          studentProfileId: r.studentProfileId as string,
          status: r.status as AttendanceStatus,
        })),
      );

      const patterns = detectAttendancePatterns(summaries).map((insight) => {
        const record = (records ?? []).find(
          (r) => r.studentProfileId === insight.studentProfileId,
        );
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(record?.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          ...insight,
          name: user?.name ?? profile?.registrationNumber ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
        };
      });

      const rates = summaries
        .map((s) => s.percentage)
        .filter((p): p is number => p != null);
      const avgRate =
        rates.length > 0
          ? Math.round(
              (rates.reduce((a, b) => a + b, 0) / rates.length) * 10,
            ) / 10
          : null;

      return {
        patterns,
        atRisk: patterns.length,
        avgRate,
      };
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const patterns = useMemo(() => query.data?.patterns ?? [], [query.data?.patterns]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [subjectId, patterns.length]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <CurrentAcademicYearBadge label="Year" />
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">Subject (optional)</p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Class average attendance
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
              Students flagged
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {query.isLoading ? '—' : (query.data?.atRisk ?? 0)}
          </CardContent>
        </Card>
      </div>

      <AttendanceDataGrid
        table={table}
        title="Attendance patterns"
        recordCount={patterns.length}
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        emptyMessage="No concerning patterns detected for this scope."
      />
    </div>
  );
}
