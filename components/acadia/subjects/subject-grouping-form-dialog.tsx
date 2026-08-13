'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  subjectGroupingFormSchema,
  type SubjectGroupingFormValues,
} from '@/lib/acadia/subject-catalog';
import { useSubjectGroupingMutations } from '@/hooks/use-subject-grouping-mutations';
import { useTranslation } from '@/hooks/useTranslation';

export type SubjectGroupingRow = {
  id: string;
  nameEn: string;
  nameFr: string;
  code: string | null;
  sortOrder: number;
};

export function SubjectGroupingFormDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: SubjectGroupingRow | null;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const { createGrouping, updateGrouping } = useSubjectGroupingMutations();

  const form = useForm<SubjectGroupingFormValues>({
    resolver: zodResolver(subjectGroupingFormSchema),
    defaultValues: {
      nameEn: '',
      nameFr: '',
      code: '',
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        nameEn: record.nameEn,
        nameFr: record.nameFr,
        code: record.code ?? '',
        sortOrder: record.sortOrder,
      });
    } else {
      form.reset({
        nameEn: '',
        nameFr: '',
        code: '',
        sortOrder: 0,
      });
    }
  }, [open, record, form]);

  const pending = createGrouping.isPending || updateGrouping.isPending;

  const onSubmit = (values: SubjectGroupingFormValues) => {
    if (isEdit && record) {
      updateGrouping.mutate(
        { id: record.id, values },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createGrouping.mutate(values, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('subjects.editGrouping') : t('subjects.newGrouping')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.labels.nameEn')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.labels.nameFr')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.labels.optionalCode')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SCI-BLOCK" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.labels.sortOrder')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                {isEdit ? t('common.buttons.save') : t('common.buttons.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
