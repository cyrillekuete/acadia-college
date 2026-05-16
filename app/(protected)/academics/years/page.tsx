'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'label', header: 'Label' },
  { accessorKey: 'startsOn', header: 'Starts' },
  { accessorKey: 'endsOn', header: 'Ends' },
  { accessorKey: 'isCurrent', header: 'Current' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Academic years" description="Academic year definitions.">
      <SupabaseTableList
        table="AcademicYear"
        title="AcademicYear"
        select="id, label, startsOn, endsOn, isCurrent"
        columns={columns}
        searchKeys={['label']}
      />
    </AcadiaPageShell>
  );
}
