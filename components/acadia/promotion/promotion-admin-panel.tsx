'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  promotionActionLabel,
  PROMOTION_PASS_AVERAGE,
} from '@/lib/acadia/promotion';
import {
  promotionFiltersSchema,
  promotionOverrideSchema,
  PROMOTION_ACTIONS,
  type PromotionFiltersValues,
  type PromotionOverrideValues,
} from '@/lib/acadia/promotion-schemas';
import { formatMarkScore } from '@/lib/acadia/assessment';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  useLevelsForSpecialty,
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { usePromotionMutations } from '@/hooks/use-promotion-mutations';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { canManagePromotion } from '@/lib/acadia/roles';
import { levelDisplayLabel } from '@/lib/acadia/education-system';

export function PromotionAdminPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManagePromotion(session?.roleSlug);
  const { computeAutomaticPromotion, savePromotionOverride } =
    usePromotionMutations();
  const { data: years = [] } = useAcademicYearOptions();
  const { data: specialties = [] } = useSpecialtyOptions();

  const filterForm = useForm<PromotionFiltersValues>({
    resolver: zodResolver(promotionFiltersSchema),
    defaultValues: {
      academicYearId: '',
      specialtyId: '',
      levelId: '',
    },
  });

  const academicYearId = filterForm.watch('academicYearId');
  const specialtyId = filterForm.watch('specialtyId');
  const { data: levels = [] } = useLevelsForSpecialty(specialtyId);

  const [submitted, setSubmitted] = useState<PromotionFiltersValues | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{
    studentProfileId: string;
    registrationNumber: string;
    finalAction: string;
    targetLevelId: string | null;
  } | null>(null);

  useEffect(() => {
    if (years.length > 0 && !academicYearId) {
      const current = years.find((y) => y.isCurrent);
      filterForm.setValue('academicYearId', current?.id ?? years[0].id);
    }
  }, [years, academicYearId, filterForm]);

  const decisionsQuery = useQuery({
    queryKey: ['promotion-decisions', tenantId, submitted],
    queryFn: async () => {
      if (!submitted) {
        return [];
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentPromotionDecision')
        .select(
          `
          id,
          studentProfileId,
          yearAverage,
          recommendedAction,
          finalAction,
          source,
          targetLevelId,
          notes,
          StudentProfile:studentProfileId (
            registrationNumber,
            User:userId ( name )
          ),
          Level:targetLevelId ( number, labelEn )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', submitted.academicYearId)
        .eq('specialtyId', submitted.specialtyId)
        .eq('fromLevelId', submitted.levelId)
        .order('yearAverage', { ascending: false, nullsFirst: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!submitted,
  });

  const overrideForm = useForm<PromotionOverrideValues>({
    resolver: zodResolver(promotionOverrideSchema),
    defaultValues: {
      studentProfileId: '',
      academicYearId: '',
      finalAction: 'PROMOTE',
      notes: '',
    },
  });

  useEffect(() => {
    if (!overrideTarget || !submitted) {
      return;
    }
    overrideForm.reset({
      studentProfileId: overrideTarget.studentProfileId,
      academicYearId: submitted.academicYearId,
      finalAction: overrideTarget.finalAction as PromotionOverrideValues['finalAction'],
      targetLevelId: overrideTarget.targetLevelId ?? undefined,
      notes: '',
    });
  }, [overrideTarget, submitted, overrideForm]);

  const rows = useMemo(() => decisionsQuery.data ?? [], [decisionsQuery.data]);

  const stats = useMemo(() => {
    const promote = rows.filter((r) => r.finalAction === 'PROMOTE').length;
    const repeat = rows.filter((r) => r.finalAction === 'REPEAT').length;
    const manual = rows.filter((r) => r.source === 'MANUAL').length;
    return { promote, repeat, manual, total: rows.length };
  }, [rows]);

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Administrator access is required to manage promotion.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Students with a year average of {PROMOTION_PASS_AVERAGE} or above are
        recommended to promote automatically (FR-DM-1). Use manual overrides for
        exceptional cases (FR-DM-2).
      </p>

      <Form {...filterForm}>
        <form
          onSubmit={filterForm.handleSubmit((values) => setSubmitted(values))}
          className="flex flex-wrap items-end gap-4"
        >
          <FormField
            control={filterForm.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem className="min-w-[160px]">
                <FormLabel>Academic year</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={filterForm.control}
            name="specialtyId"
            render={({ field }) => (
              <FormItem className="min-w-[180px]">
                <FormLabel>Specialty</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Specialty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={filterForm.control}
            name="levelId"
            render={({ field }) => (
              <FormItem className="min-w-[160px]">
                <FormLabel>Level</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!specialtyId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {levelDisplayLabel(l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="secondary">
            Load decisions
          </Button>
          <Button
            type="button"
            disabled={!submitted || computeAutomaticPromotion.isPending}
            onClick={() => {
              if (submitted) {
                computeAutomaticPromotion.mutate(submitted);
              }
            }}
          >
            {computeAutomaticPromotion.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Compute automatic promotion
          </Button>
        </form>
      </Form>

      {submitted ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{stats.total} students</Badge>
          <Badge variant="secondary">{stats.promote} promote</Badge>
          <Badge variant="secondary">{stats.repeat} repeat</Badge>
          <Badge variant="outline">{stats.manual} manual overrides</Badge>
          <Button size="sm" variant="outline" asChild>
            <Link
              href={`/academics/years/${submitted.academicYearId}/rollover?specialty=${submitted.specialtyId}`}
            >
              Year rollover wizard
            </Link>
          </Button>
        </div>
      ) : null}

      {decisionsQuery.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(decisionsQuery.error)}
        </p>
      ) : null}

      {submitted && !decisionsQuery.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No promotion decisions yet. Run &quot;Compute automatic promotion&quot; for
          this cohort.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Year avg</TableHead>
              <TableHead>Recommended</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Target level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const profile = unwrapRelation<{
                registrationNumber?: string;
                User?: unknown;
              }>(row.StudentProfile);
              const user = unwrapRelation<{ name?: string }>(profile?.User);
              const targetLevel = unwrapRelation<{ number?: number; labelEn?: string }>(
                row.Level,
              );
              return (
                <TableRow key={row.id as string}>
                  <TableCell>
                    <Link
                      href={`/students/${row.studentProfileId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {user?.name ?? profile?.registrationNumber ?? '—'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatMarkScore(
                      row.yearAverage != null ? Number(row.yearAverage) : null,
                    )}
                  </TableCell>
                  <TableCell>
                    {promotionActionLabel(
                      row.recommendedAction as Parameters<typeof promotionActionLabel>[0],
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.source === 'MANUAL' ? 'primary' : 'secondary'}
                    >
                      {promotionActionLabel(
                        row.finalAction as Parameters<typeof promotionActionLabel>[0],
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {targetLevel
                      ? levelDisplayLabel(targetLevel)
                      : row.finalAction === 'GRADUATE'
                        ? 'Alumni'
                        : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setOverrideTarget({
                          studentProfileId: row.studentProfileId as string,
                          registrationNumber:
                            profile?.registrationNumber ?? 'Student',
                          finalAction: row.finalAction as string,
                          targetLevelId: row.targetLevelId as string | null,
                        })
                      }
                    >
                      Override
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      <Dialog
        open={!!overrideTarget}
        onOpenChange={(open) => !open && setOverrideTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Manual override — {overrideTarget?.registrationNumber}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Form {...overrideForm}>
              <form
                id="promotion-override-form"
                onSubmit={overrideForm.handleSubmit((values) => {
                  savePromotionOverride.mutate(values, {
                    onSuccess: () => setOverrideTarget(null),
                  });
                })}
                className="space-y-4"
              >
                <FormField
                  control={overrideForm.control}
                  name="finalAction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final decision</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROMOTION_ACTIONS.map((action) => (
                            <SelectItem key={action} value={action}>
                              {promotionActionLabel(action)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={overrideForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
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
              form="promotion-override-form"
              disabled={savePromotionOverride.isPending}
            >
              Save override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


