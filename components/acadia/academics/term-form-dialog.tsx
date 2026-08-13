'use client';

import { useEffect, useMemo } from 'react';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('academics.editTerm') : t('academics.newTerm')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-4">
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
