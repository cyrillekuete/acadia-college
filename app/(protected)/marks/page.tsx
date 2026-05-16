'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'score', header: 'Score' },
  { accessorKey: 'maxScore', header: 'Max' },
  { accessorKey: 'recordedAt', header: 'Recorded' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Marks" description="Course marks.">
      <SupabaseTableList
        table="CourseMark"
        title="CourseMark"
        select="id, score, maxScore, recordedAt"
        columns={columns}
        searchKeys={[]}
      />
    </AcadiaPageShell>
  );
}
