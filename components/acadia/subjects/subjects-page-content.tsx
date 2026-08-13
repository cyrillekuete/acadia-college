'use client';

import { SubjectCatalogView } from '@/components/acadia/subjects/subject-catalog-view';
import { StudentSubjectsView } from '@/components/acadia/subjects/student-subjects-view';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { resolveSubjectsViewMode } from '@/lib/acadia/subject-views';
import { useTranslation } from '@/hooks/useTranslation';

export function SubjectsPageContent() {
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

  const mode = resolveSubjectsViewMode(session?.roleSlug);
  if (mode === 'student') {
    return <StudentSubjectsView />;
  }
  return <SubjectCatalogView />;
}
