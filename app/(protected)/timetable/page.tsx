'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'dayOfWeek', header: 'Day' },
  { accessorKey: 'startMinutes', header: 'Start (min)' },
  { accessorKey: 'endMinutes', header: 'End (min)' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Timetable" description="Timetable slots.">
      <SupabaseTableList
        table="TimetableSlot"
        title="TimetableSlot"
        select="id, dayOfWeek, startMinutes, endMinutes"
        columns={columns}
        searchKeys={[]}
      />
    </AcadiaPageShell>
  );
}
