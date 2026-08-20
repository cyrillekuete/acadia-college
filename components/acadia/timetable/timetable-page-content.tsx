'use client';

import { ClassTimetableView } from '@/components/acadia/timetable/class-timetable-view';
import { GuardianTimetableView } from '@/components/acadia/timetable/guardian-timetable-view';
import { StudentTimetableView } from '@/components/acadia/timetable/student-timetable-view';
import { TeacherTimetableView } from '@/components/acadia/timetable/teacher-timetable-view';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { resolveTimetableViewMode } from '@/lib/acadia/timetable-views';
import { useTranslation } from '@/hooks/useTranslation';

export function TimetablePageContent() {
  const { t } = useTranslation();
  const { data: session, isLoading, isError, error, refetch } =
    useAcadiaCollegeSession();

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
        <p className="text-destructive">
          {error instanceof Error && error.message
            ? error.message
            : t('common.messages.sessionLoadFailed')}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refetch()}
        >
          {t('common.buttons.retry')}
        </Button>
      </div>
    );
  }

  const mode = resolveTimetableViewMode(session?.roleSlug);

  switch (mode) {
    case 'admin':
      return <ClassTimetableView canManage={canWriteRegistry(session?.roleSlug)} />;
    case 'teacher':
      return <TeacherTimetableView />;
    case 'student':
      return <StudentTimetableView />;
    case 'guardian':
      return <GuardianTimetableView />;
    case 'browse':
      return <ClassTimetableView canManage={false} />;
  }
}
