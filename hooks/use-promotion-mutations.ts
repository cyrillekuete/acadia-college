'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { provisionCameroonCalendar, setCurrentAcademicYear } from '@/lib/acadia/academic-calendar';
import {
  buildPromotionCandidates,
  computeYearAveragesFromMarks,
  DEFAULT_RETENTION_POLICY,
  planYearRollover,
} from '@/lib/acadia/promotion';
import type {
  DataRetentionPolicyValues,
  PromotionFiltersValues,
  PromotionOverrideValues,
  YearRolloverValues,
} from '@/lib/acadia/promotion-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidatePromotionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ['promotion-candidates'] });
  void queryClient.invalidateQueries({ queryKey: ['promotion-decisions'] });
  void queryClient.invalidateQueries({ queryKey: ['data-retention-policy'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['academic-year-options'] });
}

export function usePromotionMutations() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId;
  const userId = session?.profile?.id;

  const computeAutomaticPromotion = useMutation({
    mutationFn: async (filters: PromotionFiltersValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const [
        { data: enrollments, error: enrollError },
        { data: levels, error: levelError },
        { data: sessions, error: sessionError },
      ] = await Promise.all([
        supabase
          .from('StudentEnrollment')
          .select('studentProfileId, specialtyId, levelId')
          .eq('tenantId', tenantId)
          .eq('academicYearId', filters.academicYearId)
          .eq('specialtyId', filters.specialtyId)
          .eq('levelId', filters.levelId)
          .eq('status', 'ENROLLED'),
        supabase
          .from('Level')
          .select('id, specialtyId, number')
          .eq('tenantId', tenantId),
        supabase
          .from('ExamSession')
          .select('id, AcademicSequence:sequenceId ( number )')
          .eq('tenantId', tenantId)
          .eq('academicYearId', filters.academicYearId),
      ]);

      if (enrollError) {
        throw enrollError;
      }
      if (levelError) {
        throw levelError;
      }
      if (sessionError) {
        throw sessionError;
      }

      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      let yearAverages = new Map<string, number>();

      if (sessionIds.length > 0) {
        const { data: marks, error: marksError } = await supabase
          .from('CourseMark')
          .select('studentProfileId, totalScore, examSessionId')
          .eq('tenantId', tenantId)
          .in('examSessionId', sessionIds);

        if (marksError) {
          throw marksError;
        }

        const seqBySession = new Map(
          (sessions ?? []).map((s) => [
            s.id as string,
            unwrapRelation<{ number?: number }>(s.AcademicSequence)?.number ?? null,
          ]),
        );

        yearAverages = computeYearAveragesFromMarks(
          (marks ?? []).map((m) => ({
            studentProfileId: m.studentProfileId as string,
            totalScore:
              m.totalScore != null ? Number(m.totalScore) : null,
            sequenceNumber: seqBySession.get(m.examSessionId as string) ?? null,
          })),
        );
      }

      const { data: existingDecisions } = await supabase
        .from('StudentPromotionDecision')
        .select('id, studentProfileId, finalAction, targetLevelId, source')
        .eq('tenantId', tenantId)
        .eq('academicYearId', filters.academicYearId);

      const existingIdByStudent = new Map(
        (existingDecisions ?? []).map((d) => [
          d.studentProfileId as string,
          d.id as string,
        ]),
      );

      const manualByStudent = new Map(
        (existingDecisions ?? [])
          .filter((d) => d.source === 'MANUAL')
          .map((d) => [
            d.studentProfileId as string,
            {
              finalAction: d.finalAction as PromotionOverrideValues['finalAction'],
              targetLevelId: d.targetLevelId as string | null,
            },
          ]),
      );

      const candidates = buildPromotionCandidates(
        (enrollments ?? []).map((e) => ({
          studentProfileId: e.studentProfileId as string,
          specialtyId: e.specialtyId as string,
          levelId: e.levelId as string,
          yearAverage: yearAverages.get(e.studentProfileId as string) ?? null,
          manualFinalAction:
            manualByStudent.get(e.studentProfileId as string)?.finalAction ?? null,
          manualTargetLevelId:
            manualByStudent.get(e.studentProfileId as string)?.targetLevelId ?? null,
        })),
        (levels ?? []).map((l) => ({
          id: l.id as string,
          specialtyId: l.specialtyId as string,
          number: Number(l.number),
        })),
      );

      const rows = candidates.map((c) => ({
        id:
          existingIdByStudent.get(c.studentProfileId) ?? generateAcadiaId('promo'),
        tenantId,
        studentProfileId: c.studentProfileId,
        academicYearId: filters.academicYearId,
        specialtyId: c.specialtyId,
        fromLevelId: c.fromLevelId,
        targetLevelId: c.targetLevelId,
        yearAverage: c.yearAverage,
        recommendedAction: c.recommendedAction,
        finalAction: c.finalAction,
        source: c.isManualOverride ? ('MANUAL' as const) : ('AUTO' as const),
        notes: null,
        decidedByUserId: userId,
        appliedAt: null,
        createdAt: now,
        updatedAt: now,
      }));

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('StudentPromotionDecision')
          .upsert(rows, {
            onConflict: 'tenantId,studentProfileId,academicYearId',
            ignoreDuplicates: false,
          });
        if (upsertError) {
          throw upsertError;
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'promotion.auto_computed',
        description: `Computed promotion for ${rows.length} student(s).`,
        entityId: filters.academicYearId,
        entityType: 'AcademicYear',
        meta: { specialtyId: filters.specialtyId, levelId: filters.levelId },
      });

      return { count: rows.length, promote: rows.filter((r) => r.finalAction === 'PROMOTE').length };
    },
    onSuccess: (result) => {
      invalidatePromotionQueries(queryClient);
      toast.success(
        `Promotion computed for ${result.count} student(s) (${result.promote} to promote).`,
      );
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const savePromotionOverride = useMutation({
    mutationFn: async (values: PromotionOverrideValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: enrollment, error: enrollError } = await supabase
        .from('StudentEnrollment')
        .select('specialtyId, levelId, academicYearId')
        .eq('tenantId', tenantId)
        .eq('studentProfileId', values.studentProfileId)
        .eq('academicYearId', values.academicYearId)
        .eq('status', 'ENROLLED')
        .maybeSingle();

      if (enrollError) {
        throw enrollError;
      }
      if (!enrollment) {
        throw new Error('No active enrollment found for this student and year.');
      }

      const { data: levels, error: levelError } = await supabase
        .from('Level')
        .select('id, specialtyId, number')
        .eq('tenantId', tenantId);
      if (levelError) {
        throw levelError;
      }

      const { data: existing } = await supabase
        .from('StudentPromotionDecision')
        .select('id, yearAverage, recommendedAction')
        .eq('tenantId', tenantId)
        .eq('studentProfileId', values.studentProfileId)
        .eq('academicYearId', values.academicYearId)
        .maybeSingle();

      const [candidate] = buildPromotionCandidates(
        [
          {
            studentProfileId: values.studentProfileId,
            specialtyId: enrollment.specialtyId as string,
            levelId: enrollment.levelId as string,
            yearAverage:
              existing?.yearAverage != null
                ? Number(existing.yearAverage)
                : null,
            manualFinalAction: values.finalAction,
            manualTargetLevelId: values.targetLevelId ?? null,
          },
        ],
        (levels ?? []).map((l) => ({
          id: l.id as string,
          specialtyId: l.specialtyId as string,
          number: Number(l.number),
        })),
      );

      const row = {
        id: (existing?.id as string | undefined) ?? generateAcadiaId('promo'),
        tenantId,
        studentProfileId: values.studentProfileId,
        academicYearId: values.academicYearId,
        specialtyId: candidate.specialtyId,
        fromLevelId: candidate.fromLevelId,
        targetLevelId: candidate.targetLevelId,
        yearAverage: candidate.yearAverage,
        recommendedAction:
          existing?.recommendedAction ?? candidate.recommendedAction,
        finalAction: candidate.finalAction,
        source: 'MANUAL' as const,
        notes: values.notes?.trim() || null,
        decidedByUserId: userId,
        appliedAt: null,
        updatedAt: now,
        createdAt: now,
      };

      const { error } = await supabase
        .from('StudentPromotionDecision')
        .upsert(row, {
          onConflict: 'tenantId,studentProfileId,academicYearId',
        });
      if (error) {
        throw error;
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'promotion.override_saved',
        description: `Manual promotion: ${values.finalAction}.`,
        entityId: values.studentProfileId,
        entityType: 'StudentProfile',
      });
    },
    onSuccess: () => {
      invalidatePromotionQueries(queryClient);
      toast.success('Promotion override saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const executeYearRollover = useMutation({
    mutationFn: async (values: YearRolloverValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      let targetYearId = values.targetAcademicYearId;

      if (values.createTargetYear) {
        targetYearId = generateAcadiaId('year');
        const { error: yearError } = await supabase.from('AcademicYear').insert({
          id: targetYearId,
          tenantId,
          label: values.targetYearLabel?.trim() ?? '',
          startsOn: values.targetYearStartsOn ?? '',
          endsOn: values.targetYearEndsOn ?? '',
          isCurrent: false,
          isActive: true,
          updatedAt: now,
        });
        if (yearError) {
          throw yearError;
        }
        await provisionCameroonCalendar(supabase, tenantId, targetYearId);
      }

      if (!targetYearId?.trim()) {
        throw new Error('Target academic year is required.');
      }

      const { data: decisions, error: decisionError } = await supabase
        .from('StudentPromotionDecision')
        .select(
          'studentProfileId, specialtyId, fromLevelId, targetLevelId, finalAction, yearAverage, recommendedAction',
        )
        .eq('tenantId', tenantId)
        .eq('academicYearId', values.sourceAcademicYearId);

      if (decisionError) {
        throw decisionError;
      }

      if (!decisions?.length) {
        throw new Error(
          'No promotion decisions found. Run automatic promotion for the source year first.',
        );
      }

      const candidates = (decisions ?? []).map((d) => ({
        studentProfileId: d.studentProfileId as string,
        specialtyId: d.specialtyId as string,
        fromLevelId: d.fromLevelId as string,
        yearAverage: d.yearAverage != null ? Number(d.yearAverage) : null,
        recommendedAction: d.recommendedAction as 'PROMOTE' | 'REPEAT',
        finalAction: d.finalAction as PromotionOverrideValues['finalAction'],
        targetLevelId: d.targetLevelId as string | null,
        isManualOverride: false,
      }));

      const plan = planYearRollover({
        sourceAcademicYearId: values.sourceAcademicYearId,
        targetAcademicYearId: targetYearId,
        candidates,
        promoteEligible: values.promoteEligible,
        repeatNonEligible: values.repeatNonEligible,
      });

      for (const item of plan.enrollments) {
        if (item.markAlumni) {
          const { error: alumniError } = await supabase
            .from('StudentProfile')
            .update({
              alumniSince: now,
              isActive: false,
              currentLevelId: item.targetLevelId,
              updatedAt: now,
            })
            .eq('id', item.studentProfileId)
            .eq('tenantId', tenantId);
          if (alumniError) {
            throw alumniError;
          }
        }

        if (item.createEnrollment) {
          const { error: enrollError } = await supabase
            .from('StudentEnrollment')
            .insert({
              id: generateAcadiaId('enr'),
              tenantId,
              studentProfileId: item.studentProfileId,
              academicYearId: targetYearId,
              specialtyId: item.specialtyId,
              levelId: item.targetLevelId,
              status: 'ENROLLED',
              applicationId: null,
              createdAt: now,
              updatedAt: now,
            });
          if (enrollError) {
            throw enrollError;
          }

          const { error: profileError } = await supabase
            .from('StudentProfile')
            .update({
              specialtyId: item.specialtyId,
              currentLevelId: item.targetLevelId,
              updatedAt: now,
            })
            .eq('id', item.studentProfileId)
            .eq('tenantId', tenantId);
          if (profileError) {
            throw profileError;
          }
        }

        await supabase
          .from('StudentPromotionDecision')
          .update({ appliedAt: now, updatedAt: now })
          .eq('tenantId', tenantId)
          .eq('studentProfileId', item.studentProfileId)
          .eq('academicYearId', values.sourceAcademicYearId);
      }

      await setCurrentAcademicYear(supabase, tenantId, targetYearId);

      await appendSystemLog(supabase, {
        userId,
        event: 'academic_year.rollover',
        description: `Rollover: ${plan.promoted} promoted, ${plan.repeated} repeated, ${plan.graduated} graduated.`,
        entityId: targetYearId,
        entityType: 'AcademicYear',
        meta: plan,
      });

      return { targetYearId, plan };
    },
    onSuccess: (result) => {
      invalidatePromotionQueries(queryClient);
      toast.success('Academic year rollover completed.');
      router.push(`/academics/years`);
      void result;
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveRetentionPolicy = useMutation({
    mutationFn: async (values: DataRetentionPolicyValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { error } = await supabase.from('TenantDataRetentionPolicy').upsert({
        tenantId,
        marksRetentionYears: values.marksRetentionYears,
        enrollmentRetentionYears: values.enrollmentRetentionYears,
        archiveInactiveAfterYears: values.archiveInactiveAfterYears,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'data_retention.policy_updated',
        description: 'Data retention policy updated.',
        entityId: tenantId,
        entityType: 'Tenant',
      });
    },
    onSuccess: () => {
      invalidatePromotionQueries(queryClient);
      toast.success('Retention policy saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const runRetentionArchive = useMutation({
    mutationFn: async () => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: policy } = await supabase
        .from('TenantDataRetentionPolicy')
        .select('*')
        .eq('tenantId', tenantId)
        .maybeSingle();

      const retention = {
        ...DEFAULT_RETENTION_POLICY,
        ...policy,
      };

      const inactiveCutoff = new Date();
      inactiveCutoff.setFullYear(
        inactiveCutoff.getFullYear() - retention.archiveInactiveAfterYears,
      );
      const enrollmentCutoff = new Date();
      enrollmentCutoff.setFullYear(
        enrollmentCutoff.getFullYear() - retention.enrollmentRetentionYears,
      );
      const cutoffIso = enrollmentCutoff.toISOString();

      const { data: inactiveProfiles, error: inactiveError } = await supabase
        .from('StudentProfile')
        .select('id')
        .eq('tenantId', tenantId)
        .eq('isActive', true)
        .lt('updatedAt', inactiveCutoff.toISOString());
      if (inactiveError) {
        throw inactiveError;
      }

      let deactivated = 0;
      for (const profile of inactiveProfiles ?? []) {
        const { error } = await supabase
          .from('StudentProfile')
          .update({ isActive: false, updatedAt: now })
          .eq('id', profile.id as string)
          .eq('tenantId', tenantId);
        if (!error) {
          deactivated += 1;
        }
      }

      const { data: oldEnrollments, error: enrollError } = await supabase
        .from('StudentEnrollment')
        .select('id')
        .eq('tenantId', tenantId)
        .eq('status', 'ENROLLED')
        .lt('createdAt', cutoffIso);
      if (enrollError) {
        throw enrollError;
      }

      let archivedEnrollments = 0;
      for (const enrollment of oldEnrollments ?? []) {
        const { error } = await supabase
          .from('StudentEnrollment')
          .update({ status: 'WITHDRAWN', updatedAt: now })
          .eq('id', enrollment.id as string)
          .eq('tenantId', tenantId);
        if (!error) {
          archivedEnrollments += 1;
        }
      }

      await supabase.from('TenantDataRetentionPolicy').upsert({
        tenantId,
        marksRetentionYears: retention.marksRetentionYears,
        enrollmentRetentionYears: retention.enrollmentRetentionYears,
        archiveInactiveAfterYears: retention.archiveInactiveAfterYears,
        lastArchivalRunAt: now,
        updatedAt: now,
      });

      await appendSystemLog(supabase, {
        userId,
        event: 'data_retention.archive_run',
        description: `Archived ${archivedEnrollments} enrollment(s); deactivated ${deactivated} profile(s).`,
        entityId: tenantId,
        entityType: 'Tenant',
        meta: { archivedEnrollments, deactivated },
      });

      return { archivedEnrollments, deactivated };
    },
    onSuccess: (result) => {
      invalidatePromotionQueries(queryClient);
      toast.success(
        `Retention job complete: ${result.archivedEnrollments} enrollment(s), ${result.deactivated} profile(s).`,
      );
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    computeAutomaticPromotion,
    savePromotionOverride,
    executeYearRollover,
    saveRetentionPolicy,
    runRetentionArchive,
  };
}
