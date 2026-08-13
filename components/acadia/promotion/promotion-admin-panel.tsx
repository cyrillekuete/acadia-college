'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ClassPromotionPoliciesTable } from '@/components/acadia/promotion/class-promotion-policies-table';
import {
  promotionActionLabel,
} from '@/lib/acadia/promotion';
import {
  promotionFiltersSchema,
  promotionOverrideSchema,
  PROMOTION_ACTIONS,
  PROMOTION_BULK_MODES,
  type PromotionFiltersValues,
  type PromotionOverrideValues,
} from '@/lib/acadia/promotion-schemas';
import { formatMarkScore } from '@/lib/acadia/assessment';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  levelDisplayLabel,
} from '@/lib/acadia/education-system';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  useClassesForFilters,
  useLevelsForStream,
} from '@/hooks/use-enrollment-catalog-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { usePromotionMutations } from '@/hooks/use-promotion-mutations';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { canManagePromotion } from '@/lib/acadia/roles';
import {
  countEnrollmentsForClass,
  fetchClassPromotionPolicy,
  fetchPromotionDecisions,
  fetchUnassignedEnrollments,
  isPromotionYearLocked,
} from '@/lib/supabase/queries/promotion';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

export function PromotionAdminPanel() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManagePromotion(session?.roleSlug);
  const {
    computeAutomaticPromotion,
    savePromotionOverride,
    deleteOrphanAutoDecisions,
  } = usePromotionMutations();
  const { data: years = [] } = useAcademicYearOptions();

  const filterForm = useForm<PromotionFiltersValues>({
    resolver: zodResolver(promotionFiltersSchema),
    defaultValues: {
      academicYearId: '',
      bulkMode: 'class',
      classId: '',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
    },
  });

  const academicYearId = filterForm.watch('academicYearId');
  const bulkMode = filterForm.watch('bulkMode');
  const subSystem = filterForm.watch('subSystem');
  const branch = filterForm.watch('branch');
  const classId = filterForm.watch('classId');

  const { data: classes = [] } = useClassesForFilters();

  const [submitted, setSubmitted] = useState<PromotionFiltersValues | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{
    studentProfileId: string;
    registrationNumber: string;
    finalAction: string;
    targetLevelId: string | null;
    classId: string;
  } | null>(null);

  const overrideClass = classes.find((c) => c.id === overrideTarget?.classId);
  const streamSubSystem =
    (overrideClass?.subSystem as PromotionFiltersValues['subSystem']) ??
    subSystem;
  const streamBranch =
    (overrideClass?.branch as PromotionFiltersValues['branch']) ?? branch;
  const { data: levels = [] } = useLevelsForStream(streamSubSystem, streamBranch);

  useEffect(() => {
    if (years.length > 0 && !academicYearId) {
      const fromUrl = searchParams.get('year');
      const current = years.find((y) => y.id === fromUrl) ?? years.find((y) => y.isCurrent);
      filterForm.setValue('academicYearId', current?.id ?? years[0].id);
    }
  }, [years, academicYearId, filterForm, searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get('class');
    if (fromUrl && classes.some((c) => c.id === fromUrl)) {
      filterForm.setValue('classId', fromUrl);
      filterForm.setValue('bulkMode', 'class');
    }
  }, [searchParams, classes, filterForm]);

  const yearLockedQuery = useQuery({
    queryKey: ['promotion-year-locked', tenantId, submitted?.academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return isPromotionYearLocked(
        supabase,
        tenantId!,
        submitted!.academicYearId,
      );
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!submitted?.academicYearId,
  });

  const enrollmentCountQuery = useQuery({
    queryKey: [
      'promotion-class-enrollment-count',
      tenantId,
      submitted?.classId,
      submitted?.academicYearId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return countEnrollmentsForClass(
        supabase,
        tenantId!,
        submitted!.academicYearId,
        submitted!.classId!,
      );
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!submitted?.classId &&
      submitted.bulkMode === 'class',
  });

  const policyQuery = useQuery({
    queryKey: ['class-promotion-policy', tenantId, submitted?.classId, submitted?.academicYearId],
    queryFn: async () => {
      if (!submitted?.classId || submitted.bulkMode !== 'class') {
        return null;
      }
      const supabase = requireBrowserClient();
      return fetchClassPromotionPolicy(
        supabase,
        tenantId!,
        submitted.classId,
        submitted.academicYearId,
      );
    },
    enabled:
      !!submitted?.classId &&
      submitted.bulkMode === 'class' &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const decisionsQuery = useQuery({
    queryKey: ['promotion-decisions', tenantId, submitted],
    queryFn: async () => {
      if (!submitted?.classId || submitted.bulkMode !== 'class') {
        return { rows: [], orphans: [] };
      }
      const supabase = requireBrowserClient();
      return fetchPromotionDecisions(supabase, tenantId!, {
        academicYearId: submitted.academicYearId,
        classId: submitted.classId,
      });
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!submitted?.classId &&
      submitted.bulkMode === 'class',
  });

  const unassignedQuery = useQuery({
    queryKey: ['promotion-unassigned', tenantId, academicYearId, subSystem, branch],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchUnassignedEnrollments(supabase, tenantId!, academicYearId, {
        subSystem: subSystem || undefined,
        branch: branch || undefined,
      });
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!academicYearId,
  });

  const overrideForm = useForm<PromotionOverrideValues>({
    resolver: zodResolver(promotionOverrideSchema),
    defaultValues: {
      studentProfileId: '',
      academicYearId: '',
      classId: '',
      finalAction: 'PROMOTE',
      targetLevelId: '',
      notes: '',
    },
  });

  const overrideFinalAction = overrideForm.watch('finalAction');

  useEffect(() => {
    if (!overrideTarget || !submitted) {
      return;
    }
    overrideForm.reset({
      studentProfileId: overrideTarget.studentProfileId,
      academicYearId: submitted.academicYearId,
      classId: overrideTarget.classId,
      finalAction: overrideTarget.finalAction as PromotionOverrideValues['finalAction'],
      targetLevelId: overrideTarget.targetLevelId ?? undefined,
      notes: '',
    });
  }, [overrideTarget, submitted, overrideForm]);

  const rows = useMemo(
    () => decisionsQuery.data?.rows ?? [],
    [decisionsQuery.data?.rows],
  );
  const orphanRows = useMemo(
    () => decisionsQuery.data?.orphans ?? [],
    [decisionsQuery.data?.orphans],
  );

  const yearLocked = yearLockedQuery.data === true;
  const enrollmentCount = enrollmentCountQuery.data ?? 0;

  const stats = useMemo(() => {
    const decided = rows.filter((r) => !r.isPending);
    const promote = decided.filter((r) => r.finalAction === 'PROMOTE').length;
    const repeat = decided.filter((r) => r.finalAction === 'REPEAT').length;
    const manual = decided.filter((r) => r.source === 'MANUAL').length;
    const pending = rows.filter((r) => r.isPending).length;
    return { promote, repeat, manual, pending, total: rows.length };
  }, [rows]);

  const selectedClass = classes.find((c) => c.id === submitted?.classId);
  const policy = policyQuery.data;

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('academics.promotionAccessDenied')}
      </p>
    );
  }

  return (
    <Tabs defaultValue="policies" className="space-y-6">
      <TabsList>
        <TabsTrigger value="policies">{t('academics.classPolicies')}</TabsTrigger>
        <TabsTrigger value="compute">{t('academics.computeDecisions')}</TabsTrigger>
      </TabsList>

      <TabsContent value="policies" className="space-y-4">
        <Form {...filterForm}>
          <FormField
            control={filterForm.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>{t('students.academicYear')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('academics.year')} />
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
              </FormItem>
            )}
          />
        </Form>
        {academicYearId ? (
          <ClassPromotionPoliciesTable
            academicYearId={academicYearId}
            years={years}
          />
        ) : null}
      </TabsContent>

      <TabsContent value="compute" className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {t('academics.promotionComputeHint')}
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
                  <FormLabel>{t('students.academicYear')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('academics.year')} />
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
              name="bulkMode"
              render={({ field }) => (
                <FormItem className="min-w-[160px]">
                  <FormLabel>{t('academics.computeScope')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROMOTION_BULK_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode === 'class'
                            ? t('academics.scopeClass')
                            : mode === 'stream'
                              ? t('academics.scopeStream')
                              : t('academics.scopeYear')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {bulkMode === 'stream' || bulkMode === 'year' ? (
              <>
                <FormField
                  control={filterForm.control}
                  name="subSystem"
                  render={({ field }) => (
                    <FormItem className="min-w-[180px]">
                      <FormLabel>
                        {bulkMode === 'stream'
                          ? t('academics.subSystem')
                          : t('academics.subSystemOptional')}
                      </FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('academics.subSystem')} />
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
                  control={filterForm.control}
                  name="branch"
                  render={({ field }) => (
                    <FormItem className="min-w-[160px]">
                      <FormLabel>
                        {bulkMode === 'stream'
                          ? t('academics.branch')
                          : t('academics.branchOptional')}
                      </FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('academics.branch')} />
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
              </>
            ) : null}
            {bulkMode === 'class' ? (
              <FormField
                control={filterForm.control}
                name="classId"
                render={({ field }) => (
                  <FormItem className="min-w-[200px]">
                    <FormLabel>{t('students.class')}</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('students.class')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <Button type="submit" variant="secondary">
              {t('academics.loadDecisions')}
            </Button>
            <Button
              type="button"
              disabled={
                !submitted ||
                yearLocked ||
                computeAutomaticPromotion.isPending ||
                (submitted.bulkMode === 'class' && enrollmentCount === 0)
              }
              title={
                yearLocked
                  ? t('academics.promotionLocked')
                  : submitted?.bulkMode === 'class' && enrollmentCount === 0
                    ? t('academics.noEnrolledStudents')
                    : undefined
              }
              onClick={() => {
                if (submitted) {
                  computeAutomaticPromotion.mutate(submitted);
                }
              }}
            >
              {computeAutomaticPromotion.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              {t('academics.computeAutomatic')}
            </Button>
          </form>
        </Form>

        {(unassignedQuery.data?.length ?? 0) > 0 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {t('academics.unassignedStudents', {
                count: unassignedQuery.data!.length,
              })}
            </p>
            <p className="mt-1 text-muted-foreground">
              {t('academics.unassignedHint')}{' '}
              <Link href="/classes" className="text-primary hover:underline">
                {t('nav.classRosters')}
              </Link>
            </p>
          </div>
        ) : null}

        {submitted?.bulkMode === 'class' && selectedClass ? (
          <div className="text-sm">
            {policy ? (
              policy.autoPromotionEnabled ? (
                <span>
                  <strong>{selectedClass.name}</strong>{' '}
                  {t('academics.promoteAtAverage', {
                    average: formatMarkScore(policy.minPromotionAverage),
                  })}
                </span>
              ) : (
                <span>
                  <strong>{selectedClass.name}</strong>{' '}
                  {t('academics.autoPromotionOff')}
                </span>
              )
            ) : (
              <span className="text-destructive">{t('academics.noPolicy')}</span>
            )}
          </div>
        ) : null}

        {submitted ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">
              {t('academics.studentCount', { count: stats.total })}
            </Badge>
            <Badge variant="secondary">
              {t('academics.promoteCount', { count: stats.promote })}
            </Badge>
            <Badge variant="secondary">
              {t('academics.repeatCount', { count: stats.repeat })}
            </Badge>
            <Badge variant="outline">
              {t('academics.manualCount', { count: stats.manual })}
            </Badge>
            {stats.pending > 0 ? (
              <Badge variant="outline">
                {t('academics.pendingCount', { count: stats.pending })}
              </Badge>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link href={`/academics/years/${submitted.academicYearId}/rollover`}>
                {t('academics.rolloverTitle')}
              </Link>
            </Button>
          </div>
        ) : null}

        {yearLocked ? (
          <p className="text-sm text-muted-foreground">
            {t('academics.yearLockedMessage')}
          </p>
        ) : null}

        {decisionsQuery.isError ? (
          <p className="text-sm text-destructive">
            {getQueryErrorMessage(decisionsQuery.error)}
          </p>
        ) : null}

        {submitted?.bulkMode === 'class' &&
        !decisionsQuery.isLoading &&
        rows.length === 0 &&
        enrollmentCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('academics.noEnrolledInClass')}
          </p>
        ) : null}

        {submitted?.bulkMode === 'class' &&
        !decisionsQuery.isLoading &&
        rows.length === 0 &&
        enrollmentCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('academics.noDecisionsYet')}
          </p>
        ) : null}

        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('students.student')}</TableHead>
                <TableHead>{t('academics.yearAvg')}</TableHead>
                <TableHead>{t('academics.threshold')}</TableHead>
                <TableHead>{t('academics.recommended')}</TableHead>
                <TableHead>{t('academics.final')}</TableHead>
                <TableHead>{t('academics.targetLevel')}</TableHead>
                <TableHead className="text-right">{t('common.labels.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const profile = unwrapRelation<{
                  registrationNumber?: string;
                  User?: unknown;
                }>(row.StudentProfile);
                const user = unwrapRelation<{ name?: string }>(profile?.User);
                const targetLevel = unwrapRelation<{
                  number?: number;
                  labelEn?: string;
                  labelFr?: string;
                }>(row.Level);
                const rowKey =
                  (row.id as string | null) ??
                  `pending-${row.studentProfileId as string}`;
                return (
                  <TableRow key={rowKey}>
                    <TableCell>
                      <Link
                        href={`/students/${row.studentProfileId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {user?.name ?? profile?.registrationNumber ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.isPending
                        ? '—'
                        : formatMarkScore(
                            row.yearAverage != null
                              ? Number(row.yearAverage)
                              : null,
                          )}
                    </TableCell>
                    <TableCell>
                      {row.policyMinAverage != null
                        ? formatMarkScore(Number(row.policyMinAverage))
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {row.isPending
                        ? t('academics.pending')
                        : t(`academics.action.${row.recommendedAction}`, {
                            defaultValue: promotionActionLabel(
                              row.recommendedAction as Parameters<
                                typeof promotionActionLabel
                              >[0],
                            ),
                          })}
                    </TableCell>
                    <TableCell>
                      {row.isPending ? (
                        <Badge variant="outline">{t('academics.pending')}</Badge>
                      ) : (
                        <Badge
                          variant={row.source === 'MANUAL' ? 'primary' : 'secondary'}
                        >
                          {t(`academics.action.${row.finalAction}`, {
                            defaultValue: promotionActionLabel(
                              row.finalAction as Parameters<
                                typeof promotionActionLabel
                              >[0],
                            ),
                          })}
                        </Badge>
                      )}
                      {row.classChangedSinceCompute ? (
                        <Badge variant="outline" className="ml-1">
                          {t('academics.classChanged')}
                        </Badge>
                      ) : null}
                      {row.policyStaleAt ? (
                        <Badge variant="outline" className="ml-1">
                          {t('academics.recompute')}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {targetLevel
                        ? levelDisplayLabel(targetLevel)
                        : row.finalAction === 'GRADUATE'
                          ? t('academics.alumni')
                          : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={yearLocked}
                        onClick={() =>
                          setOverrideTarget({
                            studentProfileId: row.studentProfileId as string,
                            registrationNumber:
                              profile?.registrationNumber ?? t('students.student'),
                            finalAction: (row.finalAction as string) ?? 'REPEAT',
                            targetLevelId: row.targetLevelId as string | null,
                            classId: submitted!.classId!,
                          })
                        }
                      >
                        {t('academics.override')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}

        {orphanRows.length > 0 && submitted ? (
          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              {t('academics.orphanDecisions', { count: orphanRows.length })}
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-muted-foreground">
                {t('academics.orphanHint')}
              </p>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={deleteOrphanAutoDecisions.isPending}
                onClick={() =>
                  deleteOrphanAutoDecisions.mutate({
                    academicYearId: submitted.academicYearId,
                    classId: submitted.classId!,
                    decisionIds: orphanRows
                      .filter((o) => o.source === 'AUTO' && o.id)
                      .map((o) => o.id as string),
                  })
                }
              >
                {t('academics.removeOrphans')}
              </Button>
            </div>
          </details>
        ) : null}

        <Dialog
          open={!!overrideTarget}
          onOpenChange={(open) => !open && setOverrideTarget(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t('academics.manualOverride', {
                  id: overrideTarget?.registrationNumber,
                })}
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
                        <FormLabel>{t('academics.finalDecision')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROMOTION_ACTIONS.map((action) => (
                              <SelectItem key={action} value={action}>
                                {t(`academics.action.${action}`, {
                                  defaultValue: promotionActionLabel(action),
                                })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {overrideFinalAction === 'PROMOTE' ? (
                    <FormField
                      control={overrideForm.control}
                      name="targetLevelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('academics.targetLevel')}</FormLabel>
                          <Select
                            value={field.value ?? ''}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('academics.selectLevel')} />
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
                  ) : null}
                  <FormField
                    control={overrideForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.labels.notes')}</FormLabel>
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
                {t('academics.saveOverride')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
}
