import { Suspense } from 'react';
import { StudentDashboardView } from '@/components/acadia/student-dashboard/student-dashboard-view';
import { getCachedStudentDashboardStats } from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';

export default function StudentDashboardPage() {
  return (
    <Suspense>
      <StudentDashboardCachedPage />
    </Suspense>
  );
}

async function StudentDashboardCachedPage() {
  const ctx = await getCachedPageContext();
  if (!ctx?.yearId) {
    return <StudentDashboardView />;
  }

  const initialStats = await loadCachedValue(() =>
    getCachedStudentDashboardStats(ctx.tenantId, ctx.yearId!, ctx.actorUserId),
  );

  return (
    <StudentDashboardView initialStats={initialStats} seedYearId={ctx.yearId} />
  );
}
