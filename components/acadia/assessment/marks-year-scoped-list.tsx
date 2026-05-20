'use client';

import { ColumnDef } from '@tanstack/react-table';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { useExamSessionIdsForActiveYear } from '@/hooks/use-exam-session-ids-for-year';

export function MarksYearScopedList<T extends Record<string, unknown>>({
  columns,
  select,
}: {
  columns: ColumnDef<T>[];
  select: string;
}) {
  const { data: examSessionIds = [], isLoading } = useExamSessionIdsForActiveYear();

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground p-5">
        Loading marks for the selected academic year…
      </p>
    );
  }

  if (examSessionIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-5">
        No exam sessions for this academic year yet.
      </p>
    );
  }

  return (
    <SupabaseTableList<T>
      table="SubjectMark"
      title="Subject marks"
      select={select}
      columns={columns}
      searchKeys={[]}
      filters={[]}
      inFilters={[{ column: 'examSessionId', values: examSessionIds }]}
    />
  );
}
