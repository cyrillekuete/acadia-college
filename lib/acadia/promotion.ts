import {
  type AcademicYearStructure,
  DEFAULT_ACADEMIC_STRUCTURE,
  buildSequenceDistribution,
} from '@/lib/acadia/academic-calendar';
import {
  collapseMarksToSubjectScore,
  computeAnnualAverage,
  computeTermAverageFromSequences,
  PASSING_AVERAGE,
  weightedAverage,
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
  subSystem: string;
  branch: string;
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
  subSystem: string;
  branch: string;
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
  subSystem: string;
  branch: string;
  targetLevelId: string;
  targetClassId: string | null;
  finalAction: PromotionAction;
  createEnrollment: boolean;
  markAlumni: boolean;
  withdrawSource: boolean;
  closeSourceEnrollment: boolean;
};

export type UnresolvedRolloverClass = {
  studentProfileId: string;
  finalAction: PromotionAction;
  targetLevelId: string;
  reason: 'missing';
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
  fromLevelId: string,
  minPromotionAverage: number,
  manualFinalAction?: PromotionAction | null,
): { finalAction: PromotionAction; targetLevelId: string | null } {
  if (manualFinalAction) {
    if (manualFinalAction === 'PROMOTE') {
      const next = findNextLevel(levels, fromLevelId);
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

  const next = findNextLevel(levels, fromLevelId);
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
        subSystem: input.subSystem,
        branch: input.branch,
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
        subSystem: input.subSystem,
        branch: input.branch,
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
      subSystem: input.subSystem,
      branch: input.branch,
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

type YearAverageMark = {
  studentProfileId: string;
  totalScore: number | null;
  sequenceNumber: number | null;
  subjectId?: string;
  subjectSubBranchId?: string | null;
  subjectCoefficient?: number | null;
  subBranchCoefficient?: number | null;
};

export type PromotionClassSubject = {
  subjectId: string;
  /** Assigned papers; empty/null means a single subject-level mark. */
  subBranchIds?: string[] | null;
};

function isScoredTotal(totalScore: number | null | undefined): boolean {
  return totalScore != null && !Number.isNaN(totalScore);
}

function normalizePromotionClassSubjects(
  classSubjects: Array<string | PromotionClassSubject> | null,
): PromotionClassSubject[] | null {
  if (!classSubjects || classSubjects.length === 0) {
    return null;
  }
  return classSubjects.map((item) =>
    typeof item === 'string' ? { subjectId: item } : item,
  );
}

function requiredSubBranchesBySubject(
  classSubjects: PromotionClassSubject[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const subject of classSubjects) {
    const ids = (subject.subBranchIds ?? []).filter((id) => id.trim().length > 0);
    if (ids.length > 0) {
      map.set(subject.subjectId, ids);
    }
  }
  return map;
}

function promotionMarksAreComplete(
  marks: YearAverageMark[],
  classSubjects: PromotionClassSubject[],
): boolean {
  for (const subject of classSubjects) {
    const papers = (subject.subBranchIds ?? []).filter((id) => id.trim().length > 0);
    const subjectMarks = marks.filter((mark) => mark.subjectId === subject.subjectId);

    if (papers.length === 0) {
      if (!subjectMarks.some((mark) => isScoredTotal(mark.totalScore))) {
        return false;
      }
      continue;
    }

    const sequences = new Set(subjectMarks.map((mark) => mark.sequenceNumber ?? 1));
    if (sequences.size === 0) {
      return false;
    }

    for (const seq of Array.from(sequences)) {
      const seqMarks = subjectMarks.filter(
        (mark) => (mark.sequenceNumber ?? 1) === seq,
      );
      const allPapersScored = papers.every((paperId) =>
        seqMarks.some(
          (mark) =>
            mark.subjectSubBranchId === paperId && isScoredTotal(mark.totalScore),
        ),
      );
      if (!allPapersScored) {
        return false;
      }
    }
  }
  return true;
}

/** Aggregate sequence marks into a year average per student. */
export function computeYearAveragesFromMarks(
  marks: YearAverageMark[],
  requiredSubBranchesBySubjectId?: ReadonlyMap<string, readonly string[]>,
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): Map<string, number> {
  const byStudent = new Map<string, { sequenceNumber: number; average: number }[]>();
  const grouped = new Map<string, YearAverageMark[]>();

  marks.forEach((mark, index) => {
    const seqNum = mark.sequenceNumber ?? 1;
    const subjectKey = mark.subjectId?.trim() ? mark.subjectId : `__row_${index}`;
    const key = `${mark.studentProfileId}::${seqNum}::${subjectKey}`;
    const list = grouped.get(key) ?? [];
    list.push(mark);
    grouped.set(key, list);
  });

  const sequenceSubjects = new Map<
    string,
    Map<number, { score: number; coefficient: number }[]>
  >();

  for (const [key, subjectMarks] of Array.from(grouped.entries())) {
    const [studentId, seqRaw] = key.split('::');
    const seqNum = Number(seqRaw);
    const subjectId = subjectMarks[0]?.subjectId?.trim() ?? '';
    const score = collapseMarksToSubjectScore(
      subjectMarks,
      requiredSubBranchesBySubjectId?.get(subjectId),
    );
    if (score == null) {
      continue;
    }
    const studentMap = sequenceSubjects.get(studentId) ?? new Map();
    const sequenceList = studentMap.get(seqNum) ?? [];
    sequenceList.push({
      score,
      coefficient: subjectMarks[0]?.subjectCoefficient ?? 1,
    });
    studentMap.set(seqNum, sequenceList);
    sequenceSubjects.set(studentId, studentMap);
  }

  for (const [studentId, sequences] of Array.from(sequenceSubjects.entries())) {
    const list: { sequenceNumber: number; average: number }[] = [];
    for (const [seqNum, subjectScores] of Array.from(sequences.entries())) {
      const average = weightedAverage(subjectScores);
      if (average != null) {
        list.push({ sequenceNumber: seqNum, average });
      }
    }
    byStudent.set(studentId, list);
  }

  const { termNumberBySequence } = buildSequenceDistribution(structure);
  const result = new Map<string, number>();
  for (const [studentId, sequences] of Array.from(byStudent.entries())) {
    const termAvgs: (number | null)[] = [];
    const termNumbers = new Set(
      sequences
        .map((row) => termNumberBySequence.get(row.sequenceNumber))
        .filter((term): term is number => term != null),
    );
    for (const termNum of Array.from(termNumbers).sort((a, b) => a - b)) {
      const seqInTerm = sequences.filter(
        (row) => termNumberBySequence.get(row.sequenceNumber) === termNum,
      );
      const termAvg = computeTermAverageFromSequences(seqInTerm, structure);
      termAvgs.push(termAvg);
    }
    const yearAvg = computeAnnualAverage(termAvgs);
    if (yearAvg != null) {
      result.set(studentId, yearAvg);
    }
  }
  return result;
}

/** Class-scoped year average: requires scored marks for every class subject and paper. */
export function computeYearAverageForPromotionFromMarks(
  marks: {
    studentProfileId: string;
    subjectId: string;
    totalScore: number | null;
    sequenceNumber: number | null;
    subjectSubBranchId?: string | null;
    subjectCoefficient?: number | null;
    subBranchCoefficient?: number | null;
  }[],
  studentProfileId: string,
  classSubjects: Array<string | PromotionClassSubject> | null,
  structure: AcademicYearStructure = DEFAULT_ACADEMIC_STRUCTURE,
): YearAverageForPromotion {
  const requirements = normalizePromotionClassSubjects(classSubjects);
  const studentMarks = marks.filter((m) => m.studentProfileId === studentProfileId);
  const requiredSubjectIds = requirements?.map((subject) => subject.subjectId) ?? [];
  const scopedMarks =
    requiredSubjectIds.length > 0
      ? studentMarks.filter((m) => requiredSubjectIds.includes(m.subjectId))
      : studentMarks;

  if (requirements && !promotionMarksAreComplete(scopedMarks, requirements)) {
    return { average: null, status: 'incomplete' };
  }

  const averages = computeYearAveragesFromMarks(
    scopedMarks.map((m) => ({
      studentProfileId: m.studentProfileId,
      subjectId: m.subjectId,
      totalScore: m.totalScore,
      sequenceNumber: m.sequenceNumber,
      subjectSubBranchId: m.subjectSubBranchId,
      subjectCoefficient: m.subjectCoefficient,
      subBranchCoefficient: m.subBranchCoefficient,
    })),
    requirements ? requiredSubBranchesBySubject(requirements) : undefined,
    structure,
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

    if (row.finalAction === 'DEFER') {
      deferred += 1;
      skipped += 1;
      continue;
    }

    if (row.finalAction === 'WITHDRAW') {
      withdrawn += 1;
      enrollments.push({
        studentProfileId: row.studentProfileId,
        subSystem: row.subSystem,
        branch: row.branch,
        targetLevelId: row.fromLevelId,
        targetClassId: null,
        finalAction: 'WITHDRAW',
        createEnrollment: false,
        markAlumni: false,
        withdrawSource: true,
        closeSourceEnrollment: true,
      });
      continue;
    }

    if (row.finalAction === 'GRADUATE') {
      graduated += 1;
      enrollments.push({
        studentProfileId: row.studentProfileId,
        subSystem: row.subSystem,
        branch: row.branch,
        targetLevelId: row.fromLevelId,
        targetClassId: null,
        finalAction: 'GRADUATE',
        createEnrollment: false,
        markAlumni: true,
        withdrawSource: false,
        closeSourceEnrollment: true,
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
        subSystem: row.subSystem,
        branch: row.branch,
        targetLevelId: row.targetLevelId,
        targetClassId: row.targetClassId,
        finalAction: 'PROMOTE',
        createEnrollment: true,
        markAlumni: false,
        withdrawSource: false,
        closeSourceEnrollment: true,
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
        subSystem: row.subSystem,
        branch: row.branch,
        targetLevelId: row.fromLevelId,
        targetClassId: row.classId,
        finalAction: 'REPEAT',
        createEnrollment: true,
        markAlumni: false,
        withdrawSource: false,
        closeSourceEnrollment: true,
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

export function retentionCutoffDate(referenceDate: Date, years: number): string {
  const cutoff = new Date(referenceDate);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return cutoff.toISOString().slice(0, 10);
}

export function shouldArchiveEnrollment(input: {
  status: string;
  yearIsCurrent: boolean;
  yearEndsOn: string | null;
  cutoffDate: string;
}): boolean {
  if (input.yearIsCurrent) {
    return false;
  }
  if (input.status !== 'ENROLLED') {
    return false;
  }
  if (!input.yearEndsOn) {
    return false;
  }
  return input.yearEndsOn.slice(0, 10) < input.cutoffDate;
}

export function shouldDeactivateRetentionProfile(input: {
  isActive: boolean;
  hasCurrentYearEnrollment: boolean;
  updatedAt: string;
  inactiveCutoffIso: string;
}): boolean {
  if (!input.isActive || input.hasCurrentYearEnrollment) {
    return false;
  }
  return input.updatedAt < input.inactiveCutoffIso;
}

export function selectRetentionArchiveTargets(input: {
  referenceDate: Date;
  archiveInactiveAfterYears: number;
  enrollmentRetentionYears: number;
  profiles: Array<{ id: string; isActive: boolean; updatedAt: string }>;
  enrollments: Array<{
    id: string;
    studentProfileId: string;
    status: string;
    yearIsCurrent: boolean;
    yearEndsOn: string | null;
  }>;
}): { profileIds: string[]; enrollmentIds: string[] } {
  const enrollmentCutoff = retentionCutoffDate(
    input.referenceDate,
    input.enrollmentRetentionYears,
  );
  const inactiveCutoff = new Date(input.referenceDate);
  inactiveCutoff.setFullYear(
    inactiveCutoff.getFullYear() - input.archiveInactiveAfterYears,
  );
  const inactiveCutoffIso = inactiveCutoff.toISOString();

  const currentYearProfileIds = new Set(
    input.enrollments
      .filter((row) => row.yearIsCurrent && row.status === 'ENROLLED')
      .map((row) => row.studentProfileId),
  );

  return {
    profileIds: input.profiles
      .filter((profile) =>
        shouldDeactivateRetentionProfile({
          isActive: profile.isActive,
          hasCurrentYearEnrollment: currentYearProfileIds.has(profile.id),
          updatedAt: profile.updatedAt,
          inactiveCutoffIso,
        }),
      )
      .map((profile) => profile.id),
    enrollmentIds: input.enrollments
      .filter((row) =>
        shouldArchiveEnrollment({
          status: row.status,
          yearIsCurrent: row.yearIsCurrent,
          yearEndsOn: row.yearEndsOn,
          cutoffDate: enrollmentCutoff,
        }),
      )
      .map((row) => row.id),
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

export function unresolvedRolloverTargetClasses(
  plan: YearRolloverPlan,
): UnresolvedRolloverClass[] {
  return plan.enrollments
    .filter((item) => item.createEnrollment && !item.targetClassId)
    .map((item) => ({
      studentProfileId: item.studentProfileId,
      finalAction: item.finalAction,
      targetLevelId: item.targetLevelId,
      reason: 'missing' as const,
    }));
}

export function formatUnresolvedRolloverMessage(
  unresolved: UnresolvedRolloverClass[],
): string {
  const sample = unresolved
    .slice(0, 5)
    .map((item) => item.targetLevelId)
    .join(', ');
  return (
    `Cannot enroll ${unresolved.length} student(s) because the next class is missing or ambiguous (${sample}). ` +
    'Assign a unique active class or mark a default promotion class for that level and stream.'
  );
}

export function assertRolloverTargetClassesResolved(plan: YearRolloverPlan): void {
  const unresolved = unresolvedRolloverTargetClasses(plan);
  if (unresolved.length > 0) {
    throw new Error(formatUnresolvedRolloverMessage(unresolved));
  }
}

export function rolloverItemsForRpc(plan: YearRolloverPlan) {
  return plan.enrollments.map((item) => ({
    studentProfileId: item.studentProfileId,
    subSystem: item.subSystem,
    branch: item.branch,
    targetLevelId: item.targetLevelId,
    targetClassId: item.targetClassId,
    finalAction: item.finalAction,
    createEnrollment: item.createEnrollment,
    markAlumni: item.markAlumni,
    withdrawSource: item.withdrawSource,
    closeSourceEnrollment: item.closeSourceEnrollment,
  }));
}
