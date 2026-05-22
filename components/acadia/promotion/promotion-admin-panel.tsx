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
  branchLabel,
  levelDisplayLabel,
  subSystemLabel,
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

export function PromotionAdminPanel() {
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
        Administrator access is required to manage promotion.
      </p>
    );
  }

  return (
    <Tabs defaultValue="policies" className="space-y-6">
      <TabsList>
        <TabsTrigger value="policies">Class policies</TabsTrigger>
        <TabsTrigger value="compute">Compute &amp; decisions</TabsTrigger>
      </TabsList>

      <TabsContent value="policies" className="space-y-4">
        <Form {...filterForm}>
          <FormField
            control={filterForm.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem className="max-w-xs">
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
          Promotion uses each class&apos;s configured minimum average for the selected
          year. Students must be assigned to a class before automatic compute.
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
              name="bulkMode"
              render={({ field }) => (
                <FormItem className="min-w-[160px]">
                  <FormLabel>Compute scope</FormLabel>
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
                            ? 'This class'
                            : mode === 'stream'
                              ? 'All classes in stream'
                              : 'Entire year'}
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
                        {bulkMode === 'stream' ? 'Sub-system' : 'Sub-system (optional)'}
                      </FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sub-system" />
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
                  control={filterForm.control}
                  name="branch"
                  render={({ field }) => (
                    <FormItem className="min-w-[160px]">
                      <FormLabel>
                        {bulkMode === 'stream' ? 'Branch' : 'Branch (optional)'}
                      </FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Branch" />
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
              </>
            ) : null}
            {bulkMode === 'class' ? (
              <FormField
                control={filterForm.control}
                name="classId"
                render={({ field }) => (
                  <FormItem className="min-w-[200px]">
                    <FormLabel>Class</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Class" />
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
              Load decisions
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
                  ? 'Promotion is locked after rollover was applied.'
                  : submitted?.bulkMode === 'class' && enrollmentCount === 0
                    ? 'No enrolled students in this class.'
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
              Compute automatic promotion
            </Button>
          </form>
        </Form>

        {(unassignedQuery.data?.length ?? 0) > 0 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {unassignedQuery.data!.length} student(s) enrolled without a class
            </p>
            <p className="mt-1 text-muted-foreground">
              Assign them via{' '}
              <Link href="/classes" className="text-primary hover:underline">
                class rosters
              </Link>{' '}
              or student migration before computing promotion.
            </p>
          </div>
        ) : null}

        {submitted?.bulkMode === 'class' && selectedClass ? (
          <div className="text-sm">
            {policy ? (
              policy.autoPromotionEnabled ? (
                <span>
                  <strong>{selectedClass.name}</strong> — promote at year average ≥
                  {formatMarkScore(policy.minPromotionAverage)}
                </span>
              ) : (
                <span>
                  <strong>{selectedClass.name}</strong> — auto-promotion off (manual
                  decisions only)
                </span>
              )
            ) : (
              <span className="text-destructive">
                No promotion policy for this class. Configure it under Class policies.
              </span>
            )}
          </div>
        ) : null}

        {submitted ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">{stats.total} students</Badge>
            <Badge variant="secondary">{stats.promote} promote</Badge>
            <Badge variant="secondary">{stats.repeat} repeat</Badge>
            <Badge variant="outline">{stats.manual} manual overrides</Badge>
            {stats.pending > 0 ? (
              <Badge variant="outline">{stats.pending} pending</Badge>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link href={`/academics/years/${submitted.academicYearId}/rollover`}>
                Year rollover wizard
              </Link>
            </Button>
          </div>
        ) : null}

        {yearLocked ? (
          <p className="text-sm text-muted-foreground">
            Promotion for this year is locked after rollover was applied.
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
            No enrolled students in this class for the selected year.
          </p>
        ) : null}

        {submitted?.bulkMode === 'class' &&
        !decisionsQuery.isLoading &&
        rows.length === 0 &&
        enrollmentCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            No promotion decisions yet. Run &quot;Compute automatic promotion&quot; for
            this class.
          </p>
        ) : null}

        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Year avg</TableHead>
                <TableHead>Threshold</TableHead>
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
                const targetLevel = unwrapRelation<{
                  number?: number;
                  labelEn?: string;
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
                        ? 'Pending'
                        : promotionActionLabel(
                            row.recommendedAction as Parameters<
                              typeof promotionActionLabel
                            >[0],
                          )}
                    </TableCell>
                    <TableCell>
                      {row.isPending ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : (
                        <Badge
                          variant={row.source === 'MANUAL' ? 'primary' : 'secondary'}
                        >
                          {promotionActionLabel(
                            row.finalAction as Parameters<
                              typeof promotionActionLabel
                            >[0],
                          )}
                        </Badge>
                      )}
                      {row.classChangedSinceCompute ? (
                        <Badge variant="outline" className="ml-1">
                          Class changed
                        </Badge>
                      ) : null}
                      {row.policyStaleAt ? (
                        <Badge variant="outline" className="ml-1">
                          Recompute
                        </Badge>
                      ) : null}
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
                        disabled={yearLocked}
                        onClick={() =>
                          setOverrideTarget({
                            studentProfileId: row.studentProfileId as string,
                            registrationNumber:
                              profile?.registrationNumber ?? 'Student',
                            finalAction: (row.finalAction as string) ?? 'REPEAT',
                            targetLevelId: row.targetLevelId as string | null,
                            classId: submitted!.classId!,
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

        {orphanRows.length > 0 && submitted ? (
          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Orphan decisions ({orphanRows.length}) — not in current class roster
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-muted-foreground">
                These AUTO decisions reference students no longer enrolled in this
                class.
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
                Remove AUTO orphans
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
                  {overrideFinalAction === 'PROMOTE' ? (
                    <FormField
                      control={overrideForm.control}
                      name="targetLevelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target level</FormLabel>
                          <Select
                            value={field.value ?? ''}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
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
      </TabsContent>
    </Tabs>
  );
}
