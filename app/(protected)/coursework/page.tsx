'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  detailLinkColumn,
  nestedFieldColumn,
} from '@/lib/acadia/list-columns';

type TaskRow = {
  id: string;
  titleEn?: string;
  Subject?: unknown;
} & Record<string, unknown>;

type SubmissionRow = {
  id: string;
  status?: string;
  CourseworkTask?: unknown;
  StudentProfile?: unknown;
} & Record<string, unknown>;

const taskColumns: ColumnDef<TaskRow>[] = [
  detailLinkColumn<TaskRow>('/coursework', 'titleEn', 'Task'),
  nestedFieldColumn<TaskRow>('subject', 'Subject', 'Subject', 'code'),
  { accessorKey: 'dueAt', header: 'Due' },
  { accessorKey: 'maxScore', header: 'Max score' },
  { accessorKey: 'isPublished', header: 'Published' },
];

const submissionColumns: ColumnDef<SubmissionRow>[] = [
  detailLinkColumn<SubmissionRow>(
    '/coursework/submissions',
    'status',
    'Status',
  ),
  nestedFieldColumn<SubmissionRow>(
    'task',
    'Task',
    'CourseworkTask',
    'titleEn',
  ),
  nestedFieldColumn<SubmissionRow>(
    'student',
    'Student',
    'StudentProfile',
    'registrationNumber',
  ),
  { accessorKey: 'submittedAt', header: 'Submitted' },
  { accessorKey: 'confirmedScore', header: 'Score' },
];

const TASK_SELECT = `
  id,
  titleEn,
  titleFr,
  dueAt,
  maxScore,
  isPublished,
  createdAt,
  Subject:subjectId ( code, nameEn )
`;

const SUBMISSION_SELECT = `
  id,
  status,
  submittedAt,
  confirmedScore,
  createdAt,
  CourseworkTask:taskId ( titleEn, dueAt ),
  StudentProfile:studentProfileId ( registrationNumber )
`;

export default function CourseworkPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Coursework"
      description="Assignments and student submissions from Supabase."
    >
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <SupabaseTableList
          table="CourseworkTask"
          title="Coursework tasks"
          select={TASK_SELECT}
          columns={taskColumns}
          searchKeys={['titleEn', 'titleFr']}
        />
        <SupabaseTableList
          table="CourseworkSubmission"
          title="Submissions"
          select={SUBMISSION_SELECT}
          columns={submissionColumns}
          searchKeys={['status']}
        />
      </div>
    </AcadiaPageShell>
  );
}
