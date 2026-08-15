'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
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
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { levelFormSchema, type LevelFormValues } from '@/lib/acadia/structure-schemas';
import { levelCreateConfirmCopy } from '@/lib/acadia/structure-messages';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { useTranslation } from '@/hooks/useTranslation';
import { type LevelListRow } from '@/hooks/use-level-list';
import { RegistryCreateConfirmDialog } from '@/components/acadia/academics/registry-create-confirm-dialog';

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
  const { t } = useTranslation();
  const { createLevel, updateLevel } = useAcademicStructureMutations();
  const isEdit = !!record;
  const pending = createLevel.isPending || updateLevel.isPending;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<LevelFormValues | null>(null);
  const createConfirm = levelCreateConfirmCopy();

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
      setConfirmOpen(false);
      setPendingValues(null);
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
    if (isEdit && record) {
      try {
        await updateLevel.mutateAsync({ id: record.id, values });
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
      await createLevel.mutateAsync(pendingValues);
      setConfirmOpen(false);
      setPendingValues(null);
      onOpenChange(false);
    } catch {
      setConfirmOpen(false);
      // Toast is shown by mutation onError; keep form dialog open for correction.
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{isEdit ? t('academics.editLevel') : t('academics.newLevel')}</SheetTitle>
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
                    <FormLabel>{t('academics.levelName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('academics.levelNamePlaceholder')} {...field} />
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
        pending={createLevel.isPending}
      />
    </Sheet>
  );
}
