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
import {
  SUBJECT_TYPES,
  subjectTypeLabel,
} from '@/lib/acadia/subject-catalog';
import type { SubjectType } from '@/lib/acadia/subject-catalog';
import { subjectSchema, type SubjectFormValues } from '@/lib/acadia/subject-schemas';
import {
  useAcademicYearOptions,
  useTermOptions,
} from '@/hooks/use-academic-calendar-options';
import {
  useLevelsForSpecialty,
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';

const NO_GROUPING = '__none__';

export type SubjectFormSubBranch = {
  name: string;
  nameFr?: string;
  coefficient: number;
};

export type SubjectFormRecord = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  credits: number;
  hours: number;
  specialtyId: string;
  levelId: string;
  termId: string;
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
  const { data: years = [], isLoading: yearsLoading } = useAcademicYearOptions();
  const { data: groupings = [], isLoading: groupingsLoading } =
    useSubjectGroupingOptions();

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      code: '',
      nameEn: '',
      nameFr: '',
      credits: 3,
      hours: 45,
      academicYearId: '',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      specialtyId: '',
      levelId: '',
      termId: '',
      subjectType: 'OTHERS',
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
  const academicYearId = form.watch('academicYearId');
  const hasSubBranches = form.watch('hasSubBranches');

  const { data: specialties = [], isLoading: specialtiesLoading } =
    useSpecialtyOptions(subSystem, branch);
  const { data: levels = [], isLoading: levelsLoading } =
    useLevelsForSpecialty(specialtyId, subSystem, branch);
  const { data: terms = [], isLoading: termsLoading } =
    useTermOptions(academicYearId);

  useEffect(() => {
    if (!record) {
      return;
    }
    form.reset({
      code: record.code,
      nameEn: record.nameEn,
      nameFr: record.nameFr,
      credits: record.credits,
      hours: record.hours,
      academicYearId: record.academicYearId,
      subSystem: record.subSystem as SubjectFormValues['subSystem'],
      branch: record.branch as SubjectFormValues['branch'],
      specialtyId: record.specialtyId,
      levelId: record.levelId,
      termId: record.termId,
      subjectType: record.subjectType,
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
    if (!record && years.length > 0 && !form.getValues('academicYearId')) {
      const current = years.find((y) => y.isCurrent);
      if (current) {
        form.setValue('academicYearId', current.id);
      }
    }
  }, [record, years, form]);

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue('termId', '');
                  }}
                  disabled={yearsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (English)</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="credits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credits</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="subjectType"
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
                    {SUBJECT_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {subjectTypeLabel(value)}
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
                        append({ name: '', nameFr: '', coefficient: 1 });
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {hasSubBranches ? (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 rounded-md border border-dashed p-3 md:grid-cols-[1fr_1fr_auto_auto]"
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
                    name={`subBranches.${index}.nameFr`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Name (FR)</FormLabel>
                        <FormControl>
                          <Input {...subField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', nameFr: '', coefficient: 1 })}
              >
                <Plus className="size-4" />
                Add sub-branch
              </Button>
              <FormMessage>{form.formState.errors.subBranches?.message}</FormMessage>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          <FormField
            control={form.control}
            name="termId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Term</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!academicYearId || termsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        Term {term.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <Button type="submit" disabled={pending}>
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
