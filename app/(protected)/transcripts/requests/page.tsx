'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { useTranslation } from '@/hooks/useTranslation';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'requestedAt', header: 'Requested' },
];

export default function Page() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell title={t('transcripts.requestsTitle')} description={t('transcripts.requestsDescription')}>
      <SupabaseTableList
        table="TranscriptCopyRequest"
        title="TranscriptCopyRequest"
        select="id, status, requestedAt"
        columns={columns}
        searchKeys={['status']}
      />
    </AcadiaPageShell>
  );
}
