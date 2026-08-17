/**
 * Wave 7H unit tests
 * Covers: finance schemas, fee totals, payment status, ledger aggregation
 */
import { describe, it, expect } from 'vitest';
import {
  aggregateExpenditureStats,
  aggregateFinanceSummary,
  aggregateSalesStats,
  allocateFeePayment,
  canApproveExpenditure,
  canDeleteExpenditure,
  canEditExpenditure,
  canMarkExpenditurePaid,
  computeFeeAccountTotals,
  computeSaleTotalMinor,
  cumulativePaidAmountMinor,
  effectiveInstallmentStatus,
  formatMoneyMinor,
  isInstallmentOverdue,
  mergeFeePlanClassSelection,
  nextExpenditureStatus,
  parseMoneyToMinor,
  paymentProgressPercent,
  pruneFeePlanClassSelection,
  remainingInstallmentMinor,
  resolveFeePlanStream,
  splitTuitionIntoDefaultInstallments,
  applyDefaultFeeInstallmentSplit,
  DEFAULT_FEE_INSTALLMENT_LABELS,
  sumInstallmentTemplates,
  toFeePlanRow,
} from '@/lib/acadia/finance';
import {
  expenditureSchema,
  financeLedgerEntrySchema,
  financeSaleSchema,
  recordFeePaymentSchema,
  streamFeePlanSchema,
} from '@/lib/acadia/finance-schemas';
import {
  ensureStudentFeeAccount,
  rebillInstallments,
} from '@/lib/acadia/fee-account-provision';
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
    expect(totals.creditMinor).toBe(0);
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

describe('remainingInstallmentMinor', () => {
  it('returns the unpaid remainder for pending installments', () => {
    expect(
      remainingInstallmentMinor({
        amountMinor: 100000,
        paidAmountMinor: null,
        status: 'PENDING',
      }),
    ).toBe(100000);
    expect(
      remainingInstallmentMinor({
        amountMinor: 100000,
        paidAmountMinor: 40000,
        status: 'PENDING',
      }),
    ).toBe(60000);
  });

  it('is zero for paid and waived installments', () => {
    expect(
      remainingInstallmentMinor({
        amountMinor: 100000,
        paidAmountMinor: 50000,
        status: 'PAID',
      }),
    ).toBe(0);
    expect(
      remainingInstallmentMinor({
        amountMinor: 100000,
        paidAmountMinor: null,
        status: 'WAIVED',
      }),
    ).toBe(0);
  });
});

describe('cumulativePaidAmountMinor', () => {
  it('records a full payment from zero', () => {
    expect(cumulativePaidAmountMinor(null, 100000, 100000)).toBe(100000);
  });

  it('records a partial payment', () => {
    expect(cumulativePaidAmountMinor(0, 40000, 100000)).toBe(40000);
  });

  it('accumulates a second partial payment', () => {
    expect(cumulativePaidAmountMinor(40000, 25000, 100000)).toBe(65000);
  });

  it('caps at the installment amount', () => {
    expect(cumulativePaidAmountMinor(40000, 100000, 100000)).toBe(100000);
  });
});

describe('allocateFeePayment', () => {
  const plan = [
    {
      id: 'i1',
      installmentNumber: 1,
      amountMinor: 4000000,
      paidAmountMinor: null,
      status: 'PENDING',
    },
    {
      id: 'i2',
      installmentNumber: 2,
      amountMinor: 4000000,
      paidAmountMinor: null,
      status: 'PENDING',
    },
    {
      id: 'i3',
      installmentNumber: 3,
      amountMinor: 4000000,
      paidAmountMinor: null,
      status: 'PENDING',
    },
  ];
  const fullRemaining = 12000000;

  it('waterfalls an overpayment onto the next installment', () => {
    const result = allocateFeePayment({
      selectedInstallmentId: 'i1',
      paymentMinor: 5000000,
      installments: plan,
      accountRemainingMinor: fullRemaining,
    });
    expect(result.appliedMinor).toBe(5000000);
    expect(result.unappliedMinor).toBe(0);
    expect(result.updates).toEqual([
      { id: 'i1', paidAmountMinor: 4000000, status: 'PAID' },
      { id: 'i2', paidAmountMinor: 1000000, status: 'PENDING' },
    ]);
  });

  it('records a partial payment on the selected installment only', () => {
    const result = allocateFeePayment({
      selectedInstallmentId: 'i1',
      paymentMinor: 3000000,
      installments: plan,
      accountRemainingMinor: fullRemaining,
    });
    expect(result.appliedMinor).toBe(3000000);
    expect(result.updates).toEqual([
      { id: 'i1', paidAmountMinor: 3000000, status: 'PENDING' },
    ]);
  });

  it('caps at the account remaining', () => {
    const result = allocateFeePayment({
      selectedInstallmentId: 'i1',
      paymentMinor: 20000000,
      installments: plan,
      accountRemainingMinor: fullRemaining,
    });
    expect(result.appliedMinor).toBe(fullRemaining);
    expect(result.unappliedMinor).toBe(8000000);
    expect(result.updates.every((row) => row.status === 'PAID')).toBe(true);
  });

  it('skips waived installments when applying overflow', () => {
    const result = allocateFeePayment({
      selectedInstallmentId: 'i1',
      paymentMinor: 5000000,
      installments: [
        plan[0],
        { ...plan[1], status: 'WAIVED' },
        plan[2],
      ],
      accountRemainingMinor: 8000000,
    });
    expect(result.updates).toEqual([
      { id: 'i1', paidAmountMinor: 4000000, status: 'PAID' },
      { id: 'i3', paidAmountMinor: 1000000, status: 'PENDING' },
    ]);
  });

  it('overflows after a partial on the first installment', () => {
    const result = allocateFeePayment({
      selectedInstallmentId: 'i1',
      paymentMinor: 2000000,
      installments: [
        { ...plan[0], paidAmountMinor: 3000000 },
        plan[1],
        plan[2],
      ],
      accountRemainingMinor: 9000000,
    });
    expect(result.updates).toEqual([
      { id: 'i1', paidAmountMinor: 4000000, status: 'PAID' },
      { id: 'i2', paidAmountMinor: 1000000, status: 'PENDING' },
    ]);
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

describe('splitTuitionIntoDefaultInstallments', () => {
  it('splits even totals into 50 / 25 / 25', () => {
    expect(splitTuitionIntoDefaultInstallments(10000)).toEqual([5000, 2500, 2500]);
  });

  it('puts the remainder on the last installment', () => {
    expect(splitTuitionIntoDefaultInstallments(10001)).toEqual([5000, 2500, 2501]);
    expect(splitTuitionIntoDefaultInstallments(3)).toEqual([1, 0, 2]);
  });

  it('keeps a tiny total on the last installment', () => {
    expect(splitTuitionIntoDefaultInstallments(1)).toEqual([0, 0, 1]);
    expect(splitTuitionIntoDefaultInstallments(0)).toEqual([0, 0, 0]);
  });

  it('always sums back to the original total', () => {
    for (const total of [1, 2, 3, 4, 7, 99, 15000000]) {
      const parts = splitTuitionIntoDefaultInstallments(total);
      expect(parts.reduce((sum, part) => sum + part, 0)).toBe(total);
      expect(parts[2]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('applyDefaultFeeInstallmentSplit', () => {
  it('keeps labels and due dates when there are already 3 rows', () => {
    const result = applyDefaultFeeInstallmentSplit(
      [
        {
          labelEn: 'Custom 1',
          labelFr: 'Perso 1',
          dueOn: '2026-09-01',
        },
        {
          labelEn: 'Custom 2',
          labelFr: 'Perso 2',
          dueOn: '2026-12-01',
        },
        {
          labelEn: 'Custom 3',
          labelFr: 'Perso 3',
          dueOn: '2027-03-01',
        },
      ],
      [5000, 2500, 2500],
    );
    expect(result).toEqual([
      {
        installmentNumber: 1,
        labelEn: 'Custom 1',
        labelFr: 'Perso 1',
        amountMinor: 5000,
        dueOn: '2026-09-01',
      },
      {
        installmentNumber: 2,
        labelEn: 'Custom 2',
        labelFr: 'Perso 2',
        amountMinor: 2500,
        dueOn: '2026-12-01',
      },
      {
        installmentNumber: 3,
        labelEn: 'Custom 3',
        labelFr: 'Perso 3',
        amountMinor: 2500,
        dueOn: '2027-03-01',
      },
    ]);
  });

  it('resets labels when the count is not 3 and keeps due dates from the first rows', () => {
    const result = applyDefaultFeeInstallmentSplit(
      [
        { labelEn: 'A', labelFr: 'A', dueOn: '2026-09-01' },
        { labelEn: 'B', labelFr: 'B', dueOn: '2026-12-01' },
        { labelEn: 'C', labelFr: 'C', dueOn: '2027-03-01' },
        { labelEn: 'D', labelFr: 'D', dueOn: '2027-06-01' },
      ],
      [8000, 4000, 4000],
    );
    expect(result.map((row) => row.labelEn)).toEqual(
      DEFAULT_FEE_INSTALLMENT_LABELS.map((row) => row.labelEn),
    );
    expect(result.map((row) => row.dueOn)).toEqual([
      '2026-09-01',
      '2026-12-01',
      '2027-03-01',
    ]);
    expect(result).toHaveLength(3);
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

  it('locks paid expenditures from edit and delete', () => {
    expect(canEditExpenditure('PENDING')).toBe(true);
    expect(canEditExpenditure('APPROVED')).toBe(true);
    expect(canEditExpenditure('REJECTED')).toBe(true);
    expect(canEditExpenditure('PAID')).toBe(false);
    expect(canDeleteExpenditure('PENDING')).toBe(true);
    expect(canDeleteExpenditure('PAID')).toBe(false);
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
  const installment = {
    installmentNumber: 1,
    labelEn: 'First',
    labelFr: 'Première',
    amountMinor: 50000,
    dueOn: '2026-09-15',
  };
  const defaultSplitInstallments = [
    {
      installmentNumber: 1,
      labelEn: 'First',
      labelFr: 'Première',
      amountMinor: 50000,
      dueOn: '2026-09-15',
    },
    {
      installmentNumber: 2,
      labelEn: 'Second',
      labelFr: 'Deuxième',
      amountMinor: 25000,
      dueOn: '2026-12-15',
    },
    {
      installmentNumber: 3,
      labelEn: 'Third',
      labelFr: 'Troisième',
      amountMinor: 25000,
      dueOn: '2027-03-15',
    },
  ];

  it('requires classes, academic year, full amount, and installments', () => {
    expect(
      streamFeePlanSchema.safeParse({
        academicYearId: 'year-1',
        classIds: ['class-1', 'class-2'],
        totalAmountMinor: 100000,
        installments: defaultSplitInstallments,
      }).success,
    ).toBe(true);
  });

  it('accepts a custom installment breakdown that still sums to the full amount', () => {
    expect(
      streamFeePlanSchema.safeParse({
        academicYearId: 'year-1',
        classIds: ['class-1'],
        totalAmountMinor: 100000,
        installments: [
          installment,
          {
            installmentNumber: 2,
            labelEn: 'Second',
            labelFr: 'Deuxième',
            amountMinor: 30000,
            dueOn: '2026-12-15',
          },
          {
            installmentNumber: 3,
            labelEn: 'Third',
            labelFr: 'Troisième',
            amountMinor: 20000,
            dueOn: '2027-03-15',
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects installments that do not sum to the full amount', () => {
    const result = streamFeePlanSchema.safeParse({
      academicYearId: 'year-1',
      classIds: ['class-1'],
      totalAmountMinor: 100000,
      installments: [installment],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.message === 'validation.installmentsMustMatchTotal',
        ),
      ).toBe(true);
    }
  });

  it('rejects an empty class list', () => {
    expect(
      streamFeePlanSchema.safeParse({
        academicYearId: 'year-1',
        classIds: [],
        totalAmountMinor: 50000,
        installments: [installment],
      }).success,
    ).toBe(false);
  });
});

describe('resolveFeePlanStream', () => {
  it('returns the shared stream', () => {
    expect(
      resolveFeePlanStream([
        { id: 'a', subSystem: 'ENGLISH', branch: 'GRAMMAR' },
        { id: 'b', subSystem: 'ENGLISH', branch: 'GRAMMAR' },
      ]),
    ).toEqual({ subSystem: 'ENGLISH', branch: 'GRAMMAR' });
  });

  it('rejects mixed streams instead of copying the first class', () => {
    expect(() =>
      resolveFeePlanStream([
        { id: 'a', subSystem: 'ENGLISH', branch: 'GRAMMAR' },
        { id: 'b', subSystem: 'FRENCH', branch: 'GENERAL' },
      ]),
    ).toThrow('Select classes from a single stream.');
  });
});

describe('fee plan class selection', () => {
  const classes = [
    { id: 'en1', subSystem: 'ENGLISH', branch: 'GRAMMAR' },
    { id: 'en2', subSystem: 'ENGLISH', branch: 'GRAMMAR' },
    { id: 'fr1', subSystem: 'FRENCH', branch: 'GENERAL' },
  ];

  it('keeps hidden ids when filters are empty', () => {
    expect(
      pruneFeePlanClassSelection(['en1', 'fr1'], ['en1'], {
        subSystem: null,
        branch: null,
      }),
    ).toEqual(['en1', 'fr1']);
  });

  it('drops prior picks that are not in the filtered class list', () => {
    expect(
      pruneFeePlanClassSelection(['en1', 'fr1'], ['fr1'], {
        subSystem: 'FRENCH',
        branch: 'GENERAL',
      }),
    ).toEqual(['fr1']);
  });

  it('adds classes from the same stream', () => {
    expect(mergeFeePlanClassSelection(['en1'], ['en2'], classes)).toEqual([
      'en1',
      'en2',
    ]);
  });

  it('replaces the selection when adding a different stream', () => {
    expect(mergeFeePlanClassSelection(['en1'], ['fr1'], classes)).toEqual([
      'fr1',
    ]);
  });

  it('does not mix streams on select-all', () => {
    expect(
      mergeFeePlanClassSelection(['en1'], ['en1', 'en2', 'fr1'], classes),
    ).toEqual(['en1', 'en2']);
  });

  it('select-all with no prior pick stays on one stream', () => {
    expect(
      mergeFeePlanClassSelection([], ['en1', 'en2', 'fr1'], classes),
    ).toEqual(['en1', 'en2']);
  });
});

describe('toFeePlanRow', () => {
  it('maps installments, total, and first due date', () => {
    const row = toFeePlanRow({
      id: 'plan-1',
      academicYearId: 'year-1',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      installments: [
        {
          installmentNumber: 2,
          labelEn: 'Second',
          labelFr: 'Deuxième',
          amountMinor: 40000,
          dueOn: '2026-12-01',
        },
        {
          installmentNumber: 1,
          labelEn: 'First',
          labelFr: 'Première',
          amountMinor: 40000,
          dueOn: '2026-09-15',
        },
      ],
      classes: [{ id: 'c1', name: 'Form 1 A' }],
    });
    expect(row.totalMinor).toBe(80000);
    expect(row.firstDueOn).toBe('2026-09-15');
    expect(row.classes).toHaveLength(1);
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

describe('rebillInstallments', () => {
  const threeInstallments = [
    {
      installmentNumber: 1,
      labelEn: 'First',
      labelFr: 'Premier',
      amountMinor: 100000,
      dueOn: '2026-10-01',
    },
    {
      installmentNumber: 2,
      labelEn: 'Second',
      labelFr: 'Deuxième',
      amountMinor: 100000,
      dueOn: '2027-01-01',
    },
    {
      installmentNumber: 3,
      labelEn: 'Third',
      labelFr: 'Troisième',
      amountMinor: 100000,
      dueOn: '2027-04-01',
    },
  ];

  it('copies an unpaid schedule with nothing transferred', () => {
    const result = rebillInstallments({
      paidMinor: 0,
      templates: threeInstallments,
    });
    expect(result.totalAmountMinor).toBe(300000);
    expect(result.appliedPaidMinor).toBe(0);
    expect(result.creditMinor).toBe(0);
    expect(result.remainingMinor).toBe(300000);
    expect(result.installments.every((row) => row.status === 'PENDING')).toBe(
      true,
    );
  });

  it('carries a partial payment onto the new plan', () => {
    const result = rebillInstallments({
      paidMinor: 200000,
      templates: [
        {
          installmentNumber: 1,
          labelEn: 'A',
          labelFr: 'A',
          amountMinor: 150000,
          dueOn: '2026-10-01',
        },
        {
          installmentNumber: 2,
          labelEn: 'B',
          labelFr: 'B',
          amountMinor: 150000,
          dueOn: '2027-01-01',
        },
        {
          installmentNumber: 3,
          labelEn: 'C',
          labelFr: 'C',
          amountMinor: 150000,
          dueOn: '2027-04-01',
        },
      ],
    });
    expect(result.totalAmountMinor).toBe(450000);
    expect(result.appliedPaidMinor).toBe(200000);
    expect(result.creditMinor).toBe(0);
    expect(result.remainingMinor).toBe(250000);
    expect(result.installments[0]?.status).toBe('PAID');
    expect(result.installments[1]?.paidAmountMinor).toBe(50000);
    expect(result.installments[1]?.status).toBe('PENDING');
    expect(result.installments[2]?.paidAmountMinor).toBeNull();
  });

  it('records credit when already paid more than the new due amount', () => {
    const result = rebillInstallments({
      paidMinor: 400000,
      templates: threeInstallments,
    });
    expect(result.remainingMinor).toBe(0);
    expect(result.creditMinor).toBe(100000);
    expect(result.appliedPaidMinor).toBe(300000);
    expect(result.installments.every((row) => row.status === 'PAID')).toBe(true);
  });

  it('reduces remaining due by scholarships after rebill', () => {
    const result = rebillInstallments({
      paidMinor: 200000,
      scholarshipMinor: 50000,
      templates: threeInstallments,
    });
    expect(result.totalDueMinor).toBe(250000);
    expect(result.appliedPaidMinor).toBe(200000);
    expect(result.creditMinor).toBe(0);
    expect(result.remainingMinor).toBe(50000);
  });

  it('credits overpayment after scholarships', () => {
    const result = rebillInstallments({
      paidMinor: 400000,
      scholarshipMinor: 50000,
      templates: threeInstallments,
    });
    expect(result.totalDueMinor).toBe(250000);
    expect(result.remainingMinor).toBe(0);
    expect(result.creditMinor).toBe(150000);
  });
});

describe('ensureStudentFeeAccount', () => {
  it('is idempotent when an account already exists', async () => {
    const inserted: unknown[] = [];
    const supabase = {
      from(table: string) {
        if (table === 'StudentFeeAccount') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { id: 'fee-acct-existing' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            insert: async (row: unknown) => {
              inserted.push(row);
              return { error: null };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };

    const first = await ensureStudentFeeAccount(supabase as never, {
      tenantId: 'tenant-1',
      studentProfileId: 'stu-1',
      academicYearId: 'year-1',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      studentEnrollmentId: 'enr-1',
      classId: 'class-1',
    });
    const second = await ensureStudentFeeAccount(supabase as never, {
      tenantId: 'tenant-1',
      studentProfileId: 'stu-1',
      academicYearId: 'year-1',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      studentEnrollmentId: 'enr-1',
      classId: 'class-1',
    });

    expect(first).toEqual({
      ok: true,
      accountId: 'fee-acct-existing',
      created: false,
    });
    expect(second).toEqual(first);
    expect(inserted).toHaveLength(0);
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
