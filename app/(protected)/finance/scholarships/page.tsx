'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Badge } from '@/components/ui/badge';
import { formatMoneyMinor } from '@/lib/acadia/finance';
import { useTranslation } from '@/hooks/useTranslation';

type ScholarshipTypeRow = {
  id: string;
  nameEn?: string;
  nameFr?: string;
  discountKind?: string;
  percentBps?: number | null;
  fixedAmountMinor?: number | null;
  isActive?: boolean;
} & Record<string, unknown>;

function discountKindLabel(kind?: string): string {
  if (kind === 'PERCENT_BPS') {
    return 'Percent';
  }
  if (kind === 'FIXED_MINOR') {
    return 'Fixed amount';
  }
  return kind || '—';
}

function formatDiscount(row: ScholarshipTypeRow): string {
  if (row.discountKind === 'PERCENT_BPS') {
    const bps = Number(row.percentBps ?? 0);
    return `${(bps / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  }
  if (row.discountKind === 'FIXED_MINOR') {
    return formatMoneyMinor(Number(row.fixedAmountMinor ?? 0));
  }
  return '—';
}

const columns: ColumnDef<ScholarshipTypeRow>[] = [
  { accessorKey: 'nameEn', header: 'Name (EN)' },
  { accessorKey: 'nameFr', header: 'Name (FR)' },
  {
    id: 'discountKind',
    accessorKey: 'discountKind',
    header: 'Discount',
    cell: ({ row }) => discountKindLabel(row.original.discountKind),
  },
  {
    id: 'value',
    header: 'Value',
    cell: ({ row }) => formatDiscount(row.original),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => {
      const active = row.original.isActive !== false;
      return (
        <Badge variant={active ? 'success' : 'secondary'} appearance="light" size="sm">
          {active ? 'Active' : 'Inactive'}
        </Badge>
      );
    },
  },
];

const SCHOLARSHIP_TYPE_SELECT =
  'id, nameEn, nameFr, discountKind, percentBps, fixedAmountMinor, isActive';

export default function Page() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.scholarshipsTitle')}
      description={t('finance.scholarshipsDescription')}
    >
      <SupabaseTableList
        table="ScholarshipType"
        title={t('finance.scholarshipsTitle')}
        select={SCHOLARSHIP_TYPE_SELECT}
        columns={columns}
        searchKeys={['nameEn', 'nameFr']}
        tableLayout={{
          width: 'fixed',
          columnsResizable: true,
          columnsPinnable: true,
          columnsMovable: true,
          columnsVisibility: true,
        }}
      />
    </AcadiaPageShell>
  );
}
