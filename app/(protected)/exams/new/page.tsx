'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CalendarWindowGate } from '@/components/acadia/academics/calendar-window-gate';
import { ExamSessionForm } from '@/components/acadia/assessment/exam-session-form';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { Button } from '@/components/ui/button';
import { checkExamPeriodWindow } from '@/lib/acadia/calendar-milestones';
import { canManageInstitution, canWriteOperations } from '@/lib/acadia/roles';
import { useAcademicCalendarMilestones } from '@/hooks/use-academic-calendar-milestones';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewExamSessionPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const { activeYearId } = useActiveAcademicYear();
  const canManage = canWriteOperations(session?.roleSlug);
  const { data: calendarContext, isLoading: calendarLoading } =
    useAcademicCalendarMilestones(activeYearId);

  const examWindow = useMemo(() => {
    if (!calendarContext) {
      return undefined;
    }
    return checkExamPeriodWindow(calendarContext.milestones);
  }, [calendarContext]);

  return (
    <AcadiaPageShell
      title={t('exams.newTitle')}
      description={t('exams.newDescription')}
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/exams">{t('exams.backToExams')}</Link>
        </Button>
      </div>
      {canManage ? (
        <CalendarWindowGate
          featureLabel={t('exams.newSessionsGate')}
          window={examWindow}
          loading={calendarLoading}
          bypass={canManageInstitution(session?.roleSlug)}
        >
          <ExamSessionForm onCancelHref="/exams" />
        </CalendarWindowGate>
      ) : (
        <p className="text-sm text-muted-foreground">{t('exams.permissionDenied')}</p>
      )}
    </AcadiaPageShell>
  );
}
