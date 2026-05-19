import { z } from 'zod';
import {
  FEE_BUDGET_CATEGORIES,
  FEE_INSTALLMENT_STATUSES,
  FINANCE_LEDGER_TYPES,
} from '@/lib/acadia/finance';

export const feeInstallmentTemplateSchema = z.object({
  installmentNumber: z.coerce.number().int().min(1),
  labelEn: z.string().min(1, 'English label is required.'),
  labelFr: z.string().min(1, 'French label is required.'),
  amountMinor: z.coerce.number().int().min(1, 'Amount must be greater than zero.'),
  dueOn: z.string().min(1, 'Due date is required.'),
});

export type FeeInstallmentTemplateValues = z.infer<
  typeof feeInstallmentTemplateSchema
>;

export const specialtyFeePlanSchema = z.object({
  specialtyId: z.string().min(1, 'Specialty is required.'),
  installments: z
    .array(feeInstallmentTemplateSchema)
    .min(1, 'Add at least one installment.'),
});

export type SpecialtyFeePlanFormValues = z.infer<typeof specialtyFeePlanSchema>;

export const createStudentFeeAccountSchema = z.object({
  studentProfileId: z.string().min(1, 'Student is required.'),
  academicYearId: z.string().min(1, 'Academic year is required.'),
  specialtyId: z.string().min(1, 'Specialty is required.'),
  studentEnrollmentId: z.string().optional().or(z.literal('')),
  feeCurrency: z.string().min(1).default('XAF'),
  useSpecialtyPlan: z.boolean().optional(),
});

export type CreateStudentFeeAccountValues = z.infer<
  typeof createStudentFeeAccountSchema
>;

export const recordFeePaymentSchema = z.object({
  installmentId: z.string().min(1),
  amountMinor: z.coerce.number().int().min(1),
  paidAmountMinor: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional().or(z.literal('')),
});

export type RecordFeePaymentValues = z.infer<typeof recordFeePaymentSchema>;

export const financeLedgerEntrySchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  entryType: z.enum(FINANCE_LEDGER_TYPES),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().optional().or(z.literal('')),
  amountMinor: z.coerce.number().int().min(1, 'Amount must be greater than zero.'),
  currency: z.string().min(1).default('XAF'),
  occurredOn: z.string().min(1, 'Date is required.'),
});

export type FinanceLedgerEntryFormValues = z.infer<
  typeof financeLedgerEntrySchema
>;

export const financeBudgetLineSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  category: z.enum(FEE_BUDGET_CATEGORIES),
  budgetedMinor: z.coerce
    .number()
    .int()
    .min(0, 'Budget must be zero or greater.'),
  currency: z.string().min(1).default('XAF'),
  notes: z.string().optional().or(z.literal('')),
});

export type FinanceBudgetLineFormValues = z.infer<typeof financeBudgetLineSchema>;

export const financeReportFiltersSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
});

export type FinanceReportFiltersValues = z.infer<
  typeof financeReportFiltersSchema
>;

export const feeInstallmentStatusSchema = z.enum(FEE_INSTALLMENT_STATUSES);
