'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SubjectsPageContent } from '@/components/acadia/subjects/subjects-page-content';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { resolveSubjectsViewMode } from '@/lib/acadia/subject-views';
import type { SubjectListRowView } from '@/lib/supabase/queries/subject-list';
import { useTranslation } from '@/hooks/useTranslation';

export function SubjectsPageView({
  initialSubjects,
}: {
  initialSubjects?: SubjectListRowView[];
}) {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const mode = resolveSubjectsViewMode(session?.roleSlug);
  const isStudentView = mode === 'student';

  return (
    <AcadiaPageShell
      title={isStudentView ? t('subjects.myTitle') : t('subjects.title')}
      description={
        isStudentView ? t('subjects.myDescription') : t('subjects.description')
      }
    >
      <SubjectsPageContent initialSubjects={initialSubjects} />
    </AcadiaPageShell>
  );
}
