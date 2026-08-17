'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  directMessageSchema,
  type DirectMessageFormValues,
} from '@/lib/acadia/communication-schemas';
import { isGuardian } from '@/lib/acadia/roles';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import { useTenantUserOptions } from '@/hooks/use-tenant-user-options';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { fetchWhatsAppConfigured } from '@/lib/acadia/whatsapp-request';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';

export function MessageComposeForm({ onCancelHref }: { onCancelHref: string }) {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const { data: users = [], isLoading: usersLoading } = useTenantUserOptions(
    session?.profile?.id,
  );
  const { createDirectMessage } = useCommunicationMutations();
  const whatsappQuery = useQuery({
    queryKey: ['whatsapp-configured'],
    queryFn: fetchWhatsAppConfigured,
  });
  const whatsappConfigured = whatsappQuery.data === true;

  const form = useForm<DirectMessageFormValues>({
    resolver: zodResolver(directMessageSchema),
    defaultValues: {
      recipientUserId: '',
      subjectEn: '',
      subjectFr: '',
      body: '',
      sendWhatsApp: false,
    },
  });

  const recipientUserId = form.watch('recipientUserId');
  const recipient = users.find((user) => user.id === recipientUserId);
  const showWhatsApp = isGuardian(recipient?.roleSlug);

  const onSubmit = form.handleSubmit(async (values) => {
    await createDirectMessage.mutateAsync({
      ...values,
      sendWhatsApp: showWhatsApp && Boolean(values.sendWhatsApp),
    });
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

        {showWhatsApp ? (
          <FormField
            control={form.control}
            name="sendWhatsApp"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 rounded-md border p-3">
                <FormControl>
                  <Checkbox
                    checked={Boolean(field.value)}
                    disabled={!whatsappConfigured}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel className="font-normal">
                    {t('communication.sendWhatsApp')}
                  </FormLabel>
                  <FormDescription>
                    {whatsappConfigured
                      ? t('communication.sendWhatsAppDescription')
                      : t('communication.whatsappNotConfigured')}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        ) : null}

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
