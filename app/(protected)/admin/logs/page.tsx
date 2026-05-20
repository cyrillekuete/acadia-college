'use client';

import { useSearchParams } from 'next/navigation';
import { AdminManagementPageShell } from '@/components/acadia/admin/admin-management-page-shell';
import { SystemLogDataGrid } from '@/components/acadia/admin/system-log-data-grid';

export default function AdminLogsPage() {
  const searchParams = useSearchParams();
  const userEmailFilter =
    searchParams.get('userEmail') ?? searchParams.get('email') ?? undefined;

  return (
    <AdminManagementPageShell title="Logs" breadcrumbPage="Logs">
      <SystemLogDataGrid userEmailFilter={userEmailFilter ?? undefined} />
    </AdminManagementPageShell>
  );
}
