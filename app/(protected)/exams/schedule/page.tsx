'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import {
  detailLinkColumn,
  nestedFieldColumn,
} from '@/lib/acadia/list-columns';
import { useTranslation } from '@/hooks/useTranslation';
type ExamRow = {
  id: string;
  type?: string;
  Subject?: unknown;
  AcademicSequence?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<ExamRow>[] = [
  detailLinkColumn<ExamRow>('/exams', 'type', 'Type'),
  nestedFieldColumn<ExamRow>('subject', 'Subject', 'Subject', 'code'),
  nestedFieldColumn<ExamRow>(
    'sequence',
    'Sequence',
    'AcademicSequence',
    'number',
  ),
  { accessorKey: 'startsOn', header: 'Starts' },
  { accessorKey: 'endsOn', header: 'Ends' },
  { accessorKey: 'finalizedAt', header: 'Finalized' },
];

const EXAM_SELECT = `
  id,
  type,
  startsOn,
  endsOn,
  finalizedAt,
  Subject!ExamSession_subjectId_tenantId_fkey ( code, nameEn ),
  AcademicSequence:sequenceId ( number )
`;

export default function ExamSchedulePage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('exams.scheduleTitle')}
      description="Upcoming and past exam sessions (FR-4.2.3)."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href="/exams/new">{t('exams.newTitle')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/exams">All exams</Link>
        </Button>
      </div>
      <SupabaseTableList scopeByAcademicYear
        table="ExamSession"
        title={t('exams.scheduleTitle')}
        select={EXAM_SELECT}
        columns={columns}
        searchKeys={['type']}
      />
    </AcadiaPageShell>
  );
}
