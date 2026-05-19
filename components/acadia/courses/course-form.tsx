'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from 'lucide-react';
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
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  branchLabel,
  levelDisplayLabel,
  subSystemLabel,
} from '@/lib/acadia/education-system';
import { courseSchema, type CourseFormValues } from '@/lib/acadia/course-schemas';
import {
  useAcademicYearOptions,
  useTermOptions,
} from '@/hooks/use-academic-calendar-options';
import {
  useLevelsForSpecialty,
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';
import { useCourseMutations } from '@/hooks/use-course-mutations';

export type CourseFormRecord = {
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
};

export function CourseForm({
  record,
  onCancelHref,
}: {
  record?: CourseFormRecord | null;
  onCancelHref: string;
}) {
  const isEdit = !!record;
  const { createCourse, updateCourse } = useCourseMutations();
  const { data: years = [], isLoading: yearsLoading } = useAcademicYearOptions();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
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
    },
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const specialtyId = form.watch('specialtyId');
  const academicYearId = form.watch('academicYearId');

  const { data: specialties = [], isLoading: specialtiesLoading } =
    useSpecialtyOptions(subSystem, branch);
  const { data: levels = [], isLoading: levelsLoading } =
    useLevelsForSpecialty(specialtyId);
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
      subSystem: record.subSystem as CourseFormValues['subSystem'],
      branch: record.branch as CourseFormValues['branch'],
      specialtyId: record.specialtyId,
      levelId: record.levelId,
      termId: record.termId,
    });
  }, [record, form]);

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

  const pending = createCourse.isPending || updateCourse.isPending;

  const onSubmit = (values: CourseFormValues) => {
    if (isEdit && record) {
      updateCourse.mutate({ id: record.id, values });
    } else {
      createCourse.mutate(values);
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
                <FormLabel>Course code</FormLabel>
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
            {isEdit ? 'Save course' : 'Create course'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
