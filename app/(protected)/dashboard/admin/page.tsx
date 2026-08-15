import { Suspense } from 'react';
import { AdminDashboardView } from '@/components/acadia/admin-dashboard/admin-dashboard-view';
import {
  getCachedAdminDashboardStats,
  getCachedAdminRecentActivities,
} from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';

export default function AdminDashboardPage() {
  return (
    <Suspense>
      <AdminDashboardCachedPage />
    </Suspense>
  );
}

async function AdminDashboardCachedPage() {
  const ctx = await getCachedPageContext();
  if (!ctx) {
    return <AdminDashboardView />;
  }

  const [initialStats, initialActivities] = await Promise.all([
    loadCachedValue(() =>
      getCachedAdminDashboardStats(ctx.tenantId, ctx.yearId),
    ),
    loadCachedValue(() => getCachedAdminRecentActivities(ctx.tenantId)),
  ]);

  return (
    <AdminDashboardView
      initialStats={initialStats}
      initialActivities={initialActivities}
      seedYearId={ctx.yearId}
    />
  );
}
