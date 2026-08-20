'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CalendarWindowGate } from '@/components/acadia/academics/calendar-window-gate';
import {
  ExamSessionForm,
  type ExamSessionFormRecord,
} from '@/components/acadia/assessment/exam-session-form';
import { Button } from '@/components/ui/button';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useAcademicCalendarMilestones } from '@/hooks/use-academic-calendar-milestones';
import { canEditExamSession } from '@/lib/acadia/assessment';
import { checkExamPeriodWindow } from '@/lib/acadia/calendar-milestones';
import { canManageInstitution, canWriteOperations } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

const SELECT = `
  id,
  academicYearId,
  subjectId,
  termId,
  sequenceId,
  type,
  startsOn,
  endsOn,
  finalizedAt
`;

type ExamEdit = ExamSessionFormRecord & { finalizedAt: string | null };

export default function EditExamSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const { activeYearId } = useActiveAcademicYear();
  const canManage = canWriteOperations(session?.roleSlug);
  const { data: calendarContext, isLoading: calendarLoading } =
    useAcademicCalendarMilestones(activeYearId);
  const { data, isLoading, isError, error } = useSupabaseRecord<ExamEdit>(
    'ExamSession',
    id,
    SELECT,
  );

  const examWindow = useMemo(() => {
    if (!calendarContext) {
      return undefined;
    }
    return checkExamPeriodWindow(calendarContext.milestones);
  }, [calendarContext]);

  const editable = data ? canEditExamSession(data.finalizedAt) : false;

  return (
    <AcadiaPageShell
      title={t('exams.editTitle')}
      description={t('exams.editDescription')}
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/exams/${id}`}>{t('exams.session')}</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.messages.loading')}</p>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : t('exams.notFound')}
        </p>
      ) : !canManage ? (
        <p className="text-sm text-muted-foreground">{t('exams.permissionDenied')}</p>
      ) : !editable ? (
        <p className="text-sm text-muted-foreground">{t('exams.finalizedCannotEdit')}</p>
      ) : (
        <CalendarWindowGate
          featureLabel={t('exams.newSessionsGate')}
          window={examWindow}
          loading={calendarLoading}
          bypass={canManageInstitution(session?.roleSlug)}
        >
          <ExamSessionForm
            record={{
              id: data.id,
              academicYearId: data.academicYearId,
              subjectId: data.subjectId,
              termId: data.termId,
              sequenceId: data.sequenceId ?? '',
              type: data.type as ExamSessionFormRecord['type'],
              startsOn: data.startsOn,
              endsOn: data.endsOn,
            }}
            onCancelHref={`/exams/${id}`}
          />
        </CalendarWindowGate>
      )}
    </AcadiaPageShell>
  );
}
