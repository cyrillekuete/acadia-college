'use client';

import { ClassTimetableView } from '@/components/acadia/timetable/class-timetable-view';
import { StudentTimetableView } from '@/components/acadia/timetable/student-timetable-view';
import { TeacherTimetableView } from '@/components/acadia/timetable/teacher-timetable-view';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { resolveTimetableViewMode } from '@/lib/acadia/timetable-views';

function sessionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Could not load your session. Please try again.';
}

export function TimetablePageContent() {
  const { data: session, isLoading, isError, error, refetch } =
    useAcadiaCollegeSession();

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
        <p className="text-destructive">{sessionErrorMessage(error)}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refetch()}
        >
          Retry
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
    case 'browse':
      return <ClassTimetableView canManage={false} />;
  }
}
