'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'kind', header: 'Kind' },
  { accessorKey: 'onDate', header: 'Date' },
  { accessorKey: 'labelEn', header: 'Label (EN)' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Academic calendar" description="Calendar milestones.">
      <SupabaseTableList
        table="AcademicCalendarMilestone"
        title="AcademicCalendarMilestone"
        select="id, kind, onDate, labelEn, labelFr"
        columns={columns}
        searchKeys={['labelEn', 'kind']}
      />
    </AcadiaPageShell>
  );
}
