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
type ExamRow = {
  id: string;
  type?: string;
  Course?: unknown;
  AcademicSequence?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<ExamRow>[] = [
  detailLinkColumn<ExamRow>('/exams', 'type', 'Type'),
  nestedFieldColumn<ExamRow>('course', 'Course', 'Course', 'code'),
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
  Course:courseId ( code, nameEn ),
  AcademicSequence:sequenceId ( number )
`;

export default function ExamSchedulePage() {
  return (
    <AcadiaPageShell
      title="Examination schedule"
      description="Upcoming and past exam sessions (FR-4.2.3)."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href="/exams/new">New exam session</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/exams">All exams</Link>
        </Button>
      </div>
      <SupabaseTableList
        table="ExamSession"
        title="Exam schedule"
        select={EXAM_SELECT}
        columns={columns}
        searchKeys={['type']}
      />
    </AcadiaPageShell>
  );
}
