import type {
  FeeInstallmentTemplateValues,
  RecordFeePaymentValues,
} from '@/lib/acadia/finance-schemas';

export const FEE_INSTALLMENT_STATUSES = [
  'PENDING',
  'PAID',
  'OVERDUE',
  'WAIVED',
] as const;

export type FeeInstallmentStatus = (typeof FEE_INSTALLMENT_STATUSES)[number];

export const FINANCE_LEDGER_TYPES = ['INCOME', 'EXPENSE'] as const;
export type FinanceLedgerEntryType = (typeof FINANCE_LEDGER_TYPES)[number];

const STATUS_LABELS: Record<FeeInstallmentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  WAIVED: 'Waived',
};

const LEDGER_LABELS: Record<FinanceLedgerEntryType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
};

export function feeInstallmentStatusLabel(status: string): string {
  return STATUS_LABELS[status as FeeInstallmentStatus] ?? status;
}

export function financeLedgerTypeLabel(type: string): string {
  return LEDGER_LABELS[type as FinanceLedgerEntryType] ?? type;
}

export const DEFAULT_FEE_CURRENCY = 'XAF';

/** Amounts stored in minor units (e.g. centimes for XAF). */
export function formatMoneyMinor(
  amountMinor: number,
  currency = DEFAULT_FEE_CURRENCY,
): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat('fr-CM', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major.toLocaleString()} ${currency}`;
  }
}

export function parseMoneyToMinor(input: string): number {
  const normalized = input.replace(/[^\d.,-]/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100);
}

export type FeeInstallmentRow = {
  installmentNumber: number;
  labelEn: string;
  labelFr: string;
  amountMinor: number;
  dueOn: string;
  status: FeeInstallmentStatus;
  paidAmountMinor: number | null;
  paidAt: string | null;
};

export type FeeAccountTotals = {
  totalDueMinor: number;
  totalPaidMinor: number;
  scholarshipMinor: number;
  balanceMinor: number;
};

export function sumInstallmentTemplates(
  installments: FeeInstallmentTemplateValues[],
): number {
  return installments.reduce((sum, row) => sum + row.amountMinor, 0);
}

export function computeFeeAccountTotals(input: {
  totalAmountMinor: number;
  scholarshipMinor?: number;
  installments: Array<{
    amountMinor: number;
    status: string;
    paidAmountMinor?: number | null;
  }>;
}): FeeAccountTotals {
  const scholarshipMinor = input.scholarshipMinor ?? 0;
  const totalDueMinor = Math.max(0, input.totalAmountMinor - scholarshipMinor);
  let totalPaidMinor = 0;
  for (const inst of input.installments) {
    if (inst.status === 'PAID') {
      totalPaidMinor += inst.paidAmountMinor ?? inst.amountMinor;
    } else if (inst.status === 'WAIVED') {
      continue;
    } else if (inst.paidAmountMinor) {
      totalPaidMinor += inst.paidAmountMinor;
    }
  }
  return {
    totalDueMinor,
    totalPaidMinor,
    scholarshipMinor,
    balanceMinor: Math.max(0, totalDueMinor - totalPaidMinor),
  };
}

export function isInstallmentOverdue(
  status: string,
  dueOn: string,
  today = new Date(),
): boolean {
  if (status === 'PAID' || status === 'WAIVED') {
    return false;
  }
  const due = new Date(`${dueOn}T12:00:00`);
  const now = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
    0,
    0,
  );
  return due < now;
}

export function effectiveInstallmentStatus(
  status: string,
  dueOn: string,
): FeeInstallmentStatus {
  if (status === 'PENDING' && isInstallmentOverdue(status, dueOn)) {
    return 'OVERDUE';
  }
  return status as FeeInstallmentStatus;
}

export function paymentProgressPercent(totals: FeeAccountTotals): number | null {
  if (totals.totalDueMinor <= 0) {
    return totals.totalPaidMinor > 0 ? 100 : null;
  }
  return Math.min(
    100,
    Math.round((totals.totalPaidMinor / totals.totalDueMinor) * 100),
  );
}

export function buildFeeInstallmentRows(
  templates: FeeInstallmentTemplateValues[],
  tenantId: string,
  studentFeeAccountId: string,
  nowIso: string,
): Array<Record<string, unknown>> {
  return templates.map((row) => ({
    id: `fee-inst-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    tenantId,
    studentFeeAccountId,
    installmentNumber: row.installmentNumber,
    labelEn: row.labelEn,
    labelFr: row.labelFr,
    amountMinor: row.amountMinor,
    dueOn: row.dueOn,
    status: 'PENDING',
    paidAmountMinor: null,
    paidAt: null,
    notes: null,
    updatedByUserId: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}

export function buildFeePaymentUpdate(
  values: RecordFeePaymentValues,
  userId: string,
  nowIso: string,
): Record<string, unknown> {
  const paidMinor =
    values.paidAmountMinor != null && values.paidAmountMinor > 0
      ? values.paidAmountMinor
      : values.amountMinor;
  const isFull = paidMinor >= values.amountMinor;
  return {
    status: isFull ? 'PAID' : 'PENDING',
    paidAmountMinor: paidMinor,
    paidAt: nowIso,
    notes: values.notes?.trim() || null,
    updatedByUserId: userId,
    updatedAt: nowIso,
  };
}

export type FinanceSummary = {
  accounts: number;
  totalDueMinor: number;
  totalPaidMinor: number;
  outstandingMinor: number;
  overdueInstallments: number;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
};

export function aggregateFinanceSummary(
  accounts: FeeAccountTotals[],
  ledger: Array<{ entryType: string; amountMinor: number }>,
): FinanceSummary {
  const totalDueMinor = accounts.reduce((s, a) => s + a.totalDueMinor, 0);
  const totalPaidMinor = accounts.reduce((s, a) => s + a.totalPaidMinor, 0);
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const row of ledger) {
    if (row.entryType === 'INCOME') {
      incomeMinor += row.amountMinor;
    } else if (row.entryType === 'EXPENSE') {
      expenseMinor += row.amountMinor;
    }
  }
  return {
    accounts: accounts.length,
    totalDueMinor,
    totalPaidMinor,
    outstandingMinor: Math.max(0, totalDueMinor - totalPaidMinor),
    overdueInstallments: 0,
    incomeMinor,
    expenseMinor,
    netMinor: incomeMinor - expenseMinor,
  };
}

export const FEE_BUDGET_CATEGORIES = [
  'Tuition',
  'Salaries',
  'Facilities',
  'Supplies',
  'Transport',
  'Scholarships',
  'Other',
] as const;
