'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  detailLinkColumn,
  nestedFieldColumn,
} from '@/lib/acadia/list-columns';

type ExamRow = {
  id: string;
  type?: string;
  Course?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<ExamRow>[] = [
  detailLinkColumn<ExamRow>('/exams', 'type', 'Type'),
  nestedFieldColumn<ExamRow>('course', 'Course', 'Course', 'code'),
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
  createdAt,
  Course:courseId ( code, nameEn )
`;

export default function ExamsPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Exams"
      description="Exam sessions from Supabase."
    >
      <SupabaseTableList
        table="ExamSession"
        title="Exam sessions"
        select={EXAM_SELECT}
        columns={columns}
        searchKeys={['type']}
      />
    </AcadiaPageShell>
  );
}
