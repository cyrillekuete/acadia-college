'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';

type Row = {
  id: string;
  Course?: unknown;
  StudentProfile?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  nestedFieldColumn<Row>('student', 'Student', 'StudentProfile', 'registrationNumber'),
  nestedFieldColumn<Row>('course', 'Course', 'Course', 'code'),
  { accessorKey: 'caScore', header: 'CA' },
  { accessorKey: 'examScore', header: 'Exam' },
  { accessorKey: 'totalScore', header: 'Total' },
  { accessorKey: 'updatedAt', header: 'Updated' },
];

const SELECT = `
  id,
  caScore,
  examScore,
  totalScore,
  isResitEligible,
  updatedAt,
  Course:courseId ( code ),
  StudentProfile:studentProfileId ( registrationNumber )
`;

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Marks" description="Course marks from Supabase.">
      <SupabaseTableList
        table="CourseMark"
        title="CourseMark"
        select={SELECT}
        columns={columns}
        searchKeys={[]}
      />
    </AcadiaPageShell>
  );
}
