'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon, Pencil, Trash2 } from '@/lib/icons';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import {
  subjectMaterialSchema,
  type SubjectMaterialFormValues,
} from '@/lib/acadia/subject-schemas';
import {
  DEFAULT_COURSEWORK_MAX_SCORE,
} from '@/lib/acadia/coursework';
import {
  isoToLocalDateTimeInputValue,
} from '@/lib/acadia/dates';
import { formatDateTime, formatRecordValue } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

type MaterialRow = {
  id: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string | null;
  descriptionFr: string | null;
  dueAt: string;
  maxScore: number;
  isPublished: boolean;
  createdAt: string;
};

export function SubjectMaterialsPanel({
  subjectId,
  canManage = true,
}: {
  subjectId: string;
  canManage?: boolean;
}) {
  const { t } = useTranslation();
  const { createMaterial, updateMaterial, deleteMaterial } = useSubjectMutations();
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['subject-materials', tenantId, subjectId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('CourseworkTask')
        .select(
          'id, titleEn, titleFr, descriptionEn, descriptionFr, dueAt, maxScore, isPublished, createdAt',
        )
        .eq('tenantId', tenantId!)
        .eq('subjectId', subjectId);
      if (activeYearId) {
        query = query.eq('academicYearId', activeYearId);
      }
      const { data, error } = await query.order('dueAt', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []) as MaterialRow[];
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
      academicYearId: '',
      titleEn: '',
      titleFr: '',
      descriptionEn: '',
      descriptionFr: '',
      dueAt: '',
      maxScore: DEFAULT_COURSEWORK_MAX_SCORE,
      isPublished: true,
    },
  });

  useEffect(() => {
    if (activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [activeYearId, form]);

  const resetForm = (overrides?: Partial<SubjectMaterialFormValues>) => {
    form.reset({
      academicYearId: activeYearId ?? overrides?.academicYearId ?? '',
      titleEn: '',
      titleFr: '',
      descriptionEn: '',
      descriptionFr: '',
      dueAt: '',
      maxScore: DEFAULT_COURSEWORK_MAX_SCORE,
      isPublished: true,
      ...overrides,
    });
    setEditingId(null);
  };

  const startEdit = (row: MaterialRow) => {
    setEditingId(row.id);
    form.reset({
      academicYearId: activeYearId ?? '',
      titleEn: row.titleEn,
      titleFr: row.titleFr,
      descriptionEn: row.descriptionEn ?? '',
      descriptionFr: row.descriptionFr ?? '',
      dueAt: isoToLocalDateTimeInputValue(row.dueAt),
      maxScore: row.maxScore,
      isPublished: row.isPublished,
    });
  };

  const onSubmit = (values: SubjectMaterialFormValues) => {
    if (editingId) {
      updateMaterial.mutate(
        { id: editingId, values },
        {
          onSuccess: () => resetForm({ academicYearId: values.academicYearId }),
        },
      );
      return;
    }
    createMaterial.mutate(
      { subjectId, values },
      {
        onSuccess: () => resetForm({ academicYearId: values.academicYearId }),
      },
    );
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const pending =
    createMaterial.isPending || updateMaterial.isPending || deleteMaterial.isPending;

  return (
    <div className="space-y-6">
      <RecordDetailCard
        title={t('coursework.materialsTitle')}
        fields={
          materials.length === 0
            ? [{ label: t('coursework.materialsTitle'), value: t('coursework.noMaterials') }]
            : materials.map((row) => ({
                label: String(row.titleEn),
                value: (
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {formatRecordValue(
                        row.isPublished
                          ? t('coursework.published')
                          : t('coursework.draft'),
                      )}{' '}
                      · {t('coursework.due')} {formatDateTime(row.dueAt)} ·{' '}
                      {t('coursework.maxScore')} {formatRecordValue(row.maxScore)}
                    </span>
                    {canManage ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          onClick={() => startEdit(row)}
                          aria-label={t('common.buttons.edit')}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          onClick={() => deleteMaterial.mutate(row.id)}
                          aria-label={t('common.buttons.delete')}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ),
              }))
        }
      />

      {canManage ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 rounded-lg border p-4"
          >
            <p className="text-sm font-medium">
              {editingId ? t('coursework.editMaterial') : t('coursework.addMaterial')}
            </p>
            <FormField
              control={form.control}
              name="academicYearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('academics.academicYear')}</FormLabel>
                  <CurrentAcademicYearBadge />
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
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
                    <FormLabel>{t('common.labels.titleEn')}</FormLabel>
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
                    <FormLabel>{t('common.labels.titleFr')}</FormLabel>
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
                    <FormLabel>{t('coursework.descriptionEn')}</FormLabel>
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
                    <FormLabel>{t('coursework.descriptionFr')}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="dueAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('coursework.due')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('coursework.maxScore')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">
                    {t('coursework.publishedForStudents')}
                  </FormLabel>
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                {editingId ? t('common.buttons.save') : t('coursework.addMaterial')}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => resetForm()}
                >
                  {t('common.buttons.cancel')}
                </Button>
              ) : null}
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  );
}
