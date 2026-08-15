'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { normalizeSubjectSelections } from '@/lib/acadia/class-subject-selections';
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
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  levelDisplayLabel,
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
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
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

  const onSubmit = form.handleSubmit(async (values) => {
    const normalized = {
      ...values,
      subjectSelections: normalizeSubjectSelections(
        values.subjectSelections ?? [],
        availableSubjects,
      ),
    };
    if (isEdit && record) {
      try {
        await updateClass.mutateAsync({ id: record.id, values: normalized });
        onOpenChange(false);
      } catch {
        // Toast is shown by mutation onError; keep dialog open for correction.
      }
      return;
    }
    setPendingValues(normalized);
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
      : t('academics.loadSubjectsFailed')
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{isEdit ? t('academics.editClass') : t('academics.newClass')}</SheetTitle>
          <SheetDescription className="sr-only">
            {isEdit
              ? t('academics.editClassDescription')
              : t('academics.newClassDescription')}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
            <SheetBody className="p-0">
              <ScrollArea className="h-[calc(100vh-10.5rem)]">
                <div className="space-y-4 px-5 py-2.5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academics.className')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('academics.classNamePlaceholder')} {...field} />
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
                    <FormLabel>{t('students.level')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('academics.selectLevel')} />
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
                    <FormLabel>{t('catalog.subSystemLabel')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACADEMIC_SUB_SYSTEMS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {t(`catalog.subSystem.${value}`)}
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
                    <FormLabel>{t('catalog.branchLabel')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACADEMIC_BRANCHES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {t(`catalog.branch.${value}`)}
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
                    <FormLabel>{t('nav.subjects')}</FormLabel>
                    {!levelId ? (
                      <p className="text-sm text-muted-foreground">
                        {t('academics.subjectsHint')}
                      </p>
                    ) : (
                      <FormControl>
                        <SubjectClassMultiSelect
                          options={availableSubjects}
                          value={field.value ?? []}
                          onChange={(selections) =>
                            field.onChange(
                              normalizeSubjectSelections(selections, availableSubjects),
                            )
                          }
                          loading={subjectsLoading}
                          error={subjectsErrorMessage}
                          emptyMessage={t('academics.noSubjectsForLevel')}
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
                    <FormLabel>{t('academics.classTeacher')}</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.labels.unassigned')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t('common.labels.unassigned')}</SelectItem>
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
                    <FormLabel>{t('common.labels.status')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLASS_STATUSES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value === 'ACTIVE' ? t('common.labels.active') : t('common.labels.inactive')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
                  {isEdit && record ? (
                    <p className="text-sm text-muted-foreground">
                      <Link
                        href={
                          activeYearId
                            ? `/academics/promotion?year=${activeYearId}&class=${record.id}`
                            : `/academics/promotion?class=${record.id}`
                        }
                        className="text-primary hover:underline"
                      >
                        {t('academics.configurePromotion')}
                      </Link>
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            </SheetBody>
            <SheetFooter className="border-t border-border p-5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                {isEdit ? t('common.buttons.save') : t('common.buttons.create')}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
      <RegistryCreateConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={createConfirm.title}
        description={createConfirm.description}
        onConfirm={() => void confirmCreate()}
        pending={createClass.isPending}
      />
    </Sheet>
  );
}
