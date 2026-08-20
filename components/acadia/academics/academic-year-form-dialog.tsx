'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_ACADEMIC_STRUCTURE } from '@/lib/acadia/academic-calendar';
import {
  academicYearSchema,
  type AcademicYearFormValues,
} from '@/lib/acadia/calendar-schemas';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import { useTranslation } from '@/hooks/useTranslation';

type AcademicYearRow = {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  isActive?: boolean;
  termsPerYear?: number;
  sequencesPerTerm?: number;
  sequencesPerYear?: number;
  enrollmentOpensAt?: string | null;
  enrollmentClosesAt?: string | null;
};

function toFormDate(value: string | null | undefined): string {
  return value ? String(value).slice(0, 10) : '';
}

export function AcademicYearFormDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: AcademicYearRow | null;
}) {
  const { t } = useTranslation();
  const { createAcademicYear, updateAcademicYear } = useAcademicCalendarMutations();
  const isEdit = !!record;

  const form = useForm<AcademicYearFormValues>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      label: '',
      startsOn: '',
      endsOn: '',
      isCurrent: false,
      isActive: true,
      termsPerYear: DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
      sequencesPerTerm: DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
      sequencesPerYear: DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
      enrollmentOpensAt: '',
      enrollmentClosesAt: '',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        label: record.label,
        startsOn: toFormDate(record.startsOn),
        endsOn: toFormDate(record.endsOn),
        isCurrent: !!record.isCurrent,
        isActive: record.isActive !== false,
        termsPerYear: record.termsPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
        sequencesPerTerm:
          record.sequencesPerTerm ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
        sequencesPerYear:
          record.sequencesPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
        enrollmentOpensAt: toFormDate(record.enrollmentOpensAt),
        enrollmentClosesAt: toFormDate(record.enrollmentClosesAt),
      });
    } else {
      form.reset({
        label: '',
        startsOn: '',
        endsOn: '',
        isCurrent: false,
        isActive: true,
        termsPerYear: DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
        sequencesPerTerm: DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
        sequencesPerYear: DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
        enrollmentOpensAt: '',
        enrollmentClosesAt: '',
      });
    }
  }, [open, record, form]);

  const pending = createAcademicYear.isPending || updateAcademicYear.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record) {
      await updateAcademicYear.mutateAsync({ id: record.id, values });
    } else {
      await createAcademicYear.mutateAsync(values);
    }
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{isEdit ? t('academics.editYear') : t('academics.newYear')}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('academics.yearFormDescription')}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
            <SheetBody className="p-0">
              <ScrollArea className="h-[calc(100vh-10.5rem)]">
                <div className="space-y-4 px-5 py-2.5">
              {!isEdit ? (
                <p className="text-sm text-muted-foreground">
                  {t('academics.yearCreateHint')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('academics.yearEditHint')}
                </p>
              )}
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.labels.label')}</FormLabel>
                    <FormControl>
                      <Input placeholder="2025-2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startsOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.labels.starts')}</FormLabel>
                      <FormControl>
                        <DatePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endsOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.labels.ends')}</FormLabel>
                      <FormControl>
                        <DatePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="termsPerYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academics.termsPerYear')}</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={isEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
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
                  name="sequencesPerTerm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academics.seqPerTerm')}</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={isEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
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
                  name="sequencesPerYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academics.seqPerYear')}</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={isEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="enrollmentOpensAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academics.enrollmentOpens')}</FormLabel>
                      <FormControl>
                        <DatePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enrollmentClosesAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academics.enrollmentCloses')}</FormLabel>
                      <FormControl>
                        <DatePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('academics.enrollmentMilestonesHint')}
              </p>
              <FormField
                control={form.control}
                name="isCurrent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <FormLabel>{t('academics.currentYear')}</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      {isEdit && record?.isCurrent
                        ? t('academics.currentYearLockedHint')
                        : t('academics.currentYearHint')}
                    </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        disabled={Boolean(isEdit && record?.isCurrent && field.value)}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border p-3">
                    <FormLabel>{t('common.labels.active')}</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        disabled={Boolean(form.watch('isCurrent'))}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
                </div>
              </ScrollArea>
            </SheetBody>
            <SheetFooter className="border-t border-border p-5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                {isEdit ? t('common.messages.saveChanges') : t('academics.createYear')}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
