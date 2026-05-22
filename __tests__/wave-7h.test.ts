/**
 * Wave 7H unit tests
 * Covers: finance schemas, fee totals, payment status, ledger aggregation
 */
import { describe, it, expect } from 'vitest';
import {
  aggregateFinanceSummary,
  computeFeeAccountTotals,
  effectiveInstallmentStatus,
  formatMoneyMinor,
  isInstallmentOverdue,
  parseMoneyToMinor,
  paymentProgressPercent,
  sumInstallmentTemplates,
} from '@/lib/acadia/finance';
import {
  financeLedgerEntrySchema,
  recordFeePaymentSchema,
  streamFeePlanSchema,
} from '@/lib/acadia/finance-schemas';

describe('formatMoneyMinor', () => {
  it('formats minor units as currency', () => {
    expect(formatMoneyMinor(150000, 'XAF')).toContain('500');
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
