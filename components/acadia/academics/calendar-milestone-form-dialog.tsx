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
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CALENDAR_MILESTONE_KINDS,
  calendarMilestoneSchema,
  type CalendarMilestoneFormValues,
} from '@/lib/acadia/calendar-schemas';
import { termLabel } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import {
  useAcademicYearOptions,
  useTermOptions,
} from '@/hooks/use-academic-calendar-options';

type MilestoneRow = {
  id: string;
  academicYearId: string;
  kind: string;
  onDate: string;
  termId?: string | null;
  labelEn?: string | null;
  labelFr?: string | null;
};

function kindLabel(kind: string): string {
  return kind
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function CalendarMilestoneFormDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: MilestoneRow | null;
}) {
  const { createMilestone, updateMilestone } = useAcademicCalendarMutations();
  const { data: years = [] } = useAcademicYearOptions();
  const isEdit = !!record;

  const form = useForm<CalendarMilestoneFormValues>({
    resolver: zodResolver(calendarMilestoneSchema),
    defaultValues: {
      academicYearId: '',
      kind: 'INSTRUCTION_START',
      onDate: '',
      termId: '',
      labelEn: '',
      labelFr: '',
    },
  });

  const academicYearId = form.watch('academicYearId');
  const { data: terms = [] } = useTermOptions(academicYearId || null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        academicYearId: record.academicYearId,
        kind: record.kind as CalendarMilestoneFormValues['kind'],
        onDate: String(record.onDate).slice(0, 10),
        termId: record.termId ?? '',
        labelEn: record.labelEn ?? '',
        labelFr: record.labelFr ?? '',
      });
    } else {
      form.reset({
        academicYearId: years[0]?.id ?? '',
        kind: 'INSTRUCTION_START',
        onDate: '',
        termId: '',
        labelEn: '',
        labelFr: '',
      });
    }
  }, [open, record, form, years]);

  const pending = createMilestone.isPending || updateMilestone.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record) {
      await updateMilestone.mutateAsync({ id: record.id, values });
    } else {
      await createMilestone.mutateAsync(values);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit calendar milestone' : 'New calendar milestone'}
          </DialogTitle>
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
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kind</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CALENDAR_MILESTONE_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {kindLabel(k)}
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
                name="onDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
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
                name="termId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term (optional)</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? '' : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Whole year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Whole year</SelectItem>
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
                name="labelEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (English)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="labelFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (French)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
