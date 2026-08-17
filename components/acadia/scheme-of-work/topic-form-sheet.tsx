'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { RichTextEditor } from '@/components/acadia/rich-text-editor';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  schemeOfWorkTopicSchema,
  type SchemeOfWorkTopicFormValues,
} from '@/lib/acadia/scheme-of-work-schemas';
import { normalizeRichText } from '@/lib/acadia/sanitize-html';
import { useTranslation } from '@/hooks/useTranslation';

const EMPTY_VALUES: SchemeOfWorkTopicFormValues = {
  parentTopicId: '',
  titleEn: '',
  titleFr: '',
  descriptionEn: '',
  descriptionFr: '',
};

export function SchemeTopicFormSheet({
  open,
  onOpenChange,
  defaultValues,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<SchemeOfWorkTopicFormValues>;
  pending?: boolean;
  onSubmit: (values: SchemeOfWorkTopicFormValues) => void;
}) {
  const { t } = useTranslation();
  const form = useForm<SchemeOfWorkTopicFormValues>({
    resolver: zodResolver(schemeOfWorkTopicSchema),
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  });
  const isEdit = Boolean(defaultValues?.titleEn);
  const isSubTopic = Boolean(defaultValues?.parentTopicId);

  useEffect(() => {
    if (open) {
      form.reset({ ...EMPTY_VALUES, ...defaultValues });
    }
  }, [open, defaultValues, form]);

  const title = isEdit
    ? t('schemeOfWork.editTopic')
    : isSubTopic
      ? t('schemeOfWork.addSubTopic')
      : t('schemeOfWork.addTopic');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="z-[60] inset-5 start-auto h-auto gap-0 rounded-lg p-0 sm:w-[720px] sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{title}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('schemeOfWork.createSheetDescription')}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <div className="px-5 py-2.5">
              {open ? (
                <Form {...form}>
                  <form
                    id="scheme-topic-form"
                    className="space-y-4"
                    onSubmit={form.handleSubmit((values) =>
                      onSubmit({
                        ...values,
                        parentTopicId: values.parentTopicId ?? defaultValues?.parentTopicId ?? '',
                        descriptionEn: normalizeRichText(values.descriptionEn),
                        descriptionFr: normalizeRichText(values.descriptionFr),
                      }),
                    )}
                  >
                    <input type="hidden" {...form.register('parentTopicId')} />
                    <FormField
                      control={form.control}
                      name="titleEn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('schemeOfWork.topicTitle')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descriptionEn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('schemeOfWork.topicNotes')}</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              placeholder={t('schemeOfWork.topicNotes')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : null}
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-border border-t p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.buttons.cancel')}
          </Button>
          <Button type="submit" form="scheme-topic-form" disabled={pending}>
            {t('common.buttons.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
