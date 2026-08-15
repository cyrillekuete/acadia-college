import { Suspense } from 'react';
import { StaffDashboardView } from '@/components/acadia/staff-dashboard/staff-dashboard-view';
import { getCachedStaffDashboardStats } from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';

export default function StaffDashboardPage() {
  return (
    <Suspense>
      <StaffDashboardCachedPage />
    </Suspense>
  );
}

async function StaffDashboardCachedPage() {
  const ctx = await getCachedPageContext();
  if (!ctx?.yearId) {
    return <StaffDashboardView />;
  }

  const initialStats = await loadCachedValue(() =>
    getCachedStaffDashboardStats(ctx.tenantId, ctx.yearId!, ctx.actorUserId),
  );

  return (
    <StaffDashboardView initialStats={initialStats} seedYearId={ctx.yearId} />
  );
}
