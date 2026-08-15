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
  extras?: {
    completedSalesMinor?: number;
    paidExpendituresMinor?: number;
  },
): FinanceSummary {
  const totalDueMinor = accounts.reduce((s, a) => s + a.totalDueMinor, 0);
  const totalPaidMinor = accounts.reduce((s, a) => s + a.totalPaidMinor, 0);
  let incomeMinor = extras?.completedSalesMinor ?? 0;
  let expenseMinor = extras?.paidExpendituresMinor ?? 0;
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
  'Merchandise',
  'Other',
] as const;

export type FeeBudgetCategory = (typeof FEE_BUDGET_CATEGORIES)[number];

export const MERCHANDISE_BUDGET_CATEGORY = 'Merchandise' satisfies FeeBudgetCategory;

export const FINANCE_SALE_ITEM_TYPES = [
  'PULLOVER',
  'SPORT_WEAR',
  'UNIFORM',
  'T_SHIRT',
  'OTHER',
] as const;

export type FinanceSaleItemType = (typeof FINANCE_SALE_ITEM_TYPES)[number];

export const FINANCE_SALE_STATUSES = [
  'COMPLETED',
  'PENDING',
  'CANCELLED',
] as const;

export type FinanceSaleStatus = (typeof FINANCE_SALE_STATUSES)[number];

export const FINANCE_PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
  'CHECK',
  'CREDIT_CARD',
] as const;

export type FinancePaymentMethod = (typeof FINANCE_PAYMENT_METHODS)[number];

export const EXPENDITURE_STATUSES = [
  'PENDING',
  'APPROVED',
  'PAID',
  'REJECTED',
] as const;

export type ExpenditureStatus = (typeof EXPENDITURE_STATUSES)[number];

export const EXPENDITURE_CATEGORIES = [
  'academic',
  'administrative',
  'infrastructure',
  'utilities',
  'maintenance',
  'transportation',
  'food_catering',
  'equipment',
  'supplies',
  'professional_services',
  'marketing',
  'training',
  'other',
] as const;

export type ExpenditureCategory = (typeof EXPENDITURE_CATEGORIES)[number];

export const SALE_ITEM_DEFAULT_NAMES: Record<FinanceSaleItemType, string> = {
  PULLOVER: 'School Pullover',
  SPORT_WEAR: 'Sport Wear',
  UNIFORM: 'School Uniform',
  T_SHIRT: 'T-Shirt',
  OTHER: '',
};

export function computeSaleTotalMinor(
  quantity: number,
  unitPriceMinor: number,
): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPriceMinor)) {
    return 0;
  }
  return Math.max(0, Math.round(quantity) * Math.round(unitPriceMinor));
}

export function canApproveExpenditure(status: string): boolean {
  return status === 'PENDING';
}

export function canMarkExpenditurePaid(status: string): boolean {
  return status === 'APPROVED';
}

export function canEditExpenditure(status: string): boolean {
  return status !== 'PAID';
}

export function canDeleteExpenditure(status: string): boolean {
  return status !== 'PAID';
}

export function nextExpenditureStatus(
  action: 'approve' | 'pay',
  status: string,
): ExpenditureStatus | null {
  if (action === 'approve' && canApproveExpenditure(status)) {
    return 'APPROVED';
  }
  if (action === 'pay' && canMarkExpenditurePaid(status)) {
    return 'PAID';
  }
  return null;
}

export type FinanceSaleRow = {
  id: string;
  studentProfileId: string;
  studentLabel: string;
  itemType: FinanceSaleItemType;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  saleDate: string;
  status: FinanceSaleStatus;
  notes: string | null;
};

export type ExpenditureRow = {
  id: string;
  title: string;
  description: string | null;
  category: ExpenditureCategory;
  amountMinor: number;
  currency: string;
  paymentMethod: FinancePaymentMethod | null;
  paymentDate: string;
  vendor: string;
  vendorContact: string | null;
  receiptNumber: string | null;
  invoiceNumber: string | null;
  status: ExpenditureStatus;
  budgetCategory: string | null;
  department: string | null;
  notes: string | null;
};

export type SalesStats = {
  count: number;
  revenueMinor: number;
  itemsSold: number;
  averageOrderMinor: number;
};

export function aggregateSalesStats(
  sales: Array<{ status: string; quantity: number; totalMinor: number }>,
): SalesStats {
  const completed = sales.filter((row) => row.status === 'COMPLETED');
  const revenueMinor = completed.reduce((sum, row) => sum + row.totalMinor, 0);
  const itemsSold = completed.reduce((sum, row) => sum + row.quantity, 0);
  return {
    count: completed.length,
    revenueMinor,
    itemsSold,
    averageOrderMinor:
      completed.length > 0 ? Math.round(revenueMinor / completed.length) : 0,
  };
}

export type ExpenditureStats = {
  count: number;
  totalAmountMinor: number;
  pendingCount: number;
  approvedCount: number;
};

export function aggregateExpenditureStats(
  rows: Array<{ status: string; amountMinor: number }>,
): ExpenditureStats {
  return {
    count: rows.length,
    totalAmountMinor: rows
      .filter((row) => row.status === 'PAID')
      .reduce((sum, row) => sum + row.amountMinor, 0),
    pendingCount: rows.filter((row) => row.status === 'PENDING').length,
    approvedCount: rows.filter((row) => row.status === 'APPROVED').length,
  };
}
