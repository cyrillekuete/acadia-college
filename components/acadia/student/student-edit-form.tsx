'use client';

import { useEffect } from 'react';
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
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { Switch } from '@/components/ui/switch';
import {
  studentProfileEditSchema,
  type StudentProfileEditFormValues,
  type StudentProfileEditValues,
} from '@/lib/acadia/student-schemas';
import { useStudentMutations } from '@/hooks/use-student-mutations';
import { useTranslation } from '@/hooks/useTranslation';

export type StudentEditRecord = {
  profileId: string;
  userId: string;
  registrationNumber: string;
  matriculeNumber: string | null;
  isActive: boolean;
  alumniDirectoryOptIn: boolean;
  alumniSince: string | null;
  name: string;
  email: string;
  country: string | null;
  timezone: string | null;
};

export function StudentEditForm({ student }: { student: StudentEditRecord }) {
  const { t } = useTranslation();
  const { updateStudentProfile } = useStudentMutations();

  const form = useForm<StudentProfileEditFormValues, unknown, StudentProfileEditValues>({
    resolver: zodResolver(studentProfileEditSchema),
    defaultValues: {
      registrationNumber: student.registrationNumber,
      matriculeNumber: student.matriculeNumber ?? '',
      isActive: student.isActive,
      alumniDirectoryOptIn: student.alumniDirectoryOptIn,
      alumniSince: student.alumniSince?.slice(0, 10) ?? '',
      name: student.name,
      email: student.email,
      country: student.country ?? '',
      timezone: student.timezone ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      registrationNumber: student.registrationNumber,
      matriculeNumber: student.matriculeNumber ?? '',
      isActive: student.isActive,
      alumniDirectoryOptIn: student.alumniDirectoryOptIn,
      alumniSince: student.alumniSince?.slice(0, 10) ?? '',
      name: student.name,
      email: student.email,
      country: student.country ?? '',
      timezone: student.timezone ?? '',
    });
  }, [student, form]);

  const onSubmit = (values: StudentProfileEditValues) => {
    updateStudentProfile.mutate({
      profileId: student.profileId,
      userId: student.userId,
      values,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="registrationNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('students.studentId')}</FormLabel>
              <FormControl>
                <Input {...field} readOnly className="bg-muted" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="matriculeNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('students.matriculeOptional')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder={t('students.matriculePlaceholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.labels.fullName')}</FormLabel>
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
              <FormLabel>{t('common.labels.email')}</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('common.labels.country')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('common.labels.timezone')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="alumniSince"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('students.alumniSince')}</FormLabel>
              <FormControl>
                <DatePickerInput
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <FormLabel>{t('students.activeStudent')}</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="alumniDirectoryOptIn"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <FormLabel>{t('students.alumniOptIn')}</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={updateStudentProfile.isPending}>
          {updateStudentProfile.isPending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : null}
          {t('students.saveProfile')}
        </Button>
      </form>
    </Form>
  );
}
