'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  resourceRequestReviewSchema,
  resourceRequestSchema,
  type ResourceRequestFormValues,
  type ResourceRequestReviewValues,
} from '@/lib/acadia/resources-schemas';
import { resourceRequestStatusLabel } from '@/lib/acadia/resources';
import { useResourceMutations } from '@/hooks/use-resource-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManageResources, canRequestResources } from '@/lib/acadia/roles';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { Skeleton } from '@/components/ui/skeleton';

export function ResourceRequestsPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageResources(session?.roleSlug);
  const canRequest = canRequestResources(session?.roleSlug);
  const { submitResourceRequest, reviewResourceRequest } = useResourceMutations();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: ['school-resources', tenantId, 'active-only'],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SchoolResource')
        .select('id, code, nameEn')
        .eq('tenantId', tenantId!)
        .eq('isActive', true)
        .order('code');
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

  const requestsQuery = useQuery({
    queryKey: ['resource-requests', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('ResourceRequest')
        .select(
          `
          id,
          quantity,
          purpose,
          status,
          createdAt,
          reviewNotes,
          SchoolResource:resourceId ( code, nameEn ),
          Requester:requestedByUserId ( name )
        `,
        )
        .eq('tenantId', tenantId!)
        .order('createdAt', { ascending: false });
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

  const requestForm = useForm<ResourceRequestFormValues>({
    resolver: zodResolver(resourceRequestSchema),
    defaultValues: { resourceId: '', quantity: 1, purpose: '' },
  });

  const reviewForm = useForm<ResourceRequestReviewValues>({
    resolver: zodResolver(resourceRequestReviewSchema),
    defaultValues: { status: 'APPROVED', reviewNotes: '' },
  });

  if (requestsQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(requestsQuery.error)}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {canRequest ? (
        <Form {...requestForm}>
          <form
            onSubmit={requestForm.handleSubmit((values) =>
              submitResourceRequest.mutate(values, {
                onSuccess: () => requestForm.reset(),
              }),
            )}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
          >
            <FormField
              control={requestForm.control}
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
                      {(resourcesQuery.data ?? []).map((row) => (
                        <SelectItem key={row.id as string} value={row.id as string}>
                          {String(row.code)} — {String(row.nameEn)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={requestForm.control}
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
              control={requestForm.control}
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
              Submit request
            </Button>
          </form>
        </Form>
      ) : null}

      {requestsQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Purpose</TableHead>
              {canManage ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requestsQuery.data ?? []).map((row) => {
              const resource = unwrapRelation<{ code?: string; nameEn?: string }>(
                row.SchoolResource,
              );
              const requester = unwrapRelation<{ name?: string }>(row.Requester);
              const status = String(row.status);
              return (
                <TableRow key={row.id as string}>
                  <TableCell>
                    {resource?.code} — {resource?.nameEn}
                  </TableCell>
                  <TableCell>{requester?.name ?? '—'}</TableCell>
                  <TableCell>{String(row.quantity)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {resourceRequestStatusLabel(status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {String(row.purpose ?? '')}
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      {status === 'PENDING' || status === 'APPROVED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewingId(row.id as string)}
                        >
                          Review
                        </Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {reviewingId && canManage ? (
        <Form {...reviewForm}>
          <form
            onSubmit={reviewForm.handleSubmit((values) =>
              reviewResourceRequest.mutate(
                { requestId: reviewingId, values },
                { onSuccess: () => setReviewingId(null) },
              ),
            )}
            className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-2"
          >
            <FormField
              control={reviewForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        ['APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED'] as const
                      ).map((value) => (
                        <SelectItem key={value} value={value}>
                          {resourceRequestStatusLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={reviewForm.control}
              name="reviewNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Save review</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReviewingId(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  );
}
