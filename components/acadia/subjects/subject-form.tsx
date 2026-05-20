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
import { Input } from '@/components/ui/input';
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
import {
  useLevelsForSpecialty,
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';

const NO_GROUPING = '__none__';

export type SubjectFormSubBranch = {
  name: string;
  hasCustomCoefficient: boolean;
  coefficient?: number;
};

export type SubjectFormRecord = {
  id: string;
  code: string;
  nameEn: string;
  specialtyId: string;
  levelId: string;
  subSystem: string;
  branch: string;
  academicYearId: string;
  subjectType: SubjectType;
  coefficient: number;
  groupingId: string | null;
  hasSubBranches: boolean;
  subBranches: SubjectFormSubBranch[];
};

export function SubjectForm({
  record,
  onCancelHref,
}: {
  record?: SubjectFormRecord | null;
  onCancelHref: string;
}) {
  const isEdit = !!record;
  const { createSubject, updateSubject } = useSubjectMutations();
  const { activeYearId, activeYear } = useActiveAcademicYear();
  const { data: groupings = [], isLoading: groupingsLoading } =
    useSubjectGroupingOptions();

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      code: '',
      nameEn: '',
      academicYearId: '',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      specialtyId: '',
      levelId: '',
      coefficient: 1,
      groupingId: '',
      hasSubBranches: false,
      subBranches: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subBranches',
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const specialtyId = form.watch('specialtyId');
  const academicYearId = form.watch('academicYearId') || activeYearId || '';
  const hasSubBranches = form.watch('hasSubBranches');

  const { data: specialties = [], isLoading: specialtiesLoading } =
    useSpecialtyOptions(subSystem, branch);
  const { data: levels = [], isLoading: levelsLoading } =
    useLevelsForSpecialty(specialtyId, subSystem, branch);

  useEffect(() => {
    if (!record) {
      return;
    }
    form.reset({
      code: record.code,
      nameEn: record.nameEn,
      academicYearId: record.academicYearId,
      subSystem: record.subSystem as SubjectFormValues['subSystem'],
      branch: record.branch as SubjectFormValues['branch'],
      specialtyId: record.specialtyId,
      levelId: record.levelId,
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
    if (activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [activeYearId, form]);

  useEffect(() => {
    const current = form.getValues('specialtyId');
    if (current && !specialties.some((s) => s.id === current)) {
      form.setValue('specialtyId', '');
      form.setValue('levelId', '');
    }
  }, [subSystem, branch, specialties, form]);

  useEffect(() => {
    const current = form.getValues('levelId');
    if (current && !levels.some((l) => l.id === current)) {
      form.setValue('levelId', '');
    }
  }, [specialtyId, levels, form]);

  const pending = createSubject.isPending || updateSubject.isPending;

  const onSubmit = (values: SubjectFormValues) => {
    if (isEdit && record) {
      updateSubject.mutate({ id: record.id, values });
    } else {
      createSubject.mutate(values);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Mathematics" />
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
                      value={activeYear?.label ?? 'No academic year configured'}
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
                    field.onChange(v);
                    form.setValue('specialtyId', '');
                    form.setValue('levelId', '');
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
                    field.onChange(v);
                    form.setValue('specialtyId', '');
                    form.setValue('levelId', '');
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
            name="specialtyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialty</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue('levelId', '');
                  }}
                  disabled={specialtiesLoading || specialties.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {specialties.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id}>
                        {spec.nameEn}
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
            name="levelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!specialtyId || levelsLoading || levels.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {levelDisplayLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || !activeYearId}>
            {pending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            {isEdit ? 'Save subject' : 'Create subject'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
