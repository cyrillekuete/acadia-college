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
  subSystemLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { levelFormSchema, type LevelFormValues } from '@/lib/acadia/structure-schemas';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { type LevelListRow } from '@/hooks/use-level-list';

export function LevelFormDialog({
  open,
  onOpenChange,
  record,
  defaultFilters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: LevelListRow | null;
  defaultFilters?: CatalogFilters;
}) {
  const { createLevel, updateLevel } = useAcademicStructureMutations();
  const isEdit = !!record;
  const pending = createLevel.isPending || updateLevel.isPending;

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(levelFormSchema),
    defaultValues: {
      name: '',
      subSystem: defaultFilters?.subSystem ?? 'ENGLISH',
      branch: defaultFilters?.branch ?? 'GRAMMAR',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        name: record.name,
        subSystem: record.subSystem,
        branch: record.branch,
      });
    } else {
      form.reset({
        name: '',
        subSystem: defaultFilters?.subSystem ?? 'ENGLISH',
        branch: defaultFilters?.branch ?? 'GRAMMAR',
      });
    }
  }, [open, record, defaultFilters, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit && record) {
        await updateLevel.mutateAsync({ id: record.id, values });
      } else {
        await createLevel.mutateAsync(values);
      }
      onOpenChange(false);
    } catch {
      // Toast is shown by mutation onError; keep dialog open for correction.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit level' : 'New level'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level name</FormLabel>
                    <FormControl>
                      <Input placeholder="Form 5" {...field} />
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
