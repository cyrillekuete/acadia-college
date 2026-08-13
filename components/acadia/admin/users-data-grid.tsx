'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronRight, KeyRound, Pencil, Plus, Search, X } from 'lucide-react';
import { formatDate, getInitials } from '@/lib/helpers';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useSupabaseTableList } from '@/hooks/use-supabase-table-list';
import { useUserRoleOptions } from '@/hooks/use-user-role-options';
import { useUserManagementMutations } from '@/hooks/use-user-management-mutations';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canManageUsers } from '@/lib/acadia/roles';
import { UserStatus } from '@/app/models/user';
import {
  getUserStatusProps,
  UserStatusProps,
} from '@/app/(protected)/user-management/users/constants/status';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge, BadgeDot, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserFormDialog } from '@/components/acadia/admin/user-form-dialog';
import { useTranslation } from '@/hooks/useTranslation';

const SELECT = `
  id,
  email,
  name,
  status,
  createdAt,
  lastSignInAt,
  isProtected,
  roleId,
  UserRole:roleId ( slug, name )
`;

type UserRow = {
  id: string;
  email?: string;
  name?: string;
  status?: string;
  createdAt?: string;
  lastSignInAt?: string | null;
  isProtected?: boolean;
  roleId?: string;
  UserRole?: unknown;
} & Record<string, unknown>;

export function UsersDataGrid() {
  const { t } = useTranslation();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { data: session } = useAcadiaCollegeSession();
  const { setUserStatus, sendPasswordReset } = useUserManagementMutations();
  const canManage = canManageUsers(session?.roleSlug);
  const { data: roleList = [], isLoading: rolesLoading } = useUserRoleOptions();

  const { data: users = [], isLoading, isError, error } =
    useSupabaseTableList<UserRow>('User', SELECT);

  const filteredUsers = useMemo(() => {
    let rows = users;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (row) =>
          String(row.email ?? '')
            .toLowerCase()
            .includes(q) ||
          String(row.name ?? '')
            .toLowerCase()
            .includes(q),
      );
    }
    if (selectedRole !== 'all') {
      rows = rows.filter((row) => row.roleId === selectedRole);
    }
    if (selectedStatus !== 'all') {
      rows = rows.filter((row) => String(row.status) === selectedStatus);
    }
    return rows;
  }, [users, searchQuery, selectedRole, selectedStatus]);

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        id: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('admin.user')} visibility={true} column={column} />
        ),
        cell: ({ row }) => {
          const user = row.original;
          const initials = getInitials(user.name || user.email);

          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-px">
                <div className="font-medium text-sm">{user.name || '—'}</div>
                <div className="text-muted-foreground text-xs">{user.email}</div>
              </div>
            </div>
          );
        },
        size: 300,
        meta: {
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ),
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        id: 'role',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('admin.role')} visibility={true} column={column} />
        ),
        cell: ({ row }) => {
          const role = unwrapRelation<{ name?: string }>(row.original.UserRole);
          return role?.name ? (
            <Badge variant="secondary">{role.name}</Badge>
          ) : (
            '—'
          );
        },
        size: 150,
        meta: { skeleton: <Skeleton className="w-28 h-7" /> },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('common.labels.status')} visibility={true} column={column} />
        ),
        cell: ({ row }) => {
          const status = row.original.status as UserStatus;
          const statusProps = getUserStatusProps(status);
          const variant = statusProps.variant as keyof BadgeProps['variant'];

          return (
            <Badge variant={variant} appearance="ghost">
              <BadgeDot />
              {t(`admin.status.${status}`, { defaultValue: statusProps.label })}
            </Badge>
          );
        },
        size: 125,
        meta: { skeleton: <Skeleton className="w-14 h-7" /> },
        enableSorting: true,
      },
      {
        accessorKey: 'createdAt',
        id: 'createdAt',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('admin.joined')} visibility={true} column={column} />
        ),
        cell: (info) => {
          const value = info.getValue() as string | undefined;
          return value ? formatDate(new Date(value)) : '—';
        },
        size: 150,
        meta: { skeleton: <Skeleton className="w-20 h-7" /> },
        enableSorting: true,
      },
      ...(canManage
        ? [
            {
              id: 'manage',
              header: '',
              cell: ({ row }: { row: { original: UserRow } }) => {
                const user = row.original;
                const email = String(user.email ?? '');
                const status = String(user.status ?? '');
                const isProtected = Boolean(user.isProtected);

                return (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild aria-label={t('admin.editUser')}>
                      <Link href={`/admin/users/${user.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    {!isProtected ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={t('admin.moreActions')}>
                            <KeyRound className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => sendPasswordReset.mutate(String(user.id))}
                          >
                            {t('admin.sendPasswordReset')}
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
                              {t('admin.activateAccount')}
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
                              {t('admin.deactivateAccount')}
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
                              {t('admin.blockAccount')}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                );
              },
              size: 80,
              enableSorting: false,
              enableHiding: false,
            } as ColumnDef<UserRow>,
          ]
        : []),
      {
        id: 'actions',
        header: '',
        cell: () => (
          <ChevronRight className="text-muted-foreground/70 size-3.5" />
        ),
        size: 40,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [canManage, sendPasswordReset, setUserStatus, t],
  );

  const table = useReactTable({
    columns,
    data: filteredUsers,
    pageCount: Math.ceil(filteredUsers.length / pagination.pageSize) || 1,
    getRowId: (row) => row.id,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  const DataGridToolbar = () => {
    const [inputValue, setInputValue] = useState(searchQuery);

    const handleSearch = () => {
      setSearchQuery(inputValue);
      setPagination({ ...pagination, pageIndex: 0 });
    };

    return (
      <CardHeader className="flex-col flex-wrap sm:flex-row items-stretch sm:items-center py-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder={t('admin.searchUsers')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={isLoading}
              className="ps-9 w-full sm:w-40 md:w-64"
            />
            {searchQuery.length > 0 && (
              <Button
                mode="icon"
                variant="dim"
                className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => {
                  setSearchQuery('');
                  setInputValue('');
                }}
              >
                <X />
              </Button>
            )}
          </div>
          <Select
            value={selectedRole}
            onValueChange={(value) => {
              setSelectedRole(value);
              setPagination({ ...pagination, pageIndex: 0 });
            }}
            disabled={isLoading || rolesLoading}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder={t('admin.filterByRole')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allRoles')}</SelectItem>
              {roleList.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
              setPagination({ ...pagination, pageIndex: 0 });
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder={t('admin.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allUsers')}</SelectItem>
              {Object.entries(UserStatusProps).map(([status]) => (
                <SelectItem key={status} value={status}>
                  {t(`admin.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManage ? (
          <div className="flex items-center justify-end">
            <Button disabled={isLoading} onClick={() => setDialogOpen(true)}>
              <Plus />
              {t('admin.addUser')}
            </Button>
          </div>
        ) : null}
      </CardHeader>
    );
  };

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : t('admin.loadUsersFailed')}
      </p>
    );
  }

  return (
    <>
      <DataGrid
        table={table}
        recordCount={filteredUsers.length}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
        tableLayout={{
          columnsResizable: true,
          columnsPinnable: true,
          columnsMovable: true,
          columnsVisibility: true,
        }}
        tableClassNames={{ edgeCell: 'px-5' }}
      >
        <Card>
          <DataGridToolbar />
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>
      {canManage ? (
        <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      ) : null}
    </>
  );
}
