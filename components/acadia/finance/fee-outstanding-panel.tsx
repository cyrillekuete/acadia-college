'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import {
  computeFeeAccountTotals,
  formatMoneyMinor,
  isInstallmentOverdue,
} from '@/lib/acadia/finance';
import { FeeStatusBadge } from '@/components/acadia/finance/fee-status-badge';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';

type OutstandingRow = {
  accountId: string;
  studentName: string;
  registrationNumber: string;
  balanceMinor: number;
  currency: string;
  overdueCount: number;
  nextDueOn: string | null;
};

export function FeeOutstandingPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const query = useQuery({
    queryKey: ['fee-outstanding', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data: accounts, error } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          feeCurrency,
          totalAmountMinor,
          StudentProfile!StudentFeeAccount_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          ),
          StudentFeeInstallment (
            amountMinor,
            status,
            dueOn,
            paidAmountMinor
          ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (error) {
        throw error;
      }

      const rows: OutstandingRow[] = [];
      for (const account of accounts ?? []) {
        const installments = (account.StudentFeeInstallment ?? []) as Array<{
          amountMinor: number;
          status: string;
          dueOn: string;
          paidAmountMinor: number | null;
        }>;
        const scholarships = (account.StudentScholarship ?? []) as Array<{
          discountMinor: number;
        }>;
        const scholarshipMinor = scholarships.reduce(
          (s, x) => s + Number(x.discountMinor ?? 0),
          0,
        );
        const totals = computeFeeAccountTotals({
          totalAmountMinor: Number(account.totalAmountMinor),
          scholarshipMinor,
          installments,
        });
        if (totals.balanceMinor <= 0) {
          continue;
        }
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(account.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        const overdueCount = installments.filter((i) =>
          isInstallmentOverdue(i.status, i.dueOn),
        ).length;
        const pendingDue = installments
          .filter((i) => i.status !== 'PAID' && i.status !== 'WAIVED')
          .map((i) => i.dueOn)
          .sort();
        rows.push({
          accountId: account.id as string,
          studentName: user?.name ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
          balanceMinor: totals.balanceMinor,
          currency: String(account.feeCurrency ?? 'XAF'),
          overdueCount,
          nextDueOn: pendingDue[0] ?? null,
        });
      }
      rows.sort((a, b) => b.balanceMinor - a.balanceMinor);
      return rows;
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const totalOutstanding = useMemo(
    () => (query.data ?? []).reduce((s, r) => s + r.balanceMinor, 0),
    [query.data],
  );

  const hasRows = (query.data?.length ?? 0) > 0;
  const showTable = Boolean(activeYearId) && (query.isLoading || hasRows);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <CurrentAcademicYearBadge label="Year" />
        {activeYearId ? (
          <p className="text-sm text-muted-foreground pb-2">
            Outstanding: {formatMoneyMinor(totalOutstanding)}
          </p>
        ) : null}
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : null}

      {activeYearId && !query.isLoading && !hasRows ? (
        <p className="text-sm text-muted-foreground">No outstanding balances.</p>
      ) : null}

      {showTable ? (
        <OutstandingBalancesTable
          data={query.data ?? []}
          isLoading={query.isLoading}
        />
      ) : null}
    </div>
  );
}

function OutstandingBalancesTable({
  data,
  isLoading,
}: {
  data: OutstandingRow[];
  isLoading: boolean;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'studentName',
    'registrationNumber',
    'balanceMinor',
    'nextDueOn',
    'status',
  ]);

  const columns = useMemo<ColumnDef<OutstandingRow>[]>(
    () => [
      {
        accessorKey: 'studentName',
        header: ({ column }) => (
          <DataGridColumnHeader title="Student" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Link
            href={`/finance/fees/${row.original.accountId}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.studentName}
          </Link>
        ),
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'registrationNumber',
        header: ({ column }) => (
          <DataGridColumnHeader title="Reg. #" visibility column={column} />
        ),
        cell: ({ row }) => row.original.registrationNumber,
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'balanceMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title="Balance" visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.balanceMinor, row.original.currency),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'nextDueOn',
        header: ({ column }) => (
          <DataGridColumnHeader title="Next due" visibility column={column} />
        ),
        cell: ({ row }) => row.original.nextDueOn ?? '—',
        size: 140,
        enableSorting: true,
      },
      {
        id: 'status',
        accessorFn: (row) => (row.overdueCount > 0 ? 'OVERDUE' : 'PENDING'),
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.overdueCount > 0 ? (
            <FeeStatusBadge status="OVERDUE" />
          ) : (
            <FeeStatusBadge status="PENDING" />
          ),
        size: 120,
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination, columnOrder },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      isLoading={isLoading}
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardTable>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
