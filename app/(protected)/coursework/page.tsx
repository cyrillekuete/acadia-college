'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { COURSEWORK_TABLE_LAYOUT } from '@/components/acadia/coursework/coursework-table-layout';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Badge } from '@/components/ui/badge';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { courseworkTaskListFilters } from '@/lib/acadia/coursework';
import {
  detailLinkColumn,
  nestedFieldColumn,
} from '@/lib/acadia/list-columns';
import { formatDateTime, formatRecordValue } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';

type TaskRow = {
  id: string;
  titleEn?: string;
  dueAt?: string;
  maxScore?: number;
  isPublished?: boolean;
  Subject?: unknown;
} & Record<string, unknown>;

type SubmissionRow = {
  id: string;
  status?: string;
  submittedAt?: string;
  confirmedScore?: number | null;
  CourseworkTask?: unknown;
  StudentProfile?: unknown;
} & Record<string, unknown>;

const TASK_SELECT = `
  id,
  titleEn,
  titleFr,
  dueAt,
  maxScore,
  isPublished,
  createdAt,
  Subject!CourseworkTask_subjectId_tenantId_fkey ( code, nameEn )
`;

const SUBMISSION_SELECT = `
  id,
  status,
  submittedAt,
  confirmedScore,
  createdAt,
  CourseworkTask!CourseworkSubmission_taskId_tenantId_fkey ( titleEn, dueAt ),
  StudentProfile!CourseworkSubmission_studentProfileId_tenantId_fkey ( registrationNumber )
`;

export default function CourseworkPage() {
  const { t } = useTranslation();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const taskFilters = useMemo(
    () => courseworkTaskListFilters(session?.roleSlug),
    [session?.roleSlug],
  );

  const yearTaskIdsQuery = useQuery({
    queryKey: ['coursework-year-task-ids', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('CourseworkTask')
        .select('id')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => row.id as string);
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  const submissionInFilters = useMemo(() => {
    const ids = yearTaskIdsQuery.data ?? [];
    return [{ column: 'taskId', values: ids }];
  }, [yearTaskIdsQuery.data]);

  const taskColumns = useMemo<ColumnDef<TaskRow>[]>(
    () => [
      {
        ...detailLinkColumn<TaskRow>('/coursework', 'titleEn', t('coursework.task')),
        id: 'titleEn',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('coursework.task')}
            visibility
            column={column}
          />
        ),
        size: 220,
        meta: {
          headerTitle: t('coursework.task'),
          skeleton: <Skeleton className="h-4 w-40" />,
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        ...nestedFieldColumn<TaskRow>('subject', t('nav.subjects'), 'Subject', 'code'),
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('nav.subjects')}
            visibility
            column={column}
          />
        ),
        size: 100,
        meta: {
          headerTitle: t('nav.subjects'),
          skeleton: <Skeleton className="h-4 w-16" />,
        },
        enableSorting: true,
        enableHiding: true,
      } as ColumnDef<TaskRow>,
      {
        accessorKey: 'dueAt',
        id: 'dueAt',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('coursework.due')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => formatDateTime(row.original.dueAt),
        size: 160,
        meta: {
          headerTitle: t('coursework.due'),
          skeleton: <Skeleton className="h-4 w-28" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'maxScore',
        id: 'maxScore',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('coursework.maxScore')}
            visibility
            column={column}
            className="justify-center"
          />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {formatRecordValue(row.original.maxScore)}
          </span>
        ),
        size: 96,
        meta: {
          headerTitle: t('coursework.maxScore'),
          skeleton: <Skeleton className="mx-auto h-4 w-10" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'isPublished',
        id: 'isPublished',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('coursework.published')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.isPublished ? 'success' : 'secondary'}
            appearance="light"
          >
            {row.original.isPublished
              ? t('common.labels.yes')
              : t('common.labels.no')}
          </Badge>
        ),
        size: 100,
        meta: {
          headerTitle: t('coursework.published'),
          skeleton: <Skeleton className="h-7 w-12" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
    ],
    [t],
  );

  const submissionColumns = useMemo<ColumnDef<SubmissionRow>[]>(
    () => [
      {
        ...detailLinkColumn<SubmissionRow>(
          '/coursework/submissions',
          'status',
          t('common.labels.status'),
        ),
        id: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.status')}
            visibility
            column={column}
          />
        ),
        size: 120,
        meta: {
          headerTitle: t('common.labels.status'),
          skeleton: <Skeleton className="h-4 w-20" />,
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        ...nestedFieldColumn<SubmissionRow>(
          'task',
          t('coursework.task'),
          'CourseworkTask',
          'titleEn',
        ),
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('coursework.task')}
            visibility
            column={column}
          />
        ),
        size: 200,
        meta: {
          headerTitle: t('coursework.task'),
          skeleton: <Skeleton className="h-4 w-36" />,
        },
        enableSorting: true,
        enableHiding: true,
      } as ColumnDef<SubmissionRow>,
      {
        ...nestedFieldColumn<SubmissionRow>(
          'student',
          t('nav.students'),
          'StudentProfile',
          'registrationNumber',
        ),
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('nav.students')}
            visibility
            column={column}
          />
        ),
        size: 140,
        meta: {
          headerTitle: t('nav.students'),
          skeleton: <Skeleton className="h-4 w-24" />,
        },
        enableSorting: true,
        enableHiding: true,
      } as ColumnDef<SubmissionRow>,
      {
        accessorKey: 'submittedAt',
        id: 'submittedAt',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('coursework.submitted')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => formatDateTime(row.original.submittedAt),
        size: 160,
        meta: {
          headerTitle: t('coursework.submitted'),
          skeleton: <Skeleton className="h-4 w-28" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'confirmedScore',
        id: 'confirmedScore',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('coursework.score')}
            visibility
            column={column}
            className="justify-center"
          />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {formatRecordValue(row.original.confirmedScore)}
          </span>
        ),
        size: 88,
        meta: {
          headerTitle: t('coursework.score'),
          skeleton: <Skeleton className="mx-auto h-4 w-10" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
    ],
    [t],
  );

  return (
    <AcadiaPageShell
      title={t('coursework.title')}
      description={t('coursework.description')}
    >
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <SupabaseTableList
          scopeByAcademicYear
          table="CourseworkTask"
          title={t('coursework.tasks')}
          select={TASK_SELECT}
          columns={taskColumns}
          searchKeys={['titleEn', 'titleFr']}
          filters={taskFilters}
          tableLayout={COURSEWORK_TABLE_LAYOUT}
        />
        <SupabaseTableList
          table="CourseworkSubmission"
          title={t('coursework.submissions')}
          select={SUBMISSION_SELECT}
          columns={submissionColumns}
          searchKeys={['status']}
          inFilters={submissionInFilters}
          tableLayout={COURSEWORK_TABLE_LAYOUT}
        />
      </div>
    </AcadiaPageShell>
  );
}
