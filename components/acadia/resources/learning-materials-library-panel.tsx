'use client';

import { useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ExternalLink, LoaderCircleIcon } from '@/lib/icons';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  learningMaterialSchema,
  type LearningMaterialFormValues,
} from '@/lib/acadia/resources-schemas';
import {
  formatFileSize,
  learningMaterialKindLabel,
  learningMaterialTitleDisplay,
} from '@/lib/acadia/resources';
import { getLearningMaterialPublicUrl } from '@/lib/supabase/storage';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useResourceMutations } from '@/hooks/use-resource-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManageResources } from '@/lib/acadia/roles';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

export function LearningMaterialsLibraryPanel() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageResources(session?.roleSlug);
  const { data: subjects = [] } = useSubjectOptions();
  const { uploadLearningMaterial } = useResourceMutations();

  const form = useForm<LearningMaterialFormValues>({
    resolver: zodResolver(learningMaterialSchema),
    defaultValues: {
      titleEn: '',
      titleFr: '',
      descriptionEn: '',
      descriptionFr: '',
      kind: 'DOCUMENT',
      subjectId: '',
      externalUrl: '',
      isPublished: true,
    },
  });

  const kind = form.watch('kind');

  const query = useQuery({
    queryKey: ['learning-materials', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('LearningMaterial')
        .select(
          'id, titleEn, titleFr, kind, subjectId, storageKey, externalUrl, fileSizeBytes, isPublished, createdAt, Subject:subjectId ( code )',
        )
        .eq('tenantId', tenantId!)
        .order('createdAt', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const file = fileRef.current?.files?.[0] ?? null;
    await uploadLearningMaterial.mutateAsync({ values, file });
    form.reset({
      titleEn: '',
      titleFr: '',
      descriptionEn: '',
      descriptionFr: '',
      kind: 'DOCUMENT',
      subjectId: '',
      externalUrl: '',
      isPublished: true,
    });
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  });

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
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
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.labels.type')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['DOCUMENT', 'VIDEO', 'LINK', 'OTHER'] as const).map(
                          (value) => (
                            <SelectItem key={value} value={value}>
                              {t(`resources.kind.${value}`, {
                                defaultValue: learningMaterialKindLabel(value),
                              })}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('resources.subjectOptional')}</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? '' : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('resources.schoolWide')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t('resources.schoolWide')}</SelectItem>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.code} — {subject.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {kind === 'LINK' ? (
              <FormField
                control={form.control}
                name="externalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('resources.url')}</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>{t('resources.fileUpload')}</FormLabel>
                <Input ref={fileRef} type="file" />
              </FormItem>
            )}
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">{t('resources.publishedForStudents')}</FormLabel>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={uploadLearningMaterial.isPending}>
              {uploadLearningMaterial.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              {t('resources.addMaterial')}
            </Button>
          </form>
        </Form>
      ) : null}

      <LearningMaterialsTable
        data={(query.data ?? []).map((row) => ({
          id: row.id as string,
          titleEn: row.titleEn as string | null,
          titleFr: row.titleFr as string | null,
          kind: String(row.kind),
          storageKey: (row.storageKey as string | null) ?? null,
          externalUrl: (row.externalUrl as string | null) ?? null,
          fileSizeBytes: (row.fileSizeBytes as number | null) ?? null,
          isPublished: Boolean(row.isPublished),
        }))}
        isLoading={query.isLoading}
      />
    </div>
  );
}

type LearningMaterialRow = {
  id: string;
  titleEn: string | null;
  titleFr: string | null;
  kind: string;
  storageKey: string | null;
  externalUrl: string | null;
  fileSizeBytes: number | null;
  isPublished: boolean;
};

function LearningMaterialsTable({
  data,
  isLoading,
}: {
  data: LearningMaterialRow[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'title',
    'kind',
    'fileSizeBytes',
    'isPublished',
    'access',
  ]);

  const columns = useMemo<ColumnDef<LearningMaterialRow>[]>(
    () => [
      {
        id: 'title',
        accessorFn: (row) => learningMaterialTitleDisplay(row),
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.title')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {learningMaterialTitleDisplay(row.original)}
          </span>
        ),
        size: 240,
        enableSorting: true,
      },
      {
        accessorKey: 'kind',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.type')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) =>
          t(`resources.kind.${row.original.kind}`, {
            defaultValue: learningMaterialKindLabel(row.original.kind),
          }),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'fileSizeBytes',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('resources.size')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => formatFileSize(row.original.fileSizeBytes),
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'isPublished',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.status')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isPublished ? 'success' : 'secondary'}>
            {row.original.isPublished
              ? t('resources.published')
              : t('resources.draft')}
          </Badge>
        ),
        size: 130,
        enableSorting: true,
      },
      {
        id: 'access',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('resources.access')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => {
          const url =
            row.original.externalUrl ||
            getLearningMaterialPublicUrl(row.original.storageKey);
          if (!url) {
            return '—';
          }
          return (
            <div className="text-right">
              <Button size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                  {t('resources.open')}
                </a>
              </Button>
            </div>
          );
        },
        size: 140,
        enableSorting: false,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination, columnOrder },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      isLoading={isLoading}
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardTable>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
