'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
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
import {
  enrollmentApplicationSchema,
  type EnrollmentApplicationFormValues,
} from '@/lib/acadia/enrollment-schemas';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  useLevelsForSpecialty,
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';
import { useEnrollmentMutations } from '@/hooks/use-enrollment-mutations';

export type EnrollmentApplicationRecord = {
  id: string;
  kind: 'NEW' | 'RE_ENROLL';
  status: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameFr?: string | null;
  lastNameFr?: string | null;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  preferredLocale: string;
  studentProfileId?: string | null;
  subSystem: string;
  branch: string;
  specialtyId: string;
  levelId: string;
  academicYearId: string;
};

export function EnrollmentApplicationForm({
  record,
  onCancelHref,
}: {
  record?: EnrollmentApplicationRecord | null;
  onCancelHref: string;
}) {
  const isEdit = !!record;
  const { createApplication, updateApplication } = useEnrollmentMutations();
  const { data: years = [], isLoading: yearsLoading } = useAcademicYearOptions();

  const form = useForm<EnrollmentApplicationFormValues>({
    resolver: zodResolver(enrollmentApplicationSchema),
    defaultValues: {
      kind: 'NEW',
      firstNameEn: '',
      lastNameEn: '',
      firstNameFr: '',
      lastNameFr: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      preferredLocale: 'en',
      studentProfileId: '',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      specialtyId: '',
      levelId: '',
      academicYearId: '',
    },
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const specialtyId = form.watch('specialtyId');

  const { data: specialties = [], isLoading: specialtiesLoading } =
    useSpecialtyOptions(subSystem, branch);
  const { data: levels = [], isLoading: levelsLoading } =
    useLevelsForSpecialty(specialtyId, subSystem, branch);

  useEffect(() => {
    if (!record) {
      return;
    }
    form.reset({
      kind: record.kind,
      firstNameEn: record.firstNameEn,
      lastNameEn: record.lastNameEn,
      firstNameFr: record.firstNameFr ?? '',
      lastNameFr: record.lastNameFr ?? '',
      email: record.email,
      phone: record.phone ?? '',
      dateOfBirth: record.dateOfBirth
        ? String(record.dateOfBirth).slice(0, 10)
        : '',
      preferredLocale: (record.preferredLocale === 'fr' ? 'fr' : 'en') as 'en' | 'fr',
      studentProfileId: record.studentProfileId ?? '',
      subSystem: record.subSystem as EnrollmentApplicationFormValues['subSystem'],
      branch: record.branch as EnrollmentApplicationFormValues['branch'],
      specialtyId: record.specialtyId,
      levelId: record.levelId,
      academicYearId: record.academicYearId,
    });
  }, [record, form]);

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

  const pending =
    createApplication.isPending || updateApplication.isPending;

  const onSubmit = (values: EnrollmentApplicationFormValues) => {
    if (isEdit && record) {
      updateApplication.mutate({
        id: record.id,
        values,
        currentStatus: record.status,
      });
    } else {
      createApplication.mutate(values);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Application type</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NEW">New student</SelectItem>
                    <SelectItem value="RE_ENROLL">Re-enrollment</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferredLocale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred locale</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
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
            name="firstNameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name (English)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastNameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name (English)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="firstNameFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name (French)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastNameFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name (French)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
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
            name="academicYearId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Academic year</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
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
                        {year.isCurrent ? ' (current)' : ''}
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
            {isEdit ? 'Save changes' : 'Submit application'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
