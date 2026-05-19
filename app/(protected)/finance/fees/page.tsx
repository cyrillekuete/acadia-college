'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FeeOutstandingPanel } from '@/components/acadia/finance/fee-outstanding-panel';
import { FeeStatusBadge } from '@/components/acadia/finance/fee-status-badge';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTable, CardFooter } from '@/components/ui/card';
import {
  computeFeeAccountTotals,
  formatMoneyMinor,
  paymentProgressPercent,
} from '@/lib/acadia/finance';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance } from '@/lib/acadia/roles';
import {
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from '@/lib/icons';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

type FeeAccountRow = {
  id: string;
  feeCurrency: string;
  totalDueMinor: number;
  totalPaidMinor: number;
  balanceMinor: number;
  progress: number | null;
  paymentStatus: string;
  StudentProfile?: unknown;
  AcademicYear?: unknown;
  Specialty?: unknown;
};

const columns: ColumnDef<FeeAccountRow>[] = [
  {
    accessorKey: 'id',
    header: 'Account',
    cell: ({ row }) => (
      <Link
        href={`/finance/fees/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.id.slice(-8).toUpperCase()}
      </Link>
    ),
  },
  nestedFieldColumn<FeeAccountRow>('student', 'Student', 'StudentProfile', 'registrationNumber'),
  nestedFieldColumn<FeeAccountRow>('year', 'Year', 'AcademicYear', 'label'),
  nestedFieldColumn<FeeAccountRow>('specialty', 'Specialty', 'Specialty', 'code'),
  {
    id: 'due',
    header: 'Due',
    cell: ({ row }) =>
      formatMoneyMinor(row.original.totalDueMinor, row.original.feeCurrency),
  },
  {
    id: 'paid',
    header: 'Paid',
    cell: ({ row }) =>
      formatMoneyMinor(row.original.totalPaidMinor, row.original.feeCurrency),
  },
  {
    id: 'balance',
    header: 'Balance',
    cell: ({ row }) =>
      formatMoneyMinor(row.original.balanceMinor, row.original.feeCurrency),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <FeeStatusBadge
        status={
          row.original.balanceMinor <= 0
            ? 'PAID'
            : row.original.paymentStatus
        }
      />
    ),
  },
];

function FeeAccountsTable() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['fee-accounts', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          feeCurrency,
          totalAmountMinor,
          StudentProfile:studentProfileId (
            registrationNumber,
            User:userId ( name )
          ),
          AcademicYear:academicYearId ( label ),
          Specialty:specialtyId ( code ),
          StudentFeeInstallment ( amountMinor, status, paidAmountMinor, dueOn ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId!)
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
        const hasOverdue = installments.some(
          (i) => i.status === 'OVERDUE' || (i.status === 'PENDING' && i.dueOn < new Date().toISOString().slice(0, 10)),
        );
        return {
          id: account.id as string,
          feeCurrency: String(account.feeCurrency ?? 'XAF'),
          totalDueMinor: totals.totalDueMinor,
          totalPaidMinor: totals.totalPaidMinor,
          balanceMinor: totals.balanceMinor,
          progress: paymentProgressPercent(totals),
          paymentStatus: hasOverdue ? 'OVERDUE' : totals.balanceMinor > 0 ? 'PENDING' : 'PAID',
          StudentProfile: account.StudentProfile,
          AcademicYear: account.AcademicYear,
          Specialty: account.Specialty,
        } satisfies FeeAccountRow;
      });
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
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

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search student or account…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <DataGrid
        table={table}
        recordCount={filtered.length}
        isLoading={query.isLoading}
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
        <CardFooter className="justify-end">
          <DataGridPagination />
        </CardFooter>
      </DataGrid>
    </Card>
  );
}

export default function StudentFeesPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteFinance(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Student fees"
      description="Fee accounts, payment tracking, and outstanding balances."
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {canManage ? (
          <>
            <Button size="sm" asChild>
              <Link href="/finance/fees/setup">Fee plan setup</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/finance/fees/new">New fee account</Link>
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/reports">Financial reports</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/ledger">Ledger</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/budget">Budget</Link>
        </Button>
      </div>

      <Tabs defaultValue="accounts" className="print:hidden">
        <TabsList>
          <TabsTrigger value="accounts">All accounts</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-4">
          <FeeAccountsTable />
        </TabsContent>
        <TabsContent value="outstanding" className="mt-4">
          <FeeOutstandingPanel />
        </TabsContent>
      </Tabs>
    </AcadiaPageShell>
  );
}
