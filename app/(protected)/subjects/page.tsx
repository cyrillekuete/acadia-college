'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SubjectsPageContent } from '@/components/acadia/subjects/subjects-page-content';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { resolveSubjectsViewMode } from '@/lib/acadia/subject-views';
import { useTranslation } from '@/hooks/useTranslation';

export default function SubjectsPage() {
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
      <SubjectsPageContent />
    </AcadiaPageShell>
  );
}
