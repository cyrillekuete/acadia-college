'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { TimetablePageContent } from '@/components/acadia/timetable/timetable-page-content';
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
    >
      <TimetablePageContent />
    </AcadiaPageShell>
  );
}
