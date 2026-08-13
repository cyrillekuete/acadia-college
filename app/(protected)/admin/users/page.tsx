'use client';

import { AdminManagementPageShell } from '@/components/acadia/admin/admin-management-page-shell';
import { UsersDataGrid } from '@/components/acadia/admin/users-data-grid';
import { useTranslation } from '@/hooks/useTranslation';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  return (
    <AdminManagementPageShell title={t('admin.users')} breadcrumbPage={t('admin.users')}>
      <UsersDataGrid />
    </AdminManagementPageShell>
  );
}
