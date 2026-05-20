'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
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
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { useLevelOptions } from '@/hooks/use-academic-calendar-options';
import {
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';
import { useStaffOptions } from '@/hooks/use-subject-catalog-options';
import { unwrapRelation } from '@/lib/acadia/record-display';

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
  const isEdit = !!record;
  const pending = createClass.isPending || updateClass.isPending;

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
    },
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');

  const { data: levels = [] } = useLevelOptions({ subSystem, branch });
  const { data: specialties = [] } = useSpecialtyOptions(subSystem, branch);
  const { data: staff = [] } = useStaffOptions();

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        name: record.name,
        levelId: record.levelId,
        subSystem: record.subSystem,
        branch: record.branch,
        specialtyId: record.specialtyId ?? '',
        staffProfileId: record.staffProfileId ?? '',
        status: record.status,
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
      });
    }
  }, [open, record, defaultFilters, form]);

  useEffect(() => {
    const currentLevel = form.getValues('levelId');
    if (currentLevel && !levels.some((l) => l.id === currentLevel)) {
      form.setValue('levelId', '');
    }
  }, [subSystem, branch, levels, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record) {
      await updateClass.mutateAsync({ id: record.id, values });
    } else {
      await createClass.mutateAsync(values);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
