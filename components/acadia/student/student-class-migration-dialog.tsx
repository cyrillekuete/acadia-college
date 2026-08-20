'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowRightLeft, LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[540px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

const FORM_ID = 'class-migration-form';

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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className={SHEET_CONTENT_CLASS}>
          <SheetHeader className="mb-0 border-b border-border">
            <div className="space-y-1 p-3 pe-12">
              <SheetTitle>Class migration</SheetTitle>
              <SheetDescription>
                Move this student to another level or class for the current academic year.
              </SheetDescription>
            </div>
          </SheetHeader>
          <SheetBody className="p-0">
            <ScrollArea className="h-[calc(100vh-12.5rem)]">
              <div className="px-5 py-2.5">
                <Form {...form}>
                  <form
                    id={FORM_ID}
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
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
                          <FormLabel>
                            {classOptions.length > 1 ? 'Class' : 'Class (optional)'}
                          </FormLabel>
                          <Select
                            value={field.value || (classOptions.length === 1 ? classOptions[0]!.id : '')}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    classOptions.length === 1
                                      ? 'Auto-match unique class'
                                      : 'Select a class'
                                  }
                                />
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
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Note (optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </ScrollArea>
          </SheetBody>
          <SheetFooter className="border-t border-border p-5">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={migrateStudentClass.isPending}
            >
              {migrateStudentClass.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Apply migration
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
