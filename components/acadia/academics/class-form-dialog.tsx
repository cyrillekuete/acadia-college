'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { normalizeSubjectSelections } from '@/lib/acadia/class-subject-selections';
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
import { classCreateConfirmCopy } from '@/lib/acadia/structure-messages';
import { RegistryCreateConfirmDialog } from '@/components/acadia/academics/registry-create-confirm-dialog';
import { SubjectClassMultiSelect } from '@/components/acadia/academics/subject-class-multi-select';
import { fetchClassSubjectSelections } from '@/lib/supabase/queries/class-subjects';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { useLevelOptions } from '@/hooks/use-academic-calendar-options';
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<ClassFormValues | null>(null);
  const createConfirm = classCreateConfirmCopy();

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      levelId: '',
      subSystem: defaultFilters?.subSystem ?? 'ENGLISH',
      branch: defaultFilters?.branch ?? 'GRAMMAR',
      staffProfileId: '',
      status: 'ACTIVE',
      subjectSelections: [],
    },
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const levelId = form.watch('levelId');

  const { data: levels = [] } = useLevelOptions({ subSystem, branch });
  const { data: staff = [] } = useStaffOptions({ enabled: open });
  const {
    data: availableSubjects = [],
    isLoading: subjectsLoading,
    isError: subjectsError,
    error: subjectsQueryError,
  } = useSubjectsForClass({
    levelId,
    subSystem,
    branch,
    academicYearId: activeYearId,
  });

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      setPendingValues(null);
      return;
    }

    async function resetForm() {
      if (record && tenantId) {
        const supabase = requireBrowserClient();
        let assignedSelections: ClassFormValues['subjectSelections'] = [];
        try {
          assignedSelections = await fetchClassSubjectSelections(
            supabase,
            tenantId,
            record.id,
          );
        } catch {
          assignedSelections = [];
        }
        form.reset({
          name: record.name,
          levelId: record.levelId,
          subSystem: record.subSystem,
          branch: record.branch,
          staffProfileId: record.staffProfileId ?? '',
          status: record.status,
          subjectSelections: assignedSelections,
        });
      } else {
        form.reset({
          name: '',
          levelId: '',
          subSystem: defaultFilters?.subSystem ?? 'ENGLISH',
          branch: defaultFilters?.branch ?? 'GRAMMAR',
          staffProfileId: '',
          status: 'ACTIVE',
          subjectSelections: [],
        });
      }
    }

    void resetForm();
  }, [open, record, defaultFilters, form, tenantId]);

  useEffect(() => {
    const currentLevel = form.getValues('levelId');
    if (currentLevel && !levels.some((level) => level.id === currentLevel)) {
      form.setValue('levelId', '');
    }
  }, [subSystem, branch, levels, form]);

  useEffect(() => {
    if (subjectsLoading || availableSubjects.length === 0) {
      return;
    }
    const current = form.getValues('subjectSelections') ?? [];
    const next = normalizeSubjectSelections(current, availableSubjects);
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      form.setValue('subjectSelections', next);
    }
  }, [levelId, availableSubjects, subjectsLoading, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record) {
      try {
        await updateClass.mutateAsync({ id: record.id, values });
        onOpenChange(false);
      } catch {
        // Toast is shown by mutation onError; keep dialog open for correction.
      }
      return;
    }
    setPendingValues(values);
    setConfirmOpen(true);
  });

  const confirmCreate = async () => {
    if (!pendingValues) {
      return;
    }
    try {
      await createClass.mutateAsync(pendingValues);
      setConfirmOpen(false);
      setPendingValues(null);
      onOpenChange(false);
    } catch {
      setConfirmOpen(false);
      // Toast is shown by mutation onError; keep form dialog open for correction.
    }
  };

  const subjectsErrorMessage = subjectsError
    ? subjectsQueryError instanceof Error
      ? subjectsQueryError.message
      : 'Failed to load subjects.'
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,720px)] max-w-lg overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? 'Edit class' : 'New class'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
            <DialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto">
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
                name="subjectSelections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subjects</FormLabel>
                    {!levelId ? (
                      <p className="text-sm text-muted-foreground">
                        Select a level to see subjects.
                      </p>
                    ) : (
                      <FormControl>
                        <SubjectClassMultiSelect
                          options={availableSubjects}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          loading={subjectsLoading}
                          error={subjectsErrorMessage}
                          emptyMessage="No subjects found for this level and stream."
                        />
                      </FormControl>
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
            {isEdit && record ? (
              <p className="shrink-0 px-6 pb-2 text-sm text-muted-foreground">
                <Link
                  href={
                    activeYearId
                      ? `/academics/promotion?year=${activeYearId}&class=${record.id}`
                      : `/academics/promotion?class=${record.id}`
                  }
                  className="text-primary hover:underline"
                >
                  Configure promotion policy for this class
                </Link>
              </p>
            ) : null}
            <DialogFooter className="shrink-0">
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
      <RegistryCreateConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={createConfirm.title}
        description={createConfirm.description}
        onConfirm={() => void confirmCreate()}
        pending={createClass.isPending}
      />
    </Dialog>
  );
}
