'use client';

import { useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from 'lucide-react';
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
import {
  numberInTermForSequence,
  termNumberForSequence,
} from '@/lib/acadia/academic-calendar';
import {
  sequenceSchema,
  type SequenceFormValues,
} from '@/lib/acadia/calendar-schemas';
import { termLabel } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import {
  useAcademicYearOptions,
  useTermOptions,
} from '@/hooks/use-academic-calendar-options';

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: SequenceRow | null;
}) {
  const { createSequence, updateSequence } = useAcademicCalendarMutations();
  const { data: years = [] } = useAcademicYearOptions();
  const isEdit = !!record;

  const form = useForm<SequenceFormValues>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      academicYearId: '',
      termId: '',
      number: 1,
      numberInTerm: 1,
    },
  });

  const academicYearId = form.watch('academicYearId');
  const { data: terms = [], isLoading: termsLoading } = useTermOptions(academicYearId || null);

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
        academicYearId: years[0]?.id ?? '',
        termId: '',
        number: 1,
        numberInTerm: 1,
      });
    }
  }, [open, record, form, years]);

  const syncSequenceDerivedFields = useCallback(
    (sequenceNumber: number) => {
      const termNum = termNumberForSequence(sequenceNumber);
      const match = terms.find((t) => t.number === termNum);
      // Always write termId — empty string when terms haven't loaded yet so
      // Zod validation fires immediately instead of leaving stale/blank state.
      form.setValue('termId', match?.id ?? '', { shouldValidate: true });
      form.setValue('numberInTerm', numberInTermForSequence(sequenceNumber), {
        shouldValidate: true,
      });
    },
    [terms, form],
  );

  // Re-sync after useTermOptions resolves. Handles the race where the user
  // already chose a sequence number before terms finished loading, and also
  // re-syncs when the user switches academic years.
  useEffect(() => {
    if (termsLoading || terms.length === 0 || !academicYearId) {
      return;
    }
    syncSequenceDerivedFields(form.getValues('number'));
  }, [terms, termsLoading, academicYearId, syncSequenceDerivedFields]);

  const pending = createSequence.isPending || updateSequence.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record) {
      await updateSequence.mutateAsync({ id: record.id, values });
    } else {
      await createSequence.mutateAsync(values);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit sequence' : 'New sequence'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="academicYearId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic year</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue('termId', '');
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
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
                    <FormLabel>Sequence number (1–6)</FormLabel>
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
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Sequence {n}
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
                    <FormLabel>Term</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {terms.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {termLabel({ number: t.number })}
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
                    <FormLabel>Position in term</FormLabel>
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
                        <SelectItem value="1">1st in term</SelectItem>
                        <SelectItem value="2">2nd in term</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                {isEdit ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
