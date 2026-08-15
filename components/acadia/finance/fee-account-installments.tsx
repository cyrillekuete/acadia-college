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
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import {
  computeFeeAccountTotals,
  formatMoneyMinor,
  paymentProgressPercent,
} from '@/lib/acadia/finance';
import { FeeStatusBadge } from '@/components/acadia/finance/fee-status-badge';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canWriteFinance } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

type InstallmentRow = {
  id: string;
  installmentNumber: number;
  labelEn: string;
  amountMinor: number;
  dueOn: string;
  status: string;
  paidAmountMinor: number | null;
  paidAt: string | null;
};

export function FeeAccountInstallments({
  accountId,
  readOnly = false,
}: {
  accountId: string;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug) && !readOnly;
  const { recordFeePayment } = useFinanceMutations();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const query = useQuery({
    queryKey: ['fee-account-installments', tenantId, accountId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data: account, error: accountError } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          feeCurrency,
          totalAmountMinor,
          StudentFeeInstallment (
            id,
            installmentNumber,
            labelEn,
            amountMinor,
            dueOn,
            status,
            paidAmountMinor,
            paidAt
          ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('id', accountId)
        .maybeSingle();
      if (accountError) {
        throw accountError;
      }
      if (!account) {
        throw new Error('Fee account not found');
      }
      const installments = (account.StudentFeeInstallment ?? []) as InstallmentRow[];
      installments.sort((a, b) => a.installmentNumber - b.installmentNumber);
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
      return {
        currency: String(account.feeCurrency ?? 'XAF'),
        installments,
        totals,
        progress: paymentProgressPercent(totals),
      };
    },
    enabled:
      !!accountId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const handleRecordPayment = async (
    installmentId: string,
    amountMinor: number,
  ) => {
    setPayingId(installmentId);
    try {
      await recordFeePayment.mutateAsync({
        installmentId,
        amountMinor,
        paidAmountMinor: amountMinor,
        notes,
      });
      setNotes('');
    } finally {
      setPayingId(null);
    }
  };

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(query.error)}
      </p>
    );
  }

  const currency = query.data?.currency ?? 'XAF';
  const totals = query.data?.totals;
  const progress = query.data?.progress ?? null;

  return (
    <div className="space-y-4">
      {query.data && totals ? (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>
              {t('finance.due')}: {formatMoneyMinor(totals.totalDueMinor, currency)}
            </span>
            <span>
              {t('finance.paid')}: {formatMoneyMinor(totals.totalPaidMinor, currency)}
            </span>
            <span className="font-medium">
              {t('finance.balance')}: {formatMoneyMinor(totals.balanceMinor, currency)}
            </span>
          </div>
          {progress !== null ? (
            <Progress value={progress} className="h-2" />
          ) : null}
          <div className="flex gap-2 print:hidden">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/finance/fees/${accountId}/invoice`}>
                {t('finance.viewInvoice')}
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      <InstallmentsTable
        data={query.data?.installments ?? []}
        currency={currency}
        isLoading={query.isLoading}
        canManage={canManage}
        payingId={payingId}
        isPaymentPending={recordFeePayment.isPending}
        onRecordPayment={handleRecordPayment}
      />

      {canManage && query.data ? (
        <div className="max-w-md print:hidden">
          <label className="text-sm font-medium">{t('finance.paymentNotes')}</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('finance.paymentNotesPlaceholder')}
            className="mt-1"
          />
        </div>
      ) : null}
    </div>
  );
}

function InstallmentsTable({
  data,
  currency,
  isLoading,
  canManage,
  payingId,
  isPaymentPending,
  onRecordPayment,
}: {
  data: InstallmentRow[];
  currency: string;
  isLoading: boolean;
  canManage: boolean;
  payingId: string | null;
  isPaymentPending: boolean;
  onRecordPayment: (installmentId: string, amountMinor: number) => void;
}) {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'installmentNumber',
    'labelEn',
    'dueOn',
    'amountMinor',
    'status',
    'actions',
  ]);

  const columns = useMemo<ColumnDef<InstallmentRow>[]>(() => {
    const base: ColumnDef<InstallmentRow>[] = [
      {
        accessorKey: 'installmentNumber',
        header: ({ column }) => (
          <DataGridColumnHeader title="#" visibility column={column} />
        ),
        cell: ({ row }) => row.original.installmentNumber,
        size: 70,
        enableSorting: true,
      },
      {
        accessorKey: 'labelEn',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.installment')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => row.original.labelEn,
        size: 200,
        enableSorting: true,
      },
      {
        accessorKey: 'dueOn',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.due')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => row.original.dueOn,
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'amountMinor',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.amount')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => formatMoneyMinor(row.original.amountMinor, currency),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.status')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <FeeStatusBadge status={row.original.status} dueOn={row.original.dueOn} />
        ),
        size: 130,
        enableSorting: true,
      },
    ];

    if (!canManage) {
      return base;
    }

    return [
      ...base,
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.actions')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.status !== 'PAID' && row.original.status !== 'WAIVED' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPaymentPending && payingId === row.original.id}
                onClick={() =>
                  void onRecordPayment(row.original.id, row.original.amountMinor)
                }
              >
                {t('finance.markPaid')}
              </Button>
            ) : (
              '—'
            )}
          </div>
        ),
        size: 140,
        enableSorting: false,
      },
    ];
  }, [canManage, currency, isPaymentPending, onRecordPayment, payingId, t]);

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
