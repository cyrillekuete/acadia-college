'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { LoaderCircleIcon, Plus, Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  branchLabel,
  levelDisplayLabel,
  subSystemLabel,
} from '@/lib/acadia/education-system';
import type { SubjectType } from '@/lib/acadia/subject-catalog';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { subjectSchema, type SubjectFormValues } from '@/lib/acadia/subject-schemas';
import { useLevelOptions } from '@/hooks/use-academic-calendar-options';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';

const NO_GROUPING = '__none__';

export type SubjectFormSubBranch = {
  id?: string;
  name: string;
  hasCustomCoefficient: boolean;
  coefficient?: number;
};

export type SubjectFormRecord = {
  id: string;
  code: string;
  nameEn: string;
  nameFr?: string;
  levelIds: string[];
  subSystem: string;
  branch: string;
  academicYearId: string;
  subjectType: SubjectType;
  coefficient: number;
  groupingId: string | null;
  hasSubBranches: boolean;
  subBranches: SubjectFormSubBranch[];
};

export const SUBJECT_FORM_ID = 'subject-form';

export function SubjectForm({
  record,
  initialValues,
  copyAssignmentsFromSubjectId,
  variantMode = false,
  onCancelHref,
  onCancel,
  onCreated,
  hideActions = false,
  formId = SUBJECT_FORM_ID,
  onPendingChange,
}: {
  record?: SubjectFormRecord | null;
  initialValues?: Partial<SubjectFormValues>;
  copyAssignmentsFromSubjectId?: string;
  variantMode?: boolean;
  onCancelHref?: string;
  onCancel?: () => void;
  onCreated?: (id: string) => void;
  hideActions?: boolean;
  formId?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const isEdit = !!record;
  const { createSubject, updateSubject } = useSubjectMutations();
  const { activeYearId, activeYear, years } = useActiveAcademicYear();
  const { data: groupings = [], isLoading: groupingsLoading } =
    useSubjectGroupingOptions();

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      code: initialValues?.code ?? '',
      nameEn: initialValues?.nameEn ?? '',
      nameFr: initialValues?.nameFr ?? '',
      academicYearId: initialValues?.academicYearId ?? '',
      subSystem: initialValues?.subSystem ?? 'ENGLISH',
      branch: initialValues?.branch ?? 'GRAMMAR',
      levelIds: initialValues?.levelIds ?? [],
      coefficient: initialValues?.coefficient ?? 1,
      groupingId: initialValues?.groupingId ?? '',
      hasSubBranches: initialValues?.hasSubBranches ?? false,
      subBranches: initialValues?.subBranches ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subBranches',
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const academicYearId = form.watch('academicYearId') || activeYearId || '';
  const hasSubBranches = form.watch('hasSubBranches');

  const { data: levels = [], isLoading: levelsLoading } = useLevelOptions({
    subSystem,
    branch,
  });
  const levelIds = form.watch('levelIds');

  useEffect(() => {
    if (!record) {
      return;
    }
    form.reset({
      code: record.code,
      nameEn: record.nameEn,
      nameFr: record.nameFr ?? '',
      academicYearId: record.academicYearId,
      subSystem: record.subSystem as SubjectFormValues['subSystem'],
      branch: record.branch as SubjectFormValues['branch'],
      levelIds: record.levelIds,
      coefficient: record.coefficient,
      groupingId: record.groupingId ?? '',
      hasSubBranches: record.hasSubBranches,
      subBranches: record.subBranches,
    });
  }, [record, form]);

  useEffect(() => {
    if (!hasSubBranches) {
      form.setValue('subBranches', []);
    }
  }, [hasSubBranches, form]);

  useEffect(() => {
    if (!isEdit && activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [activeYearId, form, isEdit]);

  useEffect(() => {
    const current = form.getValues('levelIds') ?? [];
    const validIds = new Set(levels.map((l) => l.id));
    const next = current.filter((id) => validIds.has(id));
    if (next.length !== current.length) {
      form.setValue('levelIds', next);
    }
  }, [subSystem, branch, levels, form]);

  const toggleLevel = (levelId: string, checked: boolean) => {
    const current = form.getValues('levelIds') ?? [];
    if (checked) {
      if (!current.includes(levelId)) {
        form.setValue('levelIds', [...current, levelId], { shouldDirty: true });
      }
      return;
    }
    form.setValue(
      'levelIds',
      current.filter((id) => id !== levelId),
      { shouldDirty: true },
    );
  };

  const pending = createSubject.isPending || updateSubject.isPending;

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  const onSubmit = (values: SubjectFormValues) => {
    if (isEdit && record) {
      updateSubject.mutate({ id: record.id, values });
    } else {
      createSubject.mutate(
        { values, copyAssignmentsFromSubjectId },
        {
          onSuccess: (id) => onCreated?.(id),
        },
      );
    }
  };

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {variantMode ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Creating a level variant. Keep the same name, use a different code and
            coefficient, and choose levels that do not overlap the original subject.
            Assigned teachers are copied when you save.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (English)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Mathematics" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nameFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (French)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Mathématiques" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject code</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="CS101" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Academic year</FormLabel>
                <FormControl>
                  <div>
                    <Input type="hidden" {...field} />
                    <Input
                      readOnly
                      disabled
                      value={
                        (isEdit
                          ? years.find((year) => year.id === field.value)?.label
                          : activeYear?.label) ?? 'No academic year configured'
                      }
                      className="bg-muted"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="coefficient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coefficient</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={0.1} step={0.1} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="groupingId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grouping (optional)</FormLabel>
                <Select
                  value={field.value?.trim() ? field.value : NO_GROUPING}
                  onValueChange={(v) =>
                    field.onChange(v === NO_GROUPING ? '' : v)
                  }
                  disabled={groupingsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No grouping" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_GROUPING}>No grouping</SelectItem>
                    {groupings.map((grouping) => (
                      <SelectItem key={grouping.id} value={grouping.id}>
                        {grouping.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <Link href="/subjects/groupings" className="underline">
                    Manage groupings
                  </Link>
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <FormField
            control={form.control}
            name="hasSubBranches"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4">
                <div>
                  <FormLabel>Has sub-branches</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    e.g. Pure Maths, Mechanics, Statistics for Mathematics
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked && fields.length === 0) {
                        append({ name: '', hasCustomCoefficient: false });
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {hasSubBranches ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Sub-branches use the subject coefficient unless a custom value is set.
              </p>
              {fields.map((field, index) => {
                const hasCustomCoefficient = form.watch(
                  `subBranches.${index}.hasCustomCoefficient`,
                );

                return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 rounded-md border border-dashed p-3 md:grid-cols-[1fr_auto_auto_auto]"
                >
                  <FormField
                    control={form.control}
                    name={`subBranches.${index}.id`}
                    render={({ field: idField }) => (
                      <input type="hidden" {...idField} value={idField.value ?? ''} />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subBranches.${index}.name`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...subField} placeholder="Pure Maths" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subBranches.${index}.hasCustomCoefficient`}
                    render={({ field: subField }) => (
                      <FormItem className="flex flex-col justify-end">
                        <FormLabel>Custom coef.</FormLabel>
                        <FormControl>
                          <Switch
                            checked={subField.value}
                            onCheckedChange={(checked) => {
                              subField.onChange(checked);
                              if (!checked) {
                                form.setValue(`subBranches.${index}.coefficient`, undefined);
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {hasCustomCoefficient ? (
                    <FormField
                      control={form.control}
                      name={`subBranches.${index}.coefficient`}
                      render={({ field: subField }) => (
                        <FormItem>
                          <FormLabel>Coef.</FormLabel>
                          <FormControl>
                            <Input {...subField} type="number" min={0.1} step={0.1} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="hidden md:block" aria-hidden />
                  )}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      aria-label="Remove sub-branch"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', hasCustomCoefficient: false })}
              >
                <Plus className="size-4" />
                Add sub-branch
              </Button>
              <FormMessage>{form.formState.errors.subBranches?.message}</FormMessage>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="subSystem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sub-system</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    const currentLevels = form.getValues('levelIds') ?? [];
                    if (
                      currentLevels.length > 0 &&
                      v !== field.value &&
                      !window.confirm(
                        'Changing stream clears selected levels that may not apply to the new sub-system. Continue?',
                      )
                    ) {
                      return;
                    }
                    field.onChange(v);
                    form.setValue('levelIds', []);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACADEMIC_SUB_SYSTEMS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {subSystemLabel(value)}
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
            name="branch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    const currentLevels = form.getValues('levelIds') ?? [];
                    if (
                      currentLevels.length > 0 &&
                      v !== field.value &&
                      !window.confirm(
                        'Changing branch clears selected levels that may not apply to the new stream. Continue?',
                      )
                    ) {
                      return;
                    }
                    field.onChange(v);
                    form.setValue('levelIds', []);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACADEMIC_BRANCHES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {branchLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">Terms</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This subject applies to all terms (1st, 2nd, and 3rd) in the selected
            academic year.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="levelIds"
            render={() => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Levels</FormLabel>
                  {levels.length > 0 ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs"
                        onClick={() =>
                          form.setValue(
                            'levelIds',
                            levels.map((l) => l.id),
                            { shouldDirty: true },
                          )
                        }
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs"
                        onClick={() => form.setValue('levelIds', [], { shouldDirty: true })}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select one or more levels this subject applies to. If the
                  coefficient or sub-branches differ by cycle (for example Forms 1–5
                  vs Lower/Upper Sixth), create a separate level variant instead of
                  selecting both cycles here.
                </p>
                {levelsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading levels…</p>
                ) : levels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No levels for this sub-system and branch. Create levels under Academic
                    structure first.
                  </p>
                ) : (
                  <ScrollArea className="h-40 rounded-md border p-3">
                    <div className="space-y-2">
                      {levels.map((level) => {
                        const checked = (levelIds ?? []).includes(level.id);
                        return (
                          <div key={level.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`subject-level-${level.id}`}
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleLevel(level.id, value === true)
                              }
                            />
                            <Label
                              htmlFor={`subject-level-${level.id}`}
                              className="cursor-pointer text-sm font-normal"
                            >
                              {levelDisplayLabel(level)}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {hideActions ? null : (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || (!isEdit && !activeYearId)}>
              {pending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              {isEdit ? 'Save subject' : 'Create subject'}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            ) : onCancelHref ? (
              <Button type="button" variant="outline" asChild>
                <Link href={onCancelHref}>Cancel</Link>
              </Button>
            ) : null}
          </div>
        )}
      </form>
    </Form>
  );
}
