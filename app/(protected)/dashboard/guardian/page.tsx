import { Suspense } from 'react';
import { GuardianDashboardView } from '@/components/acadia/guardian-dashboard/guardian-dashboard-view';
import { getCachedGuardianDashboardStats } from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';

export default function GuardianDashboardPage() {
  return (
    <Suspense>
      <GuardianDashboardCachedPage />
    </Suspense>
  );
}

async function GuardianDashboardCachedPage() {
  const ctx = await getCachedPageContext();
  if (!ctx?.yearId) {
    return <GuardianDashboardView />;
  }

  const initialStats = await loadCachedValue(() =>
    getCachedGuardianDashboardStats(ctx.tenantId, ctx.yearId!, ctx.actorUserId),
  );

  return (
    <GuardianDashboardView initialStats={initialStats} seedYearId={ctx.yearId} />
  );
}
