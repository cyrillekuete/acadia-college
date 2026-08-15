/**
 * Wave 7H unit tests
 * Covers: finance schemas, fee totals, payment status, ledger aggregation
 */
import { describe, it, expect } from 'vitest';
import {
  aggregateExpenditureStats,
  aggregateFinanceSummary,
  aggregateSalesStats,
  canApproveExpenditure,
  canMarkExpenditurePaid,
  computeFeeAccountTotals,
  computeSaleTotalMinor,
  effectiveInstallmentStatus,
  formatMoneyMinor,
  isInstallmentOverdue,
  nextExpenditureStatus,
  parseMoneyToMinor,
  paymentProgressPercent,
  sumInstallmentTemplates,
} from '@/lib/acadia/finance';
import {
  expenditureSchema,
  financeLedgerEntrySchema,
  financeSaleSchema,
  recordFeePaymentSchema,
  streamFeePlanSchema,
} from '@/lib/acadia/finance-schemas';
import { formatMoney } from '@/i18n/format';
import { formatStudentFeesAmounts } from '@/lib/acadia/student-list';

describe('formatMoneyMinor', () => {
  it('formats minor units as currency', () => {
    expect(formatMoneyMinor(150000, 'XAF')).toContain('500');
  });
});

describe('formatMoney', () => {
  it('defaults to XAF without a dollar sign', () => {
    const formatted = formatMoney(1500);
    expect(formatted).not.toContain('$');
    expect(formatted).toMatch(/FCFA|F\s?CFA|XAF/i);
  });
});

describe('formatStudentFeesAmounts', () => {
  it('formats minor units as XAF major units', () => {
    const formatted = formatStudentFeesAmounts(150000, 150000);
    expect(formatted).toBeTruthy();
    const digits = formatted!.replace(/\D/g, '');
    expect(digits).toContain('1500');
    expect(digits).not.toContain('150000');
    expect(formatted).toMatch(/FCFA|F\s?CFA|XAF/i);
  });
});

describe('parseMoneyToMinor', () => {
  it('converts major units to minor', () => {
    expect(parseMoneyToMinor('1500')).toBe(150000);
  });
});

describe('computeFeeAccountTotals', () => {
  it('subtracts scholarships and sums paid installments', () => {
    const totals = computeFeeAccountTotals({
      totalAmountMinor: 300000,
      scholarshipMinor: 50000,
      installments: [
        { amountMinor: 100000, status: 'PAID', paidAmountMinor: 100000 },
        { amountMinor: 100000, status: 'PENDING', paidAmountMinor: null },
        { amountMinor: 100000, status: 'WAIVED', paidAmountMinor: null },
      ],
    });
    expect(totals.totalDueMinor).toBe(250000);
    expect(totals.totalPaidMinor).toBe(100000);
    expect(totals.balanceMinor).toBe(150000);
  });
});

describe('paymentProgressPercent', () => {
  it('returns percentage of amount due collected', () => {
    expect(
      paymentProgressPercent({
        totalDueMinor: 200000,
        totalPaidMinor: 100000,
        scholarshipMinor: 0,
        balanceMinor: 100000,
      }),
    ).toBe(50);
  });
});

describe('isInstallmentOverdue', () => {
  it('flags pending installments past due date', () => {
    expect(
      isInstallmentOverdue('PENDING', '2020-01-01', new Date('2026-05-19')),
    ).toBe(true);
    expect(
      isInstallmentOverdue('PAID', '2020-01-01', new Date('2026-05-19')),
    ).toBe(false);
  });
});

describe('effectiveInstallmentStatus', () => {
  it('maps pending past-due to overdue', () => {
    expect(
      effectiveInstallmentStatus('PENDING', '2020-01-01'),
    ).toBe('OVERDUE');
  });
});

describe('sumInstallmentTemplates', () => {
  it('sums installment amounts', () => {
    expect(
      sumInstallmentTemplates([
        {
          installmentNumber: 1,
          labelEn: 'A',
          labelFr: 'A',
          amountMinor: 10000,
          dueOn: '2026-09-01',
        },
        {
          installmentNumber: 2,
          labelEn: 'B',
          labelFr: 'B',
          amountMinor: 20000,
          dueOn: '2026-12-01',
        },
      ]),
    ).toBe(30000);
  });
});

describe('aggregateFinanceSummary', () => {
  it('combines account and ledger totals', () => {
    const summary = aggregateFinanceSummary(
      [
        {
          totalDueMinor: 100000,
          totalPaidMinor: 40000,
          scholarshipMinor: 0,
          balanceMinor: 60000,
        },
      ],
      [
        { entryType: 'INCOME', amountMinor: 5000 },
        { entryType: 'EXPENSE', amountMinor: 2000 },
      ],
    );
    expect(summary.accounts).toBe(1);
    expect(summary.outstandingMinor).toBe(60000);
    expect(summary.netMinor).toBe(3000);
  });

  it('adds completed sales and paid expenditures to ledger totals', () => {
    const summary = aggregateFinanceSummary(
      [],
      [
        { entryType: 'INCOME', amountMinor: 1000 },
        { entryType: 'EXPENSE', amountMinor: 400 },
      ],
      { completedSalesMinor: 2500, paidExpendituresMinor: 800 },
    );
    expect(summary.incomeMinor).toBe(3500);
    expect(summary.expenseMinor).toBe(1200);
    expect(summary.netMinor).toBe(2300);
  });
});

describe('computeSaleTotalMinor', () => {
  it('multiplies quantity by unit price in minor units', () => {
    expect(computeSaleTotalMinor(3, 150000)).toBe(450000);
  });

  it('returns zero for invalid inputs', () => {
    expect(computeSaleTotalMinor(Number.NaN, 100)).toBe(0);
    expect(computeSaleTotalMinor(-2, 100)).toBe(0);
  });
});

describe('expenditure status workflow', () => {
  it('allows pending to approved and approved to paid', () => {
    expect(canApproveExpenditure('PENDING')).toBe(true);
    expect(canMarkExpenditurePaid('APPROVED')).toBe(true);
    expect(nextExpenditureStatus('approve', 'PENDING')).toBe('APPROVED');
    expect(nextExpenditureStatus('pay', 'APPROVED')).toBe('PAID');
  });

  it('rejects invalid transitions', () => {
    expect(canApproveExpenditure('APPROVED')).toBe(false);
    expect(canMarkExpenditurePaid('PENDING')).toBe(false);
    expect(nextExpenditureStatus('approve', 'PAID')).toBeNull();
    expect(nextExpenditureStatus('pay', 'PENDING')).toBeNull();
  });
});

describe('aggregateSalesStats', () => {
  it('counts only completed sales', () => {
    const stats = aggregateSalesStats([
      { status: 'COMPLETED', quantity: 2, totalMinor: 20000 },
      { status: 'PENDING', quantity: 1, totalMinor: 5000 },
      { status: 'CANCELLED', quantity: 4, totalMinor: 8000 },
    ]);
    expect(stats.count).toBe(1);
    expect(stats.revenueMinor).toBe(20000);
    expect(stats.itemsSold).toBe(2);
    expect(stats.averageOrderMinor).toBe(20000);
  });
});

describe('aggregateExpenditureStats', () => {
  it('sums paid amounts and counts pending and approved', () => {
    const stats = aggregateExpenditureStats([
      { status: 'PENDING', amountMinor: 1000 },
      { status: 'APPROVED', amountMinor: 2000 },
      { status: 'PAID', amountMinor: 5000 },
      { status: 'REJECTED', amountMinor: 9000 },
    ]);
    expect(stats.count).toBe(4);
    expect(stats.totalAmountMinor).toBe(5000);
    expect(stats.pendingCount).toBe(1);
    expect(stats.approvedCount).toBe(1);
  });
});

describe('streamFeePlanSchema', () => {
  it('requires sub-system, branch, and installments', () => {
    expect(
      streamFeePlanSchema.safeParse({
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
        installments: [
          {
            installmentNumber: 1,
            labelEn: 'First',
            labelFr: 'Première',
            amountMinor: 50000,
            dueOn: '2026-09-15',
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('recordFeePaymentSchema', () => {
  it('requires installment and amount', () => {
    expect(
      recordFeePaymentSchema.safeParse({
        installmentId: 'inst-1',
        amountMinor: 25000,
      }).success,
    ).toBe(true);
  });
});

describe('financeLedgerEntrySchema', () => {
  it('accepts income and expense entries', () => {
    expect(
      financeLedgerEntrySchema.safeParse({
        academicYearId: 'year-1',
        entryType: 'EXPENSE',
        category: 'Supplies',
        amountMinor: 12000,
        currency: 'XAF',
        occurredOn: '2026-05-19',
      }).success,
    ).toBe(true);
  });
});

describe('financeSaleSchema', () => {
  it('accepts a merchandise sale', () => {
    expect(
      financeSaleSchema.safeParse({
        academicYearId: 'year-1',
        studentProfileId: 'stu-1',
        itemType: 'UNIFORM',
        itemName: 'School Uniform',
        quantity: 2,
        unitPriceMinor: 150000,
        saleDate: '2026-08-15',
      }).success,
    ).toBe(true);
  });
});

describe('expenditureSchema', () => {
  it('accepts a vendor expenditure', () => {
    expect(
      expenditureSchema.safeParse({
        academicYearId: 'year-1',
        title: 'Generator fuel',
        category: 'utilities',
        amountMinor: 250000,
        currency: 'XAF',
        paymentMethod: 'CASH',
        paymentDate: '2026-08-15',
        vendor: 'Total',
        budgetCategory: 'Facilities',
      }).success,
    ).toBe(true);
  });
});
