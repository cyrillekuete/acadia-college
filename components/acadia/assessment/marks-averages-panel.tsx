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
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { MarksDataGrid } from '@/components/acadia/assessment/marks-data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  computeStudentSubjectAverages,
  formatMarkScore,
  isPassingScore,
  rankStudents,
  type StudentAverage,
} from '@/lib/acadia/assessment';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';

type AverageRow = StudentAverage & {
  name: string;
  registrationNumber: string;
  passing: boolean;
};

const DEFAULT_COLUMN_ORDER = ['rank', 'student', 'average', 'status'];

export function MarksAveragesPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [sequenceId, setSequenceId] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);

  const { data: sequences = [] } = useSequenceOptions(activeYearId ?? '');

  const query = useQuery({
    queryKey: ['marks-averages', tenantId, activeYearId, sequenceId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let examQuery = supabase
        .from('ExamSession')
        .select('id, sequenceId, termId')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (sequenceId) {
        examQuery = examQuery.eq('sequenceId', sequenceId);
      }
      const { data: sessions, error: sessionError } = await examQuery;
      if (sessionError) {
        throw sessionError;
      }
      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return [];
      }
      const sessionMeta = new Map(
        (sessions ?? []).map((s) => [
          s.id as string,
          {
            sequenceId: (s.sequenceId as string | null) ?? null,
            termId: (s.termId as string | null) ?? null,
          },
        ]),
      );

      const { data: marks, error: marksError } = await supabase
        .from('SubjectMark')
        .select(
          `
          studentProfileId,
          subjectId,
          subjectSubBranchId,
          totalScore,
          examSessionId,
          StudentProfile!SubjectMark_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          ),
          Subject!SubjectMark_subjectId_tenantId_fkey ( coefficient ),
          SubjectSubBranch!SubjectMark_subjectSubBranchId_tenantId_fkey ( coefficient )
        `,
        )
        .eq('tenantId', tenantId!)
        .in('examSessionId', sessionIds);

      if (marksError) {
        throw marksError;
      }

      const averages = computeStudentSubjectAverages(
        (marks ?? []).map((m) => {
          const subject = unwrapRelation<{ coefficient?: number | null }>(m.Subject);
          const subBranch = unwrapRelation<{ coefficient?: number | null }>(
            m.SubjectSubBranch,
          );
          const meta = sessionMeta.get(m.examSessionId as string);
          return {
            studentProfileId: m.studentProfileId as string,
            subjectId: m.subjectId as string,
            totalScore: m.totalScore != null ? Number(m.totalScore) : null,
            sequenceId: meta?.sequenceId ?? null,
            termId: meta?.termId ?? null,
            subjectSubBranchId: (m.subjectSubBranchId as string | null) ?? null,
            subjectCoefficient:
              subject?.coefficient != null ? Number(subject.coefficient) : 1,
            subBranchCoefficient:
              subBranch?.coefficient != null ? Number(subBranch.coefficient) : null,
          };
        }),
      );

      const ranked = rankStudents(
        Array.from(averages.entries()).map(([studentProfileId, average]) => ({
          studentProfileId,
          average,
        })),
      );

      const profileById = new Map(
        (marks ?? []).map((m) => [m.studentProfileId as string, m.StudentProfile]),
      );

      return ranked.map((row) => {
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(profileById.get(row.studentProfileId));
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          ...row,
          name: user?.name ?? profile?.registrationNumber ?? row.studentProfileId,
          registrationNumber: profile?.registrationNumber ?? '—',
          passing: isPassingScore(row.average),
        };
      });
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!activeYearId,
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [sequenceId, rows.length]);

  const columns = useMemo<ColumnDef<AverageRow>[]>(
    () => [
      {
        accessorKey: 'rank',
        header: ({ column }) => (
          <DataGridColumnHeader title="Rank" visibility column={column} />
        ),
        size: 80,
        enableSorting: true,
      },
      {
        id: 'student',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Student" visibility column={column} />
        ),
        cell: ({ row }) => (
          <>
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground block">
              {row.original.registrationNumber}
            </span>
          </>
        ),
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'average',
        header: ({ column }) => (
          <DataGridColumnHeader title="Average" visibility column={column} />
        ),
        cell: ({ row }) => formatMarkScore(row.original.average),
        size: 100,
        enableSorting: true,
      },
      {
        id: 'status',
        accessorFn: (row) => (row.passing ? 'Pass' : 'Below 10'),
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => (row.original.passing ? 'Pass' : 'Below 10'),
        size: 120,
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
      <div className="flex flex-wrap gap-4">
        <CurrentAcademicYearBadge label="Year" />
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">Sequence (optional)</p>
          <Select
            value={sequenceId || '__all__'}
            onValueChange={(v) => setSequenceId(v === '__all__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All sequences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All sequences in year</SelectItem>
              {sequences.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {sequenceOptionLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MarksDataGrid
        table={table}
        recordCount={rows.length}
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        emptyMessage="No marks for this scope yet."
      />
    </div>
  );
}
