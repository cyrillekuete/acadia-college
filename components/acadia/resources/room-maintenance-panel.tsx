'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
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
  roomMaintenanceSchema,
  type RoomMaintenanceFormValues,
} from '@/lib/acadia/resources-schemas';
import { roomMaintenanceStatusLabel } from '@/lib/acadia/resources';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { useRoomOptions } from '@/hooks/use-course-catalog-options';
import { useResourceMutations } from '@/hooks/use-resource-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManageResources } from '@/lib/acadia/roles';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { Skeleton } from '@/components/ui/skeleton';

export function RoomMaintenancePanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageResources(session?.roleSlug);
  const { data: rooms = [] } = useRoomOptions();
  const { scheduleRoomMaintenance } = useResourceMutations();

  const form = useForm<RoomMaintenanceFormValues>({
    resolver: zodResolver(roomMaintenanceSchema),
    defaultValues: {
      roomId: '',
      title: '',
      description: '',
      scheduledOn: formatLocalDateInputValue(),
      status: 'SCHEDULED',
    },
  });

  const query = useQuery({
    queryKey: ['room-maintenance', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('RoomMaintenanceSchedule')
        .select(
          `
          id,
          title,
          description,
          scheduledOn,
          status,
          Room:roomId ( code, nameEn )
        `,
        )
        .eq('tenantId', tenantId!)
        .order('scheduledOn', { ascending: true });
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

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              scheduleRoomMaintenance.mutate(values, {
                onSuccess: () =>
                  form.reset({
                    roomId: '',
                    title: '',
                    description: '',
                    scheduledOn: formatLocalDateInputValue(),
                    status: 'SCHEDULED',
                  }),
              }),
            )}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.code} — {room.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        [
                          'SCHEDULED',
                          'IN_PROGRESS',
                          'COMPLETED',
                          'CANCELLED',
                        ] as const
                      ).map((value) => (
                        <SelectItem key={value} value={value}>
                          {roomMaintenanceStatusLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={scheduleRoomMaintenance.isPending}
            >
              {scheduleRoomMaintenance.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Schedule maintenance
            </Button>
          </form>
        </Form>
      ) : null}

      {query.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(query.data ?? []).map((row) => {
              const room = unwrapRelation<{ code?: string; nameEn?: string }>(
                row.Room,
              );
              return (
                <TableRow key={row.id as string}>
                  <TableCell>
                    {room?.code} — {room?.nameEn}
                  </TableCell>
                  <TableCell className="font-medium">{String(row.title)}</TableCell>
                  <TableCell>{String(row.scheduledOn)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {roomMaintenanceStatusLabel(String(row.status))}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
