'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import {
  useAcademicYearStructure,
  useUpdateAcademicYearStructure,
} from '@/hooks/use-academic-year-structure';
import { termsStructureSchema, type TermsStructureFormValues } from '@/lib/acadia/calendar-schemas';

export function TermsStructureCard({ academicYearId }: { academicYearId: string }) {
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
    <Card>
      <CardHeader>
        <CardTitle>Terms per academic year</CardTitle>
        <CardDescription>
          Define how many terms this academic year has, then generate term records for marks and
          reports.
          {structure ? ` (${structure.label})` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading structure…</p>
        ) : (
          <Form {...form}>
            <form onSubmit={onSave} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <FormField
                control={form.control}
                name="termsPerYear"
                render={({ field }) => (
                  <FormItem className="flex-1">
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
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" disabled={pending}>
                  {updateStructure.isPending ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : null}
                  Save structure
                </Button>
                <Button type="button" disabled={pending || !termsPerYear} onClick={() => void onGenerate()}>
                  {provisionCalendar.isPending ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : null}
                  Generate {termsPerYear} term{termsPerYear === 1 ? '' : 's'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
