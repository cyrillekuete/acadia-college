import { describe, expect, it } from 'vitest';
import {
  aggregateFinanceSummary,
  assertFinanceYearWritable,
  canCancelSale,
  canDeleteSale,
  canEditSaleAmounts,
  canRejectExpenditure,
  canReopenExpenditure,
  capScholarshipStack,
  computeFeeAccountTotals,
  computeScholarshipDiscountMinor,
  countOverdueInstallments,
  feeAccountCollectionStatus,
  isFinanceYearClosed,
  nextExpenditureStatus,
  parseMoneyToMinor,
  scholarshipMinorFromGrants,
} from '@/lib/acadia/finance';
import { streamFeePlanSchema } from '@/lib/acadia/finance-schemas';
import { getMenuForRole } from '@/config/menu.acadia';

describe('fee account totals edge cases', () => {
  it('reduces due by waived installments before scholarships', () => {
    const totals = computeFeeAccountTotals({
      totalAmountMinor: 300000,
      scholarshipMinor: 50000,
      installments: [
        { amountMinor: 100000, status: 'PAID', paidAmountMinor: 100000 },
        { amountMinor: 100000, status: 'PENDING', paidAmountMinor: null },
        { amountMinor: 100000, status: 'WAIVED', paidAmountMinor: null },
      ],
    });
    expect(totals.waivedMinor).toBe(100000);
    expect(totals.totalDueMinor).toBe(150000);
    expect(totals.balanceMinor).toBe(50000);
  });

  it('includes credit in outstanding', () => {
    const totals = computeFeeAccountTotals({
      totalAmountMinor: 200000,
      creditMinor: 25000,
      installments: [
        { amountMinor: 100000, status: 'PAID', paidAmountMinor: 100000 },
        { amountMinor: 100000, status: 'PENDING', paidAmountMinor: null },
      ],
    });
    const summary = aggregateFinanceSummary([totals], []);
    expect(summary.outstandingMinor).toBe(75000);
  });

  it('computes overdue from dueOn, not stored OVERDUE', () => {
    const installments = [
      {
        amountMinor: 100000,
        status: 'PENDING',
        paidAmountMinor: null,
        dueOn: '2020-01-01',
      },
      {
        amountMinor: 100000,
        status: 'PENDING',
        paidAmountMinor: null,
        dueOn: '2099-01-01',
      },
    ];
    const totals = computeFeeAccountTotals({
      totalAmountMinor: 200000,
      installments,
    });
    expect(countOverdueInstallments(installments, new Date('2026-08-20'))).toBe(1);
    expect(
      feeAccountCollectionStatus(totals, installments, new Date('2026-08-20')),
    ).toBe('overdue');
  });
});

describe('scholarship helpers', () => {
  it('computes percent and fixed discounts', () => {
    expect(
      computeScholarshipDiscountMinor({
        discountKind: 'PERCENT_BPS',
        percentBps: 2500,
        totalAmountMinor: 200000,
      }),
    ).toBe(50000);
    expect(
      computeScholarshipDiscountMinor({
        discountKind: 'FIXED_MINOR',
        fixedAmountMinor: 15000,
        totalAmountMinor: 200000,
      }),
    ).toBe(15000);
  });

  it('caps stacked grants at the assessed amount', () => {
    expect(capScholarshipStack([80000, 80000], 100000)).toBe(100000);
    expect(scholarshipMinorFromGrants([{ discountMinor: 10 }, { discountMinor: 15 }])).toBe(
      25,
    );
  });
});

describe('closed finance year', () => {
  it('blocks writes when the year is inactive', () => {
    expect(isFinanceYearClosed({ isActive: false })).toBe(true);
    expect(() => assertFinanceYearWritable({ isActive: false })).toThrow(/closed/);
    expect(() => assertFinanceYearWritable({ isActive: true })).not.toThrow();
  });
});

describe('sales and expenditure guards', () => {
  it('locks completed sales from amount edits and deletes', () => {
    expect(canEditSaleAmounts('COMPLETED')).toBe(false);
    expect(canDeleteSale('COMPLETED')).toBe(false);
    expect(canCancelSale('COMPLETED')).toBe(true);
    expect(canDeleteSale('PENDING')).toBe(true);
  });

  it('rejects and reopens expenditures', () => {
    expect(canRejectExpenditure('PENDING')).toBe(true);
    expect(nextExpenditureStatus('reject', 'PENDING')).toBe('REJECTED');
    expect(canReopenExpenditure('REJECTED')).toBe(true);
    expect(nextExpenditureStatus('reopen', 'REJECTED')).toBe('PENDING');
  });
});

describe('fee plan due dates', () => {
  it('rejects installments that are due out of order', () => {
    const result = streamFeePlanSchema.safeParse({
      academicYearId: 'year-1',
      classIds: ['class-1'],
      totalAmountMinor: 100000,
      installments: [
        {
          installmentNumber: 1,
          labelEn: 'First',
          labelFr: 'Première',
          amountMinor: 50000,
          dueOn: '2026-12-01',
        },
        {
          installmentNumber: 2,
          labelEn: 'Second',
          labelFr: 'Deuxième',
          amountMinor: 50000,
          dueOn: '2026-09-01',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('self-service fee menu', () => {
  it('routes students and guardians to my-fees, not the bursar list', () => {
    const student = getMenuForRole('student');
    const guardian = getMenuForRole('guardian');
    const studentFees = JSON.stringify(student);
    const guardianFees = JSON.stringify(guardian);
    expect(studentFees).toContain('/finance/my-fees');
    expect(guardianFees).toContain('/finance/my-fees');
    expect(studentFees).not.toContain('"/finance/fees"');
    expect(guardianFees).not.toContain('"/finance/fees"');
  });

  it('exposes ledger and budget to bursar menus', () => {
    const bursar = JSON.stringify(getMenuForRole('bursar'));
    expect(bursar).toContain('/finance/ledger');
    expect(bursar).toContain('/finance/budget');
  });
});

describe('parseMoneyToMinor locale', () => {
  it('parses grouped thousands as XAF major units', () => {
    expect(parseMoneyToMinor('1,500')).toBe(150000);
  });
});
