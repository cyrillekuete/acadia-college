'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { KeyRound, Pencil } from 'lucide-react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { UserFormDialog } from '@/components/acadia/admin/user-form-dialog';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { useUserManagementMutations } from '@/hooks/use-user-management-mutations';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canManageUsers } from '@/lib/acadia/roles';
import { UserStatus } from '@/app/models/user';

type Row = {
  id: string;
  email?: string;
  name?: string;
  status?: string;
  UserRole?: unknown;
} & Record<string, unknown>;

const SELECT = `
  id,
  email,
  name,
  status,
  createdAt,
  isProtected,
  UserRole:roleId ( slug, name )
`;

export default function AdminUsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: session } = useAcadiaCollegeSession();
  const { setUserStatus, sendPasswordReset } = useUserManagementMutations();
  const canManage = canManageUsers(session?.roleSlug);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <Link
            href={`/admin/users/${row.original.id}`}
            className="text-primary hover:underline"
          >
            {row.original.email}
          </Link>
        ),
      },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'status', header: 'Status' },
      nestedFieldColumn<Row>('role', 'Role', 'UserRole', 'name'),
      { accessorKey: 'createdAt', header: 'Created' },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: '',
              cell: ({ row }: { row: { original: Row } }) => {
                const user = row.original;
                const email = String(user.email ?? '');
                const status = String(user.status ?? '');
                const isProtected = Boolean(user.isProtected);

                return (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild aria-label="Edit user">
                      <Link href={`/admin/users/${user.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    {!isProtected ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="More actions">
                            <KeyRound className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => sendPasswordReset.mutate(String(user.id))}
                          >
                            Send password reset
                          </DropdownMenuItem>
                          {status !== UserStatus.ACTIVE ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setUserStatus.mutate({
                                  id: String(user.id),
                                  email,
                                  status: UserStatus.ACTIVE,
                                  previousStatus: status,
                                })
                              }
                            >
                              Activate account
                            </DropdownMenuItem>
                          ) : null}
                          {status === UserStatus.ACTIVE ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setUserStatus.mutate({
                                  id: String(user.id),
                                  email,
                                  status: UserStatus.INACTIVE,
                                  previousStatus: status,
                                })
                              }
                            >
                              Deactivate account
                            </DropdownMenuItem>
                          ) : null}
                          {status !== UserStatus.BLOCKED ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setUserStatus.mutate({
                                  id: String(user.id),
                                  email,
                                  status: UserStatus.BLOCKED,
                                  previousStatus: status,
                                })
                              }
                            >
                              Block account
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                );
              },
            } as ColumnDef<Row>,
          ]
        : []),
    ],
    [canManage, sendPasswordReset, setUserStatus],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Users"
      description="Create and manage tenant users, roles, and account status."
    >
      {canManage ? (
        <AdminToolbar
          addLabel="New user"
          onAdd={() => setDialogOpen(true)}
        />
      ) : null}
      <SupabaseTableList
        table="User"
        title="Users"
        select={SELECT}
        columns={columns}
        searchKeys={['email', 'name']}
      />
      {canManage ? (
        <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      ) : null}
    </AcadiaPageShell>
  );
}
