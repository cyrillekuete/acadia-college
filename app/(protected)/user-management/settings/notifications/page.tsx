'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  AppWindowMac,
  Bell,
  LoaderCircleIcon,
  MailWarning,
  UserPlus,
  Users,
} from '@/lib/icons';
import { useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { UserRole } from '@/app/models/user';
import { apiFetch } from '@/lib/api';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardTable,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useSettings } from '../components/settings-context';
import {
  NotificationSettingsSchema,
  NotificationSettingsSchemaType,
} from '../forms/notification-settings-schema';

const notificationSettings = [
  {
    label: 'Stock Alerts',
    description: 'Notify when stock reaches the threshold.',
    emailField: 'notifyStockEmail',
    webField: 'notifyStockWeb',
    roleIdsField: 'notifyStockRoleIds',
  },
  {
    label: 'New Orders',
    description: 'Notify when new orders are received.',
    emailField: 'notifyNewOrderEmail',
    webField: 'notifyNewOrderWeb',
    roleIdsField: 'notifyNewOrderRoleIds',
  },
  {
    label: 'Order Status Updates',
    description: 'Notify when an order status is updated.',
    emailField: 'notifyOrderStatusUpdateEmail',
    webField: 'notifyOrderStatusUpdateWeb',
    roleIdsField: 'notifyOrderStatusUpdateRoleIds',
  },
  {
    label: 'Payment Failures',
    description: 'Notify when a payment failure occurs.',
    emailField: 'notifyPaymentFailureEmail',
    webField: 'notifyPaymentFailureWeb',
    roleIdsField: 'notifyPaymentFailureRoleIds',
  },
  {
    label: 'System Errors',
    description: 'Notify when system errors occur.',
    emailField: 'notifySystemErrorFailureEmail',
    webField: 'notifySystemErrorWeb',
    roleIdsField: 'notifySystemErrorRoleIds',
  },
];

type NotificationSettingRow = (typeof notificationSettings)[number];

function RoleIdsCell({
  roleIdsField,
  roles,
  toggleRoleSelection,
}: {
  roleIdsField: keyof NotificationSettingsSchemaType;
  roles: UserRole[];
  toggleRoleSelection: (
    field: keyof NotificationSettingsSchemaType,
    roleId: string,
  ) => void;
}) {
  const form = useFormContext<NotificationSettingsSchemaType>();
  const selectedIds =
    (form.watch(roleIdsField) as string[] | undefined) ?? [];

  return (
    <div className="flex items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" mode="icon" className="h-7! w-7!">
            <UserPlus className="size-3.5!" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start" side="bottom">
          <Command>
            <CommandInput placeholder="Search roles..." />
            <CommandList>
              <CommandEmpty>No roles found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea>
                  {roles?.map((role) => {
                    const isSelected = selectedIds.includes(role.id);
                    return (
                      <CommandItem
                        key={role.id}
                        onSelect={() => toggleRoleSelection(roleIdsField, role.id)}
                      >
                        <span className="grow">{role.name}</span>
                        {isSelected && <CommandCheck />}
                      </CommandItem>
                    );
                  })}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex items-center flex-wrap gap-2">
        {selectedIds.length > 0 ? (
          selectedIds.map((roleId) => {
            const role = roles.find((r) => r.id === roleId);
            return (
              <Badge key={roleId} variant="secondary">
                {role?.name}
              </Badge>
            );
          })
        ) : (
          <span className="text-muted-foreground">Not set</span>
        )}
      </div>
    </div>
  );
}

function NotificationCheckboxCell({
  name,
}: {
  name: keyof NotificationSettingsSchemaType;
}) {
  const form = useFormContext<NotificationSettingsSchemaType>();

  return (
    <div className="text-center">
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="items-center">
            <FormControl>
              <Checkbox
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

function NotificationSettingsTable({
  roles,
  toggleRoleSelection,
  handleReset,
  isProcessing,
}: {
  roles: UserRole[];
  toggleRoleSelection: (
    field: keyof NotificationSettingsSchemaType,
    roleId: string,
  ) => void;
  handleReset: () => void;
  isProcessing: boolean;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<NotificationSettingRow>[]>(
    () => [
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Notification"
            visibility
            column={column}
            icon={<Bell className="text-muted-foreground size-3.5" />}
          />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="text-md font-semibold">{row.original.label}</div>
            <div className="text-muted-foreground font-2sm font-regular">
              {row.original.description}
            </div>
          </div>
        ),
        size: 400,
        enableSorting: true,
      },
      {
        id: 'users',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Users"
            visibility
            column={column}
            icon={<Users className="text-muted-foreground size-3.5" />}
          />
        ),
        cell: ({ row }) => (
          <RoleIdsCell
            roleIdsField={
              row.original.roleIdsField as keyof NotificationSettingsSchemaType
            }
            roles={roles}
            toggleRoleSelection={toggleRoleSelection}
          />
        ),
        size: 280,
        enableSorting: false,
      },
      {
        id: 'email',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Email"
            visibility
            column={column}
            icon={<MailWarning className="text-muted-foreground size-3.5" />}
          />
        ),
        cell: ({ row }) => (
          <NotificationCheckboxCell
            name={
              row.original.emailField as keyof NotificationSettingsSchemaType
            }
          />
        ),
        size: 140,
        enableSorting: false,
        meta: { cellClassName: 'text-center' },
      },
      {
        id: 'web',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Web"
            visibility
            column={column}
            icon={<AppWindowMac className="text-muted-foreground size-3.5" />}
          />
        ),
        cell: ({ row }) => (
          <NotificationCheckboxCell
            name={row.original.webField as keyof NotificationSettingsSchemaType}
          />
        ),
        size: 140,
        enableSorting: false,
        meta: { cellClassName: 'text-center' },
      },
    ],
    [roles, toggleRoleSelection],
  );

  const table = useReactTable({
    data: notificationSettings,
    columns,
    state: { sorting, pagination },
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId: (row) => row.label,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={notificationSettings.length}
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter className="flex flex-wrap items-center justify-between gap-4 py-5 px-10">
          <DataGridPagination />
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing && <LoaderCircleIcon className="animate-spin" />}
              Save Settings
            </Button>
          </div>
        </CardFooter>
      </Card>
    </DataGrid>
  );
}

const NotificationSettingsPage = () => {
  const queryClient = useQueryClient();
  const { settings, roles } = useSettings();

  const form = useForm<NotificationSettingsSchemaType>({
    resolver: zodResolver(NotificationSettingsSchema),
    defaultValues: notificationSettings.reduce<
      Partial<NotificationSettingsSchemaType>
    >(
      (defaults, { emailField, webField, roleIdsField }) => {
        const saved = settings as NotificationSettingsSchemaType | null;
        return {
          ...defaults,
          [emailField]:
            saved?.[emailField as keyof NotificationSettingsSchemaType] ??
            false,
          [webField]:
            saved?.[webField as keyof NotificationSettingsSchemaType] ?? false,
          [roleIdsField]:
            saved?.[roleIdsField as keyof NotificationSettingsSchemaType] ?? [],
        };
      },
      {},
    ),
  });

  const mutation = useMutation({
    mutationFn: async (values: NotificationSettingsSchemaType) => {
      const response = await apiFetch(
        '/api/user-management/settings/notifications',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      toast.custom(
        () => (
          <Alert variant="mono" icon="success">
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Settings updated successfully</AlertTitle>
          </Alert>
        ),
        {
          position: 'top-center',
        },
      );

      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error: Error) => {
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive">
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>{error.message}</AlertTitle>
          </Alert>
        ),
        {
          position: 'top-center',
        },
      );
    },
  });

  const handleSubmit = (values: NotificationSettingsSchemaType) => {
    mutation.mutate(values);
  };

  const handleReset = () => {
    form.reset();
  };

  const toggleRoleSelection = (
    field: keyof NotificationSettingsSchemaType,
    roleId: string,
  ) => {
    const currentValues = form.getValues()[field] as string[];
    const updatedValues = currentValues.includes(roleId)
      ? currentValues.filter((id) => id !== roleId)
      : [...currentValues, roleId];

    form.setValue(field, updatedValues, { shouldDirty: true });
  };

  const isProcessing = mutation.status === 'pending';

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Form {...form}>
        <NotificationSettingsTable
          roles={roles}
          toggleRoleSelection={toggleRoleSelection}
          handleReset={handleReset}
          isProcessing={isProcessing}
        />
      </Form>
    </form>
  );
};

export default NotificationSettingsPage;
