'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { useTranslation } from '@/hooks/useTranslation';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'nameEn', header: 'Name (EN)' },
];

export default function Page() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell title={t('finance.scholarshipsTitle')} description={t('finance.scholarshipsDescription')}>
      <SupabaseTableList
        table="ScholarshipType"
        title="ScholarshipType"
        select="id, code, nameEn, nameFr"
        columns={columns}
        searchKeys={['code', 'nameEn']}
      />
    </AcadiaPageShell>
  );
}
