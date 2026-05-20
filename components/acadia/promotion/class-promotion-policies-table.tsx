'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { LoaderCircleIcon } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DEFAULT_MIN_PROMOTION_AVERAGE,
  type ClassPromotionPolicyFormValues,
} from '@/lib/acadia/class-promotion-policy-schemas';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import {
  countEnrollmentsForClass,
  fetchActiveClassesForPromotion,
  fetchClassPromotionPolicies,
} from '@/lib/supabase/queries/promotion';
import { useClassPromotionPolicyMutations } from '@/hooks/use-class-promotion-policy-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';

type PolicyDraft = {
  autoPromotionEnabled: boolean;
  minPromotionAverage: string;
  notes: string;
};

type YearOption = { id: string; label: string };

export function ClassPromotionPoliciesTable({
  academicYearId,
  years = [],
}: {
  academicYearId: string;
  years?: YearOption[];
}) {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { saveClassPromotionPolicy, copyPoliciesFromPriorYear } =
    useClassPromotionPolicyMutations();
  const [drafts, setDrafts] = useState<Record<string, PolicyDraft>>({});
  const [copyFromYearId, setCopyFromYearId] = useState('');

  const query = useQuery({
    queryKey: ['class-promotion-policies', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [classes, policies] = await Promise.all([
        fetchActiveClassesForPromotion(supabase, tenantId!),
        fetchClassPromotionPolicies(supabase, tenantId!, academicYearId),
      ]);

      const enrollmentCounts = await Promise.all(
        classes.map(async (cls) => ({
          classId: cls.id,
          count: await countEnrollmentsForClass(
            supabase,
            tenantId!,
            academicYearId,
            cls.id,
          ),
        })),
      );

      return { classes, policies, enrollmentCounts };
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!academicYearId,
  });

  const policyByClassId = useMemo(() => {
    const map = new Map(
      (query.data?.policies ?? []).map((p) => [p.classId, p]),
    );
    return map;
  }, [query.data?.policies]);

  const enrollmentByClassId = useMemo(() => {
    return new Map(
      (query.data?.enrollmentCounts ?? []).map((e) => [e.classId, e.count]),
    );
  }, [query.data?.enrollmentCounts]);

  const priorYears = years.filter((y) => y.id !== academicYearId);

  const getDraft = (classId: string): PolicyDraft => {
    if (drafts[classId]) {
      return drafts[classId];
    }
    const existing = policyByClassId.get(classId);
    return {
      autoPromotionEnabled: existing?.autoPromotionEnabled ?? true,
      minPromotionAverage: String(
        existing?.minPromotionAverage ?? DEFAULT_MIN_PROMOTION_AVERAGE,
      ),
      notes: existing?.notes ?? '',
    };
  };

  const updateDraft = (classId: string, patch: Partial<PolicyDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [classId]: { ...getDraft(classId), ...patch },
    }));
  };

  const handleSave = (classId: string) => {
    const draft = getDraft(classId);
    const values: ClassPromotionPolicyFormValues = {
      classId,
      academicYearId,
      autoPromotionEnabled: draft.autoPromotionEnabled,
      minPromotionAverage: Number(draft.minPromotionAverage),
      notes: draft.notes || undefined,
    };
    saveClassPromotionPolicy.mutate(values, {
      onSuccess: () => {
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[classId];
          return next;
        });
      },
    });
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Loading class policies…
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  const classes = query.data?.classes ?? [];

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active classes found. Create classes under Classes &amp; Levels first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Set the minimum year average (compared with ≥, rounded to 2 decimals) and
        whether automatic promotion applies for each class in this academic year.
      </p>

      {priorYears.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Copy from year</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={copyFromYearId}
              onChange={(e) => setCopyFromYearId(e.target.value)}
            >
              <option value="">Select prior year</option>
              {priorYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!copyFromYearId || copyPoliciesFromPriorYear.isPending}
            onClick={() => {
              if (copyFromYearId) {
                copyPoliciesFromPriorYear.mutate({
                  fromYearId: copyFromYearId,
                  toYearId: academicYearId,
                });
              }
            }}
          >
            Copy policies
          </Button>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead>Min average</TableHead>
            <TableHead>Auto-promotion</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((cls) => {
            const policy = policyByClassId.get(cls.id);
            const draft = getDraft(cls.id);
            const configured = !!policy;
            const enrolled = enrollmentByClassId.get(cls.id) ?? 0;
            return (
              <TableRow key={cls.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/academics/promotion?year=${academicYearId}&class=${cls.id}`}
                    className="text-primary hover:underline"
                  >
                    {cls.name}
                  </Link>
                </TableCell>
                <TableCell>{enrolled}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={20}
                    className="w-24"
                    title="Students promote when year average ≥ this value (2 decimal places)."
                    value={draft.minPromotionAverage}
                    onChange={(e) =>
                      updateDraft(cls.id, { minPromotionAverage: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={draft.autoPromotionEnabled}
                    onCheckedChange={(checked) =>
                      updateDraft(cls.id, { autoPromotionEnabled: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  {configured ? (
                    <Badge variant="secondary">Configured</Badge>
                  ) : (
                    <Badge variant="outline">Not configured</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saveClassPromotionPolicy.isPending}
                    onClick={() => handleSave(cls.id)}
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
