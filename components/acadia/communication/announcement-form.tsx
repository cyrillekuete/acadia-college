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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  announcementSchema,
  type AnnouncementFormValues,
} from '@/lib/acadia/communication-schemas';
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_KINDS,
} from '@/lib/acadia/communication';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import { useTranslation } from '@/hooks/useTranslation';

export function AnnouncementForm({
  onCancelHref,
  announcementId,
  defaultValues,
}: {
  onCancelHref: string;
  announcementId?: string;
  defaultValues?: Partial<AnnouncementFormValues>;
}) {
  const { t } = useTranslation();
  const { saveAnnouncement } = useCommunicationMutations();

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      kind: 'BROADCAST',
      titleEn: '',
      titleFr: '',
      bodyEn: '',
      bodyFr: '',
      audience: 'ALL',
      eventStartsAt: '',
      eventEndsAt: '',
      eventLocation: '',
      publishAt: '',
      publishNow: false,
      ...defaultValues,
    },
  });

  const kind = form.watch('kind');
  const publishNow = form.watch('publishNow');

  const onSubmit = form.handleSubmit(async (values) => {
    await saveAnnouncement.mutateAsync({ values, announcementId });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.labels.type')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ANNOUNCEMENT_KINDS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === 'EVENT'
                        ? t('communication.eventNotification')
                        : t('communication.schoolBroadcast')}
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
          name="audience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.labels.audience')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ANNOUNCEMENT_AUDIENCES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`communication.audience.${value}`)}
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
          name="titleEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.labels.titleEn')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="titleFr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.labels.titleFr')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bodyEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.labels.bodyEn')}</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bodyFr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.labels.bodyFr')}</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {kind === 'EVENT' ? (
          <>
            <FormField
              control={form.control}
              name="eventStartsAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('communication.eventStart')}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventEndsAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('communication.eventEndOptional')}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.labels.location')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : null}

        <FormField
          control={form.control}
          name="publishNow"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <FormLabel className="mb-0">{t('communication.publishImmediately')}</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {!publishNow ? (
          <FormField
            control={form.control}
            name="publishAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('communication.schedulePublish')}</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={saveAnnouncement.isPending}>
            {saveAnnouncement.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            {announcementId
              ? t('communication.updateAnnouncement')
              : t('communication.saveAnnouncement')}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>{t('common.buttons.cancel')}</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
