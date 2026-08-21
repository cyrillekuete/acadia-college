/**
 * Auto-provision and class-change rebill for student fee accounts.
 * Accounts are a snapshot of enrollment + the class fee plan — not a manual step.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import {
  buildFeeInstallmentRows,
  computeFeeAccountTotals,
  DEFAULT_FEE_CURRENCY,
  formatMoneyMinor,
  parseFeePlanInstallments,
  sumInstallmentTemplates,
} from '@/lib/acadia/finance';
import type { FeeInstallmentTemplateValues } from '@/lib/acadia/finance-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { appendSystemLog } from '@/lib/acadia/system-log';

export type FeeAccountSkipReason = 'no_class' | 'no_plan' | 'empty_plan';
export type FeeAccountFailReason = FeeAccountSkipReason | 'error';

export type EnsureStudentFeeAccountInput = {
  tenantId: string;
  studentProfileId: string;
  academicYearId: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  studentEnrollmentId: string;
  classId?: string | null;
  feeCurrency?: string;
  actorUserId?: string | null;
};

export type EnsureStudentFeeAccountResult =
  | { ok: true; accountId: string; created: boolean }
  | { ok: false; reason: FeeAccountFailReason; message: string };

export type RebillFeeAccountInput = EnsureStudentFeeAccountInput & {
  classId: string;
};

export type RebillFeeAccountResult =
  | {
      ok: true;
      accountId: string;
      rebilled: boolean;
      transferredPaidMinor: number;
      creditMinor: number;
      remainingMinor: number;
    }
  | { ok: false; reason: FeeAccountFailReason; message: string };

export type RebillInstallmentRow = {
  installmentNumber: number;
  labelEn: string;
  labelFr: string;
  amountMinor: number;
  dueOn: string;
  status: 'PENDING' | 'PAID';
  paidAmountMinor: number | null;
  paidAt: string | null;
};

export type RebillInstallmentsResult = {
  totalAmountMinor: number;
  totalDueMinor: number;
  appliedPaidMinor: number;
  creditMinor: number;
  remainingMinor: number;
  installments: RebillInstallmentRow[];
};

type PaidInstallmentInput = {
  amountMinor: number;
  status: string;
  paidAmountMinor?: number | null;
};

type ClassFeePlan = {
  streamFeePlanId: string;
  installments: FeeInstallmentTemplateValues[];
  totalAmountMinor: number;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function sumPaidFromInstallments(
  installments: PaidInstallmentInput[],
): number {
  return computeFeeAccountTotals({
    totalAmountMinor: 0,
    installments,
  }).totalPaidMinor;
}

/**
 * Cash already on the account for a rebill: installment receipts plus stored
 * credit. Credit is the leftover from a previous cheaper plan and is not kept
 * on installment rows, so omitting it wipes prepaid overpayment.
 */
export function paidMinorForRebill(input: {
  installments: PaidInstallmentInput[];
  creditMinor?: number | null;
}): number {
  const storedCredit = Math.max(0, Math.round(Number(input.creditMinor ?? 0)));
  return sumPaidFromInstallments(input.installments) + storedCredit;
}

/**
 * Rebuilds a fee schedule from a class plan and waterfalls money already paid
 * onto the new installments. Remaining due = new plan total − scholarships − paid.
 */
export function rebillInstallments(input: {
  paidMinor: number;
  scholarshipMinor?: number;
  templates: FeeInstallmentTemplateValues[];
  paidAt?: string | null;
}): RebillInstallmentsResult {
  const templates = [...input.templates].sort(
    (a, b) => a.installmentNumber - b.installmentNumber,
  );
  const totalAmountMinor = sumInstallmentTemplates(templates);
  const scholarshipMinor = Math.max(0, Math.round(input.scholarshipMinor ?? 0));
  const totalDueMinor = Math.max(0, totalAmountMinor - scholarshipMinor);
  const paidMinor = Math.max(0, Math.round(input.paidMinor));
  const creditMinor = Math.max(0, paidMinor - totalDueMinor);
  let leftover = Math.min(paidMinor, totalDueMinor);
  const paidAt = leftover > 0 ? (input.paidAt ?? null) : null;

  const installments: RebillInstallmentRow[] = templates.map((row) => {
    const applied = Math.min(leftover, Math.max(0, row.amountMinor));
    leftover -= applied;
    const paidAmountMinor = applied > 0 ? applied : null;
    const status: 'PENDING' | 'PAID' =
      applied >= row.amountMinor && row.amountMinor > 0 ? 'PAID' : 'PENDING';
    return {
      installmentNumber: row.installmentNumber,
      labelEn: row.labelEn,
      labelFr: row.labelFr,
      amountMinor: row.amountMinor,
      dueOn: row.dueOn,
      status,
      paidAmountMinor,
      paidAt: applied > 0 ? paidAt : null,
    };
  });

  const appliedPaidMinor = Math.min(paidMinor, totalDueMinor) - leftover;
  return {
    totalAmountMinor,
    totalDueMinor,
    appliedPaidMinor,
    creditMinor,
    remainingMinor: Math.max(0, totalDueMinor - appliedPaidMinor),
    installments,
  };
}

async function findFeeAccountId(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    studentProfileId: string;
    academicYearId: string;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('StudentFeeAccount')
    .select('id')
    .eq('tenantId', input.tenantId)
    .eq('studentProfileId', input.studentProfileId)
    .eq('academicYearId', input.academicYearId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data?.id ? String(data.id) : null;
}

async function loadClassFeePlan(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    academicYearId: string;
    classId: string;
  },
): Promise<ClassFeePlan | null> {
  const { data: assignment, error } = await supabase
    .from('StreamFeePlanClass')
    .select(
      `
      streamFeePlanId,
      StreamFeePlan!StreamFeePlanClass_streamFeePlanId_tenantId_fkey (
        installments
      )
    `,
    )
    .eq('tenantId', input.tenantId)
    .eq('academicYearId', input.academicYearId)
    .eq('classId', input.classId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  const streamFeePlanId = assignment?.streamFeePlanId
    ? String(assignment.streamFeePlanId)
    : '';
  if (!streamFeePlanId) {
    return null;
  }
  const plan = unwrapRelation<{ installments?: unknown }>(
    assignment?.StreamFeePlan,
  );
  const installments = parseFeePlanInstallments(plan?.installments);
  const totalAmountMinor = sumInstallmentTemplates(installments);
  if (totalAmountMinor <= 0) {
    return {
      streamFeePlanId,
      installments,
      totalAmountMinor: 0,
    };
  }
  return { streamFeePlanId, installments, totalAmountMinor };
}

async function insertFeeAccountWithInstallments(
  supabase: SupabaseClient,
  input: EnsureStudentFeeAccountInput & {
    plan: ClassFeePlan;
    nowIso: string;
  },
): Promise<string> {
  const accountId = generateAcadiaId('fee-acct');
  const { error: accountError } = await supabase.from('StudentFeeAccount').insert({
    id: accountId,
    tenantId: input.tenantId,
    studentProfileId: input.studentProfileId,
    academicYearId: input.academicYearId,
    subSystem: input.subSystem,
    branch: input.branch,
    studentEnrollmentId: input.studentEnrollmentId || null,
    streamFeePlanId: input.plan.streamFeePlanId,
    totalAmountMinor: input.plan.totalAmountMinor,
    creditMinor: 0,
    feeCurrency: input.feeCurrency || DEFAULT_FEE_CURRENCY,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  });
  if (accountError) {
    throw accountError;
  }

  const installmentRows = buildFeeInstallmentRows(
    input.plan.installments,
    input.tenantId,
    accountId,
    input.nowIso,
  );
  const { error: instError } = await supabase
    .from('StudentFeeInstallment')
    .insert(installmentRows);
  if (instError) {
    await supabase
      .from('StudentFeeAccount')
      .delete()
      .eq('id', accountId)
      .eq('tenantId', input.tenantId);
    throw instError;
  }
  return accountId;
}

/**
 * Creates a fee account from the class plan when none exists for this student/year.
 * Skips (does not throw) when the student has no class or the class has no plan.
 */
export async function ensureStudentFeeAccount(
  supabase: SupabaseClient,
  input: EnsureStudentFeeAccountInput,
): Promise<EnsureStudentFeeAccountResult> {
  const classId = input.classId?.trim() || '';
  if (!classId) {
    return {
      ok: false,
      reason: 'no_class',
      message: 'Student is not assigned to a class.',
    };
  }

  try {
    const existingId = await findFeeAccountId(supabase, input);
    if (existingId) {
      return { ok: true, accountId: existingId, created: false };
    }

    const plan = await loadClassFeePlan(supabase, {
      tenantId: input.tenantId,
      academicYearId: input.academicYearId,
      classId,
    });
    if (!plan) {
      return {
        ok: false,
        reason: 'no_plan',
        message: 'No fee plan for this class. Set up a plan first.',
      };
    }
    if (plan.totalAmountMinor <= 0) {
      return {
        ok: false,
        reason: 'empty_plan',
        message: 'Fee plan has no installment amounts.',
      };
    }

    const nowIso = new Date().toISOString();
    let accountId: string;
    try {
      accountId = await insertFeeAccountWithInstallments(supabase, {
        ...input,
        classId,
        plan,
        nowIso,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const racedId = await findFeeAccountId(supabase, input);
        if (racedId) {
          return { ok: true, accountId: racedId, created: false };
        }
      }
      throw error;
    }

    if (input.actorUserId) {
      await appendSystemLog(supabase, {
        userId: input.actorUserId,
        event: 'fee_account.created',
        entityId: accountId,
        entityType: 'StudentFeeAccount',
        description: `Fee account created (${formatMoneyMinor(plan.totalAmountMinor)})`,
      });
    }
    return { ok: true, accountId, created: true };
  } catch (error) {
    return {
      ok: false,
      reason: 'error',
      message: errorMessage(error, 'Failed to create fee account.'),
    };
  }
}

/**
 * Switches an existing account to the new class fee plan and carries paid money over.
 * If no account exists yet, creates one. If the new class has no plan, leaves the
 * existing account unchanged.
 */
export async function rebillFeeAccountToClassPlan(
  supabase: SupabaseClient,
  input: RebillFeeAccountInput,
): Promise<RebillFeeAccountResult> {
  const classId = input.classId.trim();
  if (!classId) {
    return {
      ok: false,
      reason: 'no_class',
      message: 'Student is not assigned to a class.',
    };
  }

  try {
    const plan = await loadClassFeePlan(supabase, {
      tenantId: input.tenantId,
      academicYearId: input.academicYearId,
      classId,
    });
    if (!plan) {
      return {
        ok: false,
        reason: 'no_plan',
        message: 'No fee plan for this class. Set up a plan first.',
      };
    }
    if (plan.totalAmountMinor <= 0) {
      return {
        ok: false,
        reason: 'empty_plan',
        message: 'Fee plan has no installment amounts.',
      };
    }

    const { data: account, error: accountError } = await supabase
      .from('StudentFeeAccount')
      .select(
        `
        id,
        totalAmountMinor,
        creditMinor,
        streamFeePlanId,
        StudentFeeInstallment ( amountMinor, status, paidAmountMinor ),
        StudentScholarship ( discountMinor )
      `,
      )
      .eq('tenantId', input.tenantId)
      .eq('studentProfileId', input.studentProfileId)
      .eq('academicYearId', input.academicYearId)
      .maybeSingle();
    if (accountError) {
      throw accountError;
    }

    if (!account?.id) {
      const created = await ensureStudentFeeAccount(supabase, {
        ...input,
        classId,
      });
      if (!created.ok) {
        return created;
      }
      return {
        ok: true,
        accountId: created.accountId,
        rebilled: false,
        transferredPaidMinor: 0,
        creditMinor: 0,
        remainingMinor: plan.totalAmountMinor,
      };
    }

    const accountId = String(account.id);
    if (account.streamFeePlanId === plan.streamFeePlanId) {
      return {
        ok: true,
        accountId,
        rebilled: false,
        transferredPaidMinor: 0,
        creditMinor: 0,
        remainingMinor: 0,
      };
    }

    const installments = (account.StudentFeeInstallment ?? []) as PaidInstallmentInput[];
    const scholarships = (account.StudentScholarship ?? []) as Array<{
      discountMinor: number;
    }>;
    const scholarshipMinor = scholarships.reduce(
      (sum, row) => sum + Number(row.discountMinor ?? 0),
      0,
    );
    const paidMinor = paidMinorForRebill({
      installments,
      creditMinor: (account as { creditMinor?: number | null }).creditMinor,
    });
    const nowIso = new Date().toISOString();
    const rebilled = rebillInstallments({
      paidMinor,
      scholarshipMinor,
      templates: plan.installments,
      paidAt: nowIso,
    });

    const { error: deleteError } = await supabase
      .from('StudentFeeInstallment')
      .delete()
      .eq('tenantId', input.tenantId)
      .eq('studentFeeAccountId', accountId);
    if (deleteError) {
      throw deleteError;
    }

    const installmentRows = buildFeeInstallmentRows(
      plan.installments,
      input.tenantId,
      accountId,
      nowIso,
    ).map((row) => {
      const match = rebilled.installments.find(
        (item) => item.installmentNumber === row.installmentNumber,
      );
      return {
        ...row,
        status: match?.status ?? 'PENDING',
        paidAmountMinor: match?.paidAmountMinor ?? null,
        paidAt: match?.paidAt ?? null,
        notes:
          paidMinor > 0 &&
          row.installmentNumber === rebilled.installments[0]?.installmentNumber
            ? `Transferred ${formatMoneyMinor(paidMinor)} from previous class plan.`
            : null,
      };
    });

    const { error: insertError } = await supabase
      .from('StudentFeeInstallment')
      .insert(installmentRows);
    if (insertError) {
      throw insertError;
    }

    const { error: updateError } = await supabase
      .from('StudentFeeAccount')
      .update({
        subSystem: input.subSystem,
        branch: input.branch,
        studentEnrollmentId: input.studentEnrollmentId || null,
        streamFeePlanId: plan.streamFeePlanId,
        totalAmountMinor: rebilled.totalAmountMinor,
        creditMinor: rebilled.creditMinor,
        updatedAt: nowIso,
      })
      .eq('id', accountId)
      .eq('tenantId', input.tenantId);
    if (updateError) {
      throw updateError;
    }

    if (input.actorUserId) {
      await appendSystemLog(supabase, {
        userId: input.actorUserId,
        event: 'fee_account.rebilled',
        entityId: accountId,
        entityType: 'StudentFeeAccount',
        description: `Fee account rebilled to new class plan (${formatMoneyMinor(Number(account.totalAmountMinor))} → ${formatMoneyMinor(rebilled.totalAmountMinor)}; paid ${formatMoneyMinor(paidMinor)} carried over)`,
        meta: {
          previousTotalMinor: Number(account.totalAmountMinor),
          nextTotalMinor: rebilled.totalAmountMinor,
          transferredPaidMinor: paidMinor,
          creditMinor: rebilled.creditMinor,
          remainingMinor: rebilled.remainingMinor,
        },
      });
    }

    return {
      ok: true,
      accountId,
      rebilled: true,
      transferredPaidMinor: paidMinor,
      creditMinor: rebilled.creditMinor,
      remainingMinor: rebilled.remainingMinor,
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'error',
      message: errorMessage(error, 'Failed to update fee account for the new class.'),
    };
  }
}

/**
 * After class placement: create an account if needed, or rebill when the class changed.
 * Enrollment itself must already have succeeded. Missing plans are skipped (or
 * reported) without rolling back the class change.
 */
export async function syncStudentFeeAccountAfterClassChange(
  supabase: SupabaseClient,
  input: EnsureStudentFeeAccountInput & {
    previousClassId?: string | null;
  },
): Promise<EnsureStudentFeeAccountResult | RebillFeeAccountResult> {
  const nextClassId = input.classId?.trim() || '';
  const previousClassId = input.previousClassId?.trim() || '';
  if (previousClassId && nextClassId && previousClassId !== nextClassId) {
    return rebillFeeAccountToClassPlan(supabase, {
      ...input,
      classId: nextClassId,
    });
  }
  return ensureStudentFeeAccount(supabase, input);
}

export async function provisionMissingFeeAccounts(
  supabase: SupabaseClient,
  input: { academicYearId: string; classId?: string | null },
): Promise<{ createdCount: number }> {
  const { data, error } = await supabase.rpc(
    'acadia_provision_missing_fee_accounts',
    {
      p_academic_year_id: input.academicYearId,
      p_class_id: input.classId?.trim() || null,
    },
  );
  if (error) {
    throw error;
  }
  return { createdCount: Number(data ?? 0) };
}

export async function countMissingFeeAccounts(
  supabase: SupabaseClient,
  input: { academicYearId: string; classId?: string | null },
): Promise<number> {
  const { data, error } = await supabase.rpc(
    'acadia_count_missing_fee_accounts',
    {
      p_academic_year_id: input.academicYearId,
      p_class_id: input.classId?.trim() || null,
    },
  );
  if (error) {
    throw error;
  }
  return Number(data ?? 0);
}
