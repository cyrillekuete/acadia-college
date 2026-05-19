'use client';

import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, LoaderCircleIcon } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useCourseOptions } from '@/hooks/use-course-catalog-options';
import { useResourceMutations } from '@/hooks/use-resource-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManageResources } from '@/lib/acadia/roles';
import { Skeleton } from '@/components/ui/skeleton';

export function LearningMaterialsLibraryPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageResources(session?.roleSlug);
  const { data: courses = [] } = useCourseOptions();
  const { uploadLearningMaterial } = useResourceMutations();

  const form = useForm<LearningMaterialFormValues>({
    resolver: zodResolver(learningMaterialSchema),
    defaultValues: {
      titleEn: '',
      titleFr: '',
      descriptionEn: '',
      descriptionFr: '',
      kind: 'DOCUMENT',
      courseId: '',
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
          'id, titleEn, titleFr, kind, courseId, storageKey, externalUrl, fileSizeBytes, isPublished, createdAt, Course:courseId ( code )',
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
      courseId: '',
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
                    <FormLabel>Title (EN)</FormLabel>
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
                    <FormLabel>Title (FR)</FormLabel>
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
                    <FormLabel>Type</FormLabel>
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
                              {learningMaterialKindLabel(value)}
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
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course (optional)</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? '' : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="School-wide" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">School-wide</SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.code} — {course.nameEn}
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
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>File upload</FormLabel>
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
                  <FormLabel className="!mt-0">Published for students</FormLabel>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={uploadLearningMaterial.isPending}>
              {uploadLearningMaterial.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Add material
            </Button>
          </form>
        </Form>
      ) : null}

      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(query.data ?? []).map((row) => {
              const url =
                row.externalUrl ||
                getLearningMaterialPublicUrl(row.storageKey as string | null);
              return (
                <TableRow key={row.id as string}>
                  <TableCell className="font-medium">
                    {learningMaterialTitleDisplay(row)}
                  </TableCell>
                  <TableCell>{learningMaterialKindLabel(String(row.kind))}</TableCell>
                  <TableCell>
                    {formatFileSize(row.fileSizeBytes as number | null)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isPublished ? 'success' : 'secondary'}>
                      {row.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {url ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={url} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-3.5" />
                          Open
                        </a>
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
