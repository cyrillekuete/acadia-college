'use client';

import { useEffect, useMemo } from 'react';
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
import { DEFAULT_ACADEMIC_STRUCTURE } from '@/lib/acadia/academic-calendar';
import { termSchemaForStructure, type TermFormValues } from '@/lib/acadia/calendar-schemas';
import { levelDisplayLabel } from '@/lib/acadia/education-system';
import { termLabel } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import {
  useAcademicYearOptions,
  useLevelOptions,
} from '@/hooks/use-academic-calendar-options';
import { useAcademicYearStructure } from '@/hooks/use-academic-year-structure';
import { useTranslation } from '@/hooks/useTranslation';

type TermRow = {
  id: string;
  number: number;
  academicYearId: string;
  levelId?: string | null;
};

export function TermFormDialog({
  open,
  onOpenChange,
  record,
  defaultAcademicYearId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: TermRow | null;
  defaultAcademicYearId?: string;
}) {
  const { t } = useTranslation();
  const { createTerm, updateTerm } = useAcademicCalendarMutations();
  const { data: years = [] } = useAcademicYearOptions();
  const { data: levels = [] } = useLevelOptions();
  const isEdit = !!record;

  const form = useForm<TermFormValues>({
    resolver: zodResolver(termSchemaForStructure(DEFAULT_ACADEMIC_STRUCTURE.termsPerYear)),
    defaultValues: {
      academicYearId: '',
      number: 1,
      levelId: '',
    },
  });

  const academicYearId = form.watch('academicYearId');
  const { data: yearStructure } = useAcademicYearStructure(academicYearId || null);
  const termsPerYear =
    yearStructure?.termsPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.termsPerYear;

  const termNumbers = useMemo(
    () => Array.from({ length: termsPerYear }, (_, i) => i + 1),
    [termsPerYear],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        academicYearId: record.academicYearId,
        number: record.number,
        levelId: record.levelId ?? '',
      });
    } else {
      form.reset({
        academicYearId: defaultAcademicYearId ?? years[0]?.id ?? '',
        number: 1,
        levelId: '',
      });
    }
  }, [open, record, form, years, defaultAcademicYearId]);

  const pending = createTerm.isPending || updateTerm.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const schema = termSchemaForStructure(termsPerYear);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      return;
    }
    if (isEdit && record) {
      await updateTerm.mutateAsync({ id: record.id, values: parsed.data });
    } else {
      await createTerm.mutateAsync(parsed.data);
    }
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{isEdit ? t('academics.editTerm') : t('academics.newTerm')}</SheetTitle>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('academics.selectYear')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.label}
                            {y.isCurrent ? t('academics.currentSuffix') : ''}
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
                    <FormLabel>{t('academics.term')}</FormLabel>
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
                        {termNumbers.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {termLabel({ number: n })}
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
                name="levelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academics.levelOptional')}</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? '' : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('academics.allLevels')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t('academics.allLevels')}</SelectItem>
                        {levels.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {levelDisplayLabel(l)}
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
