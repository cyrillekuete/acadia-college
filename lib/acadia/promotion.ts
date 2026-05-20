import {
  averageScores,
  computeAnnualAverage,
  computeTermAverageFromSequences,
  PASSING_AVERAGE,
} from '@/lib/acadia/assessment';
import type { ClassPromotionPolicyRow } from '@/lib/acadia/class-promotion-policy-schemas';
import type { PromotionAction } from '@/lib/acadia/promotion-schemas';

export { PASSING_AVERAGE as PROMOTION_PASS_AVERAGE };

export type ClassPromotionPolicyInput = Pick<
  ClassPromotionPolicyRow,
  'autoPromotionEnabled' | 'minPromotionAverage'
>;

export type LevelRow = {
  id: string;
  number: number;
  subSystem?: string;
  branch?: string;
  sortOrder?: number | null;
  isDefaultPromotionTarget?: boolean;
};

export type PromotionCandidateInput = {
  studentProfileId: string;
  specialtyId: string;
  levelId: string;
  classId: string;
  enrollmentId?: string;
  yearAverage: number | null;
  marksComplete: boolean;
  policy: ClassPromotionPolicyInput;
  manualFinalAction?: PromotionAction | null;
  manualTargetLevelId?: string | null;
};

export type PromotionCandidate = {
  studentProfileId: string;
  specialtyId: string;
  classId: string;
  enrollmentId?: string;
  fromLevelId: string;
  yearAverage: number | null;
  policyMinAverage: number;
  recommendedAction: PromotionAction;
  finalAction: PromotionAction;
  targetLevelId: string | null;
  targetClassId: string | null;
  isManualOverride: boolean;
  skippedAuto: boolean;
  skippedPendingMarks: boolean;
  classChangedSinceCompute?: boolean;
};

export type YearRolloverEnrollmentPlan = {
  studentProfileId: string;
  specialtyId: string;
  targetLevelId: string;
  targetClassId: string | null;
  finalAction: PromotionAction;
  createEnrollment: boolean;
  markAlumni: boolean;
};

export type YearRolloverPlan = {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  enrollments: YearRolloverEnrollmentPlan[];
  promoted: number;
  repeated: number;
  graduated: number;
  deferred: number;
  withdrawn: number;
  skipped: number;
  skippedManualOnly: number;
};

export type RetentionArchivePreview = {
  cutoffDate: string;
  inactiveProfiles: number;
  oldEnrollments: number;
  description: string;
};

export type ClassComputeResult = {
  classId: string;
  computed: number;
  promote: number;
  skippedManualOnly: boolean;
  skippedPendingMarks: number;
};

export type BulkComputeResult = {
  count: number;
  promote: number;
  classCount: number;
  manualOnlyClasses: number;
  skippedPendingMarks: number;
  errors: string[];
};

export type RecommendedPromotionResult =
  | 'PROMOTE'
  | 'REPEAT'
  | 'MANUAL_ONLY';

export type YearAverageForPromotion = {
  average: number | null;
  status: 'complete' | 'incomplete';
};

const PROMOTION_DECIMALS = 2;

export function roundPromotionAverage(value: number): number {
  const factor = 10 ** PROMOTION_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function meetsPromotionThreshold(
  yearAverage: number,
  minPromotionAverage: number,
): boolean {
  return (
    roundPromotionAverage(yearAverage) >= roundPromotionAverage(minPromotionAverage)
  );
}

/** Per-class policy: average threshold and optional auto-promotion off. */
export function recommendedPromotionAction(
  yearAverage: number | null | undefined,
  policy: ClassPromotionPolicyInput,
  marksComplete = true,
): RecommendedPromotionResult {
  if (!policy.autoPromotionEnabled) {
    return 'MANUAL_ONLY';
  }
  if (!marksComplete || yearAverage == null || Number.isNaN(yearAverage)) {
    return 'REPEAT';
  }
  return meetsPromotionThreshold(yearAverage, policy.minPromotionAverage)
    ? 'PROMOTE'
    : 'REPEAT';
}

export function findNextLevel(
  levels: LevelRow[],
  _specialtyId: string,
  currentLevelId: string,
): LevelRow | null {
  const current = levels.find((l) => l.id === currentLevelId);
  if (!current) {
    return null;
  }
  const candidates = levels.filter((l) => {
    if (l.number !== current.number + 1) {
      return false;
    }
    if (current.subSystem && l.subSystem && l.subSystem !== current.subSystem) {
      return false;
    }
    if (current.branch && l.branch && l.branch !== current.branch) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  const defaultTarget = candidates.find((l) => l.isDefaultPromotionTarget);
  if (defaultTarget) {
    return defaultTarget;
  }

  return [...candidates].sort((a, b) => {
    const orderA = a.sortOrder ?? a.number;
    const orderB = b.sortOrder ?? b.number;
    return orderA - orderB;
  })[0];
}

export function resolveFinalPromotionAction(
  recommended: RecommendedPromotionResult,
  yearAverage: number | null,
  levels: LevelRow[],
  specialtyId: string,
  fromLevelId: string,
  minPromotionAverage: number,
  manualFinalAction?: PromotionAction | null,
): { finalAction: PromotionAction; targetLevelId: string | null } {
  if (manualFinalAction) {
    if (manualFinalAction === 'PROMOTE') {
      const next = findNextLevel(levels, specialtyId, fromLevelId);
      return {
        finalAction: next ? 'PROMOTE' : 'GRADUATE',
        targetLevelId: next?.id ?? null,
      };
    }
    if (manualFinalAction === 'REPEAT') {
      return { finalAction: 'REPEAT', targetLevelId: fromLevelId };
    }
    return { finalAction: manualFinalAction, targetLevelId: null };
  }

  if (recommended === 'MANUAL_ONLY' || recommended === 'REPEAT') {
    return { finalAction: 'REPEAT', targetLevelId: fromLevelId };
  }

  const next = findNextLevel(levels, specialtyId, fromLevelId);
  if (next) {
    return { finalAction: 'PROMOTE', targetLevelId: next.id };
  }
  if (
    yearAverage != null &&
    meetsPromotionThreshold(yearAverage, minPromotionAverage)
  ) {
    return { finalAction: 'GRADUATE', targetLevelId: null };
  }
  return { finalAction: 'REPEAT', targetLevelId: fromLevelId };
}

export function buildPromotionCandidates(
  inputs: PromotionCandidateInput[],
  levels: LevelRow[],
): PromotionCandidate[] {
  return inputs.map((input) => {
    if (!input.marksComplete && !input.manualFinalAction) {
      return {
        studentProfileId: input.studentProfileId,
        specialtyId: input.specialtyId,
        classId: input.classId,
        enrollmentId: input.enrollmentId,
        fromLevelId: input.levelId,
        yearAverage: input.yearAverage,
        policyMinAverage: input.policy.minPromotionAverage,
        recommendedAction: 'REPEAT',
        finalAction: 'REPEAT',
        targetLevelId: input.levelId,
        targetClassId: null,
        isManualOverride: false,
        skippedAuto: true,
        skippedPendingMarks: true,
      };
    }

    const recommended = recommendedPromotionAction(
      input.yearAverage,
      input.policy,
      input.marksComplete,
    );
    const manual = input.manualFinalAction ?? null;

    if (recommended === 'MANUAL_ONLY' && !manual) {
      return {
        studentProfileId: input.studentProfileId,
        specialtyId: input.specialtyId,
        classId: input.classId,
        enrollmentId: input.enrollmentId,
        fromLevelId: input.levelId,
        yearAverage: input.yearAverage,
        policyMinAverage: input.policy.minPromotionAverage,
        recommendedAction: 'REPEAT',
        finalAction: 'REPEAT',
        targetLevelId: input.levelId,
        targetClassId: null,
        isManualOverride: false,
        skippedAuto: true,
        skippedPendingMarks: false,
      };
    }

    const recommendedAction: PromotionAction =
      recommended === 'MANUAL_ONLY' ? 'REPEAT' : recommended;

    const { finalAction, targetLevelId } = resolveFinalPromotionAction(
      recommended,
      input.yearAverage,
      levels,
      input.specialtyId,
      input.levelId,
      input.policy.minPromotionAverage,
      manual,
    );
    const resolvedTarget =
      manual === 'PROMOTE' && input.manualTargetLevelId
        ? input.manualTargetLevelId
        : targetLevelId;

    return {
      studentProfileId: input.studentProfileId,
      specialtyId: input.specialtyId,
      classId: input.classId,
      enrollmentId: input.enrollmentId,
      fromLevelId: input.levelId,
      yearAverage: input.yearAverage,
      policyMinAverage: input.policy.minPromotionAverage,
      recommendedAction: recommendedAction,
      finalAction,
      targetLevelId: resolvedTarget,
      targetClassId: null,
      isManualOverride: manual != null && manual !== recommendedAction,
      skippedAuto: false,
      skippedPendingMarks: false,
    };
  });
}

/** Aggregate sequence marks into a year average per student. */
export function computeYearAveragesFromMarks(
  marks: {
    studentProfileId: string;
    totalScore: number | null;
    sequenceNumber: number | null;
  }[],
): Map<string, number> {
  const byStudent = new Map<string, { sequenceNumber: number; average: number }[]>();

  for (const mark of marks) {
    if (mark.totalScore == null || Number.isNaN(mark.totalScore)) {
      continue;
    }
    const seqNum = mark.sequenceNumber ?? 1;
    const list = byStudent.get(mark.studentProfileId) ?? [];
    const existing = list.find((r) => r.sequenceNumber === seqNum);
    if (existing) {
      existing.average = averageScores([existing.average, mark.totalScore]) ?? existing.average;
    } else {
      list.push({ sequenceNumber: seqNum, average: mark.totalScore });
    }
    byStudent.set(mark.studentProfileId, list);
  }

  const result = new Map<string, number>();
  for (const [studentId, sequences] of Array.from(byStudent.entries())) {
    const termAvgs: (number | null)[] = [];
    const termNumbers = new Set(sequences.map((s) => Math.floor((s.sequenceNumber - 1) / 2) + 1));
    for (const termNum of Array.from(termNumbers)) {
      const seqInTerm = sequences.filter(
        (s) => Math.floor((s.sequenceNumber - 1) / 2) + 1 === termNum,
      );
      const termAvg = computeTermAverageFromSequences(seqInTerm);
      termAvgs.push(termAvg);
    }
    const yearAvg = computeAnnualAverage(termAvgs);
    if (yearAvg != null) {
      result.set(studentId, yearAvg);
    }
  }
  return result;
}

/** Class-scoped year average: requires marks for all class subjects when mappings exist. */
export function computeYearAverageForPromotionFromMarks(
  marks: {
    studentProfileId: string;
    subjectId: string;
    totalScore: number | null;
    sequenceNumber: number | null;
  }[],
  studentProfileId: string,
  classSubjectIds: string[] | null,
): YearAverageForPromotion {
  const studentMarks = marks.filter((m) => m.studentProfileId === studentProfileId);
  const scopedMarks =
    classSubjectIds && classSubjectIds.length > 0
      ? studentMarks.filter((m) => classSubjectIds.includes(m.subjectId))
      : studentMarks;

  if (classSubjectIds && classSubjectIds.length > 0) {
    const subjectsWithMarks = new Set(scopedMarks.map((m) => m.subjectId));
    const allSubjectsCovered = classSubjectIds.every((id) =>
      subjectsWithMarks.has(id),
    );
    if (!allSubjectsCovered) {
      return { average: null, status: 'incomplete' };
    }
  }

  const averages = computeYearAveragesFromMarks(
    scopedMarks.map((m) => ({
      studentProfileId: m.studentProfileId,
      totalScore: m.totalScore,
      sequenceNumber: m.sequenceNumber,
    })),
  );

  const average = averages.get(studentProfileId) ?? null;
  if (average == null) {
    return { average: null, status: 'incomplete' };
  }
  return { average, status: 'complete' };
}

export function planYearRollover(input: {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  candidates: PromotionCandidate[];
  promoteEligible: boolean;
  repeatNonEligible: boolean;
  manualOnlyClassIds?: Set<string>;
}): YearRolloverPlan {
  const enrollments: YearRolloverEnrollmentPlan[] = [];
  let promoted = 0;
  let repeated = 0;
  let graduated = 0;
  let deferred = 0;
  let withdrawn = 0;
  let skipped = 0;
  let skippedManualOnly = 0;

  for (const row of input.candidates) {
    if (
      input.manualOnlyClassIds?.has(row.classId) &&
      !row.isManualOverride
    ) {
      skippedManualOnly += 1;
      skipped += 1;
      continue;
    }

    if (row.finalAction === 'DEFER' || row.finalAction === 'WITHDRAW') {
      if (row.finalAction === 'DEFER') {
        deferred += 1;
      } else {
        withdrawn += 1;
      }
      skipped += 1;
      continue;
    }

    if (row.finalAction === 'GRADUATE') {
      graduated += 1;
      enrollments.push({
        studentProfileId: row.studentProfileId,
        specialtyId: row.specialtyId,
        targetLevelId: row.fromLevelId,
        targetClassId: null,
        finalAction: 'GRADUATE',
        createEnrollment: false,
        markAlumni: true,
      });
      continue;
    }

    if (row.finalAction === 'PROMOTE') {
      if (!input.promoteEligible || !row.targetLevelId) {
        skipped += 1;
        continue;
      }
      promoted += 1;
      enrollments.push({
        studentProfileId: row.studentProfileId,
        specialtyId: row.specialtyId,
        targetLevelId: row.targetLevelId,
        targetClassId: row.targetClassId,
        finalAction: 'PROMOTE',
        createEnrollment: true,
        markAlumni: false,
      });
      continue;
    }

    if (row.finalAction === 'REPEAT') {
      if (!input.repeatNonEligible) {
        skipped += 1;
        continue;
      }
      repeated += 1;
      enrollments.push({
        studentProfileId: row.studentProfileId,
        specialtyId: row.specialtyId,
        targetLevelId: row.fromLevelId,
        targetClassId: row.classId,
        finalAction: 'REPEAT',
        createEnrollment: true,
        markAlumni: false,
      });
    }
  }

  return {
    sourceAcademicYearId: input.sourceAcademicYearId,
    targetAcademicYearId: input.targetAcademicYearId,
    enrollments,
    promoted,
    repeated,
    graduated,
    deferred,
    withdrawn,
    skipped,
    skippedManualOnly,
  };
}

export function previewRetentionArchive(input: {
  referenceDate: Date;
  archiveInactiveAfterYears: number;
  enrollmentRetentionYears: number;
  inactiveProfileCount: number;
  oldEnrollmentCount: number;
}): RetentionArchivePreview {
  const inactiveCutoff = new Date(input.referenceDate);
  inactiveCutoff.setFullYear(
    inactiveCutoff.getFullYear() - input.archiveInactiveAfterYears,
  );
  const enrollmentCutoff = new Date(input.referenceDate);
  enrollmentCutoff.setFullYear(
    enrollmentCutoff.getFullYear() - input.enrollmentRetentionYears,
  );

  return {
    cutoffDate: enrollmentCutoff.toISOString().slice(0, 10),
    inactiveProfiles: input.inactiveProfileCount,
    oldEnrollments: input.oldEnrollmentCount,
    description: `Would flag ${input.inactiveProfileCount} inactive profile(s) and archive ${input.oldEnrollmentCount} enrollment(s) older than ${input.enrollmentRetentionYears} years.`,
  };
}

export const DEFAULT_RETENTION_POLICY = {
  marksRetentionYears: 7,
  enrollmentRetentionYears: 10,
  archiveInactiveAfterYears: 3,
} as const;

export function promotionActionLabel(action: PromotionAction): string {
  switch (action) {
    case 'PROMOTE':
      return 'Promote';
    case 'REPEAT':
      return 'Repeat year';
    case 'GRADUATE':
      return 'Graduate';
    case 'WITHDRAW':
      return 'Withdraw';
    case 'DEFER':
      return 'Defer';
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function requireClassPromotionPolicy(
  policy: ClassPromotionPolicyRow | null,
  className: string,
): ClassPromotionPolicyRow {
  if (!policy) {
    throw new Error(
      `Configure a promotion policy for "${className}" before computing.`,
    );
  }
  return policy;
}
