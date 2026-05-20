'use client';

import { AdminManagementPageShell } from '@/components/acadia/admin/admin-management-page-shell';
import { UsersDataGrid } from '@/components/acadia/admin/users-data-grid';

export default function AdminUsersPage() {
  return (
    <AdminManagementPageShell title="Users" breadcrumbPage="Users">
      <UsersDataGrid />
    </AdminManagementPageShell>
  );
}
