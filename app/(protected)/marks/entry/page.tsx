'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CalendarWindowGate } from '@/components/acadia/academics/calendar-window-gate';
import { MarksEntryGrid } from '@/components/acadia/assessment/marks-entry-grid';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { Button } from '@/components/ui/button';
import { checkMarkEntryWindow } from '@/lib/acadia/calendar-milestones';
import { canManageInstitution } from '@/lib/acadia/roles';
import { useAcademicCalendarMilestones } from '@/hooks/use-academic-calendar-milestones';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function MarksEntryPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const { activeYearId } = useActiveAcademicYear();
  const canEnter = canWriteOperations(session?.roleSlug);
  const { data: calendarContext, isLoading: calendarLoading } =
    useAcademicCalendarMilestones(activeYearId);

  const markEntryWindow = useMemo(() => {
    if (!calendarContext) {
      return undefined;
    }
    return checkMarkEntryWindow(calendarContext.milestones);
  }, [calendarContext]);

  return (
    <AcadiaPageShell
      title={t('marks.entryTitle')}
      description="Enter sequence-scoped CA and exam scores (FR-4.1.1)."
    >
      <div className="mb-4 flex gap-2 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marks">Back to marks</Link>
        </Button>
      </div>
      {canEnter ? (
        <CalendarWindowGate
          featureLabel={t('marks.entryTitle')}
          window={markEntryWindow}
          loading={calendarLoading}
          bypass={canManageInstitution(session?.roleSlug)}
        >
          <MarksEntryGrid />
        </CalendarWindowGate>
      ) : (
        <p className="text-sm text-muted-foreground">
          You do not have permission to enter marks.
        </p>
      )}
    </AcadiaPageShell>
  );
}
