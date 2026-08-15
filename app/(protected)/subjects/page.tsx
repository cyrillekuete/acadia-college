import { Suspense } from 'react';
import { SubjectsPageView } from '@/components/acadia/subjects/subjects-page-view';
import { getCachedSubjectList } from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';
import { isStudent } from '@/lib/acadia/roles';

export default function SubjectsPage() {
  return (
    <Suspense>
      <SubjectsCachedPage />
    </Suspense>
  );
}

async function SubjectsCachedPage() {
  const ctx = await getCachedPageContext();
  const studentView = ctx ? isStudent(ctx.roleSlug) : false;
  const initialSubjects =
    ctx && !studentView
      ? await loadCachedValue(() => getCachedSubjectList(ctx.tenantId))
      : undefined;

  return <SubjectsPageView initialSubjects={initialSubjects} />;
}
