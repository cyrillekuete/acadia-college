'use client';

import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  resourceAllocationSchema,
  resourceUsageLogSchema,
  schoolResourceSchema,
  type ResourceAllocationFormValues,
  type ResourceUsageLogFormValues,
  type SchoolResourceFormValues,
} from '@/lib/acadia/resources-schemas';
import {
  resourceAllocationStatusLabel,
  resolveAllocationStatus,
  schoolResourceTypeLabel,
  summarizeInventoryResource,
} from '@/lib/acadia/resources';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { useResourceMutations } from '@/hooks/use-resource-mutations';
import { useTenantUserOptions } from '@/hooks/use-tenant-user-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManageResources } from '@/lib/acadia/roles';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { Skeleton } from '@/components/ui/skeleton';

export function ResourcesOverviewPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageResources(session?.roleSlug);
  const { data: users = [] } = useTenantUserOptions();
  const {
    createSchoolResource,
    saveAllocation,
    returnAllocation,
    logResourceUsage,
  } = useResourceMutations();

  const inventoryQuery = useQuery({
    queryKey: ['school-resources', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SchoolResource')
        .select(
          `
          id,
          code,
          nameEn,
          nameFr,
          resourceType,
          totalQuantity,
          location,
          isActive,
          ResourceAllocation ( id, status, quantity, expectedReturnOn, returnedAt ),
          ResourceUsageLog ( quantity, usedOn )
        `,
        )
        .eq('tenantId', tenantId!)
        .order('code');
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => {
        const allocations = (row.ResourceAllocation ?? []) as Array<{
          status: string;
          quantity: number;
          expectedReturnOn?: string | null;
          returnedAt?: string | null;
        }>;
        const usageLogs = (row.ResourceUsageLog ?? []) as Array<{
          quantity: number;
          usedOn: string;
        }>;
        const summary = summarizeInventoryResource({
          id: row.id as string,
          code: String(row.code),
          nameEn: String(row.nameEn),
          totalQuantity: Number(row.totalQuantity),
          allocations,
          usageLogs,
        });
        return { ...row, summary };
      });
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  const resourceOptions = useMemo(
    () =>
      (inventoryQuery.data ?? [])
        .filter((r) => r.isActive)
        .map((r) => ({
          id: r.id as string,
          label: `${r.code} — ${r.nameEn}`,
          available: r.summary.available,
        })),
    [inventoryQuery.data],
  );

  const resourceForm = useForm<SchoolResourceFormValues>({
    resolver: zodResolver(schoolResourceSchema),
    defaultValues: {
      code: '',
      nameEn: '',
      nameFr: '',
      resourceType: 'EQUIPMENT',
      totalQuantity: 1,
      location: '',
      isActive: true,
    },
  });

  const allocationForm = useForm<ResourceAllocationFormValues>({
    resolver: zodResolver(resourceAllocationSchema),
    defaultValues: {
      resourceId: '',
      allocatedToUserId: '',
      quantity: 1,
      allocatedOn: formatLocalDateInputValue(),
      expectedReturnOn: '',
      notes: '',
    },
  });

  const usageForm = useForm<ResourceUsageLogFormValues>({
    resolver: zodResolver(resourceUsageLogSchema),
    defaultValues: {
      resourceId: '',
      userId: session?.profile?.id ?? '',
      usedOn: formatLocalDateInputValue(),
      quantity: 1,
      purpose: '',
    },
  });

  const allocationsQuery = useQuery({
    queryKey: ['resource-allocations', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('ResourceAllocation')
        .select(
          `
          id,
          quantity,
          allocatedOn,
          expectedReturnOn,
          returnedAt,
          status,
          SchoolResource:resourceId ( code, nameEn ),
          User:allocatedToUserId ( name )
        `,
        )
        .eq('tenantId', tenantId!)
        .order('allocatedOn', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  if (inventoryQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(inventoryQuery.error)}
      </p>
    );
  }

  return (
    <Tabs defaultValue="inventory" className="space-y-4">
      <TabsList>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="allocations">Allocations</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
      </TabsList>

      <TabsContent value="inventory" className="space-y-4">
        {canManage ? (
          <Form {...resourceForm}>
            <form
              onSubmit={resourceForm.handleSubmit((values) =>
                createSchoolResource.mutate(values),
              )}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
            >
              <FormField
                control={resourceForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resourceForm.control}
                name="resourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          ['EQUIPMENT', 'BOOK', 'LAB', 'IT', 'OTHER'] as const
                        ).map((value) => (
                          <SelectItem key={value} value={value}>
                            {schoolResourceTypeLabel(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resourceForm.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (EN)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resourceForm.control}
                name="nameFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (FR)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resourceForm.control}
                name="totalQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resourceForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resourceForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 md:col-span-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="md:col-span-2"
                disabled={createSchoolResource.isPending}
              >
                {createSchoolResource.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Add resource
              </Button>
            </form>
          </Form>
        ) : null}

        {inventoryQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Total uses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(inventoryQuery.data ?? []).map((row) => (
                <TableRow key={row.id as string}>
                  <TableCell className="font-mono text-sm">{String(row.code)}</TableCell>
                  <TableCell>{String(row.nameEn)}</TableCell>
                  <TableCell>
                    {schoolResourceTypeLabel(String(row.resourceType))}
                  </TableCell>
                  <TableCell>{row.summary.available}</TableCell>
                  <TableCell>{row.summary.allocated}</TableCell>
                  <TableCell>{row.summary.totalUses}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="allocations" className="space-y-4">
        {canManage ? (
          <Form {...allocationForm}>
            <form
              onSubmit={allocationForm.handleSubmit((values) =>
                saveAllocation.mutate(values),
              )}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
            >
              <FormField
                control={allocationForm.control}
                name="resourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resourceOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label} ({opt.available} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={allocationForm.control}
                name="allocatedToUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={allocationForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={allocationForm.control}
                name="allocatedOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocated on</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={allocationForm.control}
                name="expectedReturnOn"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Expected return (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="md:col-span-2"
                disabled={saveAllocation.isPending}
              >
                Record allocation
              </Button>
            </form>
          </Form>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(allocationsQuery.data ?? []).map((row) => {
              const resource = unwrapRelation<{ code?: string; nameEn?: string }>(
                row.SchoolResource,
              );
              const user = unwrapRelation<{ name?: string }>(row.User);
              const effective = resolveAllocationStatus({
                status: String(row.status),
                quantity: Number(row.quantity),
                expectedReturnOn: row.expectedReturnOn as string | null,
                returnedAt: row.returnedAt as string | null,
              });
              return (
                <TableRow key={row.id as string}>
                  <TableCell>
                    {resource?.code} — {resource?.nameEn}
                  </TableCell>
                  <TableCell>{user?.name ?? '—'}</TableCell>
                  <TableCell>{String(row.quantity)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        effective === 'OVERDUE' ? 'destructive' : 'secondary'
                      }
                    >
                      {resourceAllocationStatusLabel(effective)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && effective !== 'RETURNED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => returnAllocation.mutate(row.id as string)}
                      >
                        Mark returned
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="usage" className="space-y-4">
        {canManage ? (
          <Form {...usageForm}>
            <form
              onSubmit={usageForm.handleSubmit((values) =>
                logResourceUsage.mutate(values),
              )}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
            >
              <FormField
                control={usageForm.control}
                name="resourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resourceOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={usageForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Used by</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={usageForm.control}
                name="usedOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={usageForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={usageForm.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Purpose</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="md:col-span-2">
                Log usage
              </Button>
            </form>
          </Form>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Usage totals appear in the inventory tab (total uses column). Log
          daily check-outs, lab sessions, or shared equipment sign-outs here.
        </p>
      </TabsContent>
    </Tabs>
  );
}
