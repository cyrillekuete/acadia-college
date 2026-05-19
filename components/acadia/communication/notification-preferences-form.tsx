'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  notificationPreferenceSchema,
  type NotificationPreferenceFormValues,
} from '@/lib/acadia/communication-schemas';
import { NOTIFICATION_EVENTS } from '@/lib/acadia/communication';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import { useAcadiaNotificationPreferences } from '@/hooks/use-acadia-notification-preferences';

export function NotificationPreferencesForm() {
  const { data: preferences = [] } = useAcadiaNotificationPreferences();
  const { upsertNotificationPreference } = useCommunicationMutations();

  const form = useForm<NotificationPreferenceFormValues>({
    resolver: zodResolver(notificationPreferenceSchema),
    defaultValues: {
      event: NOTIFICATION_EVENTS[0],
      inApp: true,
      email: true,
    },
  });

  const selectedEvent = form.watch('event');
  const existing = preferences.find((p) => p.event === selectedEvent);

  const loadPreference = (event: string) => {
    const row = preferences.find((p) => p.event === event);
    form.reset({
      event: event as NotificationPreferenceFormValues['event'],
      inApp: row?.inApp ?? true,
      email: row?.email ?? true,
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await upsertNotificationPreference.mutateAsync(values);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="event"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      loadPreference(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NOTIFICATION_EVENTS.map((event) => (
                        <SelectItem key={event} value={event}>
                          {event}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {existing ? (
                    <p className="text-xs text-muted-foreground">
                      Last updated {new Date(existing.updatedAt).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No saved preference — defaults apply until you save.
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inApp"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="mb-0">In-app notifications</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="mb-0">Email notifications</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={upsertNotificationPreference.isPending}>
              {upsertNotificationPreference.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Save preference
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
