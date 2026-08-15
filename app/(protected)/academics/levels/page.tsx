import { Suspense } from 'react';
import { LevelsPageView } from '@/components/acadia/academics/levels-page-view';
import { getCachedLevelList } from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';

export default function LevelsPage() {
  return (
    <Suspense>
      <LevelsCachedPage />
    </Suspense>
  );
}

async function LevelsCachedPage() {
  const ctx = await getCachedPageContext();
  if (!ctx) {
    return <LevelsPageView />;
  }

  const initialLevels = await loadCachedValue(() =>
    getCachedLevelList(ctx.tenantId),
  );

  return <LevelsPageView initialLevels={initialLevels} />;
}
