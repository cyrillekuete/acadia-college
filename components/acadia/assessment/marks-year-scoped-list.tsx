'use client';

import { ColumnDef } from '@tanstack/react-table';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { useExamSessionIdsForActiveYear } from '@/hooks/use-exam-session-ids-for-year';
import { useTranslation } from '@/hooks/useTranslation';

export function MarksYearScopedList<T extends Record<string, unknown>>({
  columns,
  select,
}: {
  columns: ColumnDef<T>[];
  select: string;
}) {
  const { t } = useTranslation();
  const { data: examSessionIds = [], isLoading } = useExamSessionIdsForActiveYear();

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground p-5">
        {t('marks.loadingYear')}
      </p>
    );
  }

  if (examSessionIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-5">
        {t('marks.noExamSessions')}
      </p>
    );
  }

  return (
    <SupabaseTableList<T>
      table="SubjectMark"
      title={t('marks.allMarks')}
      select={select}
      columns={columns}
      searchKeys={[]}
      filters={[]}
      inFilters={[{ column: 'examSessionId', values: examSessionIds }]}
    />
  );
}
