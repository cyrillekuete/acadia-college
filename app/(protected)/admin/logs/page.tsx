'use client';

import { useSearchParams } from 'next/navigation';
import { AdminManagementPageShell } from '@/components/acadia/admin/admin-management-page-shell';
import { SystemLogDataGrid } from '@/components/acadia/admin/system-log-data-grid';
import { useTranslation } from '@/hooks/useTranslation';

export default function AdminLogsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const userEmailFilter =
    searchParams.get('userEmail') ?? searchParams.get('email') ?? undefined;

  return (
    <AdminManagementPageShell title={t('admin.logs')} breadcrumbPage={t('admin.logs')}>
      <SystemLogDataGrid userEmailFilter={userEmailFilter ?? undefined} />
    </AdminManagementPageShell>
  );
}
