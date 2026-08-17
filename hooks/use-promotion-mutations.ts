'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { provisionAcademicCalendar, setCurrentAcademicYear } from '@/lib/acadia/academic-calendar';
import { resolveClassIdForEnrollment } from '@/lib/acadia/class-assignment';
import { requireAcademicStream } from '@/lib/acadia/education-system';
import {
  buildPromotionCandidates,
  computeYearAverageForPromotionFromMarks,
  DEFAULT_RETENTION_POLICY,
  planYearRollover,
  requireClassPromotionPolicy,
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
import { provisionMissingFeeAccounts } from '@/lib/acadia/fee-account-provision';
import {
  fetchClassPromotionPolicy,
  fetchClassSubjectSelections,
  fetchClassesMissingPolicies,
  fetchEnrollmentsForClassPromotion,
  isPromotionYearLocked,
  resolveClassIdsForBulkCompute,
} from '@/lib/supabase/queries/promotion';
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
  void queryClient.invalidateQueries({ queryKey: ['promotion-decisions'] });
  void queryClient.invalidateQueries({ queryKey: ['class-promotion-policies'] });
  void queryClient.invalidateQueries({ queryKey: ['promotion-unassigned'] });
  void queryClient.invalidateQueries({ queryKey: ['promotion-statement'] });
  void queryClient.invalidateQueries({ queryKey: ['promotion-year-locked'] });
  void queryClient.invalidateQueries({ queryKey: ['promotion-rollover-preview'] });
  void queryClient.invalidateQueries({ queryKey: ['data-retention-policy'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['academic-year-options'] });
}

async function computePromotionForClass(
  supabase: ReturnType<typeof requireBrowserClient>,
  tenantId: string,
  userId: string,
  academicYearId: string,
  classId: string,
  className: string,
  targetAcademicYearId?: string,
) {
  const now = new Date().toISOString();

  const locked = await isPromotionYearLocked(supabase, tenantId, academicYearId);
  if (locked) {
    throw new Error('Promotion for this year is locked after rollover was applied.');
  }

  const policy = requireClassPromotionPolicy(
    await fetchClassPromotionPolicy(supabase, tenantId, classId, academicYearId),
    className,
  );

  if (!policy.autoPromotionEnabled) {
    return {
      classId,
      computed: 0,
      promote: 0,
      skippedManualOnly: true,
      skippedPendingMarks: 0,
    };
  }

  const [
    enrollments,
    classSubjects,
    { data: levels, error: levelError },
    { data: sessions, error: sessionError },
  ] = await Promise.all([
    fetchEnrollmentsForClassPromotion(supabase, tenantId, academicYearId, classId),
    fetchClassSubjectSelections(supabase, tenantId, classId),
    supabase
      .from('Level')
      .select('id, number, subSystem, branch, sortOrder, isDefaultPromotionTarget')
      .eq('tenantId', tenantId),
    supabase
      .from('ExamSession')
      .select('id, AcademicSequence:sequenceId ( number )')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId),
  ]);

  if (levelError) {
    throw levelError;
  }
  if (sessionError) {
    throw sessionError;
  }

  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  const classSubjectIds = classSubjects.map((subject) => subject.subjectId);
  const subjectFilter =
    classSubjectIds.length > 0 ? classSubjectIds : null;

  let marks: {
    studentProfileId: string;
    subjectId: string;
    totalScore: number | null;
    sequenceNumber: number | null;
    subjectSubBranchId?: string | null;
    subjectCoefficient?: number | null;
    subBranchCoefficient?: number | null;
  }[] = [];

  if (sessionIds.length > 0) {
    let marksQuery = supabase
      .from('SubjectMark')
      .select(
        `
        studentProfileId,
        subjectId,
        subjectSubBranchId,
        totalScore,
        examSessionId,
        Subject!SubjectMark_subjectId_tenantId_fkey ( coefficient ),
        SubjectSubBranch!SubjectMark_subjectSubBranchId_tenantId_fkey ( coefficient )
      `,
      )
      .eq('tenantId', tenantId)
      .in('examSessionId', sessionIds);

    if (subjectFilter) {
      marksQuery = marksQuery.in('subjectId', subjectFilter);
    }

    const { data: markRows, error: marksError } = await marksQuery;
    if (marksError) {
      throw marksError;
    }

    const seqBySession = new Map(
      (sessions ?? []).map((s) => [
        s.id as string,
        unwrapRelation<{ number?: number }>(s.AcademicSequence)?.number ?? null,
      ]),
    );

    marks = (markRows ?? []).map((m) => {
      const subject = unwrapRelation<{ coefficient?: number | null }>(m.Subject);
      const subBranch = unwrapRelation<{ coefficient?: number | null }>(
        m.SubjectSubBranch,
      );
      return {
        studentProfileId: m.studentProfileId as string,
        subjectId: m.subjectId as string,
        totalScore: m.totalScore != null ? Number(m.totalScore) : null,
        sequenceNumber: seqBySession.get(m.examSessionId as string) ?? null,
        subjectSubBranchId: (m.subjectSubBranchId as string | null) ?? null,
        subjectCoefficient:
          subject?.coefficient != null ? Number(subject.coefficient) : 1,
        subBranchCoefficient:
          subBranch?.coefficient != null ? Number(subBranch.coefficient) : null,
      };
    });
  }

  const enrollmentByStudent = new Map(
    enrollments.map((e) => [e.studentProfileId as string, e]),
  );

  const { data: existingDecisions } = await supabase
    .from('StudentPromotionDecision')
    .select(
      'id, studentProfileId, finalAction, targetLevelId, targetClassId, source, classId',
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .in(
      'studentProfileId',
      enrollments.map((e) => e.studentProfileId as string),
    );

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

  const nextYearId = targetAcademicYearId ?? academicYearId;

  const candidates = buildPromotionCandidates(
    enrollments.map((e) => {
      const studentId = e.studentProfileId as string;
      const yearResult = computeYearAverageForPromotionFromMarks(
        marks,
        studentId,
        classSubjects.length > 0
          ? classSubjects.map((subject) => ({
              subjectId: subject.subjectId,
              subBranchIds: subject.subBranchIds,
            }))
          : null,
      );
      return {
        studentProfileId: studentId,
        subSystem: e.subSystem as string,
        branch: e.branch as string,
        levelId: e.levelId as string,
        classId: e.classId as string,
        enrollmentId: e.id as string,
        yearAverage: yearResult.average,
        marksComplete: yearResult.status === 'complete',
        policy: {
          autoPromotionEnabled: policy.autoPromotionEnabled,
          minPromotionAverage: policy.minPromotionAverage,
        },
        manualFinalAction:
          manualByStudent.get(studentId)?.finalAction ?? null,
        manualTargetLevelId:
          manualByStudent.get(studentId)?.targetLevelId ?? null,
      };
    }),
    (levels ?? []).map((l) => ({
      id: l.id as string,
      number: Number(l.number),
      subSystem: l.subSystem as string | undefined,
      branch: l.branch as string | undefined,
      sortOrder: l.sortOrder != null ? Number(l.sortOrder) : null,
      isDefaultPromotionTarget: Boolean(l.isDefaultPromotionTarget),
    })),
  );

  let skippedPendingMarks = 0;
  const rows: Record<string, unknown>[] = [];

  for (const c of candidates) {
    if (c.skippedPendingMarks) {
      skippedPendingMarks += 1;
      continue;
    }
    if (c.skippedAuto) {
      continue;
    }

    const existing = (existingDecisions ?? []).find(
      (d) => d.studentProfileId === c.studentProfileId,
    );
    if (existing?.source === 'MANUAL') {
      continue;
    }

    let targetClassId: string | null = null;
    if (c.finalAction === 'PROMOTE' && c.targetLevelId) {
      const stream = requireAcademicStream(
        c.subSystem,
        c.branch,
        'Promotion candidate',
      );
      targetClassId = await resolveClassIdForEnrollment(
        supabase,
        tenantId,
        c.targetLevelId,
        stream.subSystem,
        stream.branch,
      );
    } else if (c.finalAction === 'REPEAT') {
      targetClassId = c.classId;
    }

    rows.push({
      id: existingIdByStudent.get(c.studentProfileId) ?? generateAcadiaId('promo'),
      tenantId,
      studentProfileId: c.studentProfileId,
      academicYearId,
      subSystem: c.subSystem,
      branch: c.branch,
      classId: c.classId,
      enrollmentId: c.enrollmentId ?? enrollmentByStudent.get(c.studentProfileId)?.id,
      fromLevelId: c.fromLevelId,
      targetLevelId: c.targetLevelId,
      targetClassId,
      yearAverage: c.yearAverage,
      policyMinAverage: c.policyMinAverage,
      recommendedAction: c.recommendedAction,
      finalAction: c.finalAction,
      source: c.isManualOverride ? ('MANUAL' as const) : ('AUTO' as const),
      notes: null,
      policyStaleAt: null,
      decidedByUserId: userId,
      appliedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    void nextYearId;
  }

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

  return {
    classId,
    computed: rows.length,
    promote: rows.filter((r) => r.finalAction === 'PROMOTE').length,
    skippedManualOnly: false,
    skippedPendingMarks,
  };
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

      const locked = await isPromotionYearLocked(
        supabase,
        tenantId,
        filters.academicYearId,
      );
      if (locked) {
        throw new Error('Promotion for this year is locked after rollover was applied.');
      }

      const classIds = await resolveClassIdsForBulkCompute(
        supabase,
        tenantId,
        filters,
      );

      if (classIds.length === 0) {
        throw new Error(
          'No classes with auto-promotion policies found. Configure policies first.',
        );
      }

      const { data: classRows } = await supabase
        .from('Class')
        .select('id, name')
        .eq('tenantId', tenantId)
        .in('id', classIds);

      const nameById = new Map(
        (classRows ?? []).map((c) => [c.id as string, c.name as string]),
      );

      let totalComputed = 0;
      let totalPromote = 0;
      let totalPendingMarks = 0;
      let manualOnlyClasses = 0;
      const errors: string[] = [];

      for (const classId of classIds) {
        try {
          const result = await computePromotionForClass(
            supabase,
            tenantId,
            userId,
            filters.academicYearId,
            classId,
            nameById.get(classId) ?? classId,
          );
          if (result.skippedManualOnly) {
            manualOnlyClasses += 1;
            continue;
          }
          totalComputed += result.computed;
          totalPromote += result.promote;
          totalPendingMarks += result.skippedPendingMarks;
        } catch (error) {
          errors.push(
            `${nameById.get(classId) ?? classId}: ${mutationErrorMessage(error)}`,
          );
        }
      }

      if (errors.length === classIds.length) {
        throw new Error(errors.join(' '));
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'promotion.auto_computed',
        description: `Computed promotion for ${totalComputed} student(s) across ${classIds.length - manualOnlyClasses} class(es).`,
        entityId: filters.academicYearId,
        entityType: 'AcademicYear',
        meta: { bulkMode: filters.bulkMode, classCount: classIds.length },
      });

      return {
        count: totalComputed,
        promote: totalPromote,
        classCount: classIds.length,
        manualOnlyClasses,
        skippedPendingMarks: totalPendingMarks,
        errors,
      };
    },
    onSuccess: (result) => {
      invalidatePromotionQueries(queryClient);
      const warning =
        result.errors.length > 0
          ? ` (${result.errors.length} class(es) had errors)`
          : '';
      const manualNote =
        result.manualOnlyClasses > 0
          ? ` ${result.manualOnlyClasses} manual-only class(es) skipped.`
          : '';
      const pendingNote =
        result.skippedPendingMarks > 0
          ? ` ${result.skippedPendingMarks} student(s) skipped (incomplete marks).`
          : '';
      toast.success(
        `Promotion computed for ${result.count} student(s) in ${result.classCount} class(es) (${result.promote} to promote).${manualNote}${pendingNote}${warning}`,
        result.errors.length > 0
          ? { description: result.errors.slice(0, 5).join('\n') }
          : undefined,
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

      const locked = await isPromotionYearLocked(
        supabase,
        tenantId,
        values.academicYearId,
      );
      if (locked) {
        throw new Error('Promotion for this year is locked after rollover was applied.');
      }

      const now = new Date().toISOString();

      let enrollmentQuery = supabase
        .from('StudentEnrollment')
        .select('id, subSystem, branch, levelId, classId')
        .eq('tenantId', tenantId)
        .eq('studentProfileId', values.studentProfileId)
        .eq('academicYearId', values.academicYearId)
        .eq('status', 'ENROLLED');

      if (values.classId) {
        enrollmentQuery = enrollmentQuery.eq('classId', values.classId);
      }

      const { data: enrollment, error: enrollError } =
        await enrollmentQuery.maybeSingle();

      if (enrollError) {
        throw enrollError;
      }
      if (!enrollment) {
        throw new Error('No active enrollment found for this student and year.');
      }
      if (!enrollment.classId) {
        throw new Error('Student is not assigned to a class.');
      }

      const classId = enrollment.classId as string;

      const { data: classRow } = await supabase
        .from('Class')
        .select('name')
        .eq('tenantId', tenantId)
        .eq('id', classId)
        .maybeSingle();

      const policy = requireClassPromotionPolicy(
        await fetchClassPromotionPolicy(
          supabase,
          tenantId,
          classId,
          values.academicYearId,
        ),
        classRow?.name ?? 'Class',
      );

      const { data: levels, error: levelError } = await supabase
        .from('Level')
        .select('id, number, subSystem, branch, sortOrder, isDefaultPromotionTarget')
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
            subSystem: enrollment.subSystem as string,
            branch: enrollment.branch as string,
            levelId: enrollment.levelId as string,
            classId,
            enrollmentId: enrollment.id as string,
            yearAverage:
              existing?.yearAverage != null
                ? Number(existing.yearAverage)
                : null,
            marksComplete: true,
            policy: {
              autoPromotionEnabled: policy.autoPromotionEnabled,
              minPromotionAverage: policy.minPromotionAverage,
            },
            manualFinalAction: values.finalAction,
            manualTargetLevelId: values.targetLevelId ?? null,
          },
        ],
        (levels ?? []).map((l) => ({
          id: l.id as string,
          number: Number(l.number),
          subSystem: l.subSystem as string | undefined,
          branch: l.branch as string | undefined,
          sortOrder: l.sortOrder != null ? Number(l.sortOrder) : null,
          isDefaultPromotionTarget: Boolean(l.isDefaultPromotionTarget),
        })),
      );

      let targetClassId: string | null = null;
      if (candidate.finalAction === 'PROMOTE' && candidate.targetLevelId) {
        const stream = requireAcademicStream(
          candidate.subSystem,
          candidate.branch,
          'Promotion override',
        );
        targetClassId = await resolveClassIdForEnrollment(
          supabase,
          tenantId,
          candidate.targetLevelId,
          stream.subSystem,
          stream.branch,
        );
      } else if (candidate.finalAction === 'REPEAT') {
        targetClassId = classId;
      }

      const row = {
        id: (existing?.id as string | undefined) ?? generateAcadiaId('promo'),
        tenantId,
        studentProfileId: values.studentProfileId,
        academicYearId: values.academicYearId,
        subSystem: candidate.subSystem,
        branch: candidate.branch,
        classId: candidate.classId,
        enrollmentId: enrollment.id as string,
        fromLevelId: candidate.fromLevelId,
        targetLevelId: candidate.targetLevelId,
        targetClassId,
        yearAverage: candidate.yearAverage,
        policyMinAverage: candidate.policyMinAverage,
        recommendedAction:
          existing?.recommendedAction ?? candidate.recommendedAction,
        finalAction: candidate.finalAction,
        source: 'MANUAL' as const,
        notes: values.notes?.trim() || null,
        policyStaleAt: null,
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

  const deleteOrphanAutoDecisions = useMutation({
    mutationFn: async (input: {
      academicYearId: string;
      classId: string;
      decisionIds: string[];
    }) => {
      if (!tenantId) {
        throw new Error('Session required.');
      }
      if (input.decisionIds.length === 0) {
        return;
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('StudentPromotionDecision')
        .delete()
        .eq('tenantId', tenantId)
        .eq('academicYearId', input.academicYearId)
        .eq('classId', input.classId)
        .eq('source', 'AUTO')
        .in('id', input.decisionIds);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidatePromotionQueries(queryClient);
      toast.success('Orphan auto decisions removed.');
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

      const missingPolicies = await fetchClassesMissingPolicies(
        supabase,
        tenantId,
        values.sourceAcademicYearId,
      );
      if (missingPolicies.length > 0) {
        const names = missingPolicies
          .map((c) => `${c.className} (${c.enrollmentCount})`)
          .slice(0, 5)
          .join(', ');
        throw new Error(
          `Classes without promotion policies: ${names}. Configure policies before rollover.`,
        );
      }

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
        await provisionAcademicCalendar(supabase, tenantId, targetYearId);
      }

      if (!targetYearId?.trim()) {
        throw new Error('Target academic year is required.');
      }

      const { data: policies } = await supabase
        .from('ClassPromotionPolicy')
        .select('classId, autoPromotionEnabled')
        .eq('tenantId', tenantId)
        .eq('academicYearId', values.sourceAcademicYearId);

      const manualOnlyClassIds = new Set(
        (policies ?? [])
          .filter((p) => !p.autoPromotionEnabled)
          .map((p) => p.classId as string),
      );

      const { data: decisions, error: decisionError } = await supabase
        .from('StudentPromotionDecision')
        .select(
          'id, studentProfileId, subSystem, branch, classId, fromLevelId, targetLevelId, targetClassId, finalAction, yearAverage, recommendedAction, source',
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
        subSystem: d.subSystem as string,
        branch: d.branch as string,
        classId: (d.classId as string | null) ?? '',
        fromLevelId: d.fromLevelId as string,
        yearAverage: d.yearAverage != null ? Number(d.yearAverage) : null,
        policyMinAverage: 0,
        recommendedAction: d.recommendedAction as 'PROMOTE' | 'REPEAT',
        finalAction: d.finalAction as PromotionOverrideValues['finalAction'],
        targetLevelId: d.targetLevelId as string | null,
        targetClassId: d.targetClassId as string | null,
        isManualOverride: d.source === 'MANUAL',
        skippedAuto: false,
        skippedPendingMarks: false,
      }));

      const plan = planYearRollover({
        sourceAcademicYearId: values.sourceAcademicYearId,
        targetAcademicYearId: targetYearId,
        candidates,
        promoteEligible: values.promoteEligible,
        repeatNonEligible: values.repeatNonEligible,
        manualOnlyClassIds,
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
          let classId = item.targetClassId;
          if (!classId) {
            const stream = requireAcademicStream(
              item.subSystem,
              item.branch,
              'Year rollover enrollment',
            );
            classId = await resolveClassIdForEnrollment(
              supabase,
              tenantId,
              item.targetLevelId,
              stream.subSystem,
              stream.branch,
            );
          }

          const { error: enrollError } = await supabase
            .from('StudentEnrollment')
            .insert({
              id: generateAcadiaId('enr'),
              tenantId,
              studentProfileId: item.studentProfileId,
              academicYearId: targetYearId,
              subSystem: item.subSystem,
              branch: item.branch,
              levelId: item.targetLevelId,
              classId,
              status: 'ENROLLED',
              createdAt: now,
              updatedAt: now,
            });
          if (enrollError) {
            throw enrollError;
          }

          const { error: profileError } = await supabase
            .from('StudentProfile')
            .update({
              subSystem: item.subSystem,
              branch: item.branch,
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

      try {
        await provisionMissingFeeAccounts(supabase, {
          academicYearId: targetYearId,
        });
      } catch (error) {
        console.error('[provisionMissingFeeAccounts]', error);
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'academic_year.rollover',
        description: `Rollover: ${plan.promoted} promoted, ${plan.repeated} repeated, ${plan.graduated} graduated (${plan.skippedManualOnly} manual-only skipped).`,
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
    deleteOrphanAutoDecisions,
    executeYearRollover,
    saveRetentionPolicy,
    runRetentionArchive,
  };
}
