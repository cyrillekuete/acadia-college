'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { useTranslation } from '@/hooks/useTranslation';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'issuedAt', header: 'Issued' },
  { accessorKey: 'language', header: 'Language' },
];

export default function Page() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell title={t('transcripts.title')} description={t('transcripts.description')}>
      <SupabaseTableList scopeByAcademicYear
        table="Transcript"
        title="Transcript"
        select="id, issuedAt, language"
        columns={columns}
        searchKeys={[]}
      />
    </AcadiaPageShell>
  );
}
