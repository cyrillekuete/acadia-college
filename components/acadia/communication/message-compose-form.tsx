'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  directMessageSchema,
  type DirectMessageFormValues,
} from '@/lib/acadia/communication-schemas';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import { useTenantUserOptions } from '@/hooks/use-tenant-user-options';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

export function MessageComposeForm({ onCancelHref }: { onCancelHref: string }) {
  const { data: session } = useAcadiaCollegeSession();
  const { data: users = [], isLoading: usersLoading } = useTenantUserOptions(
    session?.profile?.id,
  );
  const { createDirectMessage } = useCommunicationMutations();

  const form = useForm<DirectMessageFormValues>({
    resolver: zodResolver(directMessageSchema),
    defaultValues: {
      recipientUserId: '',
      subjectEn: '',
      subjectFr: '',
      body: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createDirectMessage.mutateAsync(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 max-w-lg">
        <FormField
          control={form.control}
          name="recipientUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={usersLoading ? 'Loading…' : 'Select user'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                      {user.roleSlug ? ` (${user.roleSlug})` : ''}
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
          name="subjectEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject (English)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subjectFr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject (French, optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea rows={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={createDirectMessage.isPending}>
            {createDirectMessage.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Send message
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
