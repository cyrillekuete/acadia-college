'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import {
  CLASS_STATUSES,
  classFormSchema,
  type ClassFormValues,
} from '@/lib/acadia/structure-schemas';
import { fetchClassSubjectIds } from '@/lib/supabase/queries/class-subjects';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { useLevelOptions } from '@/hooks/use-academic-calendar-options';
import { useSpecialtyOptions } from '@/hooks/use-enrollment-catalog-options';
import { useStaffOptions } from '@/hooks/use-subject-catalog-options';
import { useSubjectsForClass } from '@/hooks/use-subjects-for-class';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';

type ClassRow = {
  id: string;
  name: string;
  levelId: string;
  subSystem: ClassFormValues['subSystem'];
  branch: ClassFormValues['branch'];
  specialtyId?: string | null;
  staffProfileId?: string | null;
  status: ClassFormValues['status'];
};

export function ClassFormDialog({
  open,
  onOpenChange,
  record,
  defaultFilters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ClassRow | null;
  defaultFilters?: CatalogFilters;
}) {
  const { createClass, updateClass } = useAcademicStructureMutations();
  const { data: session } = useAcadiaCollegeSession();
  const { activeYearId } = useActiveAcademicYear();
  const isEdit = !!record;
  const pending = createClass.isPending || updateClass.isPending;
  const tenantId = session?.tenantId ?? null;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      levelId: '',
      subSystem: defaultFilters?.subSystem ?? 'ENGLISH',
      branch: defaultFilters?.branch ?? 'GRAMMAR',
      specialtyId: '',
      staffProfileId: '',
      status: 'ACTIVE',
      subjectIds: [],
    },
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const levelId = form.watch('levelId');
  const specialtyId = form.watch('specialtyId');
  const subjectIds = form.watch('subjectIds');

  const { data: levels = [] } = useLevelOptions({ subSystem, branch });
  const { data: specialties = [] } = useSpecialtyOptions(subSystem, branch);
  const { data: staff = [] } = useStaffOptions({ enabled: open });
  const { data: availableSubjects = [], isLoading: subjectsLoading } = useSubjectsForClass({
    levelId,
    specialtyId: specialtyId || undefined,
    subSystem,
    branch,
    academicYearId: activeYearId,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    async function resetForm() {
      if (record && tenantId) {
        const supabase = requireBrowserClient();
        let assignedSubjectIds: string[] = [];
        try {
          assignedSubjectIds = await fetchClassSubjectIds(supabase, tenantId, record.id);
        } catch {
          assignedSubjectIds = [];
        }
        form.reset({
          name: record.name,
          levelId: record.levelId,
          subSystem: record.subSystem,
          branch: record.branch,
          specialtyId: record.specialtyId ?? '',
          staffProfileId: record.staffProfileId ?? '',
          status: record.status,
          subjectIds: assignedSubjectIds,
        });
      } else {
        form.reset({
          name: '',
          levelId: '',
          subSystem: defaultFilters?.subSystem ?? 'ENGLISH',
          branch: defaultFilters?.branch ?? 'GRAMMAR',
          specialtyId: '',
          staffProfileId: '',
          status: 'ACTIVE',
          subjectIds: [],
        });
      }
    }

    void resetForm();
  }, [open, record, defaultFilters, form, tenantId]);

  useEffect(() => {
    const currentLevel = form.getValues('levelId');
    if (currentLevel && !levels.some((l) => l.id === currentLevel)) {
      form.setValue('levelId', '');
    }
  }, [subSystem, branch, levels, form]);

  useEffect(() => {
    const validIds = new Set(availableSubjects.map((s) => s.id));
    const current = form.getValues('subjectIds') ?? [];
    const next = current.filter((id) => validIds.has(id));
    if (next.length !== current.length) {
      form.setValue('subjectIds', next);
    }
  }, [levelId, specialtyId, availableSubjects, form]);

  const toggleSubject = (subjectId: string, checked: boolean) => {
    const current = form.getValues('subjectIds') ?? [];
    if (checked) {
      if (!current.includes(subjectId)) {
        form.setValue('subjectIds', [...current, subjectId], { shouldDirty: true });
      }
      return;
    }
    form.setValue(
      'subjectIds',
      current.filter((id) => id !== subjectId),
      { shouldDirty: true },
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit && record) {
        await updateClass.mutateAsync({ id: record.id, values });
      } else {
        await createClass.mutateAsync(values);
      }
      onOpenChange(false);
    } catch {
      // Toast is shown by mutation onError; keep dialog open for correction.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit class' : 'New class'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class name</FormLabel>
                    <FormControl>
                      <Input placeholder="Form 5 Arts" {...field} />
                    </FormControl>
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
                name="subSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                name="specialtyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty (optional)</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
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
                name="subjectIds"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Subjects</FormLabel>
                      {availableSubjects.length > 0 ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs"
                            onClick={() =>
                              form.setValue(
                                'subjectIds',
                                availableSubjects.map((s) => s.id),
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
                            onClick={() => form.setValue('subjectIds', [], { shouldDirty: true })}
                          >
                            Clear
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {!levelId ? (
                      <p className="text-sm text-muted-foreground">
                        Select a level to see subjects.
                      </p>
                    ) : subjectsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading subjects…</p>
                    ) : availableSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No subjects found for this level and stream.
                      </p>
                    ) : (
                      <ScrollArea className="h-40 rounded-md border p-3">
                        <div className="space-y-2">
                          {availableSubjects.map((subject) => {
                            const checked = (subjectIds ?? []).includes(subject.id);
                            return (
                              <div key={subject.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`class-subject-${subject.id}`}
                                  checked={checked}
                                  onCheckedChange={(value) =>
                                    toggleSubject(subject.id, value === true)
                                  }
                                />
                                <Label
                                  htmlFor={`class-subject-${subject.id}`}
                                  className="cursor-pointer text-sm font-normal"
                                >
                                  {subject.code} — {subject.nameEn}
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
              <FormField
                control={form.control}
                name="staffProfileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class teacher</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {staff.map((member) => {
                          const user = unwrapRelation<{ name?: string | null }>(member.User);
                          const label =
                            user?.name?.trim() ||
                            member.staffCode ||
                            member.id;
                          return (
                            <SelectItem key={member.id} value={member.id}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLASS_STATUSES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            {isEdit && record && activeYearId ? (
              <p className="px-6 pb-2 text-sm text-muted-foreground">
                <Link
                  href={`/academics/promotion?year=${activeYearId}&class=${record.id}`}
                  className="text-primary hover:underline"
                >
                  Configure promotion policy for this class
                </Link>
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                {isEdit ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
