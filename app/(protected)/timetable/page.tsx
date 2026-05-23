'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { TimetablePageContent } from '@/components/acadia/timetable/timetable-page-content';
import { TimetablePrintButton } from '@/components/acadia/timetable/timetable-print-button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  resolveTimetableViewMode,
  timetableViewDescription,
} from '@/lib/acadia/timetable-views';

export default function TimetablePage() {
  const { data: session } = useAcadiaCollegeSession();
  const mode = resolveTimetableViewMode(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Acadia College — Timetable"
      description={timetableViewDescription(mode)}
      actions={mode === 'teacher' ? <TimetablePrintButton /> : undefined}
    >
      <TimetablePageContent />
    </AcadiaPageShell>
  );
}
