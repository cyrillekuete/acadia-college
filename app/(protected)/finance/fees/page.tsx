'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CreateFeeAccountFormDialog } from '@/components/acadia/finance/create-fee-account-form-dialog';
import { FeeOutstandingPanel } from '@/components/acadia/finance/fee-outstanding-panel';
import { FeePlansPanel } from '@/components/acadia/finance/fee-plans-panel';
import { FeeStatusBadge } from '@/components/acadia/finance/fee-status-badge';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTable, CardFooter } from '@/components/ui/card';
import {
  feeAccountCollectionStatus,
  formatMoneyMinor,
  paymentProgressPercent,
  totalsFromFeeAccountRecord,
} from '@/lib/acadia/finance';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';
import {
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation, streamLabel } from '@/lib/acadia/record-display';
import { Input, InputWrapper } from '@/components/ui/input';
import { Search, LoaderCircleIcon } from '@/lib/icons';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { countMissingFeeAccounts } from '@/lib/acadia/fee-account-provision';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';

type FeeAccountRow = {
  id: string;
  feeCurrency: string;
  totalDueMinor: number;
  totalPaidMinor: number;
  balanceMinor: number;
  progress: number | null;
  paymentStatus: string;
  subSystem: string;
  branch: string;
  StudentProfile?: unknown;
  AcademicYear?: unknown;
};

function studentRegistration(row: FeeAccountRow): string {
  const profile = unwrapRelation<{ registrationNumber?: string }>(row.StudentProfile);
  return profile?.registrationNumber?.trim() || '—';
}

function academicYearLabel(row: FeeAccountRow): string {
  const year = unwrapRelation<{ label?: string }>(row.AcademicYear);
  return year?.label?.trim() || '—';
}

function FeeAccountsTable() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'id',
    'student',
    'year',
    'stream',
    'due',
    'paid',
    'balance',
    'status',
  ]);

  const query = useQuery({
    queryKey: ['fee-accounts', tenantId, activeYearId],
    queryFn: async () => {
      if (!activeYearId) {
        return [];
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          feeCurrency,
          totalAmountMinor,
          creditMinor,
          withdrawnAt,
          subSystem,
          branch,
          StudentProfile!StudentFeeAccount_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          ),
          AcademicYear!StudentFeeAccount_academicYearId_tenantId_fkey ( label ),
          StudentFeeInstallment ( amountMinor, status, paidAmountMinor, dueOn ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId)
        .order('createdAt', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []).map((account) => {
        const installments = (account.StudentFeeInstallment ?? []) as Array<{
          amountMinor: number;
          status: string;
          paidAmountMinor: number | null;
          dueOn: string;
        }>;
        const totals = totalsFromFeeAccountRecord({
          totalAmountMinor: Number(account.totalAmountMinor),
          creditMinor: account.creditMinor,
          StudentFeeInstallment: installments,
          StudentScholarship: account.StudentScholarship,
        });
        const collection = feeAccountCollectionStatus(totals, installments);
        return {
          id: account.id as string,
          feeCurrency: String(account.feeCurrency ?? 'XAF'),
          totalDueMinor: totals.totalDueMinor,
          totalPaidMinor: totals.totalPaidMinor,
          balanceMinor: totals.balanceMinor,
          progress: paymentProgressPercent(totals),
          paymentStatus:
            collection === 'overdue'
              ? 'OVERDUE'
              : collection === 'paid'
                ? 'PAID'
                : 'PENDING',
          subSystem: String(account.subSystem ?? 'ENGLISH'),
          branch: String(account.branch ?? 'GRAMMAR'),
          StudentProfile: account.StudentProfile,
          AcademicYear: account.AcademicYear,
        } satisfies FeeAccountRow;
      });
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const filtered = useMemo(() => {
    const rows = query.data ?? [];
    if (!search.trim()) {
      return rows;
    }
    const q = search.toLowerCase();
    return rows.filter((row) => {
      const profile = unwrapRelation<{ registrationNumber?: string; User?: unknown }>(
        row.StudentProfile,
      );
      const user = unwrapRelation<{ name?: string }>(profile?.User);
      return (
        row.id.toLowerCase().includes(q) ||
        (profile?.registrationNumber ?? '').toLowerCase().includes(q) ||
        (user?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [query.data, search]);

  const columns = useMemo<ColumnDef<FeeAccountRow>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => (
          <DataGridColumnHeader title="Account" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Link
            href={`/finance/fees/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.id.slice(-8).toUpperCase()}
          </Link>
        ),
        size: 130,
        enableSorting: true,
      },
      {
        id: 'student',
        accessorFn: (row) => studentRegistration(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Student ID" visibility column={column} />
        ),
        cell: ({ row }) => studentRegistration(row.original),
        size: 150,
        enableSorting: true,
      },
      {
        id: 'year',
        accessorFn: (row) => academicYearLabel(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Year" visibility column={column} />
        ),
        cell: ({ row }) => academicYearLabel(row.original),
        size: 140,
        enableSorting: true,
      },
      {
        id: 'stream',
        accessorFn: (row) => streamLabel(row.subSystem, row.branch),
        header: ({ column }) => (
          <DataGridColumnHeader title="Sub-system / branch" visibility column={column} />
        ),
        cell: ({ row }) => streamLabel(row.original.subSystem, row.original.branch),
        size: 180,
        enableSorting: true,
      },
      {
        id: 'due',
        accessorFn: (row) => row.totalDueMinor,
        header: ({ column }) => (
          <DataGridColumnHeader title="Due" visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.totalDueMinor, row.original.feeCurrency),
        size: 120,
        enableSorting: true,
      },
      {
        id: 'paid',
        accessorFn: (row) => row.totalPaidMinor,
        header: ({ column }) => (
          <DataGridColumnHeader title="Paid" visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.totalPaidMinor, row.original.feeCurrency),
        size: 120,
        enableSorting: true,
      },
      {
        id: 'balance',
        accessorFn: (row) => row.balanceMinor,
        header: ({ column }) => (
          <DataGridColumnHeader title="Balance" visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.balanceMinor, row.original.feeCurrency),
        size: 120,
        enableSorting: true,
      },
      {
        id: 'status',
        accessorFn: (row) =>
          row.balanceMinor <= 0 ? 'PAID' : row.paymentStatus,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => (
          <FeeStatusBadge
            status={
              row.original.balanceMinor <= 0
                ? 'PAID'
                : row.original.paymentStatus
            }
          />
        ),
        size: 120,
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
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

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, filtered.length]);

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-4">
        <InputWrapper className="w-full max-w-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search student or account…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputWrapper>
      </CardHeader>
      <DataGrid
        table={table}
        recordCount={filtered.length}
        isLoading={query.isLoading}
        tableLayout={{
          width: 'fixed',
          columnsResizable: true,
          columnsPinnable: true,
          columnsMovable: true,
          columnsVisibility: true,
        }}
        tableClassNames={{
          edgeCell: 'px-5',
        }}
      >
        <CardTable>
          {query.isLoading ? (
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
      </DataGrid>
    </Card>
  );
}

export default function StudentFeesPage() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const { generateMissingFeeAccounts } = useFinanceMutations();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState('accounts');

  const missingQuery = useQuery({
    queryKey: ['missing-fee-accounts', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return countMissingFeeAccounts(supabase, {
        academicYearId: activeYearId!,
      });
    },
    enabled:
      !!canManage &&
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const missingCount = missingQuery.data ?? 0;
  const generating = generateMissingFeeAccounts.isPending;

  return (
    <AcadiaPageShell
      title={t('finance.feesTitle')}
      description={t('finance.feesDescription')}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        {canManage ? (
          <>
            <Button size="sm" onClick={() => setTab('plans')}>
              {t('finance.setupDescription')}
            </Button>
            <Button
              size="sm"
              variant={missingCount > 0 ? 'primary' : 'outline'}
              disabled={!activeYearId || generating || missingQuery.isLoading}
              onClick={() => {
                if (!activeYearId) {
                  return;
                }
                generateMissingFeeAccounts.mutate(activeYearId);
              }}
            >
              {generating ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              {t('finance.generateMissingAccounts')}
              {missingCount > 0 ? ` (${missingCount})` : ''}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSheetOpen(true)}>
              {t('finance.newAccount')}
            </Button>
          </>
        ) : null}
        {canManage ? (
          <Button size="sm" variant="outline" asChild>
            <Link href="/finance/reports">{t('finance.reportsTitle')}</Link>
          </Button>
        ) : null}
      </div>

      {canManage && missingCount > 0 ? (
        <p className="mb-4 text-sm text-muted-foreground print:hidden">
          {t('finance.missingFeeAccountsHint', { count: missingCount })}
        </p>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="print:hidden">
        <TabsList className="w-fit">
          <TabsTrigger value="accounts">All accounts</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="plans">{t('finance.setupTitle')}</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-4">
          <FeeAccountsTable />
        </TabsContent>
        <TabsContent value="outstanding" className="mt-4">
          <FeeOutstandingPanel />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <FeePlansPanel />
        </TabsContent>
      </Tabs>

      {canManage ? (
        <CreateFeeAccountFormDialog
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      ) : null}
    </AcadiaPageShell>
  );
}
