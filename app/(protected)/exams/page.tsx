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
import { examSessionTypeLabel } from '@/lib/acadia/assessment';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';

type ExamRow = {
  id: string;
  type?: string;
  Subject?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<ExamRow>[] = [
  {
    ...detailLinkColumn<ExamRow>('/exams', 'type', 'Type'),
    cell: ({ row }) => (
      <Link
        href={`/exams/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {examSessionTypeLabel(String(row.original.type ?? ''))}
      </Link>
    ),
  },
  nestedFieldColumn<ExamRow>('subject', 'Subject', 'Subject', 'code'),
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
  Subject!ExamSession_subjectId_tenantId_fkey ( code, nameEn )
`;

export default function ExamsPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Acadia College — Exams"
      description="Exam sessions including sequence exams and major national examinations."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {canManage ? (
          <Button size="sm" asChild>
            <Link href="/exams/new">New exam session</Link>
          </Button>
        ) : null}
        <Button size="sm" variant="outline" asChild>
          <Link href="/exams/schedule">Exam schedule</Link>
        </Button>
      </div>
      <SupabaseTableList scopeByAcademicYear
        table="ExamSession"
        title="Exam sessions"
        select={EXAM_SELECT}
        columns={columns}
        searchKeys={['type']}
      />
    </AcadiaPageShell>
  );
}
