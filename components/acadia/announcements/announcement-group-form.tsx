'use client';

import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { alertGroupSchema, type AlertGroupFormValues } from '@/lib/acadia/alert-schemas';
import { isGuardian } from '@/lib/acadia/roles';
import { useAlertMutations } from '@/hooks/use-alert-mutations';
import { useTenantUserOptions } from '@/hooks/use-tenant-user-options';
import { useTranslation } from '@/hooks/useTranslation';

export function AnnouncementGroupForm({
  groupId,
  defaultValues,
  onCancel,
  onSaved,
}: {
  groupId?: string;
  defaultValues?: Partial<AlertGroupFormValues>;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const { data: users = [] } = useTenantUserOptions();
  const { saveAlertGroup } = useAlertMutations();
  const guardians = useMemo(
    () => users.filter((user) => isGuardian(user.roleSlug)),
    [users],
  );

  const form = useForm<AlertGroupFormValues>({
    resolver: zodResolver(alertGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      guardianUserIds: [],
      ...defaultValues,
    },
  });

  const selected = form.watch('guardianUserIds');

  const toggleMember = (userId: string, checked: boolean) => {
    const current = form.getValues('guardianUserIds');
    if (checked) {
      form.setValue('guardianUserIds', Array.from(new Set([...current, userId])));
      return;
    }
    form.setValue(
      'guardianUserIds',
      current.filter((id) => id !== userId),
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await saveAlertGroup.mutateAsync({ values, groupId });
    onSaved?.();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.labels.name')}</FormLabel>
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
            <FormItem>
              <FormLabel>{t('common.labels.description')}</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>{t('communication.groupGuardians')}</FormLabel>
          <p className="text-xs text-muted-foreground mb-2">
            {t('communication.membersSelected', { count: selected.length })}
          </p>
          <div className="max-h-56 overflow-y-auto rounded-md border p-3 space-y-2">
            {guardians.map((user) => (
              <label key={user.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(user.id)}
                  onCheckedChange={(checked) =>
                    toggleMember(user.id, checked === true)
                  }
                />
                <span>
                  {user.name}
                  {user.email ? ` · ${user.email}` : ''}
                </span>
              </label>
            ))}
          </div>
          <FormMessage>{form.formState.errors.guardianUserIds?.message}</FormMessage>
        </FormItem>

        <div className="flex gap-2">
          <Button type="submit" disabled={saveAlertGroup.isPending}>
            {saveAlertGroup.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            {groupId ? t('communication.updateGroup') : t('communication.createGroup')}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.buttons.cancel')}
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
