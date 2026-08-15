import { Suspense } from 'react';
import { ClassesPageView } from '@/components/acadia/academics/classes-page-view';
import { getCachedClassList } from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';

export default function ClassesPage() {
  return (
    <Suspense>
      <ClassesCachedPage />
    </Suspense>
  );
}

async function ClassesCachedPage() {
  const ctx = await getCachedPageContext();
  if (!ctx) {
    return <ClassesPageView />;
  }

  const initialClasses = await loadCachedValue(() =>
    getCachedClassList(ctx.tenantId, ctx.yearId),
  );

  return (
    <ClassesPageView initialClasses={initialClasses} seedYearId={ctx.yearId} />
  );
}
