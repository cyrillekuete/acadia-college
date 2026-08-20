'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { ExamSessionListToolbar } from '@/components/acadia/assessment/exam-session-list-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { formatDateOnlyDisplay } from '@/lib/acadia/dates';
import { examScheduleStatus } from '@/lib/acadia/exam-session-guards';
import { todayDateOnly } from '@/lib/acadia/calendar-milestones';
import {
  EMPTY_EXAM_SESSION_LIST_FILTERS,
  EXAM_SESSION_LIST_SELECT,
  examSessionMatchesSearch,
  examSessionRowMatchesFilters,
  type ExamSessionListFilters,
  type ExamSessionListRow,
} from '@/lib/acadia/exam-session-list';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useTermOptions } from '@/hooks/use-academic-calendar-options';
import { canWriteOperations } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function ExamSchedulePage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const { activeYearId } = useActiveAcademicYear();
  const { data: terms = [] } = useTermOptions(activeYearId);
  const canManage = canWriteOperations(session?.roleSlug);
  const [filters, setFilters] = useState<ExamSessionListFilters>(
    EMPTY_EXAM_SESSION_LIST_FILTERS,
  );
  const today = todayDateOnly();

  const columns = useMemo<ColumnDef<ExamSessionListRow>[]>(
    () => [
      {
        accessorKey: 'type',
        header: t('exams.filterType'),
        cell: ({ row }) => (
          <Link
            href={`/exams/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {t(`exams.type.${String(row.original.type ?? '')}`, {
              defaultValue: String(row.original.type ?? ''),
            })}
          </Link>
        ),
      },
      nestedFieldColumn<ExamSessionListRow>(
        'subject',
        t('exams.subject'),
        'Subject',
        'code',
      ),
      nestedFieldColumn<ExamSessionListRow>(
        'sequence',
        t('exams.sequenceRequired'),
        'AcademicSequence',
        'number',
      ),
      {
        accessorKey: 'startsOn',
        header: t('exams.starts'),
        cell: ({ row }) => formatDateOnlyDisplay(String(row.original.startsOn ?? '')),
      },
      {
        accessorKey: 'endsOn',
        header: t('exams.ends'),
        cell: ({ row }) => formatDateOnlyDisplay(String(row.original.endsOn ?? '')),
      },
      {
        id: 'scheduleStatus',
        header: t('exams.filterStatus'),
        cell: ({ row }) => {
          const status = examScheduleStatus(
            String(row.original.startsOn ?? ''),
            String(row.original.endsOn ?? ''),
            today,
          );
          const label =
            status === 'upcoming'
              ? t('exams.statusUpcoming')
              : status === 'inProgress'
                ? t('exams.statusInProgress')
                : t('exams.statusPast');
          const variant =
            status === 'upcoming'
              ? 'info'
              : status === 'inProgress'
                ? 'success'
                : 'secondary';
          return (
            <Badge variant={variant} appearance="light">
              {label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'finalizedAt',
        header: t('exams.finalized'),
        cell: ({ row }) => {
          const isFinalized = Boolean(row.original.finalizedAt);
          return (
            <Badge variant={isFinalized ? 'success' : 'warning'} appearance="light">
              {isFinalized ? t('exams.finalized') : t('exams.open')}
            </Badge>
          );
        },
      },
    ],
    [t, today],
  );

  return (
    <AcadiaPageShell
      title={t('exams.scheduleTitle')}
      description={t('exams.scheduleDescription')}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {canManage ? (
          <Button size="sm" asChild>
            <Link href="/exams/new">{t('exams.newTitle')}</Link>
          </Button>
        ) : null}
        <Button size="sm" variant="outline" asChild>
          <Link href="/exams">{t('exams.allExams')}</Link>
        </Button>
      </div>
      <SupabaseTableList
        scopeByAcademicYear
        table="ExamSession"
        title={t('exams.scheduleTitle')}
        select={EXAM_SESSION_LIST_SELECT}
        columns={columns}
        searchFn={examSessionMatchesSearch}
        rowFilter={(row) => examSessionRowMatchesFilters(row, filters)}
        order={{ column: 'startsOn', ascending: true }}
        truncatedLabel={t('exams.truncated', { count: 200 })}
        toolbarExtra={
          <ExamSessionListToolbar
            filters={filters}
            onChange={setFilters}
            terms={terms}
          />
        }
      />
    </AcadiaPageShell>
  );
}
