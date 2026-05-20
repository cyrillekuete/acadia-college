'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon, Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import {
  subjectMaterialSchema,
  type SubjectMaterialFormValues,
} from '@/lib/acadia/subject-schemas';
import { formatDateTime, formatRecordValue } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import { Skeleton } from '@/components/ui/skeleton';

export function SubjectMaterialsPanel({
  subjectId,
  canManage = true,
}: {
  subjectId: string;
  canManage?: boolean;
}) {
  const { createMaterial, deleteMaterial } = useSubjectMutations();
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['subject-materials', tenantId, subjectId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('CourseworkTask')
        .select('id, titleEn, titleFr, dueAt, maxScore, isPublished, createdAt')
        .eq('tenantId', tenantId!)
        .eq('subjectId', subjectId)
        .order('dueAt', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      isError,
      session,
      tenantId,
    ),
  });

  const form = useForm<SubjectMaterialFormValues>({
    resolver: zodResolver(subjectMaterialSchema),
    defaultValues: {
      academicYearId: years.find((y) => y.isCurrent)?.id ?? '',
      titleEn: '',
      titleFr: '',
      descriptionEn: '',
      descriptionFr: '',
      dueAt: '',
      maxScore: 0,
      isPublished: true,
    },
  });

  const onSubmit = (values: SubjectMaterialFormValues) => {
    createMaterial.mutate(
      { subjectId, values },
      {
        onSuccess: () => {
          form.reset({
            academicYearId: values.academicYearId,
            titleEn: '',
            titleFr: '',
            descriptionEn: '',
            descriptionFr: '',
            dueAt: '',
            maxScore: 0,
            isPublished: true,
          });
        },
      },
    );
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <RecordDetailCard
        title="Learning materials"
        fields={
          materials.length === 0
            ? [{ label: 'Materials', value: 'No materials published yet.' }]
            : materials.map((row) => ({
                label: String(row.titleEn),
                value: (
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {formatRecordValue(row.isPublished ? 'Published' : 'Draft')} · Due{' '}
                      {formatDateTime(row.dueAt as string)} · Max{' '}
                      {formatRecordValue(row.maxScore)}
                    </span>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deleteMaterial.isPending}
                        onClick={() => deleteMaterial.mutate(row.id as string)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                ),
              }))
        }
      />

      {canManage ? (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Add material</p>
          <FormField
            control={form.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Academic year</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="titleEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (English)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="titleFr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (French)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="descriptionEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (English)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descriptionFr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (French)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="dueAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Published for students</FormLabel>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={createMaterial.isPending}>
            {createMaterial.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Add material
          </Button>
        </form>
      </Form>
      ) : null}
    </div>
  );
}
