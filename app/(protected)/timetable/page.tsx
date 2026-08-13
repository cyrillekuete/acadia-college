'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { TimetablePageContent } from '@/components/acadia/timetable/timetable-page-content';
import { TimetablePrintButton } from '@/components/acadia/timetable/timetable-print-button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  resolveTimetableViewMode,
} from '@/lib/acadia/timetable-views';
import { useTranslation } from '@/hooks/useTranslation';

export default function TimetablePage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const mode = resolveTimetableViewMode(session?.roleSlug);

  return (
    <AcadiaPageShell
      title={t('timetable.title')}
      description={t('timetable.description')}
      actions={mode === 'teacher' ? <TimetablePrintButton /> : undefined}
    >
      <TimetablePageContent />
    </AcadiaPageShell>
  );
}
