'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowRightLeft, LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { levelDisplayLabel } from '@/lib/acadia/education-system';
import {
  studentClassMigrationSchema,
  type StudentClassMigrationValues,
} from '@/lib/acadia/student-schemas';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  useLevelsForSpecialty,
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';
import { useStudentMutations } from '@/hooks/use-student-mutations';

export function StudentClassMigrationDialog({
  profileId,
  currentSpecialtyId,
  subSystem,
  branch,
}: {
  profileId: string;
  currentSpecialtyId: string;
  subSystem: string;
  branch: string;
}) {
  const [open, setOpen] = useState(false);
  const { migrateStudentClass } = useStudentMutations();
  const { data: years = [] } = useAcademicYearOptions();

  const form = useForm<StudentClassMigrationValues>({
    resolver: zodResolver(studentClassMigrationSchema),
    defaultValues: {
      specialtyId: currentSpecialtyId,
      levelId: '',
      academicYearId: '',
      note: '',
    },
  });

  const specialtyId = form.watch('specialtyId');
  const { data: specialties = [] } = useSpecialtyOptions(
    subSystem as 'ENGLISH' | 'FRENCH',
    branch as 'GRAMMAR' | 'TECHNICAL' | 'COMMERCIAL',
  );
  const { data: levels = [] } = useLevelsForSpecialty(specialtyId);

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset({
      specialtyId: currentSpecialtyId,
      levelId: '',
      academicYearId: years.find((y) => y.isCurrent)?.id ?? '',
      note: '',
    });
  }, [open, currentSpecialtyId, years, form]);

  const onSubmit = (values: StudentClassMigrationValues) => {
    migrateStudentClass.mutate(
      { profileId, values },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="size-4" />
        Migrate class
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Class migration</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Form {...form}>
              <form
                id="class-migration-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="academicYearId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic year</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
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
                <FormField
                  control={form.control}
                  name="specialtyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </DialogBody>
          <DialogFooter>
            <Button
              type="submit"
              form="class-migration-form"
              disabled={migrateStudentClass.isPending}
            >
              {migrateStudentClass.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Apply migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
