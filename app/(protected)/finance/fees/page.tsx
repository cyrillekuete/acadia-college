'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'currency', header: 'Currency' },
  { accessorKey: 'totalDueMinor', header: 'Due' },
  { accessorKey: 'totalPaidMinor', header: 'Paid' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Student fees" description="Fee accounts and installments.">
      <SupabaseTableList
        table="StudentFeeAccount"
        title="StudentFeeAccount"
        select="id, currency, totalDueMinor, totalPaidMinor"
        columns={columns}
        searchKeys={[]}
      />
    </AcadiaPageShell>
  );
}
