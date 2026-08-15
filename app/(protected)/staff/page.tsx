import { Suspense } from 'react';
import { StaffPageView } from '@/components/acadia/staff/staff-page-view';
import { getCachedStaffList } from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';

export default function StaffPage() {
  return (
    <Suspense>
      <StaffCachedPage />
    </Suspense>
  );
}

async function StaffCachedPage() {
  const ctx = await getCachedPageContext();
  if (!ctx) {
    return <StaffPageView />;
  }

  const initialStaff = await loadCachedValue(() =>
    getCachedStaffList(ctx.tenantId, ctx.yearId),
  );

  return <StaffPageView initialStaff={initialStaff} seedYearId={ctx.yearId} />;
}
