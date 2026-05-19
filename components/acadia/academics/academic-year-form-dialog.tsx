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
import { Switch } from '@/components/ui/switch';
import {
  academicYearSchema,
  type AcademicYearFormValues,
} from '@/lib/acadia/calendar-schemas';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';

type AcademicYearRow = {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  isActive?: boolean;
};

export function AcademicYearFormDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: AcademicYearRow | null;
}) {
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
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        label: record.label,
        startsOn: String(record.startsOn).slice(0, 10),
        endsOn: String(record.endsOn).slice(0, 10),
        isCurrent: !!record.isCurrent,
        isActive: record.isActive !== false,
      });
    } else {
      form.reset({
        label: '',
        startsOn: '',
        endsOn: '',
        isCurrent: false,
        isActive: true,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit academic year' : 'New academic year'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-4">
              {!isEdit ? (
                <p className="text-sm text-muted-foreground">
                  Saving creates three terms and six sequences automatically (Cameroon
                  calendar).
                </p>
              ) : null}
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
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
                      <FormLabel>Starts</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>Ends</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isCurrent"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <FormLabel>Current year</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Only one year should be current per school.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                {isEdit ? 'Save changes' : 'Create year'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
