'use client';

import { useEffect, useMemo } from 'react';
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
import {
  formatDistributionPreview,
  validateAcademicYearStructure,
} from '@/lib/acadia/academic-calendar';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import {
  useAcademicYearStructure,
  useUpdateAcademicYearStructure,
} from '@/hooks/use-academic-year-structure';
import {
  sequencesStructureSchema,
  type SequencesStructureFormValues,
} from '@/lib/acadia/calendar-schemas';

export function SequencesStructureCard({ academicYearId }: { academicYearId: string }) {
  const { data: structure, isLoading } = useAcademicYearStructure(academicYearId);
  const updateStructure = useUpdateAcademicYearStructure();
  const { provisionCalendar } = useAcademicCalendarMutations();

  const form = useForm<SequencesStructureFormValues>({
    resolver: zodResolver(sequencesStructureSchema),
    defaultValues: { sequencesPerTerm: 2, sequencesPerYear: 6 },
  });

  useEffect(() => {
    if (structure) {
      form.reset({
        sequencesPerTerm: structure.sequencesPerTerm,
        sequencesPerYear: structure.sequencesPerYear,
      });
    }
  }, [structure, form]);

  const sequencesPerTerm = form.watch('sequencesPerTerm');
  const sequencesPerYear = form.watch('sequencesPerYear');
  const pending = updateStructure.isPending || provisionCalendar.isPending;

  const preview = useMemo(() => {
    if (!structure || !sequencesPerTerm || !sequencesPerYear) {
      return null;
    }
    const merged = {
      termsPerYear: structure.termsPerYear,
      sequencesPerTerm,
      sequencesPerYear,
    };
    const validation = validateAcademicYearStructure(merged);
    if (!validation.valid) {
      return validation.errors[0];
    }
    return formatDistributionPreview(validation.distribution);
  }, [structure, sequencesPerTerm, sequencesPerYear]);

  const onSave = form.handleSubmit(async (values) => {
    await updateStructure.mutateAsync({ academicYearId, values });
  });

  const onGenerate = async () => {
    const values = form.getValues();
    await updateStructure.mutateAsync({ academicYearId, values });
    await provisionCalendar.mutateAsync({ academicYearId, sequencesOnly: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sequences per term and year</CardTitle>
        <CardDescription>
          Configure how many sequence exams this year has. Schools commonly use 6 per year (2 per
          term) or 5 per year.
          {structure ? ` (${structure.label})` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading structure…</p>
        ) : (
          <Form {...form}>
            <form onSubmit={onSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sequencesPerTerm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sequences per term</FormLabel>
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
                          {[1, 2, 3, 4].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} per term
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
                      <FormLabel>Sequences per academic year</FormLabel>
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
                          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} per year
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {preview ? (
                <p className="text-sm text-muted-foreground">
                  Distribution across {structure?.termsPerYear ?? '—'} terms: {preview}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" disabled={pending}>
                  {updateStructure.isPending ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : null}
                  Save structure
                </Button>
                <Button
                  type="button"
                  disabled={pending || !sequencesPerYear}
                  onClick={() => void onGenerate()}
                >
                  {provisionCalendar.isPending ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : null}
                  Generate {sequencesPerYear} sequence{sequencesPerYear === 1 ? '' : 's'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
