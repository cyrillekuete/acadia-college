'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_ACADEMIC_STRUCTURE,
  numberInTermForSequence,
  termNumberForSequence,
} from '@/lib/acadia/academic-calendar';
import {
  sequenceSchemaForStructure,
  type SequenceFormValues,
} from '@/lib/acadia/calendar-schemas';
import { termLabel } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import {
  useAcademicYearOptions,
  useTermOptions,
} from '@/hooks/use-academic-calendar-options';
import { useAcademicYearStructure } from '@/hooks/use-academic-year-structure';
import { useTranslation } from '@/hooks/useTranslation';

type SequenceRow = {
  id: string;
  number: number;
  numberInTerm: number;
  termId: string;
  academicYearId: string;
};

export function SequenceFormDialog({
  open,
  onOpenChange,
  record,
  defaultAcademicYearId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: SequenceRow | null;
  defaultAcademicYearId?: string;
}) {
  const { t } = useTranslation();
  const { createSequence, updateSequence } = useAcademicCalendarMutations();
  const { data: years = [] } = useAcademicYearOptions();
  const isEdit = !!record;

  const form = useForm<SequenceFormValues>({
    resolver: zodResolver(
      sequenceSchemaForStructure(DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear),
    ),
    defaultValues: {
      academicYearId: '',
      termId: '',
      number: 1,
      numberInTerm: 1,
    },
  });

  const academicYearId = form.watch('academicYearId');
  const { data: yearStructure } = useAcademicYearStructure(academicYearId || null);
  const structure = yearStructure ?? DEFAULT_ACADEMIC_STRUCTURE;

  const { data: terms = [], isLoading: termsLoading } = useTermOptions(academicYearId || null);

  const sequenceNumbers = useMemo(
    () => Array.from({ length: structure.sequencesPerYear }, (_, i) => i + 1),
    [structure.sequencesPerYear],
  );

  const maxNumberInTerm = useMemo(() => {
    const counts = structure.sequencesPerYear / structure.termsPerYear;
    return Math.max(structure.sequencesPerTerm, Math.ceil(counts));
  }, [structure]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        academicYearId: record.academicYearId,
        termId: record.termId,
        number: record.number,
        numberInTerm: record.numberInTerm,
      });
    } else {
      form.reset({
        academicYearId: defaultAcademicYearId ?? years[0]?.id ?? '',
        termId: '',
        number: 1,
        numberInTerm: 1,
      });
    }
  }, [open, record, form, years, defaultAcademicYearId]);

  const syncSequenceDerivedFields = useCallback(
    (sequenceNumber: number) => {
      const termNum = termNumberForSequence(sequenceNumber, structure);
      const match = terms.find((t) => t.number === termNum);
      form.setValue('termId', match?.id ?? '', { shouldValidate: true });
      form.setValue('numberInTerm', numberInTermForSequence(sequenceNumber, structure), {
        shouldValidate: true,
      });
    },
    [terms, form, structure],
  );

  useEffect(() => {
    if (termsLoading || terms.length === 0 || !academicYearId) {
      return;
    }
    syncSequenceDerivedFields(form.getValues('number'));
  }, [terms, termsLoading, academicYearId, syncSequenceDerivedFields, form]);

  const pending = createSequence.isPending || updateSequence.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const schema = sequenceSchemaForStructure(structure.sequencesPerYear, maxNumberInTerm);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      return;
    }
    if (isEdit && record) {
      await updateSequence.mutateAsync({ id: record.id, values: parsed.data });
    } else {
      await createSequence.mutateAsync(parsed.data);
    }
    onOpenChange(false);
  });

  const sequenceNumber = form.watch('number');
  const numberInTermOptions = useMemo(() => {
    const pos = numberInTermForSequence(sequenceNumber, structure);
    const max = Math.max(maxNumberInTerm, pos);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [sequenceNumber, structure, maxNumberInTerm]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">
            {isEdit ? t('academics.editSequence') : t('academics.newSequence')}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
            <SheetBody className="p-0">
              <ScrollArea className="h-[calc(100vh-10.5rem)]">
                <div className="space-y-4 px-5 py-2.5">
              <FormField
                control={form.control}
                name="academicYearId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('students.academicYear')}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue('termId', '');
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('academics.selectYear')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.label}
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
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academics.sequenceNumber', { max: structure.sequencesPerYear })}</FormLabel>
                    <Select
                      value={String(field.value)}
                      disabled={!!academicYearId && termsLoading}
                      onValueChange={(v) => {
                        const n = Number(v);
                        field.onChange(n);
                        syncSequenceDerivedFields(n);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sequenceNumbers.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {t('catalog.sequenceN', { number: n })}
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
                name="termId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academics.term')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('academics.selectTerm')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {terms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {termLabel({ number: term.number })}
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
                name="numberInTerm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academics.positionInTerm')}</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {numberInTermOptions.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 1
                              ? t('academics.inTerm1')
                              : n === 2
                                ? t('academics.inTerm2')
                                : t('academics.inTermN', { n })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                {isEdit ? t('common.buttons.save') : t('common.buttons.create')}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
