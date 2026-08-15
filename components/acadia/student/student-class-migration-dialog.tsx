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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  branchLabel,
  levelDisplayLabel,
  subSystemLabel,
  type AcademicBranch,
  type AcademicSubSystem,
} from '@/lib/acadia/education-system';
import {
  studentClassMigrationSchema,
  type StudentClassMigrationValues,
} from '@/lib/acadia/student-schemas';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  useClassesForFilters,
  useLevelsForStream,
} from '@/hooks/use-enrollment-catalog-options';
import { useStudentMutations } from '@/hooks/use-student-mutations';

export function StudentClassMigrationDialog({
  profileId,
  subSystem: initialSubSystem,
  branch: initialBranch,
}: {
  profileId: string;
  subSystem: string;
  branch: string;
}) {
  const [open, setOpen] = useState(false);
  const { migrateStudentClass } = useStudentMutations();
  const { activeYearId } = useActiveAcademicYear();

  const form = useForm<StudentClassMigrationValues>({
    resolver: zodResolver(studentClassMigrationSchema),
    defaultValues: {
      subSystem: initialSubSystem as AcademicSubSystem,
      branch: initialBranch as AcademicBranch,
      levelId: '',
      classId: '',
      academicYearId: '',
      note: '',
    },
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const levelId = form.watch('levelId');
  const { data: levels = [] } = useLevelsForStream(subSystem, branch);
  const { data: classOptions = [] } = useClassesForFilters({
    levelId,
    subSystem,
    branch,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset({
      subSystem: initialSubSystem as AcademicSubSystem,
      branch: initialBranch as AcademicBranch,
      levelId: '',
      classId: '',
      academicYearId: activeYearId ?? '',
      note: '',
    });
  }, [open, initialSubSystem, initialBranch, activeYearId, form]);

  useEffect(() => {
    const current = form.getValues('levelId');
    if (current && !levels.some((l) => l.id === current)) {
      form.setValue('levelId', '');
      form.setValue('classId', '');
    }
  }, [subSystem, branch, levels, form]);

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
                      <CurrentAcademicYearBadge />
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          form.setValue('levelId', '');
                          form.setValue('classId', '');
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
                          form.setValue('levelId', '');
                          form.setValue('classId', '');
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
                  name="levelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue('classId', '');
                        }}
                        disabled={!subSystem || !branch || levels.length === 0}
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
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class (optional)</FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Auto-match if unique" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classOptions.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
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
