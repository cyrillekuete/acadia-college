import type { ReactNode } from 'react';
import { UserManagementAccessGate } from '@/components/acadia/admin/user-management-access-gate';

export default function AdminUsersLayout({ children }: { children: ReactNode }) {
  return (
    <UserManagementAccessGate>{children}</UserManagementAccessGate>
  );
}
