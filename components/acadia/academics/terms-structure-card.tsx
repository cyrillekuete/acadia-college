'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import {
  useAcademicYearStructure,
  useUpdateAcademicYearStructure,
} from '@/hooks/use-academic-year-structure';
import { termsStructureSchema, type TermsStructureFormValues } from '@/lib/acadia/calendar-schemas';

export function TermsStructureCard({
  open,
  onOpenChange,
  academicYearId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
}) {
  const { data: structure, isLoading } = useAcademicYearStructure(academicYearId);
  const updateStructure = useUpdateAcademicYearStructure();
  const { provisionCalendar } = useAcademicCalendarMutations();

  const form = useForm<TermsStructureFormValues>({
    resolver: zodResolver(termsStructureSchema),
    defaultValues: { termsPerYear: 3 },
  });

  useEffect(() => {
    if (structure) {
      form.reset({ termsPerYear: structure.termsPerYear });
    }
  }, [structure, form]);

  const termsPerYear = form.watch('termsPerYear');
  const pending = updateStructure.isPending || provisionCalendar.isPending;

  const onSave = form.handleSubmit(async (values) => {
    await updateStructure.mutateAsync({ academicYearId, values });
  });

  const onGenerate = async () => {
    const values = form.getValues();
    await updateStructure.mutateAsync({ academicYearId, values });
    await provisionCalendar.mutateAsync({ academicYearId, termsOnly: true });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">Terms per academic year</SheetTitle>
          <SheetDescription className="sr-only">
            Define how many terms this academic year has, then generate term records for marks and
            reports.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSave}>
            <SheetBody className="p-0">
              <ScrollArea className="h-[calc(100vh-10.5rem)]">
                <div className="space-y-4 px-5 py-2.5">
                  <p className="text-sm text-muted-foreground">
                    Define how many terms this academic year has, then generate term records for
                    marks and reports.
                    {structure ? ` (${structure.label})` : ''}
                  </p>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading structure…</p>
                  ) : (
                    <FormField
                      control={form.control}
                      name="termsPerYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of terms</FormLabel>
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
                              {[1, 2, 3, 4, 5, 6].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n} {n === 1 ? 'term' : 'terms'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </ScrollArea>
            </SheetBody>
            <SheetFooter className="border-t border-border p-5">
              <Button type="submit" variant="outline" disabled={pending || isLoading}>
                {updateStructure.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Save structure
              </Button>
              <Button
                type="button"
                disabled={pending || isLoading || !termsPerYear}
                onClick={() => void onGenerate()}
              >
                {provisionCalendar.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Generate {termsPerYear} term{termsPerYear === 1 ? '' : 's'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
